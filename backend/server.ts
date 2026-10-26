/**
 * The lanbilder-admin service (Sprint 16 T-01; docs/architecture/admin-service.md): a `node:http`
 * server on 127.0.0.1:3100 behind nginx and Cloudflare Access. It owns the database writes that
 * happen at runtime (view counts, later the admin UI) and asks the RegenQueue for a regeneration
 * after changes. One JSON line per request goes to stdout (journald); no secrets are logged.
 *
 *   GALLERY_DB=/mnt/storage/lanbilder-app/db/gallery.sqlite node --no-warnings=ExperimentalWarning server.ts
 */
import * as http from 'node:http';
import * as path from 'node:path';
import type { Db } from './db/db.ts';
import { Router, HttpError, send, json, error, readJsonBody, clientIp, type Ctx, type Logger, type Reply } from './http.ts';
import { registerViewRoutes } from './routes/view.ts';
import { registerAuthRoutes } from './routes/auth.ts';
import { registerAdminRoutes } from './routes/admin.ts';
import { verifyAccessJwt, type AccessIdentity } from './auth/access.ts';
import { sessionSecret } from './auth/session.ts';
import type { AuthDeps, AuditSink } from './auth/guard.ts';
import { createAuditSink } from './audit.ts';

export const DEFAULT_PORT = 3100;
export const DEFAULT_HOST = '127.0.0.1';

export interface ServerOptions {
    db: Db;
    port?: number;
    host?: string;
    /** Log sink (default: one JSON line per entry on stdout). */
    log?: Logger;
    /** Registers additional routes (tests, later tickets). */
    routes?: (router: Router) => void;
    /** Cloudflare Access application (team domain + audience); without it and without verifyJwt the auth routes answer 503. */
    access?: { teamDomain: string; aud: string };
    /** Replaces the Access JWT check (tests, local development). */
    verifyJwt?: (token: string) => Promise<AccessIdentity>;
    /** Session cookie HMAC key (default: env SESSION_SECRET or the settings row). */
    sessionSecret?: Buffer;
    /** Audit sink (default: backend/audit.ts -> audit_log table + env AUDIT_LOG_FILE). */
    audit?: AuditSink;
    /** Clock (tests). */
    now?: () => Date;
}

/** The auth dependencies the routes share, from the server options. */
export function authDeps(opts: ServerOptions): AuthDeps {
    const access = opts.access;
    const verifyJwt = opts.verifyJwt
        ?? (access ? (token: string) => verifyAccessJwt(token, { teamDomain: access.teamDomain, aud: access.aud }) : async () => { throw new HttpError(503, 'access not configured'); });
    return {
        verifyJwt,
        secret: opts.sessionSecret ?? sessionSecret(opts.db),
        audit: opts.audit ?? createAuditSink(opts.db),
        now: opts.now,
    };
}

/** The default logger: `{"t":"...","msg":...}` lines on stdout. */
export const stdoutLogger: Logger = (entry) => {
    process.stdout.write(JSON.stringify({ t: new Date().toISOString(), ...entry }) + '\n');
};

/** Builds the router with the service's routes. Exported so tests can mount it without listening. */
export function buildRouter(opts: ServerOptions): Router {
    const router = new Router();
    router.get('/healthz', () => json(200, { ok: true }));
    registerViewRoutes(router);
    const deps = authDeps(opts);
    registerAuthRoutes(router, deps);
    registerAdminRoutes(router, deps);
    opts.routes?.(router);
    return router;
}

/** Creates the server and starts listening (port 0 picks a free port; wait for 'listening'). */
export function createServer(opts: ServerOptions): http.Server {
    const log = opts.log ?? stdoutLogger;
    const router = buildRouter(opts);
    const server = http.createServer((req, res) => {
        void handle(req, res);
    });

    async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const started = process.hrtime.bigint();
        const method = req.method ?? 'GET';
        const url = new URL(req.url ?? '/', 'http://local');
        const ip = clientIp(req);
        let reply: Reply;
        try {
            reply = await dispatch(req, res, url, ip);
        } catch (e) {
            if (e instanceof HttpError) {
                reply = error(e.status, e.message);
            } else {
                log({ level: 'error', msg: 'unhandled', method, path: url.pathname, err: e instanceof Error ? e.message : String(e) });
                reply = error(500, 'internal error');
            }
        }
        send(res, reply);
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        log({ method, path: url.pathname, status: reply.status, ms: Math.round(ms * 10) / 10, ip });
    }

    async function dispatch(req: http.IncomingMessage, res: http.ServerResponse, url: URL, ip: string): Promise<Reply> {
        const m = router.match(req.method ?? 'GET', url.pathname);
        if (!m) return error(404, 'not found');
        if ('allow' in m) return { status: 405, json: { error: 'method not allowed' }, headers: { allow: m.allow.join(', ') } };
        const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readJsonBody(req);
        const ctx: Ctx = { req, res, url, params: m.params, db: opts.db, ip, log, body };
        return m.handler(ctx);
    }

    server.listen(opts.port ?? DEFAULT_PORT, opts.host ?? DEFAULT_HOST);
    return server;
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
    const { openDb } = await import('./db/db.ts');
    const file = process.env.GALLERY_DB ?? path.join(import.meta.dirname, 'db', 'gallery.sqlite');
    const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;
    const host = process.env.HOST ?? DEFAULT_HOST;
    const db = openDb(file);
    const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
    const aud = process.env.CF_ACCESS_AUD;
    const access = teamDomain && aud ? { teamDomain, aud } : undefined;
    // Local development only: treat every request as this e-mail (no Access in front). Loopback only.
    const fakeEmail = process.env.DEV_FAKE_ACCESS_EMAIL;
    let verifyJwt: ServerOptions['verifyJwt'];
    if (fakeEmail) {
        if (host !== '127.0.0.1' && host !== '::1' && host !== 'localhost') throw new Error('DEV_FAKE_ACCESS_EMAIL only with HOST=127.0.0.1');
        stdoutLogger({ level: 'warn', msg: 'DEV_FAKE_ACCESS_EMAIL set: every request is treated as this user; never in production', email: fakeEmail });
        verifyJwt = async () => ({ email: fakeEmail.toLowerCase(), sub: 'dev', exp: Math.floor(Date.now() / 1000) + 3600 });
    } else if (!access) {
        stdoutLogger({ level: 'warn', msg: 'CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD not set: authenticated routes answer 503' });
    }
    const server = createServer({ db, port, host, access, verifyJwt });
    server.on('listening', () => stdoutLogger({ msg: 'listening', host, port, db: file }));
    const stop = (signal: string) => {
        stdoutLogger({ msg: 'stopping', signal });
        server.close(() => {
            db.close();
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => stop('SIGTERM'));
    process.on('SIGINT', () => stop('SIGINT'));
}

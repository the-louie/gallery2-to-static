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
import { registerAlbumRoutes } from './routes/albums.ts';
import { registerRegenRoutes } from './routes/regen.ts';
import { registerProfileRoutes } from './routes/profile.ts';
import { RegenQueue } from './regenQueue.ts';
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
    /** Where the originals live (Sprint 18 album/upload routes); default <repo>/frontend/public/g2data/albums. */
    albumsRoot?: string;
    /** Called after every content write (the RegenQueue's request). */
    onChange?: () => void;
    /** The regeneration queue (status route, manual run); the CLI builds one around generate.ts. */
    regen?: RegenQueue;
    /** Profile pictures (default: `avatars/` next to the database file). */
    avatarsDir?: string;
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
    const onChange = opts.onChange ?? (opts.regen ? () => opts.regen!.request() : () => {});
    registerAlbumRoutes(router, {
        auth: deps,
        albumsRoot: opts.albumsRoot ?? path.join(import.meta.dirname, '..', 'frontend', 'public', 'g2data', 'albums'),
        onChange,
    });
    registerRegenRoutes(router, deps, opts.regen, onChange);
    registerProfileRoutes(router, deps, { avatarsDir: opts.avatarsDir ?? path.join(path.dirname(opts.db.file === ':memory:' ? path.join(import.meta.dirname, 'db', 'x') : opts.db.file), 'avatars'), onChange });
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
        const multipart = (req.headers['content-type'] ?? '').startsWith('multipart/form-data');
        const body = req.method === 'GET' || req.method === 'HEAD' || multipart ? undefined : await readJsonBody(req);
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
    // `server.ts --invite-admin <email>`: the first admin (or another one), then exit
    const inviteAt = process.argv.indexOf('--invite-admin');
    if (inviteAt !== -1) {
        const { inviteUser } = await import('./auth/users.ts');
        const db0 = openDb(file);
        try {
            const u = inviteUser(db0, process.argv[inviteAt + 1] ?? '', 'admin');
            stdoutLogger({ msg: 'admin invited', id: u.id, email: u.email, db: file });
        } finally {
            db0.close();
        }
        process.exit(0);
    }
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
    // the regeneration queue: the changed branches + the published link tree, 5 s after the last change
    const { regenerateChanged } = await import('./generate.ts');
    const fsSync = await import('node:fs');
    const projectRoot = path.join(import.meta.dirname, '..');
    const config = JSON.parse(fsSync.readFileSync(path.join(import.meta.dirname, 'config.json'), 'utf-8')) as import('./types.ts').Config;
    const regen = new RegenQueue(async () => {
        const t0 = Date.now();
        await regenerateChanged(db, config, projectRoot, (l) => stdoutLogger({ level: 'warn', msg: l }));
        stdoutLogger({ msg: 'regenerated', ms: Date.now() - t0 });
    }, { onError: (err) => stdoutLogger({ level: 'error', msg: 'regen failed', error: err instanceof Error ? err.message : String(err) }) });
    const albumsRoot = path.join(projectRoot, config.albumsRoot ?? 'frontend/public/g2data/albums');
    const server = createServer({ db, port, host, access, verifyJwt, regen, albumsRoot });
    // expired sessions are dropped once an hour (otherwise only when touched)
    const { purgeExpiredSessions } = await import('./auth/session.ts');
    const purge = setInterval(() => { try { purgeExpiredSessions(db); } catch (e) { stdoutLogger({ level: 'warn', msg: 'session purge failed', error: e instanceof Error ? e.message : String(e) }); } }, 3600_000);
    purge.unref();
    server.on('listening', () => {
        const a = server.address();
        stdoutLogger({ msg: 'listening', host, port: a && typeof a === 'object' ? a.port : port, db: file });
    });
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

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
}

/** The default logger: `{"t":"...","msg":...}` lines on stdout. */
export const stdoutLogger: Logger = (entry) => {
    process.stdout.write(JSON.stringify({ t: new Date().toISOString(), ...entry }) + '\n');
};

/** Builds the router with the service's routes. Exported so tests can mount it without listening. */
export function buildRouter(opts: ServerOptions): Router {
    const router = new Router();
    router.get('/healthz', () => json(200, { ok: true }));
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
    const server = createServer({ db, port, host });
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

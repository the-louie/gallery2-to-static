/**
 * The small HTTP toolkit of the admin service (Sprint 16 T-01): a router with `:param` segments,
 * the request context handlers receive, reply helpers and the JSON body reader. No framework: the
 * service has a dozen routes and `node:http` is enough.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Db } from './db/db.ts';

/** What a handler returns; the server serialises it. `json` is omitted for 204/304. */
export interface Reply {
    status: number;
    json?: unknown;
    headers?: Record<string, string>;
}

/** One line of the service log (JSON on stdout). */
export type Logger = (entry: Record<string, unknown>) => void;

/** Everything a route handler gets. Auth (Sprint 16 T-04) adds `identity`, `user`, `session`. */
export interface Ctx {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    params: Record<string, string>;
    db: Db;
    /** The visitor address: `CF-Connecting-IP` through the tunnel, else the socket peer. */
    ip: string;
    log: Logger;
    /** Parsed JSON body (objects only); `undefined` for GET or an empty body. */
    body: unknown;
}

export type Handler = (ctx: Ctx) => Reply | Promise<Reply>;

export class HttpError extends Error {
    readonly status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

export const json = (status: number, body: unknown, headers?: Record<string, string>): Reply => ({ status, json: body, headers });
export const noContent = (headers?: Record<string, string>): Reply => ({ status: 204, headers });
export const error = (status: number, message: string, extra?: Record<string, unknown>): Reply => ({ status, json: { error: message, ...extra } });

interface Route {
    method: string;
    segments: string[];
    handler: Handler;
}

/** Exact-segment router: `/api/view/:id` matches `/api/view/42` with `params.id = '42'`. */
export class Router {
    private readonly routes: Route[] = [];

    add(method: string, path: string, handler: Handler): this {
        this.routes.push({ method: method.toUpperCase(), segments: path.split('/').filter(Boolean), handler });
        return this;
    }

    get(path: string, handler: Handler): this { return this.add('GET', path, handler); }
    post(path: string, handler: Handler): this { return this.add('POST', path, handler); }
    put(path: string, handler: Handler): this { return this.add('PUT', path, handler); }
    delete(path: string, handler: Handler): this { return this.add('DELETE', path, handler); }

    /** The handler and params for a request, `undefined` when the path is unknown and 405 info when only the method differs. */
    match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | { allow: string[] } | undefined {
        const parts = pathname.split('/').filter(Boolean);
        const allow: string[] = [];
        for (const r of this.routes) {
            const params = matchSegments(r.segments, parts);
            if (!params) continue;
            if (r.method === method.toUpperCase()) return { handler: r.handler, params };
            allow.push(r.method);
        }
        return allow.length ? { allow } : undefined;
    }
}

function matchSegments(pattern: string[], parts: string[]): Record<string, string> | undefined {
    if (pattern.length !== parts.length) return undefined;
    const params: Record<string, string> = {};
    for (let i = 0; i < pattern.length; i++) {
        const p = pattern[i];
        if (p.startsWith(':')) {
            const value = safeDecode(parts[i]);
            if (value === undefined) return undefined;
            params[p.slice(1)] = value;
        } else if (p !== parts[i]) {
            return undefined;
        }
    }
    return params;
}

function safeDecode(s: string): string | undefined {
    try {
        return decodeURIComponent(s);
    } catch {
        return undefined;
    }
}

export const MAX_BODY_BYTES = 64 * 1024;

/** Reads a JSON object body; 400 on bad JSON or a non-object, 413 when over MAX_BODY_BYTES. */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
        const b = chunk as Buffer;
        size += b.length;
        if (size > MAX_BODY_BYTES) throw new HttpError(413, 'body too large');
        chunks.push(b);
    }
    if (size === 0) return undefined;
    const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (type !== 'application/json') throw new HttpError(415, 'expected application/json');
    let parsed: unknown;
    try {
        parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw new HttpError(400, 'invalid JSON');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new HttpError(400, 'expected a JSON object');
    return parsed;
}

/** Writes a Reply. Every response carries no-store and nosniff; JSON bodies are UTF-8. */
export function send(res: ServerResponse, reply: Reply): void {
    const headers: Record<string, string> = {
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        ...reply.headers,
    };
    if (reply.json === undefined || reply.status === 204 || reply.status === 304) {
        res.writeHead(reply.status, headers);
        res.end();
        return;
    }
    const body = Buffer.from(JSON.stringify(reply.json), 'utf8');
    headers['content-type'] = 'application/json; charset=utf-8';
    headers['content-length'] = String(body.length);
    res.writeHead(reply.status, headers);
    res.end(body);
}

/** Strict positive-integer route parameter (same rule as the SPA's routeParams: /^\d+$/). */
export function intParam(value: string | undefined): number | undefined {
    if (value === undefined || !/^\d{1,15}$/.test(value)) return undefined;
    return Number(value);
}

/** The client address: the tunnel's `CF-Connecting-IP`, else the socket peer. */
export function clientIp(req: IncomingMessage): string {
    const cf = req.headers['cf-connecting-ip'];
    const h = Array.isArray(cf) ? cf[0] : cf;
    return (h && h.trim()) || req.socket.remoteAddress || '';
}

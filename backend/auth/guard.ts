/**
 * The authentication guard (Sprint 16 T-04): Access JWT -> our user -> session cookie -> TOTP.
 * `requireUser(deps, handler, { totp, admin })` wraps a route handler; the wrapped handler gets an
 * AuthCtx. Denials: 401 without a usable Access assertion, 403 for an identity that is not an
 * enabled user (or not admin where required), 401 `totp_required` until the session has passed the
 * TOTP step. Every denial is reported to the audit sink.
 */
import { HttpError, type Ctx, type Handler, type Reply } from '../http.ts';
import type { AccessIdentity } from './access.ts';
import { findUserByEmail, type User } from './users.ts';
import { createSession, getSession, sessionCookie, sessionIdFromCookie, type Session } from './session.ts';

/** One audit event; the sink (Sprint 16 T-06) writes it to the table and the JSONL file. */
export interface AuditEvent {
    userId: number | null;
    email: string | null;
    ip: string;
    action: string;
    target?: string | null;
    result: 'ok' | 'denied' | 'error';
    detail?: unknown;
}

export type AuditSink = (event: AuditEvent) => void;

export interface AuthDeps {
    verifyJwt: (token: string) => Promise<AccessIdentity>;
    secret: Buffer;
    audit: AuditSink;
    now?: () => Date;
}

export interface AuthCtx extends Ctx {
    identity: AccessIdentity;
    user: User;
    session: Session;
}

export interface GuardOptions {
    /** Require the TOTP step (default true). */
    totp?: boolean;
    /** Require role admin (default false). */
    admin?: boolean;
}

export const ACCESS_HEADER = 'cf-access-jwt-assertion';

/** An HttpError whose JSON body carries extra fields (the TOTP hint). */
export class AuthError extends HttpError {
    readonly extra: Record<string, unknown>;
    constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
        super(status, message);
        this.extra = extra;
    }
}

/**
 * Resolves identity, user and session for a request. Returns the auth context and, when a new
 * session was created, the Set-Cookie value to attach to the reply. Throws AuthError on denial.
 */
export async function authenticate(ctx: Ctx, deps: AuthDeps, opts: GuardOptions = {}): Promise<{ auth: AuthCtx; setCookie?: string }> {
    const now = deps.now ? deps.now() : new Date();
    const header = ctx.req.headers[ACCESS_HEADER];
    const token = Array.isArray(header) ? header[0] : header;
    if (!token) throw new AuthError(401, 'access assertion required');

    let identity: AccessIdentity;
    try {
        identity = await deps.verifyJwt(token);
    } catch (e) {
        if (e instanceof HttpError) throw e; // 503: Access not configured
        deps.audit({ userId: null, email: null, ip: ctx.ip, action: 'login', result: 'denied', detail: { reason: 'jwt', error: e instanceof Error ? e.message : String(e) } });
        throw new AuthError(401, 'access assertion invalid');
    }

    const user = findUserByEmail(ctx.db, identity.email);
    if (!user || user.enabled !== 1) {
        deps.audit({ userId: user?.id ?? null, email: identity.email, ip: ctx.ip, action: 'login', result: 'denied', detail: { reason: user ? 'disabled' : 'unknown' } });
        throw new AuthError(403, 'not an enabled user');
    }

    let session: Session | undefined;
    const sid = sessionIdFromCookie(ctx.req.headers.cookie, deps.secret);
    if (sid) {
        session = getSession(ctx.db, sid, now);
        if (session && session.user_id !== user.id) session = undefined; // the cookie belongs to someone else's login
    }
    let setCookie: string | undefined;
    if (!session) {
        session = createSession(ctx.db, user.id, now);
        setCookie = sessionCookie(session.id, deps.secret);
        deps.audit({ userId: user.id, email: user.email, ip: ctx.ip, action: 'session', result: 'ok', detail: { sub: identity.sub } });
    }

    const auth: AuthCtx = Object.assign(ctx, { identity, user, session });
    if (opts.totp !== false && session.totp_ok !== 1) {
        throw new AuthError(401, 'totp_required', { totpSetup: user.totp_verified_at === null, setCookie });
    }
    if (opts.admin && user.role !== 'admin') {
        deps.audit({ userId: user.id, email: user.email, ip: ctx.ip, action: 'authorize', target: `${ctx.req.method} ${ctx.url.pathname}`, result: 'denied', detail: { reason: 'admin required' } });
        throw new AuthError(403, 'admin required');
    }
    return { auth, setCookie };
}

/** Wraps a handler so it only runs for an authenticated (and, if asked, TOTP-passed / admin) user. */
export function requireUser(deps: AuthDeps, handler: (ctx: AuthCtx) => Reply | Promise<Reply>, opts: GuardOptions = {}): Handler {
    return async (ctx) => {
        let result: { auth: AuthCtx; setCookie?: string };
        try {
            result = await authenticate(ctx, deps, opts);
        } catch (e) {
            if (e instanceof AuthError) {
                const { setCookie, ...extra } = e.extra;
                const reply: Reply = { status: e.status, json: { error: e.message, ...extra } };
                if (typeof setCookie === 'string') reply.headers = { 'set-cookie': setCookie };
                return reply;
            }
            throw e;
        }
        const reply = await handler(result.auth);
        if (result.setCookie) reply.headers = { ...reply.headers, 'set-cookie': result.setCookie };
        return reply;
    };
}

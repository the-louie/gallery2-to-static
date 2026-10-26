/**
 * Login routes (Sprint 16 T-04): `GET /api/me`, the TOTP enrolment and verification, logout. The
 * Access login itself happens in Cloudflare; here a session is created on the first authenticated
 * request and unlocked by a TOTP code (every session, FUT-02 "Decisions").
 */
import type { Router } from '../http.ts';
import { json, noContent, error } from '../http.ts';
import { requireUser, type AuthDeps } from '../auth/guard.ts';
import { delegatedAlbumIds, publicUser } from '../auth/users.ts';
import { generateTotpSecret, matchTotp, otpauthUrl } from '../auth/totp.ts';
import { clearSessionCookie, deleteSession, getSession, sessionIdFromCookie, setSessionTotpOk } from '../auth/session.ts';

export const TOTP_ISSUER = 'lanbilder.se admin';
/** Consecutive failed codes before a user is locked out of TOTP for TOTP_LOCK_MS. */
export const TOTP_MAX_FAILURES = 5;
export const TOTP_LOCK_MS = 5 * 60 * 1000;

interface Lock {
    failures: number;
    until: number;
}

/** Per-user failure counter (in memory; a restart clears it, which is acceptable for 1e6-space codes with a 5-minute lock). */
export class TotpLockout {
    private readonly locks = new Map<number, Lock>();

    lockedUntil(userId: number, now: number): number | undefined {
        const l = this.locks.get(userId);
        return l && l.until > now ? l.until : undefined;
    }

    /** Records a failure; returns true when this failure locks the user. */
    fail(userId: number, now: number): boolean {
        const l = this.locks.get(userId) ?? { failures: 0, until: 0 };
        l.failures += 1;
        if (l.failures >= TOTP_MAX_FAILURES) {
            l.failures = 0;
            l.until = now + TOTP_LOCK_MS;
        }
        this.locks.set(userId, l);
        return l.until > now;
    }

    reset(userId: number): void {
        this.locks.delete(userId);
    }
}

export function registerAuthRoutes(router: Router, deps: AuthDeps, lockout: TotpLockout = new TotpLockout()): void {
    const now = () => (deps.now ? deps.now() : new Date());

    router.get('/api/me', requireUser(deps, (ctx) => json(200, {
        user: publicUser(ctx.user),
        role: ctx.user.role,
        albums: delegatedAlbumIds(ctx.db, ctx.user.id),
        session: { createdAt: ctx.session.created_at, expiresAt: ctx.session.expires_at },
    })));

    // First login: hand out a secret (shown as QR + text) until a code has verified it.
    router.post('/api/auth/totp/setup', requireUser(deps, (ctx) => {
        if (ctx.user.totp_verified_at !== null) {
            deps.audit({ userId: ctx.user.id, email: ctx.user.email, ip: ctx.ip, action: 'totp_setup', result: 'denied', detail: { reason: 'already enrolled' } });
            return error(409, 'totp already enrolled');
        }
        const secret = generateTotpSecret();
        ctx.db.run('UPDATE users SET totp_secret = ?, totp_last_step = NULL WHERE id = ?', secret, ctx.user.id);
        deps.audit({ userId: ctx.user.id, email: ctx.user.email, ip: ctx.ip, action: 'totp_setup', result: 'ok' });
        return json(200, { secret, otpauthUrl: otpauthUrl({ secret, account: ctx.user.email, issuer: TOTP_ISSUER }) });
    }, { totp: false }));

    router.post('/api/auth/totp/verify', requireUser(deps, (ctx) => {
        const body = (ctx.body ?? {}) as Record<string, unknown>;
        const code = typeof body.code === 'string' ? body.code : '';
        const t = now();
        const base = { userId: ctx.user.id, email: ctx.user.email, ip: ctx.ip, action: 'totp_verify' as const };
        if (lockout.lockedUntil(ctx.user.id, t.getTime()) !== undefined) {
            deps.audit({ ...base, result: 'denied', detail: { reason: 'locked' } });
            return error(429, 'too many failed codes, try again later');
        }
        if (!ctx.user.totp_secret) {
            deps.audit({ ...base, result: 'denied', detail: { reason: 'no secret' } });
            return error(409, 'totp not set up');
        }
        const step = matchTotp(ctx.user.totp_secret, code, { now: t.getTime() });
        const replay = step !== undefined && ctx.user.totp_last_step !== null && step <= ctx.user.totp_last_step;
        if (step === undefined || replay) {
            const locked = lockout.fail(ctx.user.id, t.getTime());
            deps.audit({ ...base, result: 'denied', detail: { reason: replay ? 'replay' : 'wrong code', locked } });
            return error(401, 'invalid code');
        }
        lockout.reset(ctx.user.id);
        const iso = t.toISOString();
        ctx.db.transaction(() => {
            ctx.db.run('UPDATE users SET totp_verified_at = COALESCE(totp_verified_at, ?), totp_last_step = ?, last_login_at = ? WHERE id = ?', iso, step, iso, ctx.user.id);
            setSessionTotpOk(ctx.db, ctx.session.id);
        });
        deps.audit({ ...base, result: 'ok', detail: { enrolled: ctx.user.totp_verified_at === null } });
        deps.audit({ userId: ctx.user.id, email: ctx.user.email, ip: ctx.ip, action: 'login', result: 'ok' });
        return json(200, { ok: true });
    }, { totp: false }));

    // Logout needs only the cookie: it must work even when the Access assertion has expired.
    router.post('/api/auth/logout', (ctx) => {
        const sid = sessionIdFromCookie(ctx.req.headers.cookie, deps.secret);
        const session = sid ? getSession(ctx.db, sid, now()) : undefined;
        if (session) {
            deleteSession(ctx.db, session.id);
            const u = ctx.db.get<{ email: string }>('SELECT email FROM users WHERE id = ?', session.user_id);
            deps.audit({ userId: session.user_id, email: u?.email ?? null, ip: ctx.ip, action: 'logout', result: 'ok' });
        }
        return noContent({ 'set-cookie': clearSessionCookie() });
    });
}

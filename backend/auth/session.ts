/**
 * Sessions (Sprint 16 T-04): a row in `sessions` (random 32-byte id, 12 h, totp_ok flag) and the
 * cookie `__Host-lbadmin` = `<id>.<hmac>` signed with the server secret (env SESSION_SECRET, else a
 * `settings` row generated on first start). The cookie is HttpOnly, Secure, SameSite=Strict,
 * Path=/; the `__Host-` prefix makes browsers enforce exactly that.
 */
import * as crypto from 'node:crypto';
import type { Db } from '../db/db.ts';

export const SESSION_COOKIE = '__Host-lbadmin';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SECRET_SETTING = 'session_secret';

export interface Session {
    id: string;
    user_id: number;
    created_at: string;
    expires_at: string;
    totp_ok: number;
}

/** The HMAC key: env SESSION_SECRET (any string of 32+ chars) or the settings row, created once. */
export function sessionSecret(db: Db, env: NodeJS.ProcessEnv = process.env): Buffer {
    const fromEnv = env.SESSION_SECRET;
    if (fromEnv !== undefined) {
        if (fromEnv.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
        return Buffer.from(fromEnv, 'utf8');
    }
    let stored = db.setting(SECRET_SETTING);
    if (!stored) {
        stored = crypto.randomBytes(32).toString('hex');
        db.setSetting(SECRET_SETTING, stored);
    }
    return Buffer.from(stored, 'hex');
}

function mac(id: string, secret: Buffer): string {
    return crypto.createHmac('sha256', secret).update(id).digest('base64url');
}

/** `<id>.<hmac>` for the cookie. */
export function signSessionId(id: string, secret: Buffer): string {
    return `${id}.${mac(id, secret)}`;
}

/** The session id from a signed cookie value, or undefined when the signature does not match. */
export function unsignSessionId(value: string, secret: Buffer): string | undefined {
    const dot = value.indexOf('.');
    if (dot < 0) return undefined;
    const id = value.slice(0, dot);
    const given = Buffer.from(value.slice(dot + 1), 'utf8');
    const expected = Buffer.from(mac(id, secret), 'utf8');
    if (!/^[0-9a-f]{64}$/.test(id) || given.length !== expected.length) return undefined;
    return crypto.timingSafeEqual(given, expected) ? id : undefined;
}

/** Cookie header -> name/value map (first occurrence wins). */
export function parseCookies(header: string | undefined): Record<string, string> {
    const out: Record<string, string> = {};
    if (!header) return out;
    for (const part of header.split(';')) {
        const eq = part.indexOf('=');
        if (eq < 0) continue;
        const name = part.slice(0, eq).trim();
        if (name && !(name in out)) out[name] = part.slice(eq + 1).trim();
    }
    return out;
}

/** The session id named by the request's cookie, after signature verification. */
export function sessionIdFromCookie(cookieHeader: string | undefined, secret: Buffer): string | undefined {
    const raw = parseCookies(cookieHeader)[SESSION_COOKIE];
    return raw ? unsignSessionId(raw, secret) : undefined;
}

/** Set-Cookie value for a session. */
export function sessionCookie(id: string, secret: Buffer): string {
    return `${SESSION_COOKIE}=${signSessionId(id, secret)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`;
}

/** Set-Cookie value that removes the session cookie. */
export function clearSessionCookie(): string {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function createSession(db: Db, userId: number, now: Date = new Date()): Session {
    const s: Session = {
        id: crypto.randomBytes(32).toString('hex'),
        user_id: userId,
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
        totp_ok: 0,
    };
    db.run('INSERT INTO sessions (id, user_id, created_at, expires_at, totp_ok) VALUES (?, ?, ?, ?, 0)', s.id, s.user_id, s.created_at, s.expires_at);
    return s;
}

/** The live session with this id; an expired one is deleted and not returned. */
export function getSession(db: Db, id: string, now: Date = new Date()): Session | undefined {
    const s = db.get<Session>('SELECT * FROM sessions WHERE id = ?', id);
    if (!s) return undefined;
    if (s.expires_at <= now.toISOString()) {
        db.run('DELETE FROM sessions WHERE id = ?', id);
        return undefined;
    }
    return s;
}

export function setSessionTotpOk(db: Db, id: string): void {
    db.run('UPDATE sessions SET totp_ok = 1 WHERE id = ?', id);
}

export function deleteSession(db: Db, id: string): void {
    db.run('DELETE FROM sessions WHERE id = ?', id);
}

/** Ends every session of a user (disable, TOTP reset). */
export function deleteUserSessions(db: Db, userId: number): number {
    return db.run('DELETE FROM sessions WHERE user_id = ?', userId).changes;
}

/** Removes expired rows; called now and then by the server. */
export function purgeExpiredSessions(db: Db, now: Date = new Date()): number {
    return db.run('DELETE FROM sessions WHERE expires_at <= ?', now.toISOString()).changes;
}

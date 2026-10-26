/**
 * Admin users (Sprint 16 T-04/T-05; TODO.md FUT-02/FUT-03 "Decisions"): invite-only accounts keyed
 * by lower-cased e-mail, role admin|user, an enabled flag, 0..n delegated albums whose whole
 * subtree the user may write. These functions do the database work; the routes in
 * routes/admin.ts enforce "admin only" and write the audit trail.
 */
import type { Db } from '../db/db.ts';
import { HttpError } from '../http.ts';
import { deleteUserSessions } from './session.ts';

export type Role = 'admin' | 'user';
export const ROLES: readonly Role[] = ['admin', 'user'];

export interface User {
    id: number;
    email: string;
    role: Role;
    enabled: number;
    nickname: string | null;
    full_name: string | null;
    show_full_name: number;
    totp_secret: string | null;
    totp_verified_at: string | null;
    totp_last_step: number | null;
    created_at: string;
    last_login_at: string | null;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]+$/;

/** The e-mail as stored: trimmed and lower-cased. */
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function findUserByEmail(db: Db, email: string): User | undefined {
    return db.get<User>('SELECT * FROM users WHERE email = ?', normalizeEmail(email));
}

export function findUserById(db: Db, id: number): User | undefined {
    return db.get<User>('SELECT * FROM users WHERE id = ?', id);
}

export function listUsers(db: Db): User[] {
    return db.all<User>('SELECT * FROM users ORDER BY id');
}

/** The album ids delegated to a user (not their descendants), ascending. */
export function delegatedAlbumIds(db: Db, userId: number): number[] {
    return db.all<{ album_id: number }>('SELECT album_id FROM user_albums WHERE user_id = ? ORDER BY album_id', userId).map((r) => r.album_id);
}

/** What the API returns about a user: never the TOTP secret. */
export function publicUser(u: User): Record<string, unknown> {
    return {
        id: u.id,
        email: u.email,
        role: u.role,
        enabled: u.enabled === 1,
        nickname: u.nickname,
        fullName: u.full_name,
        showFullName: u.show_full_name === 1,
        totpEnrolled: u.totp_verified_at !== null,
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
    };
}

/** Creates an account for an e-mail (400 on a bad e-mail or role, 409 when it exists). */
export function inviteUser(db: Db, email: string, role: Role): User {
    const e = normalizeEmail(email);
    if (!EMAIL_RE.test(e) || e.length > 254) throw new HttpError(400, 'invalid e-mail');
    if (!ROLES.includes(role)) throw new HttpError(400, 'role must be admin or user');
    if (findUserByEmail(db, e)) throw new HttpError(409, 'user exists');
    const id = db.run('INSERT INTO users (email, role) VALUES (?, ?)', e, role).lastInsertRowid;
    return findUserById(db, id)!;
}

function mustExist(db: Db, userId: number): User {
    const u = findUserById(db, userId);
    if (!u) throw new HttpError(404, 'user not found');
    return u;
}

/** Enables or disables a user; disabling ends their sessions. */
export function setEnabled(db: Db, userId: number, enabled: boolean): User {
    mustExist(db, userId);
    db.transaction(() => {
        db.run('UPDATE users SET enabled = ? WHERE id = ?', enabled ? 1 : 0, userId);
        if (!enabled) deleteUserSessions(db, userId);
    });
    return findUserById(db, userId)!;
}

/** Delegates an album (must exist and be an album) to a user; idempotent. */
export function delegate(db: Db, userId: number, albumId: number): void {
    mustExist(db, userId);
    const item = db.get<{ type: string }>('SELECT type FROM items WHERE id = ?', albumId);
    if (!item) throw new HttpError(404, 'album not found');
    if (item.type !== 'album') throw new HttpError(400, 'not an album');
    db.run('INSERT OR IGNORE INTO user_albums (user_id, album_id) VALUES (?, ?)', userId, albumId);
}

/** Removes a delegation; false when there was none. */
export function undelegate(db: Db, userId: number, albumId: number): boolean {
    mustExist(db, userId);
    return db.run('DELETE FROM user_albums WHERE user_id = ? AND album_id = ?', userId, albumId).changes > 0;
}

/** Forgets the user's TOTP secret (they enrol again at the next login) and ends their sessions. */
export function resetTotp(db: Db, userId: number): void {
    mustExist(db, userId);
    db.transaction(() => {
        db.run('UPDATE users SET totp_secret = NULL, totp_verified_at = NULL, totp_last_step = NULL WHERE id = ?', userId);
        deleteUserSessions(db, userId);
    });
}

const SQL_DELEGATED_ANCESTOR = `
    WITH RECURSIVE chain(id) AS (
        SELECT id FROM items WHERE id = ?
        UNION ALL
        SELECT i.parent_id FROM items i JOIN chain c ON i.id = c.id WHERE i.parent_id IS NOT NULL
    )
    SELECT 1 FROM user_albums ua JOIN chain ON ua.album_id = chain.id WHERE ua.user_id = ? LIMIT 1`;

/**
 * May the user write this item? Admins may write everything; a user may write an item when it or
 * one of its ancestors (items.parent_id chain) is delegated to them. Unknown items: false.
 */
export function canWrite(db: Db, userId: number, itemId: number): boolean {
    const u = findUserById(db, userId);
    if (!u || u.enabled !== 1) return false;
    if (u.role === 'admin') return true;
    return db.get(SQL_DELEGATED_ANCESTOR, itemId, userId) !== undefined;
}

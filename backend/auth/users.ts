/**
 * Admin users (Sprint 16 T-04/T-05; TODO.md FUT-02/FUT-03 "Decisions"): invite-only accounts keyed
 * by lower-cased e-mail, role admin|user, an enabled flag, 0..n delegated albums whose whole
 * subtree the user may write.
 */
import type { Db } from '../db/db.ts';

export type Role = 'admin' | 'user';

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

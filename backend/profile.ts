/**
 * User profiles (Sprint 18 T-05, FUT-03 decisions): nickname (public as "Owner:"), optional full
 * name shown instead when the user opts in, a picture stored by us and served only through the
 * admin API. The user's `owners` row (keyed by e-mail) mirrors nickname/full name/opt-in, so the
 * generator shows the right name; changing them marks the user's albums dirty (owners trigger).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';
import type { Db } from './db/db.ts';
import { HttpError } from './http.ts';
import type { User } from './auth/users.ts';
import { findUserById } from './auth/users.ts';

export interface Profile {
    nickname: string | null;
    fullName: string | null;
    showFullName: boolean;
    hasPicture: boolean;
    email: string;
    role: 'admin' | 'user';
}

export const PICTURE_SIZE = 256;
export const MAX_PICTURE_BYTES = 2 * 1024 * 1024;
const NICKNAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,38}[\p{L}\p{N}]$/u;

export function picturePath(avatarsDir: string, userId: number): string {
    return path.join(avatarsDir, `${userId}.jpg`);
}

export function getProfile(db: Db, user: User, avatarsDir: string): Profile {
    const u = findUserById(db, user.id) ?? user;
    return { nickname: u.nickname, fullName: u.full_name, showFullName: u.show_full_name === 1, hasPicture: fs.existsSync(picturePath(avatarsDir, u.id)), email: u.email, role: u.role };
}

/** Keeps the user's owners row (by e-mail) in step with the profile; creates it when missing. */
function syncOwner(db: Db, user: User): void {
    const u = findUserById(db, user.id)!;
    const nickname = u.nickname ?? u.email.split('@')[0];
    const hit = db.get<{ id: number; nickname: string }>('SELECT id, nickname FROM owners WHERE email = ?', u.email);
    if (hit) {
        db.run('UPDATE owners SET nickname = ?, full_name = ?, show_full_name = ? WHERE id = ?', nickname, u.full_name, u.show_full_name, hit.id);
    }
    // without a row yet nothing is owned; albums.ts ownerForUser creates it on the first write
}

export function updateProfile(db: Db, user: User, input: Record<string, unknown>, avatarsDir: string): Profile {
    const sets: string[] = []; const vals: Array<string | number | null> = [];
    if (input.nickname !== undefined) {
        if (typeof input.nickname !== 'string') throw new HttpError(400, 'nickname must be a string');
        const n = input.nickname.trim().normalize('NFC');
        if (!NICKNAME_RE.test(n)) throw new HttpError(400, 'nickname: 3–40 letters, digits, spaces, . _ -');
        const clash = db.get<{ id: number }>('SELECT id FROM users WHERE nickname = ? COLLATE NOCASE AND id <> ?', n, user.id)
            ?? db.get<{ id: number }>('SELECT id FROM owners WHERE nickname = ? COLLATE NOCASE AND (email IS NULL OR email <> ?)', n, user.email);
        if (clash) throw new HttpError(409, 'nickname taken');
        sets.push('nickname = ?'); vals.push(n);
    }
    if (input.fullName !== undefined) {
        if (input.fullName !== null && typeof input.fullName !== 'string') throw new HttpError(400, 'fullName must be a string or null');
        const f = input.fullName === null ? null : input.fullName.trim().normalize('NFC').slice(0, 120);
        sets.push('full_name = ?'); vals.push(f === '' ? null : f);
    }
    if (input.showFullName !== undefined) {
        if (typeof input.showFullName !== 'boolean') throw new HttpError(400, 'showFullName must be a boolean');
        sets.push('show_full_name = ?'); vals.push(input.showFullName ? 1 : 0);
    }
    if (sets.length) {
        try {
            db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, ...vals, user.id);
        } catch (e) {
            if (e instanceof Error && /nickname taken|UNIQUE/.test(e.message)) throw new HttpError(409, 'nickname taken');
            throw e;
        }
        syncOwner(db, user);
    }
    return getProfile(db, user, avatarsDir);
}

/** Stores the picture as a 256×256 JPEG (cover crop); the temp file is removed. */
export async function setPicture(db: Db, user: User, tmpFile: string, avatarsDir: string): Promise<Profile> {
    try {
        fs.mkdirSync(avatarsDir, { recursive: true });
        const out = picturePath(avatarsDir, user.id);
        await sharp(tmpFile, { failOn: 'error' }).rotate().resize(PICTURE_SIZE, PICTURE_SIZE, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(`${out}.tmp`);
        fs.renameSync(`${out}.tmp`, out);
    } catch (e) {
        throw new HttpError(400, `not a usable image: ${e instanceof Error ? e.message.slice(0, 80) : String(e)}`);
    } finally {
        try { fs.unlinkSync(tmpFile); } catch { /* moved or gone */ }
    }
    return getProfile(db, user, avatarsDir);
}

export function readPicture(avatarsDir: string, userId: number): Buffer | null {
    try { return fs.readFileSync(picturePath(avatarsDir, userId)); } catch { return null; }
}

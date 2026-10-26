/**
 * Album and photo writes for the admin service (Sprint 18 T-01/T-03; docs/architecture/admin-api.md).
 * Every function takes the open database and the acting user; authorisation (`canWrite`) is the
 * routes' job. Files are never deleted: a soft delete moves them under `<albumsRoot>/.trash/<id>/`
 * and a restore moves them back (data-master.md invariant 1).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Db } from './db/db.ts';
import { HttpError } from './http.ts';
import { getSegmentForAlbum } from './pathSegments.ts';
import { buildPathsFromPathComponent } from './pathResolution.ts';
import { photoSegment } from './importG2.ts';
import type { User } from './auth/users.ts';
import { canWrite } from './auth/users.ts';
import { albumSortSetting, sortChildren } from './tree.ts';

export interface AdminItem {
    id: number;
    type: 'album' | 'photo';
    parentId: number | null;
    position: number;
    title: string | null;
    description: string | null;
    summary: string | null;
    urlSegment: string;
    urlLocked: boolean;
    path: string;
    eventAt: number | null;
    width: number | null;
    height: number | null;
    owner: string | null;
    viewCount: number | null;
    hidden: boolean;
    deletedAt: string | null;
    /** changed since the last publish run of its album (dirty and not yet regenerated) */
    pending: boolean;
    highlightPhotoId: number | null;
    /** albums: the photo shown as the highlight (the chosen one, else the first photo) */
    currentHighlightPhotoId?: number | null;
    thumbnailUrl: string | null;
    childCount?: number;
    canWrite: boolean;
}

export interface AlbumView {
    album: AdminItem | null;
    breadcrumb: Array<{ id: number; title: string }>;
    children: AdminItem[];
}

interface Row {
    id: number; type: 'album' | 'photo'; parent_id: number | null; position: number; title: string | null;
    description: string | null; summary: string | null; path_component: string; url_segment: string; url_locked_at: string | null;
    event_at: number | null; width: number | null; height: number | null; owner_name: string | null; view_count: number | null;
    hidden: number; blocked: number; deleted_at: string | null; changed_at: string;
}

const SELECT = `SELECT i.id, i.type, i.parent_id, i.position, i.title, i.description, i.summary, i.path_component, i.url_segment,
    i.url_locked_at, i.event_at, i.width, i.height, CASE WHEN o.show_full_name = 1 AND o.full_name IS NOT NULL AND trim(o.full_name) <> '' THEN o.full_name ELSE o.nickname END AS owner_name, i.view_count, i.hidden, i.blocked, i.deleted_at, i.changed_at
    FROM items i LEFT JOIN owners o ON o.id = i.owner_id`;

export function getRow(db: Db, id: number): Row | undefined {
    return db.get<Row>(`${SELECT} WHERE i.id = ?`, id);
}

function mustGet(db: Db, id: number, type?: 'album' | 'photo'): Row {
    const r = getRow(db, id);
    if (!r || (type && r.type !== type)) throw new HttpError(404, `${type ?? 'item'} not found`);
    return r;
}

/** The root → … → item chain (the item included). */
export function chain(db: Db, id: number): Row[] {
    const out: Row[] = [];
    let cur: Row | undefined = getRow(db, id);
    while (cur) {
        out.unshift(cur);
        cur = cur.parent_id === null ? undefined : getRow(db, cur.parent_id);
    }
    return out;
}

/** Gallery 2 directory chain (path components) of an album: [] for the root. */
export function g2Chain(db: Db, albumId: number): string[] {
    return chain(db, albumId).map((r) => r.path_component).filter((p) => p !== '');
}

/** Public URL path of an item: albums '/a/b/', photos '/a/b/slug'. */
export function publicPath(db: Db, r: Row): string {
    const albums = chain(db, r.type === 'album' ? r.id : r.parent_id!).slice(1);
    const albumPath = albums.length ? `/${albums.map((a) => a.url_segment).join('/')}/` : '/';
    return r.type === 'album' ? albumPath : albumPath + photoSegment({ id: r.id, pathComponent: r.path_component, title: r.title });
}

function thumbnailUrl(db: Db, r: Row): string | null {
    const photo = r.type === 'photo' ? r : highlightPhoto(db, r.id);
    if (!photo || photo.parent_id === null) return null;
    const m = db.get<{ thumb_at: string | null; thumb_failed: number }>('SELECT thumb_at, thumb_failed FROM media WHERE item_id = ?', photo.id);
    if (!m || !m.thumb_at || m.thumb_failed) return null;
    const { thumbnailUrlPath } = buildPathsFromPathComponent([...g2Chain(db, photo.parent_id), photo.path_component], db.setting('thumb_prefix') ?? 't__');
    return `/g2data/thumbnails/${thumbnailUrlPath}`;
}

/** The chosen highlight if visible, else the first visible photo below the album (as the generator). */
function highlightPhoto(db: Db, albumId: number): Row | null {
    const chosen = db.get<{ photo_id: number }>('SELECT photo_id FROM highlights WHERE album_id = ?', albumId);
    if (chosen) {
        const p = getRow(db, chosen.photo_id);
        if (p && p.type === 'photo' && !p.deleted_at && !p.blocked) return p; // a hidden photo may be the chosen highlight (item 11); a blocked one never
    }
    const direct = db.get<Row>(`${SELECT} WHERE i.parent_id = ? AND i.type = 'photo' AND i.deleted_at IS NULL AND i.hidden = 0 ORDER BY i.position, i.id LIMIT 1`, albumId);
    if (direct) return direct;
    for (const sub of db.all<{ id: number }>(`SELECT id FROM items WHERE parent_id = ? AND type = 'album' AND deleted_at IS NULL AND hidden = 0 ORDER BY position, id`, albumId)) {
        const p = highlightPhoto(db, sub.id);
        if (p) return p;
    }
    return null;
}

/** Dirty album (itself, or the parent for a photo) whose mark is not newer than this item's last change. */
function isPending(db: Db, r: Row): boolean {
    const albumId = r.type === 'album' ? r.id : r.parent_id;
    if (albumId === null) return false;
    const d = db.get<{ since: string }>('SELECT since FROM dirty_albums WHERE album_id = ?', albumId);
    if (!d) return false;
    return r.type === 'album' || r.changed_at >= d.since;
}

export function toAdminItem(db: Db, r: Row, user: User): AdminItem {
    const chosen = r.type === 'album' ? db.get<{ photo_id: number }>('SELECT photo_id FROM highlights WHERE album_id = ? AND chosen = 1', r.id) : undefined;
    const item: AdminItem = {
        id: r.id, type: r.type, parentId: r.parent_id, position: r.position, title: r.title, description: r.description, summary: r.summary,
        urlSegment: r.url_segment, urlLocked: r.url_locked_at !== null, path: publicPath(db, r), eventAt: r.event_at, width: r.width, height: r.height,
        owner: r.owner_name, viewCount: r.view_count, hidden: r.hidden === 1, deletedAt: r.deleted_at, pending: isPending(db, r),
        highlightPhotoId: chosen ? chosen.photo_id : null, thumbnailUrl: thumbnailUrl(db, r), canWrite: canWrite(db, user.id, r.id),
    };
    if (r.type === 'album') {
        item.childCount = db.get<{ n: number }>('SELECT count(*) AS n FROM items WHERE parent_id = ? AND deleted_at IS NULL AND hidden = 0', r.id)!.n;
        item.currentHighlightPhotoId = highlightPhoto(db, r.id)?.id ?? null;
    }
    return item;
}

/** The album, its breadcrumb and its children (hidden/deleted ones only for a writer). */
export function getAlbumView(db: Db, albumId: number, user: User): AlbumView {
    const album = mustGet(db, albumId, 'album');
    const writer = canWrite(db, user.id, albumId);
    const rows = sortChildren(db.all<Row>(`${SELECT} WHERE i.parent_id = ?${writer ? '' : ' AND i.deleted_at IS NULL AND i.hidden = 0'}`, albumId), albumSortSetting(db));
    return {
        album: toAdminItem(db, album, user),
        breadcrumb: chain(db, albumId).map((r) => ({ id: r.id, title: r.parent_id === null ? (db.setting('site_name') ?? 'Home') : (r.title ?? `Album ${r.id}`) })),
        children: rows.map((r) => toAdminItem(db, r, user)),
    };
}

/** The entry view: the root for admins, the delegated albums for users. */
export function getRootView(db: Db, user: User): AlbumView {
    const rootId = Number(db.setting('root_id'));
    if (user.role === 'admin') return getAlbumView(db, rootId, user);
    const ids = db.all<{ album_id: number }>('SELECT album_id FROM user_albums WHERE user_id = ? ORDER BY album_id', user.id).map((r) => r.album_id);
    const children = ids.map((id) => getRow(db, id)).filter((r): r is Row => !!r).map((r) => toAdminItem(db, r, user));
    return { album: null, breadcrumb: [], children };
}

export interface AlbumInput { title: string; description?: string | null; summary?: string | null; eventAt?: number | null }

function cleanTitle(v: unknown, field = 'title'): string {
    if (typeof v !== 'string' || v.trim().length === 0) throw new HttpError(400, `${field} required`);
    if (v.length > 255) throw new HttpError(400, `${field} too long`);
    return v.trim().replace(/\0/g, '');
}

function optText(v: unknown, field: string, max = 65535): string | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v !== 'string') throw new HttpError(400, `${field} must be a string`);
    if (v.length > max) throw new HttpError(400, `${field} too long`);
    return v.replace(/\0/g, '');
}

function optTime(v: unknown): number | null | undefined {
    if (v === undefined) return undefined;
    if (v === null) return null;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 4102444800) throw new HttpError(400, 'eventAt must be unix seconds');
    return Math.floor(v);
}

/** The user's owner row (created on first write; email links it to the account). */
export function ownerForUser(db: Db, user: User): number {
    const hit = db.get<{ id: number }>('SELECT id FROM owners WHERE email = ?', user.email);
    if (hit) return hit.id;
    const base = (user.nickname ?? user.email.split('@')[0]).slice(0, 64) || 'user';
    let nickname = base;
    for (let n = 2; db.get('SELECT 1 FROM owners WHERE nickname = ?', nickname); n++) nickname = `${base}${n}`;
    return db.run('INSERT INTO owners (nickname, full_name, show_full_name, email) VALUES (?, ?, ?, ?)', nickname, user.full_name ?? null, user.show_full_name ?? 0, user.email).lastInsertRowid;
}

/** Creates a hidden album under `parentId`; its directory is made under albumsRoot. */
export function createAlbum(db: Db, parentId: number, input: Record<string, unknown>, user: User, albumsRoot: string): AdminItem {
    const parent = mustGet(db, parentId, 'album');
    if (parent.deleted_at) throw new HttpError(409, 'parent album is deleted');
    const title = cleanTitle(input.title);
    const description = optText(input.description, 'description') ?? null;
    const summary = optText(input.summary, 'summary', 1024) ?? null;
    const eventAt = optTime(input.eventAt) ?? Math.floor(Date.now() / 1000);
    const used = new Set(db.all<{ s: string }>(`SELECT url_segment AS s FROM items WHERE parent_id = ? AND type = 'album' UNION SELECT path_component FROM items WHERE parent_id = ?`, parentId, parentId).map((r) => r.s));
    const nextId = db.get<{ m: number }>('SELECT max(id) AS m FROM items')!.m + 1;
    const segment = getSegmentForAlbum(title, nextId, used);
    // the directory first: a failing mkdir (permissions, a read-only mount) leaves no row behind
    const dir = path.join(albumsRoot, ...g2Chain(db, parentId), segment);
    try {
        fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
        throw new HttpError(500, `cannot create the album directory: ${e instanceof Error ? e.message : String(e)}`);
    }
    const id = db.transaction(() => {
        const position = (db.get<{ m: number | null }>('SELECT max(position) AS m FROM items WHERE parent_id = ?', parentId)!.m ?? 0) + 1;
        const r = db.run(`INSERT INTO items (id, type, parent_id, position, title, description, summary, path_component, url_segment, event_at, owner_id, hidden)
            VALUES (?, 'album', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`, nextId, parentId, position, title, description, summary, segment, segment, eventAt, ownerForUser(db, user));
        return r.lastInsertRowid;
    });
    return toAdminItem(db, getRow(db, id)!, user);
}

/** Field edits; `urlSegment` only while unlocked unless `force` (admin), which records the old path for redirects. */
export function updateAlbum(db: Db, albumId: number, input: Record<string, unknown>, user: User): AdminItem {
    const r = mustGet(db, albumId, 'album');
    const sets: string[] = []; const vals: Array<string | number | null> = [];
    if (input.title !== undefined) { sets.push('title = ?'); vals.push(cleanTitle(input.title)); }
    for (const [key, col, max] of [['description', 'description', 65535], ['summary', 'summary', 1024]] as const) {
        const v = optText(input[key], key, max);
        if (v !== undefined) { sets.push(`${col} = ?`); vals.push(v); }
    }
    const t = optTime(input.eventAt);
    if (t !== undefined) { sets.push('event_at = ?'); vals.push(t); }
    if (input.position !== undefined) {
        if (typeof input.position !== 'number' || !Number.isInteger(input.position)) throw new HttpError(400, 'position must be an integer');
        sets.push('position = ?'); vals.push(input.position);
    }
    if (input.urlSegment !== undefined) {
        if (r.parent_id === null) throw new HttpError(400, 'the root has no url segment');
        const seg = cleanTitle(input.urlSegment, 'urlSegment').toLowerCase();
        if (!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(seg)) throw new HttpError(400, 'urlSegment: a-z, 0-9, - and _ only');
        if (r.url_locked_at && user.role !== 'admin') throw new HttpError(409, 'url segment is locked (the album has been public)');
        if (r.url_locked_at && input.force !== true) throw new HttpError(409, 'url segment is locked; send force: true to change it (old links get a redirect)');
        if (db.get("SELECT 1 FROM items WHERE parent_id = ? AND type = 'album' AND url_segment = ? AND id <> ?", r.parent_id, seg, r.id)) throw new HttpError(409, 'url segment taken among the siblings');
        if (r.url_locked_at) {
            // keep the old public path reachable (legacy_paths maps a Gallery 2 path; here the old clean path)
            db.run('INSERT INTO legacy_paths (g2_path, item_id) VALUES (?, ?) ON CONFLICT(g2_path) DO UPDATE SET item_id = excluded.item_id', `clean:${publicPath(db, r)}`, r.id);
        }
        sets.push('url_segment = ?'); vals.push(seg);
    }
    if (sets.length) db.run(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, ...vals, albumId);
    return toAdminItem(db, getRow(db, albumId)!, user);
}

export function setHidden(db: Db, id: number, hidden: boolean, user: User): AdminItem {
    const r = mustGet(db, id);
    if (r.parent_id === null) throw new HttpError(400, 'the root cannot be hidden');
    db.run('UPDATE items SET hidden = ? WHERE id = ?', hidden ? 1 : 0, id);
    return toAdminItem(db, getRow(db, id)!, user);
}

function trashDir(albumsRoot: string, id: number): string {
    return path.join(albumsRoot, '.trash', String(id));
}

/** Soft delete: `deleted_at` on the item (the subtree follows by the parent chain) and its files moved to .trash/<id>/. */
export function softDelete(db: Db, id: number, user: User, albumsRoot: string): void {
    const r = mustGet(db, id);
    if (r.parent_id === null) throw new HttpError(400, 'the root cannot be deleted');
    if (r.deleted_at) throw new HttpError(409, 'already deleted');
    const now = new Date().toISOString();
    db.run('UPDATE items SET deleted_at = ? WHERE id = ?', now, id);
    const src = r.type === 'album' ? path.join(albumsRoot, ...g2Chain(db, id)) : path.join(albumsRoot, ...g2Chain(db, r.parent_id), r.path_component);
    const dst = path.join(trashDir(albumsRoot, id), r.type === 'album' ? '' : r.path_component);
    if (fs.existsSync(src)) {
        fs.mkdirSync(trashDir(albumsRoot, id), { recursive: true });
        fs.renameSync(src, dst);
    }
    void user;
}

/** Restore (admin): `deleted_at` cleared, files moved back from .trash/<id>/. */
export function restore(db: Db, id: number, user: User, albumsRoot: string): AdminItem {
    const r = mustGet(db, id);
    if (!r.deleted_at) throw new HttpError(409, 'not deleted');
    const parent = r.parent_id === null ? undefined : getRow(db, r.parent_id);
    if (parent?.deleted_at) throw new HttpError(409, 'restore the parent album first');
    db.run('UPDATE items SET deleted_at = NULL WHERE id = ?', id);
    const dst = r.type === 'album' ? path.join(albumsRoot, ...g2Chain(db, id)) : path.join(albumsRoot, ...g2Chain(db, r.parent_id!), r.path_component);
    const src = path.join(trashDir(albumsRoot, id), r.type === 'album' ? '' : r.path_component);
    if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.renameSync(src, dst);
        if (r.type === 'photo') fs.rmdirSync(trashDir(albumsRoot, id), { recursive: false });
    }
    return toAdminItem(db, getRow(db, id)!, user);
}

/** Photo field edits (title, description, eventAt). */
export function updatePhoto(db: Db, photoId: number, input: Record<string, unknown>, user: User): AdminItem {
    mustGet(db, photoId, 'photo');
    const sets: string[] = []; const vals: Array<string | number | null> = [];
    if (input.title !== undefined) { sets.push('title = ?'); vals.push(cleanTitle(input.title)); }
    const d = optText(input.description, 'description');
    if (d !== undefined) { sets.push('description = ?'); vals.push(d); }
    const t = optTime(input.eventAt);
    if (t !== undefined) { sets.push('event_at = ?'); vals.push(t); }
    if (sets.length) db.run(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, ...vals, photoId);
    return toAdminItem(db, getRow(db, photoId)!, user);
}

/** The album's direct children in the given order (every current child must be listed exactly once). */
export function reorderChildren(db: Db, albumId: number, ids: unknown): void {
    mustGet(db, albumId, 'album');
    if (!Array.isArray(ids) || !ids.every((v) => Number.isInteger(v))) throw new HttpError(400, 'ids must be an array of integers');
    const current = db.all<{ id: number }>('SELECT id FROM items WHERE parent_id = ? AND deleted_at IS NULL ORDER BY position, id', albumId).map((r) => r.id);
    const given = ids as number[];
    if (given.length !== current.length || new Set(given).size !== given.length || !given.every((id) => current.includes(id))) {
        throw new HttpError(400, 'ids must list every child of the album exactly once');
    }
    db.transaction(() => {
        given.forEach((id, i) => db.run('UPDATE items SET position = ? WHERE id = ?', i + 1, id));
    });
}

/** Chosen highlight: a visible photo below the album; null returns to the default (first photo). */
export function setHighlight(db: Db, albumId: number, photoId: unknown, user: User): AdminItem {
    mustGet(db, albumId, 'album');
    if (photoId === null) {
        db.run('DELETE FROM highlights WHERE album_id = ?', albumId);
    } else {
        if (!Number.isInteger(photoId)) throw new HttpError(400, 'photoId must be an integer or null');
        const photo = getRow(db, photoId as number);
        if (!photo || photo.type !== 'photo' || photo.deleted_at || photo.blocked) throw new HttpError(404, 'photo not found');
        if (!chain(db, photo.id).some((r) => r.id === albumId)) throw new HttpError(400, 'the photo is not inside the album');
        db.run('INSERT INTO highlights (album_id, photo_id, chosen) VALUES (?, ?, 1) ON CONFLICT(album_id) DO UPDATE SET photo_id = excluded.photo_id, chosen = 1', albumId, photo.id);
    }
    return toAdminItem(db, getRow(db, albumId)!, user);
}

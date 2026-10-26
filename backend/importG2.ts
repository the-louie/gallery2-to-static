/**
 * Importer: Gallery 2 → the SQLite data master (FUT-01, Sprint 15 T-03;
 * docs/architecture/data-master.md). Walks the Gallery 2 tree through the same reader the one-shot
 * extractor used (`ExtractionSql`) and writes items, owners, highlights, legacy paths and settings.
 * Nothing is dropped: albums and photos on the ignore lists become `hidden = 1, blocked = 1` rows (blocked:
 * never served, never a highlight; hidden alone is the operator's choice and may be a highlight). Idempotent:
 * a second run updates the imported columns and leaves `deleted_at`, `view_count` additions and
 * anything the admin changed alone (see `importItem`).
 *
 * CLI: `node --no-warnings=ExperimentalWarning importG2.ts [<gallery.sqlite>]` with config.json as
 * the extractor (MYSQL_* overrides); default file `db/gallery.sqlite` next to this script.
 */
import * as path from 'node:path';
import type { Child, Config } from './types.ts';
import type { ExtractionSql } from './extract.ts';
import { getSegmentForAlbum, titleToSegment } from './pathSegments.ts';
import type { Db } from './db/db.ts';

export interface ImportOptions {
    sql: ExtractionSql;
    config: Config;
    db: Db;
    log?: (line: string) => void;
}

export interface ImportResult {
    rootId: number;
    albums: number;
    photos: number;
    hidden: number;
    owners: number;
    highlights: number;
}

function idSet(raw: Array<string | number> | null | undefined): Set<number> {
    const out = new Set<number>();
    for (const v of raw ?? []) {
        const n = typeof v === 'number' ? v : Number(String(v).trim());
        if (Number.isInteger(n)) out.add(n);
    }
    return out;
}

/** The photo's URL slug: file name without extension, dots → `_` (frontend `getPhotoSlug`). */
export function photoSegment(child: { id: number; pathComponent: string | null; title: string | null }): string {
    const name = (child.pathComponent ?? '').split('/').pop() || child.title || '';
    const slug = titleToSegment(name.replace(/\.[^.]*$/, '')).replace(/\./g, '_');
    return slug === '' ? `photo_${child.id}` : slug;
}

/**
 * Gallery 2 holds a few titles made of NUL bytes (42 photos, 2026-10-26); SQLite cuts a TEXT at the
 * first NUL, so they are stripped here and an emptied text becomes null (the SPA shows no title).
 */
export function cleanText(text: string | null | undefined): string | null {
    if (text == null) return null;
    const t = text.replace(/\0/g, '');
    return t.length === 0 && text.length > 0 ? null : t;
}

/** Owner rows are keyed by the display name the extractor resolved (no Gallery 2 user ids in the JSON). */
function ownerId(db: Db, cache: Map<string, number>, name: string | null | undefined): number | null {
    const n = name?.trim();
    if (!n) return null;
    const hit = cache.get(n);
    if (hit !== undefined) return hit;
    const row = db.get<{ id: number }>('SELECT id FROM owners WHERE nickname = ?', n);
    const id = row ? row.id : db.run('INSERT INTO owners (nickname) VALUES (?)', n).lastInsertRowid;
    cache.set(n, id);
    return id;
}

const UPSERT_ITEM = `INSERT INTO items (id, type, parent_id, position, order_weight, title, description, summary, path_component, url_segment,
        event_at, width, height, thumb_width, thumb_height, owner_id, view_count, hidden, blocked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        type = excluded.type, parent_id = excluded.parent_id, position = excluded.position, order_weight = excluded.order_weight,
        title = excluded.title, description = excluded.description, summary = excluded.summary, path_component = excluded.path_component,
        url_segment = excluded.url_segment, event_at = excluded.event_at, width = excluded.width, height = excluded.height,
        thumb_width = excluded.thumb_width, thumb_height = excluded.thumb_height, owner_id = excluded.owner_id,
        view_count = CASE WHEN COALESCE(excluded.view_count, -1) > COALESCE(items.view_count, -1) THEN excluded.view_count ELSE items.view_count END,
        hidden = CASE WHEN excluded.blocked = 1 THEN 1 ELSE items.hidden END,
        blocked = excluded.blocked,
        changed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

/**
 * Imports the whole tree below the root. Runs inside one transaction: either everything or nothing.
 */
export async function importG2(options: ImportOptions): Promise<ImportResult> {
    const { sql, config, db } = options;
    const log = options.log ?? (() => {});
    const ignoreAlbums = idSet(config.ignoreAlbums);
    const ignoreItems = idSet(config.ignoreItems);
    const rootId = config.rootId ?? await sql.getRootAlbumId();
    const rootInfo = await sql.getRootAlbumInfo(rootId);
    const owners = new Map<string, number>();
    const result: ImportResult = { rootId, albums: 0, photos: 0, hidden: 0, owners: 0, highlights: 0 };

    // Gather the tree first (async), write it in one synchronous transaction afterwards.
    type Row = { child: Child; parentId: number | null; position: number; segment: string; g2Path: string; hidden: boolean };
    const rows: Row[] = [];
    const highlights: Array<[number, number]> = [];
    const walk = async (albumId: number, g2Path: string, hiddenAbove: boolean): Promise<void> => {
        const children = await sql.getChildren(albumId);
        const used = new Set<string>();
        let position = 0;
        for (const child of children) {
            position += 1;
            const isAlbum = child.type === 'GalleryAlbumItem';
            const own = isAlbum ? ignoreAlbums.has(child.id) : ignoreItems.has(child.id);
            const hidden = hiddenAbove || own;
            const segment = isAlbum ? getSegmentForAlbum(child.title, child.id, used) : photoSegment(child);
            const childG2Path = g2Path === '' ? (child.pathComponent ?? '') : `${g2Path}/${child.pathComponent ?? ''}`;
            rows.push({ child, parentId: albumId, position, segment, g2Path: childG2Path, hidden });
            if (isAlbum) {
                const h = await sql.getAlbumHighlight(child.id);
                if (h) highlights.push([child.id, h.photoId]);
                await walk(child.id, childG2Path, hidden);
            }
        }
    };
    const rootInfoAlbum = await sql.getAlbumInfo(rootId);
    const rootHighlight = await sql.getAlbumHighlight(rootId);
    if (rootHighlight) highlights.push([rootId, rootHighlight.photoId]);
    await walk(rootId, '', ignoreAlbums.has(rootId));
    log(`gathered ${rows.length} items below root ${rootId}`);

    db.transaction(() => {
        // root
        // the root row carries the album info (as the extractor's metadata); the raw root info goes to settings (index.json)
        db.run(UPSERT_ITEM, rootId, 'album', null, 0, null, rootInfoAlbum.albumTitle, rootInfoAlbum.albumDescription,
            null, '', '', rootInfoAlbum.albumTimestamp, null, null, null, null, ownerId(db, owners, rootInfoAlbum.ownerName), null,
            ignoreAlbums.has(rootId) ? 1 : 0, ignoreAlbums.has(rootId) ? 1 : 0);
        db.run('INSERT INTO legacy_paths (g2_path, item_id) VALUES (?, ?) ON CONFLICT(g2_path) DO UPDATE SET item_id = excluded.item_id', '', rootId);
        for (const r of rows) {
            const c = r.child;
            const isAlbum = c.type === 'GalleryAlbumItem';
            db.run(UPSERT_ITEM, c.id, isAlbum ? 'album' : 'photo', r.parentId, r.position, c.order ?? null, cleanText(c.title), cleanText(c.description), cleanText(c.summary),
                c.pathComponent ?? '', r.segment, c.timestamp, c.width, c.height, c.thumb_width, c.thumb_height, ownerId(db, owners, c.ownerName),
                c.viewCount ?? null, r.hidden ? 1 : 0, r.hidden ? 1 : 0);
            if (isAlbum) {
                result.albums += 1;
                db.run('INSERT INTO legacy_paths (g2_path, item_id) VALUES (?, ?) ON CONFLICT(g2_path) DO UPDATE SET item_id = excluded.item_id', r.g2Path, c.id);
            } else {
                result.photos += 1;
            }
            if (r.hidden) result.hidden += 1;
        }
        const known = new Set(rows.map((r) => r.child.id));
        known.add(rootId);
        for (const [albumId, photoId] of highlights) {
            if (!known.has(photoId)) continue; // a highlight outside the exported tree: the generator falls back
            db.run('INSERT INTO highlights (album_id, photo_id, chosen) VALUES (?, ?, 1) ON CONFLICT(album_id) DO UPDATE SET photo_id = excluded.photo_id, chosen = 1', albumId, photoId);
            result.highlights += 1;
        }
        db.setSetting('root_id', String(rootId));
        db.setSetting('site_name', rootInfo.title ?? '');
        db.setSetting('site_description', rootInfo.description ?? '');
        db.setSetting('root_timestamp', rootInfo.timestamp == null ? null : String(rootInfo.timestamp));
        const override = config.layoutHeaderDescriptionOverride;
        db.setSetting('site_description_override', typeof override === 'string' && override.trim() ? override.trim() : null);
        db.setSetting('thumb_prefix', config.thumbPrefix ?? 't__');
        db.setSetting('imported_at', new Date().toISOString());
    });
    result.owners = db.get<{ n: number }>('SELECT count(*) AS n FROM owners')!.n;
    log(`imported ${result.albums} albums, ${result.photos} photos (${result.hidden} hidden), ${result.owners} owners, ${result.highlights} highlights`);
    return result;
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
    const [{ default: mysql }, { default: sqlUtils }, fs, { openDb }] = await Promise.all([
        import('mysql2/promise'), import('./sqlUtils.ts'), import('node:fs/promises'), import('./db/db.ts'),
    ]);
    const config = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'config.json'), 'utf-8')) as Config;
    if (process.env.MYSQL_HOST) config.mysqlSettings.host = process.env.MYSQL_HOST;
    if (process.env.MYSQL_USER) config.mysqlSettings.user = process.env.MYSQL_USER;
    if (process.env.MYSQL_PASSWORD) config.mysqlSettings.password = process.env.MYSQL_PASSWORD;
    if (process.env.MYSQL_DATABASE) config.mysqlSettings.database = process.env.MYSQL_DATABASE;
    if (process.env.MYSQL_PORT) config.mysqlSettings.port = parseInt(process.env.MYSQL_PORT, 10);
    const file = process.argv[2] ?? path.join(import.meta.dirname, 'db', 'gallery.sqlite');
    const connection = await mysql.createConnection(config.mysqlSettings);
    const db = openDb(file);
    try {
        const r = await importG2({ sql: sqlUtils(connection, config), config, db, log: (l) => console.log(l) });
        console.log(`done: ${file}`, r);
    } finally {
        db.close();
        await connection.end();
    }
}

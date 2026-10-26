/**
 * Generator: the SQLite data master → the static files the SPA reads (FUT-01, Sprint 15 T-04;
 * docs/architecture/data-master.md "Generation contract"). Produces the same files, with the same
 * fields, as the one-shot extractor did (`extract.ts`): `data/<albumId>.json` per exported album,
 * `data/index.json`, `data/legacy.json`, `data/search/index.json`. Thumbnail/resize facts come from
 * the `media` table (Sprint 15 T-05); without a row a photo has no thumbnail size and no resize.
 *
 * An album is exported when it is not hidden, not deleted, has no hidden/deleted ancestor, and has
 * at least one visible photo below it (as the extractor's albumsWithImageDescendants).
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Db } from './db/db.ts';
import type { AlbumFile, AlbumMetadata, BreadcrumbItem, Child } from './types.ts';
import { buildPathsFromPathComponent } from './pathResolution.ts';
import { decodeHtmlEntities } from '../shared/decodeHtmlEntities.ts';
import { Tree, type ItemRow } from './tree.ts';
import { updateMedia, type MediaOptions } from './media.ts';

export { Tree, type ItemRow, type MediaRow } from './tree.ts';

const ROOT_ALBUM_CHILD_DESCRIPTION_MAX_WORDS = 20;

function firstPhoto(list: ItemRow[]): ItemRow | null {
    return list.find((c) => c.type === 'photo') ?? null;
}

/** The first visible photo below an album: direct photos first, then sub-albums in order (as the extractor). */
function firstPhotoRecursive(t: Tree, albumId: number): { photo: ItemRow; album: number } | null {
    const kids = t.kids(albumId);
    const p = firstPhoto(kids);
    if (p) return { photo: p, album: albumId };
    for (const c of kids) {
        if (c.type === 'album' && c.path_component !== '') {
            const r = firstPhotoRecursive(t, c.id);
            if (r) return r;
        }
    }
    return null;
}

/** Gallery 2's / the user's chosen highlight when its photo and the albums between are visible. */
function chosenHighlight(t: Tree, albumId: number): { photo: ItemRow; album: number } | null {
    const photoId = t.highlights.get(albumId);
    if (photoId === undefined) return null;
    const photo = t.byId.get(photoId) ?? t.hiddenPhotos.get(photoId);
    if (!photo || photo.type !== 'photo' || !photo.path_component || photo.parent_id === null) return null;
    // the photo must sit in the album or below it
    for (let a = t.byId.get(photo.parent_id); a; a = a.parent_id === null ? undefined : t.byId.get(a.parent_id)) {
        if (a.id === albumId) return { photo, album: photo.parent_id };
        if (!a.path_component) return null;
    }
    return null;
}

function highlightPaths(t: Tree, r: { photo: ItemRow; album: number }): { urlPath: string; thumbnailUrlPath: string } {
    return buildPathsFromPathComponent([...t.g2Chain(r.album), r.photo.path_component], t.thumbPrefix);
}

function truncateDescriptionToWords(text: string, maxWords: number): string {
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
}

/** The Child as sqlUtils.getChildren produced it, before the extractor's additions. */
function baseChild(r: ItemRow): Child {
    const c: Child = {
        id: r.id,
        type: r.type === 'album' ? 'GalleryAlbumItem' : 'GalleryPhotoItem',
        hasChildren: r.type === 'album',
        title: r.title,
        description: r.description,
        pathComponent: r.path_component === '' ? null : r.path_component,
        timestamp: r.event_at,
        width: r.width,
        height: r.height,
        thumb_width: r.thumb_width,
        thumb_height: r.thumb_height,
        ownerName: r.owner_name,
        summary: r.summary,
    };
    if (r.order_weight != null) c.order = r.order_weight;
    if (r.view_count != null) c.viewCount = r.view_count;
    return c;
}

/** Descendant counts of an exported album: visible photos below, and photos + exported albums below. */
function counts(t: Tree, albumId: number, memo: Map<number, { images: number; items: number }>): { images: number; items: number } {
    const hit = memo.get(albumId);
    if (hit) return hit;
    let images = 0, items = 0;
    for (const c of t.listed(albumId)) {
        if (c.type === 'photo') { images += 1; items += 1; }
        else { const sub = counts(t, c.id, memo); images += sub.images; items += 1 + sub.items; }
    }
    const out = { images, items };
    memo.set(albumId, out);
    return out;
}

export interface SearchIndexItem {
    id: number;
    type: 'GalleryAlbumItem' | 'GalleryPhotoItem';
    title: string;
    description?: string;
    parentId?: number;
    pathComponent: string;
    ancestors?: string;
    path?: string;
}

/** Builds one exported album's file (and its children's search entries). */
export function buildAlbumFile(t: Tree, albumId: number, memo = new Map<number, { images: number; items: number }>()): { file: AlbumFile; search: SearchIndexItem[]; legacyPhotos: Array<[number, number]> } {
    const album = t.byId.get(albumId)!;
    const isRoot = albumId === t.rootId;
    const chain = t.g2Chain(albumId);
    const uipath = t.uipath(albumId);
    const currentPath = t.urlPath(albumId);
    const search: SearchIndexItem[] = [];
    const legacyPhotos: Array<[number, number]> = [];

    const children: Child[] = t.listed(albumId).map((r) => {
        if (r.type === 'photo') {
            legacyPhotos.push([r.id, albumId]);
            const fullChain = [...chain, r.path_component];
            const { urlPath, thumbnailUrlPath } = buildPathsFromPathComponent(fullChain, t.thumbPrefix);
            const m = t.media.get(r.id);
            const thumbFailed = Boolean(m?.thumb_failed);
            const hasThumb = Boolean(m?.thumb_at) && !thumbFailed;
            return {
                ...baseChild(r),
                thumb_width: hasThumb ? m!.thumb_w : null,
                thumb_height: hasThumb ? m!.thumb_h : null,
                ...(m?.resize_at && !thumbFailed ? { resizeUrlPath: urlPath } : {}),
                ...(thumbFailed ? { thumbnailMissing: true } : {}),
                pathComponent: fullChain.join('/'),
                urlPath,
                thumbnailUrlPath,
                highlightThumbnailUrlPath: thumbnailUrlPath,
            };
        }
        // a sub-album
        const childPath = t.urlPath(r.id);
        const chosen = chosenHighlight(t, r.id);
        const hl = chosen ?? firstPhotoRecursive(t, r.id);
        const hlPaths = hl ? highlightPaths(t, hl) : null;
        const highlightSpread: { highlightImageUrl?: string; highlightThumbnailUrlPath?: string } = {};
        if (hlPaths) { highlightSpread.highlightImageUrl = hlPaths.urlPath; highlightSpread.highlightThumbnailUrlPath = hlPaths.thumbnailUrlPath; }
        const c = counts(t, r.id, memo);
        const countSpread = { totalDescendantImageCount: c.images, totalDescendantCount: c.items };
        const childCount = t.listed(r.id).length;
        const direct = firstPhoto(t.kids(r.id));
        search.push(searchItem(t, r, albumId, uipath, childPath));
        if (direct) {
            const { thumbnailUrlPath } = buildPathsFromPathComponent([...chain, r.path_component, direct.path_component], t.thumbPrefix);
            // the extractor copied the first photo's Gallery 2 derivative size here, not the generated thumbnail's
            return {
                ...baseChild(r),
                path: childPath,
                thumbnailPathComponent: [...chain, r.path_component, direct.path_component].join('/'),
                thumbnailPhotoId: direct.id,
                thumbnailWidth: direct.thumb_width,
                thumbnailHeight: direct.thumb_height,
                thumbnailUrlPath: chosen && hlPaths ? hlPaths.thumbnailUrlPath : thumbnailUrlPath,
                ...highlightSpread,
                ...countSpread,
                childCount,
            };
        }
        return {
            ...baseChild(r),
            path: childPath,
            ...(chosen && hlPaths ? { thumbnailUrlPath: hlPaths.thumbnailUrlPath } : {}),
            ...highlightSpread,
            ...countSpread,
            childCount,
        };
    });

    const childrenForFile = isRoot
        ? children.map((c) => c.type === 'GalleryAlbumItem' && c.description != null && c.description.trim().length > 0
            ? { ...c, description: truncateDescriptionToWords(c.description, ROOT_ALBUM_CHILD_DESCRIPTION_MAX_WORDS) }
            : c)
        : children;

    const breadcrumbPath: BreadcrumbItem[] = [...t.ancestors(albumId), album].map((a) => ({
        id: a.id,
        title: a.id === t.rootId ? 'Home' : (a.title ?? `Album ${a.id}`),
        path: t.urlPath(a.id),
    }));
    const metadata: AlbumMetadata = {
        albumId,
        albumTitle: album.title,
        albumDescription: album.description,
        albumTimestamp: album.event_at,
        ownerName: album.owner_name,
        breadcrumbPath,
    };
    const own = chosenHighlight(t, albumId) ?? firstPhotoRecursive(t, albumId);
    if (own) metadata.highlightImageUrl = highlightPaths(t, own).urlPath;
    if (!isRoot) {
        const c = counts(t, albumId, memo);
        metadata.totalDescendantImageCount = c.images;
        metadata.totalDescendantCount = c.items;
    }
    return { file: { metadata, children: childrenForFile }, search, legacyPhotos };
}

function searchItem(t: Tree, album: ItemRow, parentId: number, parentUipath: string[], childPath: string): SearchIndexItem {
    const item: SearchIndexItem = { id: album.id, type: 'GalleryAlbumItem', title: album.title ?? '', pathComponent: album.path_component };
    if (album.description && album.description.trim().length > 0) item.description = album.description;
    item.parentId = parentId;
    if (parentUipath.length > 1) item.ancestors = parentUipath.slice(1).join('/');
    item.path = childPath;
    return item;
}

export interface GenerateAllResult {
    /** album files written */
    albums: number;
    /** album files moved to .removed/ (no longer exported) */
    removed: number;
    pathIndex: Map<string, number>;
}

/** Atomic file write: temp file in the same directory, then rename. */
async function writeAtomic(file: string, text: string): Promise<void> {
    const tmp = `${file}.tmp-${process.pid}`;
    await fs.writeFile(tmp, text);
    await fs.rename(tmp, file);
}

/**
 * Writes the static files into `dataDir`. With `onlyAlbums` (the changed-branch run) only those
 * album files are written and album files of albums that stopped being exported are moved to
 * `.removed/`; index.json, legacy.json and the search index are always rebuilt from the whole
 * tree (they are cheap and must stay complete).
 */
export async function generateAll(db: Db, dataDir: string, now: Date = new Date(), onlyAlbums?: Set<number>): Promise<GenerateAllResult> {
    const t = new Tree(db);
    await fs.mkdir(path.join(dataDir, 'search'), { recursive: true });
    let removed = 0;
    if (onlyAlbums) {
        for (const id of onlyAlbums) {
            if (t.exported.has(id)) continue;
            const file = path.join(dataDir, `${id}.json`);
            try {
                await fs.mkdir(path.join(dataDir, '.removed'), { recursive: true });
                await fs.rename(file, path.join(dataDir, '.removed', `${id}.json`));
                removed += 1;
            } catch (err) {
                if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
            }
        }
    }
    const memo = new Map<number, { images: number; items: number }>();
    const search = new Map<number, SearchIndexItem>();
    const pathIndex = new Map<string, number>();
    const legacyAlbums = new Map<string, string>();
    const legacyPhotos = new Map<number, number>();
    const legacyG2 = new Map<number, string>(db.all<{ g2_path: string; item_id: number }>('SELECT g2_path, item_id FROM legacy_paths').map((r) => [r.item_id, r.g2_path]));
    let albums = 0;
    for (const id of t.exported) {
        const { file, search: s, legacyPhotos: lp } = buildAlbumFile(t, id, memo);
        if (!onlyAlbums || onlyAlbums.has(id)) {
            await writeAtomic(path.join(dataDir, `${id}.json`), JSON.stringify(file, null, 2));
            albums += 1;
            // the album has been public: its URL segment is locked from now on (invariant 4)
            db.run('UPDATE items SET url_locked_at = ? WHERE id = ? AND url_locked_at IS NULL', now.toISOString(), id);
        }
        for (const item of s) search.set(item.id, item);
        for (const [photo, album] of lp) legacyPhotos.set(photo, album);
        const p = t.urlPath(id);
        pathIndex.set(p, id);
        legacyAlbums.set(legacyG2.get(id) ?? t.g2Chain(id).join('/'), p);
    }
    const items = [...search.values()].sort((a, b) => a.id - b.id);
    await writeAtomic(path.join(dataDir, 'search', 'index.json'), JSON.stringify({ version: 1, generatedAt: now.toISOString(), itemCount: items.length, items }, null, 2));
    const override = db.setting('site_description_override');
    const rootTs = db.setting('root_timestamp');
    const indexData = {
        rootAlbumId: t.rootId,
        rootAlbumFile: `${t.rootId}.json`,
        siteName: db.setting('site_name'),
        siteDescription: decodeHtmlEntities(override && override.trim() ? override.trim() : (db.setting('site_description') ?? '')),
        generatedAt: now.toISOString(),
        pathIndex: Object.fromEntries([...pathIndex.entries()]),
        metadata: {
            rootAlbumId: t.rootId,
            rootAlbumTitle: db.setting('site_name'),
            rootAlbumDescription: db.setting('site_description'),
            rootAlbumTimestamp: rootTs === null ? null : Number(rootTs),
        },
    };
    await writeAtomic(path.join(dataDir, 'index.json'), JSON.stringify(indexData, null, 2));
    await writeAtomic(path.join(dataDir, 'legacy.json'), JSON.stringify({ albums: Object.fromEntries(legacyAlbums), photoAlbum: Object.fromEntries(legacyPhotos) }));
    return { albums, removed, pathIndex };
}

/**
 * Folds the view counter's pending counts into the items (FUT-01 decision: counters keep counting);
 * the update trigger marks the albums dirty, so the next changed run shows the new numbers.
 * Returns the number of items updated.
 */
export function foldViewCounts(db: Db): number {
    return db.transaction(() => {
        const n = db.run(`UPDATE items SET view_count = COALESCE(view_count, 0) + (SELECT pending FROM view_counts v WHERE v.item_id = items.id)
            WHERE id IN (SELECT item_id FROM view_counts WHERE pending > 0)`).changes;
        db.run("UPDATE view_counts SET pending = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE pending > 0");
        return n;
    });
}

/** The dirty albums plus every ancestor up to the root (counts and highlights change up the chain). */
export function dirtyWithAncestors(db: Db, ids?: number[]): Set<number> {
    const dirty = ids ?? db.all<{ album_id: number }>('SELECT album_id FROM dirty_albums').map((r) => r.album_id);
    const out = new Set<number>();
    for (const id of dirty) {
        let cur: number | null = id;
        while (cur !== null && !out.has(cur)) {
            out.add(cur);
            const row: { parent_id: number | null } | undefined = db.get<{ parent_id: number | null }>('SELECT parent_id FROM items WHERE id = ?', cur);
            cur = row ? row.parent_id : null;
        }
    }
    return out;
}

/**
 * The changed-branch run: derivatives for the dirty albums' photos, their album files (+ancestors),
 * the always-complete index/legacy/search files, then the dirty rows that existed at the start are
 * cleared and the run recorded, in one transaction. Returns null when nothing was dirty.
 */
export interface ChangedOptions {
    /**
     * Operator, 2026-10-26: publish only albums whose last change (the album row or any child) is
     * older than this, so a finished album goes out while someone keeps working on another one.
     * 0 = everything dirty (the nightly run, "Publish now").
     */
    settleMs?: number;
}

export async function generateChanged(db: Db, dataDir: string, media?: Omit<MediaOptions, 'albumIds'>, now: Date = new Date(), opts: ChangedOptions = {}): Promise<(GenerateAllResult & { dirty: number; waiting: number }) | null> {
    const settle = opts.settleMs ?? 0;
    const cutoff = new Date(now.getTime() - settle).toISOString();
    const all = db.all<{ album_id: number; since: string }>('SELECT album_id, since FROM dirty_albums');
    const dirtyRows = settle > 0
        ? all.filter((r) => !db.get('SELECT 1 FROM items i WHERE (i.id = ? OR i.parent_id = ?) AND i.changed_at > ?', r.album_id, r.album_id, cutoff))
        : all;
    const waiting = all.length - dirtyRows.length;
    if (dirtyRows.length === 0) return null;
    const albums = dirtyWithAncestors(db, dirtyRows.map((r) => r.album_id));
    const runId = db.run("INSERT INTO generation_runs (mode, started_at, albums) VALUES ('changed', ?, ?)", now.toISOString(), albums.size).lastInsertRowid;
    if (media) await updateMedia(db, { ...media, albumIds: albums });
    const result = await generateAll(db, dataDir, now, albums);
    db.transaction(() => {
        for (const r of dirtyRows) db.run('DELETE FROM dirty_albums WHERE album_id = ? AND since = ?', r.album_id, r.since);
        db.run('UPDATE generation_runs SET finished_at = ?, ok = 1 WHERE id = ?', new Date().toISOString(), runId);
    });
    return { ...result, dirty: dirtyRows.length, waiting };
}

/** The paths and image options a run needs, from config.json (relative to the project root). */
export function runtimePaths(config: import('./types.ts').Config, projectRoot: string, log?: (l: string) => void): {
    dataDir: string; albumsRoot: string; publishedRoot: string; media: MediaOptions;
} {
    const albumsRoot = path.join(projectRoot, config.albumsRoot ?? 'frontend/public/g2data/albums');
    return {
        dataDir: path.join(projectRoot, 'data'),
        albumsRoot,
        publishedRoot: path.join(projectRoot, config.publishedAlbumsRoot ?? 'frontend/public/g2data/published'),
        media: {
            albumsRoot,
            thumbnailsRoot: path.join(projectRoot, config.thumbnailsRoot ?? 'frontend/public/g2data/thumbnails'),
            resizedRoot: path.join(projectRoot, config.resizedRoot ?? 'frontend/public/g2data/resized'),
            thumbOptions: { maxWidth: config.thumbnailMaxWidth ?? 400, maxHeight: config.thumbnailMaxHeight ?? 400, quality: config.thumbnailQuality ?? 80 },
            resizeOptions: { maxWidth: config.resizeMaxSize ?? 1024, maxHeight: config.resizeMaxSize ?? 1024, quality: config.resizeQuality ?? 85 },
            ...(config.upscaleMinSize ? { upscale: { minSize: config.upscaleMinSize, quality: config.resizeQuality ?? 85 } } : {}),
            concurrency: config.thumbnailConcurrency ?? 5,
            log,
        },
    };
}

/** What the admin service runs after a change: the changed branches, then the published link tree. */
export async function regenerateChanged(db: Db, config: import('./types.ts').Config, projectRoot: string, log?: (l: string) => void, opts: ChangedOptions = {}): Promise<{ dirty: number; waiting: number } | null> {
    const { publishImages } = await import('./publishImages.ts');
    const p = runtimePaths(config, projectRoot, log);
    const r = await generateChanged(db, p.dataDir, p.media, new Date(), opts);
    if (r) await publishImages(p.dataDir, p.albumsRoot, p.publishedRoot);
    return r ? { dirty: r.dirty, waiting: r.waiting } : null;
}

// CLI: node --no-warnings=ExperimentalWarning generate.ts --all | --changed | images [--db <file>] [--no-images] [--no-publish]
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
    const [{ openDb }, { publishImages }, { runStamp, prepareStagingDir, promoteStagingDir }, fsSync] = await Promise.all([
        import('./db/db.ts'), import('./publishImages.ts'), import('./outputDir.ts'), import('node:fs'),
    ]);
    const args = process.argv.slice(2);
    const mode = args.find((a) => a === '--all' || a === '--changed' || a === 'images' || a === '--fold-views');
    if (!mode) {
        console.error('usage: generate.ts --all | --changed | --fold-views | images [--db <file>] [--no-images] [--no-publish]');
        process.exit(2);
    }
    const projectRoot = path.join(import.meta.dirname, '..');
    const config = JSON.parse(fsSync.readFileSync(path.join(import.meta.dirname, 'config.json'), 'utf-8')) as import('./types.ts').Config;
    const dbFile = args.includes('--db') ? args[args.indexOf('--db') + 1]! : (process.env.GALLERY_DB ?? path.join(import.meta.dirname, 'db', 'gallery.sqlite'));
    const db = openDb(dbFile);
    const { dataDir, albumsRoot, publishedRoot, media } = runtimePaths(config, projectRoot, (l) => console.warn(l));
    const t0 = Date.now();
    try {
        if (mode === 'images') {
            const r = await updateMedia(db, media);
            console.log('media:', r);
        } else if (mode === '--all') {
            const stamp = runStamp();
            const runId = db.run("INSERT INTO generation_runs (mode, started_at) VALUES ('all', ?)", new Date().toISOString()).lastInsertRowid;
            if (!args.includes('--no-images')) console.log('media:', await updateMedia(db, media));
            const staging = await prepareStagingDir(dataDir, stamp);
            const r = await generateAll(db, staging);
            const previous = await promoteStagingDir(dataDir, staging, stamp);
            db.transaction(() => {
                db.run('DELETE FROM dirty_albums');
                db.run('UPDATE generation_runs SET finished_at = ?, ok = 1, albums = ? WHERE id = ?', new Date().toISOString(), r.albums, runId);
            });
            console.log(`generated ${r.albums} albums into ${dataDir}${previous ? ` (previous kept as ${previous})` : ''}`);
        } else {
            if (mode === '--fold-views') console.log(`view counts folded into ${foldViewCounts(db)} items`);
            const r = await generateChanged(db, dataDir, args.includes('--no-images') ? undefined : media);
            console.log(r ? `changed: ${r.dirty} dirty albums -> ${r.albums} files written, ${r.removed} removed` : 'nothing changed');
        }
        if (mode !== 'images' && !args.includes('--no-publish')) {
            const p = await publishImages(dataDir, albumsRoot, publishedRoot);
            console.log(`published ${p.linked} images${p.previous ? ` (previous tree kept as ${p.previous})` : ''}${p.missing.length ? `, ${p.missing.length} missing` : ''}`);
        }
        console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    } finally {
        db.close();
    }
}

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
import { cleanup_uipathcomponent } from './cleanupUipath.ts';
import { appendSegment } from './pathSegments.ts';
import { decodeHtmlEntities } from '../shared/decodeHtmlEntities.ts';

const ROOT_ALBUM_CHILD_DESCRIPTION_MAX_WORDS = 20;

/** An `items` row as the generator reads it. */
export interface ItemRow {
    id: number;
    type: 'album' | 'photo';
    parent_id: number | null;
    position: number;
    order_weight: number | null;
    title: string | null;
    description: string | null;
    summary: string | null;
    path_component: string;
    url_segment: string;
    event_at: number | null;
    width: number | null;
    height: number | null;
    thumb_width: number | null;
    thumb_height: number | null;
    owner_name: string | null;
    view_count: number | null;
    hidden: number;
    deleted_at: string | null;
}

export interface MediaRow {
    item_id: number;
    thumb_w: number | null;
    thumb_h: number | null;
    thumb_at: string | null;
    resize_w: number | null;
    resize_h: number | null;
    resize_at: string | null;
    thumb_failed?: number | null;
}

/** The whole visible tree, loaded once per run. */
export class Tree {
    readonly byId = new Map<number, ItemRow>();
    readonly children = new Map<number, ItemRow[]>();
    readonly media = new Map<number, MediaRow>();
    readonly highlights = new Map<number, number>();
    /** albums with at least one visible photo below them */
    readonly exported = new Set<number>();
    readonly rootId: number;
    readonly thumbPrefix: string;

    constructor(db: Db) {
        this.rootId = Number(db.setting('root_id'));
        this.thumbPrefix = db.setting('thumb_prefix') ?? 't__';
        const rows = db.all<ItemRow>(`SELECT i.*, o.nickname AS owner_name FROM items i LEFT JOIN owners o ON o.id = i.owner_id
            WHERE i.deleted_at IS NULL AND i.hidden = 0 ORDER BY i.parent_id, i.position, i.id`);
        for (const r of rows) this.byId.set(r.id, r);
        // a visible item needs a visible parent chain
        const visible = (r: ItemRow): boolean => r.parent_id === null ? r.id === this.rootId : (this.byId.has(r.parent_id) && visible(this.byId.get(r.parent_id)!));
        for (const r of rows) {
            if (!visible(r)) { this.byId.delete(r.id); continue; }
        }
        for (const r of this.byId.values()) {
            if (r.parent_id !== null && this.byId.has(r.parent_id)) {
                const list = this.children.get(r.parent_id) ?? [];
                list.push(r);
                this.children.set(r.parent_id, list);
            }
        }
        for (const list of this.children.values()) list.sort((a, b) => a.position - b.position || a.id - b.id);
        for (const m of db.all<MediaRow>('SELECT * FROM media')) this.media.set(m.item_id, m);
        for (const h of db.all<{ album_id: number; photo_id: number }>('SELECT album_id, photo_id FROM highlights')) this.highlights.set(h.album_id, h.photo_id);
        const mark = (id: number): boolean => {
            let any = false;
            for (const c of this.kids(id)) {
                if (c.type === 'photo') any = true;
                else if (c.path_component !== '' && mark(c.id)) any = true;
            }
            if (any) this.exported.add(id);
            return any;
        };
        if (this.byId.has(this.rootId)) mark(this.rootId);
    }

    kids(id: number): ItemRow[] { return this.children.get(id) ?? []; }
    /** Visible photos and exported sub-albums, in order: what the album's file lists. */
    listed(id: number): ItemRow[] { return this.kids(id).filter((c) => c.type === 'photo' || (c.path_component !== '' && this.exported.has(c.id))); }
    /** root → … → item (excluding the root for `chain`), as the ancestor albums */
    ancestors(id: number): ItemRow[] {
        const out: ItemRow[] = [];
        for (let r = this.byId.get(id); r && r.parent_id !== null; r = this.byId.get(r.parent_id)) out.unshift(this.byId.get(r.parent_id)!);
        return out;
    }
    /** Gallery 2 path components from the root's child down to the album (the root has ''). */
    g2Chain(albumId: number): string[] {
        return [...this.ancestors(albumId).slice(1), this.byId.get(albumId)!].map((a) => a.path_component).filter((p) => p !== '');
    }
    /** The extractor's `uipath` of an album: [''] for the root, then cleanup(title ?? pathComponent) per album below. */
    uipath(albumId: number): string[] {
        return ['', ...[...this.ancestors(albumId).slice(1), ...(albumId === this.rootId ? [] : [this.byId.get(albumId)!])].map((a) => cleanup_uipathcomponent(a.title ?? a.path_component ?? ''))];
    }
    /** Clean URL path of an exported album ('/' for the root). */
    urlPath(albumId: number): string {
        if (albumId === this.rootId) return '/';
        let p = '/';
        for (const a of [...this.ancestors(albumId).slice(1), this.byId.get(albumId)!]) p = appendSegment(p, a.url_segment);
        return p;
    }
}

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
    const photo = t.byId.get(photoId);
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
    albums: number;
    pathIndex: Map<string, number>;
}

/** Writes every exported album, index.json, legacy.json and the search index into `dataDir`. */
export async function generateAll(db: Db, dataDir: string, now: Date = new Date()): Promise<GenerateAllResult> {
    const t = new Tree(db);
    await fs.mkdir(path.join(dataDir, 'search'), { recursive: true });
    const memo = new Map<number, { images: number; items: number }>();
    const search = new Map<number, SearchIndexItem>();
    const pathIndex = new Map<string, number>();
    const legacyAlbums = new Map<string, string>();
    const legacyPhotos = new Map<number, number>();
    const legacyG2 = new Map<number, string>(db.all<{ g2_path: string; item_id: number }>('SELECT g2_path, item_id FROM legacy_paths').map((r) => [r.item_id, r.g2_path]));
    let albums = 0;
    for (const id of t.exported) {
        const { file, search: s, legacyPhotos: lp } = buildAlbumFile(t, id, memo);
        await fs.writeFile(path.join(dataDir, `${id}.json`), JSON.stringify(file, null, 2));
        for (const item of s) search.set(item.id, item);
        for (const [photo, album] of lp) legacyPhotos.set(photo, album);
        const p = t.urlPath(id);
        pathIndex.set(p, id);
        legacyAlbums.set(legacyG2.get(id) ?? t.g2Chain(id).join('/'), p);
        albums += 1;
    }
    const items = [...search.values()].sort((a, b) => a.id - b.id);
    await fs.writeFile(path.join(dataDir, 'search', 'index.json'), JSON.stringify({ version: 1, generatedAt: now.toISOString(), itemCount: items.length, items }, null, 2));
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
    await fs.writeFile(path.join(dataDir, 'index.json'), JSON.stringify(indexData, null, 2));
    await fs.writeFile(path.join(dataDir, 'legacy.json'), JSON.stringify({ albums: Object.fromEntries(legacyAlbums), photoAlbum: Object.fromEntries(legacyPhotos) }));
    return { albums, pathIndex };
}

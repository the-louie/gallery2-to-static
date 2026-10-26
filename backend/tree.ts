/**
 * The visible gallery tree as the generator and the media step read it from the data master
 * (FUT-01). Loaded once per run.
 */
import type { Db } from './db/db.ts';
import { cleanup_uipathcomponent } from './cleanupUipath.ts';
import { appendSegment } from './pathSegments.ts';

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
    thumb_failed: number;
    published_at: string | null;
    file_size: number | null;
    file_mtime: number | null;
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
        const rows = db.all<ItemRow>(`SELECT i.*, CASE WHEN o.show_full_name = 1 AND o.full_name IS NOT NULL AND trim(o.full_name) <> '' THEN o.full_name ELSE o.nickname END AS owner_name FROM items i LEFT JOIN owners o ON o.id = i.owner_id
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


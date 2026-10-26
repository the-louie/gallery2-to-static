/**
 * Derivatives from the data master (FUT-01, Sprint 15 T-05): thumbnails and 1024px resizes for the
 * visible photos, recorded in the `media` table so the generator can emit `thumb_width`,
 * `resizeUrlPath` and `thumbnailMissing` exactly as the extractor did, and so unchanged files are
 * skipped on the next run (same size and mtime, derivative present).
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { Db } from './db/db.ts';
import { Tree, type ItemRow } from './generate.ts';
import { generateThumbnail, readThumbnailSize, type ThumbnailOptions } from './generateThumbnail.ts';
import { buildPathsFromPathComponent } from './pathResolution.ts';

export interface MediaOptions {
    albumsRoot: string;
    thumbnailsRoot: string;
    resizedRoot: string;
    thumbOptions: ThumbnailOptions;
    resizeOptions: ThumbnailOptions;
    concurrency?: number;
    /** only photos in these albums (default: every exported album) */
    albumIds?: Iterable<number>;
    log?: (line: string) => void;
}

export interface MediaResult {
    photos: number;
    generated: number;
    skipped: number;
    resized: number;
    failed: number;
    missing: number;
}

const NOW = () => new Date().toISOString();

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>): Promise<void> {
    let i = 0;
    const workers = Array.from({ length: Math.max(1, n) }, async () => {
        while (i < items.length) await fn(items[i++]!);
    });
    await Promise.all(workers);
}

/** One photo: thumbnail (+ resize when the photo is larger than the resize size), media row updated. */
async function processPhoto(db: Db, t: Tree, photo: ItemRow, o: MediaOptions, r: MediaResult): Promise<void> {
    const chain = [...t.g2Chain(photo.parent_id!), photo.path_component];
    const { urlPath, thumbnailUrlPath } = buildPathsFromPathComponent(chain, t.thumbPrefix);
    const source = path.join(o.albumsRoot, urlPath);
    const thumbPath = path.join(o.thumbnailsRoot, thumbnailUrlPath);
    const resizePath = path.join(o.resizedRoot, urlPath);
    let stat: { size: number; mtimeMs: number } | null = null;
    try { stat = await fs.stat(source); } catch { stat = null; }
    const prev = t.media.get(photo.id);
    r.photos += 1;
    if (!stat) {
        r.missing += 1;
        o.log?.(`missing source image: ${source}`);
        db.run(`INSERT INTO media (item_id, thumb_w, thumb_h, thumb_at, resize_w, resize_h, resize_at, thumb_failed, file_size, file_mtime)
            VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, NULL)
            ON CONFLICT(item_id) DO UPDATE SET thumb_w = NULL, thumb_h = NULL, thumb_at = NULL, resize_w = NULL, resize_h = NULL, resize_at = NULL, thumb_failed = 0, file_size = NULL, file_mtime = NULL`, photo.id);
        return;
    }
    const mtime = Math.floor(stat.mtimeMs);
    const unchanged = prev && prev.file_size === stat.size && (prev as { file_mtime?: number | null }).file_mtime === mtime && (prev.thumb_at || prev.thumb_failed);
    if (unchanged) {
        // the derivative must still exist on disk
        const thumbThere = prev!.thumb_failed ? true : await fs.access(thumbPath).then(() => true, () => false);
        const resizeThere = prev!.resize_at ? await fs.access(resizePath).then(() => true, () => false) : true;
        if (thumbThere && resizeThere) { r.skipped += 1; return; }
    }
    let thumb: { width: number; height: number } | null = null;
    let failed = false;
    try {
        const res = await generateThumbnail(source, thumbPath, o.thumbOptions);
        if (res === 'generated' || res === 'skipped') {
            thumb = await readThumbnailSize(thumbPath);
            if (res === 'generated') r.generated += 1; else r.skipped += 1;
        } else if (res === 'invalid') {
            failed = true;
        }
    } catch (err) {
        o.log?.(`thumbnail failed, photo kept: ${source}: ${err instanceof Error ? err.message : String(err)}`);
        failed = true;
    }
    if (failed) r.failed += 1;
    let resize: { width: number; height: number } | null = null;
    if (!failed && Math.max(photo.width ?? 0, photo.height ?? 0) > o.resizeOptions.maxWidth) {
        try {
            const res = await generateThumbnail(source, resizePath, o.resizeOptions);
            if (res === 'generated' || res === 'skipped') {
                resize = await readThumbnailSize(resizePath);
                if (res === 'generated') r.resized += 1;
            } else {
                o.log?.(`no resize (${res}), photo page uses the original: ${source}`);
            }
        } catch (err) {
            o.log?.(`resize failed, photo page uses the original: ${source}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    db.run(`INSERT INTO media (item_id, thumb_w, thumb_h, thumb_at, resize_w, resize_h, resize_at, thumb_failed, file_size, file_mtime)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(item_id) DO UPDATE SET thumb_w = excluded.thumb_w, thumb_h = excluded.thumb_h, thumb_at = excluded.thumb_at,
            resize_w = excluded.resize_w, resize_h = excluded.resize_h, resize_at = excluded.resize_at, thumb_failed = excluded.thumb_failed,
            file_size = excluded.file_size, file_mtime = excluded.file_mtime`,
        photo.id, thumb?.width ?? null, thumb?.height ?? null, thumb ? NOW() : null,
        resize?.width ?? null, resize?.height ?? null, resize ? NOW() : null, failed ? 1 : 0, stat.size, mtime);
}

/**
 * Updates the derivatives and the `media` rows for the visible photos of the given albums (or all
 * exported albums). Runs before the album files are generated.
 */
export async function updateMedia(db: Db, options: MediaOptions): Promise<MediaResult> {
    const t = new Tree(db);
    await fs.mkdir(options.thumbnailsRoot, { recursive: true });
    await fs.mkdir(options.resizedRoot, { recursive: true });
    const albums = options.albumIds ? [...options.albumIds].filter((id) => t.exported.has(id)) : [...t.exported];
    const photos: ItemRow[] = [];
    for (const id of albums) for (const c of t.kids(id)) if (c.type === 'photo') photos.push(c);
    const r: MediaResult = { photos: 0, generated: 0, skipped: 0, resized: 0, failed: 0, missing: 0 };
    await pool(photos, options.concurrency ?? 5, (p) => processPhoto(db, t, p, options, r));
    return r;
}

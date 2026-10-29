/**
 * Publish only the exported images (SEC-18).
 *
 * The Gallery 2 album tree also holds files the export leaves out: ignored albums and photos
 * (config.ignoreAlbums / ignoreItems) and files the database no longer knows. Serving the whole
 * tree at /g2data/albums/ would make all of them reachable by URL. This builds a tree of symlinks
 * that contains exactly the full-size images referenced from data/*.json (photo urlPath and album
 * highlightImageUrl), so the web server can serve that tree instead.
 *
 * The tree is written to `<outDir>.new-<stamp>`. If it is identical to the current tree (same links,
 * same targets: the usual case for a nightly run) the staging tree is removed and nothing changes.
 * Otherwise it is promoted like data/, but only the newest previous tree is kept as
 * `<outDir>.prev-<stamp>`: the tree is derived from data/ and rebuilt on every run, so keeping
 * every one of them (58k symlinks each) would exhaust the inodes of the data disk (Sprint 20 T-09).
 * Usage, after an extraction:  node publishImages.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { runStamp, promoteStagingDir } from './outputDir.ts';

/** Previous published trees kept next to the live one (see the module comment). */
export const KEEP_PREVIOUS_PUBLISHED = 1;
import type { Config } from './types.ts';

/** Relative image paths referenced from the album JSON files in dataDir (sorted, unique). */
export async function collectImagePaths(dataDir: string): Promise<string[]> {
    const paths = new Set<string>();
    for (const name of await fs.readdir(dataDir)) {
        if (!/^\d+\.json$/.test(name)) continue;
        const album = JSON.parse(await fs.readFile(path.join(dataDir, name), 'utf8'));
        for (const c of album.children ?? []) {
            if (c.type !== 'GalleryAlbumItem' && typeof c.urlPath === 'string') paths.add(c.urlPath);
            if (typeof c.highlightImageUrl === 'string') paths.add(c.highlightImageUrl);
        }
    }
    return [...paths].sort();
}

/** True for a plain relative path that stays inside its root (no '..', not absolute, no NUL). */
export function isSafeRelativePath(p: string): boolean {
    if (p === '' || p.includes('\0') || path.isAbsolute(p)) return false;
    return !path.normalize(p).split(path.sep).includes('..');
}

export interface PublishResult {
    linked: number;
    missing: string[];
    rejected: string[];
    outDir: string;
    previous: string | null;
    /** True when the new tree equalled the existing one and nothing was replaced. */
    unchanged: boolean;
}

/** Every symlink under dir as "relative path -> target", sorted; used to compare two trees. */
export async function listLinks(dir: string, prefix = ''): Promise<string[]> {
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return [];
    }
    const out: string[] = [];
    for (const e of entries) {
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) out.push(...(await listLinks(full, rel)));
        else if (e.isSymbolicLink()) out.push(`${rel} -> ${await fs.readlink(full)}`);
        else out.push(`${rel} (not a link)`);
    }
    return out.sort();
}

/** True when both trees hold exactly the same symlinks with the same targets. */
export async function sameLinkTree(a: string, b: string): Promise<boolean> {
    const [la, lb] = await Promise.all([listLinks(a), listLinks(b)]);
    return la.length === lb.length && la.every((x, i) => x === lb[i]);
}

export async function publishImages(dataDir: string, albumsRoot: string, outDir: string, stamp = runStamp()): Promise<PublishResult> {
    const staging = `${outDir}.new-${stamp}`;
    await fs.mkdir(staging, { recursive: false });
    const missing: string[] = [];
    const rejected: string[] = [];
    let linked = 0;
    for (const rel of await collectImagePaths(dataDir)) {
        if (!isSafeRelativePath(rel)) { rejected.push(rel); continue; }
        const source = path.join(albumsRoot, rel);
        try {
            await fs.access(source);
        } catch {
            missing.push(rel);
            continue;
        }
        const link = path.join(staging, rel);
        await fs.mkdir(path.dirname(link), { recursive: true });
        await fs.symlink(path.resolve(source), link);
        linked++;
    }
    let current = false;
    try {
        await fs.access(outDir);
        current = true;
    } catch {
        // first run
    }
    if (current && await sameLinkTree(outDir, staging)) {
        await fs.rm(staging, { recursive: true, force: true });
        return { linked, missing, rejected, outDir, previous: null, unchanged: true };
    }
    const previous = await promoteStagingDir(outDir, staging, stamp, { keepPrevious: KEEP_PREVIOUS_PUBLISHED });
    return { linked, missing, rejected, outDir, previous, unchanged: false };
}

if (import.meta.main) {
    const projectRoot = path.join(import.meta.dirname, '..');
    const config: Config = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'config.json'), 'utf8'));
    const albumsRoot = path.join(projectRoot, config.albumsRoot ?? 'frontend/public/g2data/albums');
    const outDir = path.join(projectRoot, config.publishedAlbumsRoot ?? 'frontend/public/g2data/published');
    const r = await publishImages(path.join(projectRoot, 'data'), albumsRoot, outDir);
    console.log(r.unchanged
        ? `Published tree unchanged (${r.linked} images), ${r.outDir} kept as is`
        : `Published ${r.linked} images to ${r.outDir}${r.previous ? ` (previous tree kept as ${r.previous}, older ones pruned)` : ''}`);
    if (r.missing.length) console.warn(`${r.missing.length} referenced images not found under ${albumsRoot}, e.g. ${r.missing.slice(0, 3).join(', ')}`);
    if (r.rejected.length) {
        console.error(`${r.rejected.length} unsafe paths rejected, e.g. ${r.rejected.slice(0, 3).join(', ')}`);
        process.exitCode = 1;
    }
}

/**
 * Publish only the exported images (SEC-18).
 *
 * The Gallery 2 album tree also holds files the export leaves out: ignored albums and photos
 * (config.ignoreAlbums / ignoreItems) and files the database no longer knows. Serving the whole
 * tree at /g2data/albums/ would make all of them reachable by URL. This builds a tree of symlinks
 * that contains exactly the full-size images referenced from data/*.json (photo urlPath and album
 * highlightImageUrl), so the web server can serve that tree instead.
 *
 * The tree is written to `<outDir>.new-<stamp>` and promoted like data/ (the previous tree is kept
 * as `<outDir>.prev-<stamp>`). Usage, after an extraction:  node publishImages.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { runStamp, promoteStagingDir } from './outputDir.ts';
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
    const previous = await promoteStagingDir(outDir, staging, stamp);
    return { linked, missing, rejected, outDir, previous };
}

if (import.meta.main) {
    const projectRoot = path.join(import.meta.dirname, '..');
    const config: Config = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'config.json'), 'utf8'));
    const albumsRoot = path.join(projectRoot, config.albumsRoot ?? 'frontend/public/g2data/albums');
    const outDir = path.join(projectRoot, config.publishedAlbumsRoot ?? 'frontend/public/g2data/published');
    const r = await publishImages(path.join(projectRoot, 'data'), albumsRoot, outDir);
    console.log(`Published ${r.linked} images to ${r.outDir}${r.previous ? ` (previous tree kept as ${r.previous})` : ''}`);
    if (r.missing.length) console.warn(`${r.missing.length} referenced images not found under ${albumsRoot}, e.g. ${r.missing.slice(0, 3).join(', ')}`);
    if (r.rejected.length) {
        console.error(`${r.rejected.length} unsafe paths rejected, e.g. ${r.rejected.slice(0, 3).join(', ')}`);
        process.exitCode = 1;
    }
}

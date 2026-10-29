/**
 * Atomic output for the extraction (LOGIC-22).
 *
 * A run writes into a fresh staging directory next to data/ (data.new-<stamp>). Only a run that
 * finished without failures replaces data/: the old directory is renamed to data.prev-<stamp>
 * (kept, never deleted: production data has a no-delete policy) and the staging directory takes
 * its name. Output that is only derived from data/ (the published symlink tree, SEC-18) may ask
 * for a retention limit instead, since it is rebuilt from scratch on every run and a tree of
 * 58k symlinks per night exhausts the inodes of the data disk within months (Sprint 20 T-09). A crash or a failed run leaves data/ exactly as it was. Files that the previous output
 * had and the new one does not (albums deleted, ignored or no longer public) are listed, so stale
 * JSON is visible instead of silently staying published.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/** Timestamp usable in a directory name, e.g. 20261025-143005. */
export function runStamp(date: Date = new Date()): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

/** Create `<finalDir>.new-<stamp>` (and its search/ subdirectory); fails if it already exists. */
export async function prepareStagingDir(finalDir: string, stamp: string): Promise<string> {
    const staging = `${finalDir}.new-${stamp}`;
    await fs.mkdir(staging, { recursive: false });
    await fs.mkdir(path.join(staging, 'search'));
    return staging;
}

async function listFiles(dir: string, prefix = ''): Promise<string[]> {
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return [];
    }
    const out: string[] = [];
    for (const e of entries) {
        const rel = prefix ? `${prefix}/${e.name}` : e.name;
        if (e.isDirectory()) out.push(...(await listFiles(path.join(dir, e.name), rel)));
        else out.push(rel);
    }
    return out;
}

/** Files (relative paths) in finalDir that the new output in stagingDir does not have. */
export async function listStaleFiles(finalDir: string, stagingDir: string): Promise<string[]> {
    const fresh = new Set(await listFiles(stagingDir));
    return (await listFiles(finalDir)).filter((f) => !fresh.has(f)).sort();
}

export interface PromoteOptions {
    /**
     * How many `<finalDir>.prev-*` directories to keep after the promotion (the newest ones by
     * stamp). Default: keep all. 0 keeps none. Only for output that is derived from data/.
     */
    keepPrevious?: number;
}

/** `<finalDir>.prev-*` siblings, newest stamp first. */
export async function listPreviousDirs(finalDir: string): Promise<string[]> {
    const prefix = `${path.basename(finalDir)}.prev-`;
    let entries;
    try {
        entries = await fs.readdir(path.dirname(finalDir), { withFileTypes: true });
    } catch {
        return [];
    }
    return entries
        .filter((e) => e.isDirectory() && e.name.startsWith(prefix))
        .map((e) => path.join(path.dirname(finalDir), e.name))
        .sort()
        .reverse();
}

/** Delete all but the newest `keep` previous directories of finalDir; returns what was deleted. */
export async function prunePreviousDirs(finalDir: string, keep: number): Promise<string[]> {
    const doomed = (await listPreviousDirs(finalDir)).slice(Math.max(0, keep));
    for (const d of doomed) await fs.rm(d, { recursive: true, force: true });
    return doomed;
}

/**
 * Make stagingDir the new finalDir. The previous finalDir (if any) is renamed to
 * `<finalDir>.prev-<stamp>` and returned (null when there was none, or when `keepPrevious: 0`
 * removed it again). With `keepPrevious` set, older `<finalDir>.prev-*` directories beyond that
 * number are deleted after the promotion.
 */
export async function promoteStagingDir(finalDir: string, stagingDir: string, stamp: string, opts: PromoteOptions = {}): Promise<string | null> {
    let previous: string | null = null;
    try {
        await fs.access(finalDir);
        previous = `${finalDir}.prev-${stamp}`;
        await fs.rename(finalDir, previous);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
    await fs.rename(stagingDir, finalDir);
    if (opts.keepPrevious !== undefined) {
        const deleted = await prunePreviousDirs(finalDir, opts.keepPrevious);
        if (previous && deleted.includes(previous)) previous = null;
    }
    return previous;
}

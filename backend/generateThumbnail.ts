/**
 * Thumbnail generation from full-size images.
 * Uses pathComponent-based paths; skips when a non-empty thumbnail newer than the source exists.
 * Writes to a temp file and renames it into place, so a failed or interrupted run never leaves a
 * truncated thumbnail that a later run would treat as done.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';

export interface ThumbnailOptions {
    maxWidth: number;
    maxHeight: number;
    quality: number;
}

const DEFAULT_OPTIONS: ThumbnailOptions = {
    maxWidth: 400,
    maxHeight: 400,
    quality: 80,
};

/**
 * Reject paths containing traversal segments or null bytes.
 */
function validateNoTraversal(filePath: string, label: string): void {
    if (filePath.includes('\0')) {
        throw new Error(`${label} contains null byte`);
    }
    const segments = filePath.split(/[/\\]/);
    if (segments.some(seg => seg === '..')) {
        throw new Error(`${label} contains path traversal segment`);
    }
}

/**
 * Generate a thumbnail from a full-size image.
 * Skips if destPath exists, is non-empty and is not older than the source. Creates parent directory if needed.
 * Returns 'invalid' when source exists but cannot be decoded (sharp failOn 'truncated': recoverable
 * libjpeg warnings such as "extraneous bytes" are tolerated; truncated or broken files are not).
 * On 'invalid' no file is left at destPath.
 * Rejects paths containing traversal segments or null bytes.
 */
export async function generateThumbnail(
    sourcePath: string,
    destPath: string,
    options: Partial<ThumbnailOptions> = {},
): Promise<'generated' | 'skipped' | 'missing' | 'invalid'> {
    validateNoTraversal(sourcePath, 'sourcePath');
    validateNoTraversal(destPath, 'destPath');
    const opts = { ...DEFAULT_OPTIONS, ...options };

    let sourceStat;
    try {
        sourceStat = await fs.stat(sourcePath);
    } catch {
        return 'missing';
    }

    try {
        const destStat = await fs.stat(destPath);
        if (destStat.size > 0 && destStat.mtimeMs >= sourceStat.mtimeMs) {
            return 'skipped';
        }
        // empty or older than the source: regenerate
    } catch {
        // destPath does not exist, proceed
    }

    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });

    const tmpPath = `${destPath}.tmp-${process.pid}`;
    try {
        await sharp(sourcePath, { failOn: 'truncated' })
            .autoOrient() // apply EXIF Orientation before fitting; the tag is not kept in the output
            .resize(opts.maxWidth, opts.maxHeight, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: opts.quality })
            .toFile(tmpPath);
        await fs.rename(tmpPath, destPath);
    } catch {
        await fs.rm(tmpPath, { force: true });
        return 'invalid';
    }

    return 'generated';
}

/**
 * Width and height of an existing thumbnail file, or null if it cannot be read. Used for the
 * thumb_width/thumb_height fields, so they describe the file the frontend actually loads (the
 * Gallery 2 derivative columns describe a different image).
 */
export async function readThumbnailSize(thumbPath: string): Promise<{ width: number; height: number } | null> {
    try {
        const { width, height } = await sharp(thumbPath).metadata();
        return width && height ? { width, height } : null;
    } catch {
        return null;
    }
}

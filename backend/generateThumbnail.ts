/**
 * Thumbnail generation from full-size images.
 * Uses pathComponent-based paths; skips when thumbnail already exists.
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
 * Generate a thumbnail from a full-size image.
 * Skips if destPath already exists. Creates parent directory if needed.
 */
export async function generateThumbnail(
    sourcePath: string,
    destPath: string,
    options: Partial<ThumbnailOptions> = {},
): Promise<'generated' | 'skipped' | 'missing'> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
        await fs.access(destPath);
        return 'skipped';
    } catch {
        // destPath does not exist, proceed
    }

    try {
        await fs.access(sourcePath);
    } catch {
        return 'missing';
    }

    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });

    await sharp(sourcePath)
        .resize(opts.maxWidth, opts.maxHeight, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: opts.quality })
        .toFile(destPath);

    return 'generated';
}

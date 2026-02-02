/**
 * Unit tests for generateThumbnail.
 * Verifies skip-when-exists, directory creation, and generated/skipped/missing returns.
 */

import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { generateThumbnail } from './generateThumbnail';

async function run(): Promise<void> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'generateThumbnail-'));
    const sourcePath = path.join(tmpDir, 'source.jpg');
    const destPath = path.join(tmpDir, 'out', 'subdir', 't__source.jpg');

    try {
        // Create minimal 1x1 pixel JPEG using sharp
        await sharp({
            create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 0, b: 0 } },
        })
            .jpeg()
            .toFile(sourcePath);

        // Missing source: should return 'missing'
        const missing = await generateThumbnail(
            path.join(tmpDir, 'nonexistent.jpg'),
            path.join(tmpDir, 'out2', 't__nonexistent.jpg'),
        );
        assert.strictEqual(missing, 'missing');

        // First call: should create directory and return 'generated'
        const generated = await generateThumbnail(sourcePath, destPath);
        assert.strictEqual(generated, 'generated');
        await fs.access(destPath);

        // Second call: dest exists, should return 'skipped'
        const skipped = await generateThumbnail(sourcePath, destPath);
        assert.strictEqual(skipped, 'skipped');

        // Verify directory was created (destPath has subdir)
        const destDir = path.dirname(destPath);
        const stat = await fs.stat(destDir);
        assert.ok(stat.isDirectory(), 'output directory should exist');

        console.log('generateThumbnail tests passed');
    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});

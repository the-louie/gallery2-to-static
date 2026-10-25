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

        // Invalid source: non-image file, should return 'invalid'
        const invalidPath = path.join(tmpDir, 'not-an-image.jpg');
        await fs.writeFile(invalidPath, 'not an image');
        const invalid = await generateThumbnail(invalidPath, path.join(tmpDir, 'out', 't__not-an-image.jpg'));
        assert.strictEqual(invalid, 'invalid');

        // Verify directory was created (destPath has subdir)
        const destDir = path.dirname(destPath);
        const stat = await fs.stat(destDir);
        assert.ok(stat.isDirectory(), 'output directory should exist');

        // LOGIC-12: damaged sources
        const good = await sharp({
            create: { width: 64, height: 64, channels: 3, background: { r: 10, g: 200, b: 30 } },
        }).jpeg().toBuffer();
        // "Corrupt JPEG data: 2 extraneous bytes before marker 0xda": recoverable, common in old camera files
        const sos = good.indexOf(Buffer.from([0xff, 0xda]));
        const junkPath = path.join(tmpDir, 'junk.jpg');
        await fs.writeFile(junkPath, Buffer.concat([good.subarray(0, sos), Buffer.from([0, 0]), good.subarray(sos)]));
        const junkDest = path.join(tmpDir, 'out', 't__junk.jpg');
        assert.strictEqual(await generateThumbnail(junkPath, junkDest), 'generated', 'extraneous-bytes JPEG is tolerated');
        assert.ok((await fs.stat(junkDest)).size > 0);

        // truncated JPEG: 'invalid', and nothing (no dest, no temp file) left behind
        const truncPath = path.join(tmpDir, 'trunc.jpg');
        await fs.writeFile(truncPath, good.subarray(0, Math.floor(good.length * 0.6)));
        const truncDest = path.join(tmpDir, 'out', 't__trunc.jpg');
        assert.strictEqual(await generateThumbnail(truncPath, truncDest), 'invalid');
        await assert.rejects(() => fs.access(truncDest), 'no thumbnail left for a truncated source');
        const leftovers = (await fs.readdir(path.dirname(truncDest))).filter((f) => f.includes('.tmp-'));
        assert.deepStrictEqual(leftovers, [], 'no temp files left');
        // second run: still 'invalid', never 'skipped'
        assert.strictEqual(await generateThumbnail(truncPath, truncDest), 'invalid');

        // 0-byte leftover from an older version or a crash: regenerated, not skipped
        await fs.writeFile(junkDest, '');
        assert.strictEqual(await generateThumbnail(junkPath, junkDest), 'generated', '0-byte thumbnail regenerated');
        assert.ok((await fs.stat(junkDest)).size > 0);

        // thumbnail older than its source: regenerated
        const old = new Date(Date.now() - 3600_000);
        await fs.utimes(junkDest, old, old);
        assert.strictEqual(await generateThumbnail(junkPath, junkDest), 'generated', 'stale thumbnail regenerated');
        assert.strictEqual(await generateThumbnail(junkPath, junkDest), 'skipped', 'fresh thumbnail skipped');

        // SEC-05: path traversal rejection
        await assert.rejects(
            () => generateThumbnail('../../../etc/passwd', destPath),
            /traversal/,
            'source with .. rejected',
        );
        await assert.rejects(
            () => generateThumbnail(sourcePath, '../../evil/output.jpg'),
            /traversal/,
            'dest with .. rejected',
        );
        await assert.rejects(
            () => generateThumbnail('photo\0.jpg', destPath),
            /null byte/,
            'source with null byte rejected',
        );
        await assert.rejects(
            () => generateThumbnail(sourcePath, 'output\0.jpg'),
            /null byte/,
            'dest with null byte rejected',
        );

        console.log('generateThumbnail tests passed');
    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});

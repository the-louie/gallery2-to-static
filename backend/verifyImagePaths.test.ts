/**
 * Unit tests for verifyImagePaths module.
 */

import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
    loadImageConfigForVerification,
    collectImageUrlsFromAlbumTree,
    writeDeviationReport,
    verifyImageUrl,
    type DeviationEntry,
} from './verifyImagePaths';

async function run(): Promise<void> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'verifyImagePaths-'));

    try {
        // loadImageConfigForVerification: missing file returns null
        const missing = await loadImageConfigForVerification(tmpDir, path.join(tmpDir, 'nonexistent.json'));
        assert.strictEqual(missing, null);

        // loadImageConfigForVerification: valid config
        const configPath = path.join(tmpDir, 'image-config.json');
        await fs.writeFile(configPath, JSON.stringify({ baseUrl: 'https://example.com/images' }), 'utf-8');
        const loaded = await loadImageConfigForVerification(tmpDir, configPath);
        assert.strictEqual(loaded, 'https://example.com/images');

        // loadImageConfigForVerification: empty baseUrl returns null
        await fs.writeFile(configPath, JSON.stringify({ baseUrl: '' }), 'utf-8');
        assert.strictEqual(await loadImageConfigForVerification(tmpDir, configPath), null);

        // loadImageConfigForVerification: missing baseUrl returns null
        await fs.writeFile(configPath, JSON.stringify({}), 'utf-8');
        assert.strictEqual(await loadImageConfigForVerification(tmpDir, configPath), null);

        // collectImageUrlsFromAlbumTree: empty dataDir
        const emptyDataDir = path.join(tmpDir, 'data-empty');
        await fs.mkdir(emptyDataDir, { recursive: true });
        const emptyUrls = await collectImageUrlsFromAlbumTree(emptyDataDir, 'https://example.com');
        assert.strictEqual(emptyUrls.length, 0);

        // collectImageUrlsFromAlbumTree: no index.json
        const noIndexDir = path.join(tmpDir, 'data-noindex');
        await fs.mkdir(noIndexDir, { recursive: true });
        assert.strictEqual((await collectImageUrlsFromAlbumTree(noIndexDir, 'https://example.com')).length, 0);

        // collectImageUrlsFromAlbumTree: minimal fixture
        const dataDir = path.join(tmpDir, 'data');
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(
            path.join(dataDir, 'index.json'),
            JSON.stringify({ rootAlbumId: 1 }),
            'utf-8',
        );
        await fs.writeFile(
            path.join(dataDir, '1.json'),
            JSON.stringify({
                metadata: {
                    albumTitle: 'Test Album',
                    highlightImageUrl: 'album1/photo.jpg',
                },
                children: [
                    {
                        type: 'GalleryAlbumItem',
                        id: 2,
                        title: 'Sub',
                        thumbnailUrlPath: 'album1/sub/t__thumb.jpg',
                        highlightThumbnailUrlPath: 'album1/sub/t__thumb.jpg',
                    },
                    {
                        type: 'GalleryPhotoItem',
                        id: 10,
                        title: 'Photo',
                        urlPath: 'album1/photo.jpg',
                        thumbnailUrlPath: 'album1/t__photo.jpg',
                    },
                ],
            }),
            'utf-8',
        );
        await fs.writeFile(
            path.join(dataDir, '2.json'),
            JSON.stringify({
                metadata: { albumTitle: 'Sub', highlightImageUrl: 'album1/sub/photo2.jpg' },
                children: [],
            }),
            'utf-8',
        );

        const urls = await collectImageUrlsFromAlbumTree(dataDir, 'https://cdn.example.com');
        assert.ok(urls.length >= 4, 'expected at least 4 URLs');
        const urlStrings = urls.map((u) => u.url);
        assert.ok(urlStrings.some((u) => u.includes('album1/photo.jpg')), 'highlight image');
        assert.ok(urlStrings.some((u) => u.includes('t__thumb.jpg')), 'album thumb');
        assert.ok(urlStrings.some((u) => u.includes('album1/photo.jpg') && !u.includes('t__')), 'photo full');
        assert.ok(urlStrings.some((u) => u.includes('t__photo.jpg')), 'photo thumb');
        assert.ok(urlStrings.every((u) => u.startsWith('https://cdn.example.com/')), 'base URL applied');

        // writeDeviationReport
        const deviations: DeviationEntry[] = [
            {
                url: 'https://example.com/missing.jpg',
                albumId: 1,
                albumTitle: 'Test',
                type: 'photo-full',
                status: 404,
                error: '404 Not Found',
            },
        ];
        const reportFilename = await writeDeviationReport(
            tmpDir,
            deviations,
            10,
            'https://example.com',
            new Date().toISOString(),
        );
        assert.ok(reportFilename.startsWith('deviation-report_'), reportFilename);
        assert.ok(reportFilename.endsWith('.md'), reportFilename);
        const reportPath = path.join(tmpDir, reportFilename);
        const content = await fs.readFile(reportPath, 'utf-8');
        assert.ok(content.includes('# Image Path Deviation Report'));
        assert.ok(content.includes('https://example.com/missing.jpg'));
        assert.ok(content.includes('# Test (id 1) failed'));
        assert.ok(content.includes('Image missing or failed'));

        // verifyImageUrl: non-http URL
        const nonHttp = await verifyImageUrl('file:///local/path.jpg', 1000);
        assert.strictEqual(nonHttp.ok, false);
        assert.ok(nonHttp.error?.includes('HTTP'));

        // verifyImageUrl: real fetch is not mocked - skip to avoid network
        // Optional: mock fetch if needed for CI
    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
    }

    console.log('verifyImagePaths tests passed');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});

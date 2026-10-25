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
        assert.ok(loaded !== null);
        assert.strictEqual(loaded!.baseUrl, 'https://example.com/images');
        assert.strictEqual(loaded!.thumbnailBaseUrl, 'https://example.com/images');

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

        // SEC-08: SSRF protection - private IPs rejected
        const localhost = await verifyImageUrl('http://localhost/image.jpg', 1000);
        assert.strictEqual(localhost.ok, false);
        assert.ok(localhost.error?.includes('internal'), 'localhost rejected');

        const loopback = await verifyImageUrl('http://127.0.0.1/image.jpg', 1000);
        assert.strictEqual(loopback.ok, false);
        assert.ok(loopback.error?.includes('internal'), '127.0.0.1 rejected');

        const private10 = await verifyImageUrl('http://10.0.0.1/image.jpg', 1000);
        assert.strictEqual(private10.ok, false);
        assert.ok(private10.error?.includes('internal'), '10.x rejected');

        const private172 = await verifyImageUrl('http://172.16.0.1/image.jpg', 1000);
        assert.strictEqual(private172.ok, false);
        assert.ok(private172.error?.includes('internal'), '172.16.x rejected');

        const private192 = await verifyImageUrl('http://192.168.1.1/image.jpg', 1000);
        assert.strictEqual(private192.ok, false);
        assert.ok(private192.error?.includes('internal'), '192.168.x rejected');

        // SEC-06: path traversal rejection in local file verify
        const traversal = await verifyImageUrl('/g2data/../../etc/passwd', 1000, tmpDir);
        assert.strictEqual(traversal.ok, false);
        assert.ok(traversal.error?.includes('traversal') || traversal.error?.includes('escapes'), 'path traversal rejected');

        const nullByte = await verifyImageUrl('/g2data/albums/photo\0.jpg', 1000, tmpDir);
        assert.strictEqual(nullByte.ok, false);
        assert.ok(nullByte.error?.includes('null'), 'null byte rejected');

        // LOGIC-24: URLs are percent-encoded per segment; the local check decodes them
        const pub = path.join(tmpDir, 'frontend', 'public', 'g2data', 'albums', 'lördag');
        await fs.mkdir(pub, { recursive: true });
        await fs.writeFile(path.join(pub, 'bild #1 100%.jpg'), 'x');
        const encodedOk = await verifyImageUrl('/g2data/albums/l%C3%B6rdag/bild%20%231%20100%25.jpg', 1000, tmpDir);
        assert.strictEqual(encodedOk.ok, true, 'encoded URL resolves to the file on disk');
        const rawHash = await verifyImageUrl('/g2data/albums/lördag/bild #1 100%.jpg', 1000, tmpDir);
        assert.strictEqual(rawHash.ok, false, 'an unencoded % is invalid percent-encoding');
        const encodedTraversal = await verifyImageUrl('/g2data/albums/%2e%2e/%2e%2e/secret.jpg', 1000, tmpDir);
        assert.strictEqual(encodedTraversal.ok, false, 'encoded .. still rejected');
        const encodedSlash = await verifyImageUrl('/g2data/albums/a%2Fb.jpg', 1000, tmpDir);
        assert.strictEqual(encodedSlash.ok, false, 'encoded / inside a segment rejected');
    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
    }

    console.log('verifyImagePaths tests passed');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});

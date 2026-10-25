/**
 * Unit tests for publishImages (SEC-18): only images referenced from data/ are published.
 */

import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { collectImagePaths, isSafeRelativePath, publishImages } from './publishImages.ts';

async function write(file: string, body: string): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
}

async function run(): Promise<void> {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'publishImages-'));
    try {
        const albums = path.join(tmp, 'albums');
        const data = path.join(tmp, 'data');
        for (const f of ['a/1.jpg', 'a/hidden.jpg', 'b/2.jpg', 'orphan.jpg']) await write(path.join(albums, f), f);
        await write(path.join(data, '7.json'), JSON.stringify({ children: [
            { id: 10, type: 'GalleryAlbumItem', highlightImageUrl: 'b/2.jpg', urlPath: 'ignored-for-albums' },
            { id: 11, type: 'GalleryPhotoItem', urlPath: 'a/1.jpg' },
            { id: 12, type: 'GalleryPhotoItem', urlPath: 'a/gone.jpg' },
            { id: 13, type: 'GalleryPhotoItem', urlPath: '../etc/passwd' },
        ] }));
        await write(path.join(data, '10.json'), JSON.stringify({ children: [{ id: 14, type: 'GalleryPhotoItem', urlPath: 'b/2.jpg' }] }));
        await write(path.join(data, 'index.json'), JSON.stringify({ children: [{ type: 'GalleryPhotoItem', urlPath: 'orphan.jpg' }] }));

        assert.deepStrictEqual(await collectImagePaths(data), ['../etc/passwd', 'a/1.jpg', 'a/gone.jpg', 'b/2.jpg'],
            'photo urlPath + album highlight, unique; index.json and search/ are not album files');
        assert.ok(isSafeRelativePath('a/b c.jpg'));
        for (const bad of ['', '/etc/passwd', '../x', 'a/../../x', 'a\0b']) assert.ok(!isSafeRelativePath(bad), bad);

        const out = path.join(tmp, 'published');
        const r1 = await publishImages(data, albums, out, 'r1');
        assert.strictEqual(r1.linked, 2);
        assert.deepStrictEqual(r1.missing, ['a/gone.jpg']);
        assert.deepStrictEqual(r1.rejected, ['../etc/passwd']);
        assert.strictEqual(r1.previous, null);
        assert.strictEqual(await fs.readFile(path.join(out, 'a/1.jpg'), 'utf8'), 'a/1.jpg', 'link resolves to the source');
        assert.ok((await fs.lstat(path.join(out, 'a/1.jpg'))).isSymbolicLink());
        for (const f of ['a/hidden.jpg', 'orphan.jpg']) await assert.rejects(fs.access(path.join(out, f)), `${f} not published`);

        // A second run replaces the tree and keeps the previous one
        const r2 = await publishImages(data, albums, out, 'r2');
        assert.strictEqual(r2.previous, `${out}.prev-r2`);
        await fs.access(path.join(`${out}.prev-r2`, 'a/1.jpg'));
    } finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }
    console.log('publishImages tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

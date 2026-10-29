/**
 * Unit tests for publishImages (SEC-18): only images referenced from data/ are published.
 */

import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { collectImagePaths, isSafeRelativePath, publishImages, listLinks, sameLinkTree } from './publishImages.ts';
import { listPreviousDirs } from './outputDir.ts';

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
        assert.strictEqual(r1.unchanged, false);
        assert.strictEqual(await fs.readFile(path.join(out, 'a/1.jpg'), 'utf8'), 'a/1.jpg', 'link resolves to the source');
        assert.ok((await fs.lstat(path.join(out, 'a/1.jpg'))).isSymbolicLink());
        for (const f of ['a/hidden.jpg', 'orphan.jpg']) await assert.rejects(fs.access(path.join(out, f)), `${f} not published`);

        // A second run with the same data changes nothing: no rotation, no previous tree (T-09)
        const r2 = await publishImages(data, albums, out, 'r2');
        assert.strictEqual(r2.unchanged, true);
        assert.strictEqual(r2.previous, null);
        assert.strictEqual(r2.linked, 2);
        await assert.rejects(fs.access(`${out}.new-r2`), 'staging tree removed');
        await assert.rejects(fs.access(`${out}.prev-r2`), 'no previous tree created');
        assert.deepStrictEqual(await listLinks(out), [`a/1.jpg -> ${path.resolve(albums, 'a/1.jpg')}`, `b/2.jpg -> ${path.resolve(albums, 'b/2.jpg')}`]);
        assert.ok(await sameLinkTree(out, out));

        // Data changed: the tree is replaced and the previous one kept
        await write(path.join(albums, 'c/3.jpg'), 'c/3.jpg');
        await write(path.join(data, '11.json'), JSON.stringify({ children: [{ id: 15, type: 'GalleryPhotoItem', urlPath: 'c/3.jpg' }] }));
        const r3 = await publishImages(data, albums, out, 'r3');
        assert.strictEqual(r3.unchanged, false);
        assert.strictEqual(r3.previous, `${out}.prev-r3`);
        assert.strictEqual(r3.linked, 3);
        await fs.access(path.join(`${out}.prev-r3`, 'a/1.jpg'));
        await fs.access(path.join(out, 'c/3.jpg'));

        // Changed again: only the newest previous tree survives
        await fs.rm(path.join(data, '11.json'));
        const r4 = await publishImages(data, albums, out, 'r4');
        assert.strictEqual(r4.previous, `${out}.prev-r4`);
        assert.deepStrictEqual((await listPreviousDirs(out)).map((d) => path.basename(d)), ['published.prev-r4'], 'prev-r3 pruned');
        assert.ok(!(await sameLinkTree(out, `${out}.prev-r4`)));
    } finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }
    console.log('publishImages tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

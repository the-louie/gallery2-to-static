/**
 * End-to-end test of the extraction (TEST-03): runExtraction() over an in-memory Gallery 2 tree
 * (fake `sql`) and real image files in a temp dir, asserting on the written JSON and index.json.
 */

import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { runExtraction } from './extract.ts';
import type { Child, Config } from './types.ts';
import { fakeSql, byId, TREE, writeImages } from './fakeGallery.ts';

async function readJson(p: string): Promise<any> {
    return JSON.parse(await fs.readFile(p, 'utf-8'));
}

async function run(): Promise<void> {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'extract-e2e-'));
    const quiet = { log: console.log, warn: console.warn, error: console.error };
    const errors: unknown[][] = [];
    console.log = () => {};
    console.warn = () => {};
    console.error = (...a: unknown[]) => { errors.push(a); };
    try {
        await writeImages(path.join(tmp, 'g2/albums'));
        const config = {
            mysqlSettings: { host: 'x', user: 'x', database: 'x' },
            gallerySettings: { tablePrefix: 'g2_', columnPrefix: 'g_' },
            thumbPrefix: 't__', rootId: 7, ignoreAlbums: [30], ignoreItems: [105, '106'],
            albumsRoot: 'g2/albums', thumbnailsRoot: 'g2/thumbs', resizedRoot: 'g2/resized', verifyImagePaths: false,
        } as Config;

        const result = await runExtraction({ sql: fakeSql, config, projectRoot: tmp, verify: false });
        assert.deepStrictEqual(errors, [], 'no errors logged');
        assert.strictEqual(result.ok, true);
        const data = path.join(tmp, 'data');
        assert.strictEqual(result.finalDataDir, data);

        // path index: one path per album, duplicate titles disambiguated, blank title -> album_<id>
        const index = await readJson(path.join(data, 'index.json'));
        assert.strictEqual(index.rootAlbumId, 7);
        const pi: Record<string, number> = index.pathIndex;
        assert.strictEqual(pi['/'], 7);
        assert.strictEqual(pi['/dreamhack'], 10);
        const lordag = Object.entries(pi).filter(([, id]) => id === 11 || id === 12).map(([p]) => p).sort();
        assert.deepStrictEqual(lordag, ['/dreamhack/lordag', '/dreamhack/lordag--12'], 'duplicate-named siblings');
        assert.strictEqual(pi['/dreamhack/album_13'], 13, 'blank title');
        assert.strictEqual(pi['/dreamhack/image/2005'], 15, 'album named image with numeric child');
        assert.ok(!Object.values(pi).includes(20), 'album without images not exported');
        assert.ok(!Object.values(pi).includes(30), 'ignored album not exported');
        const ids = Object.values(pi);
        assert.strictEqual(new Set(ids).size, ids.length, 'every album has exactly one path');

        // the links the parent writes resolve to the child itself
        const dh = await readJson(path.join(data, '10.json'));
        for (const c of dh.children.filter((c: Child) => c.type === 'GalleryAlbumItem')) {
            assert.strictEqual(pi[c.path], c.id, `link ${c.path} -> ${c.id}`);
        }

        // photos: truncated JPEG kept with thumbnailMissing; PNG thumbnail named .png.jpg (LOGIC-30)
        const blank = await readJson(path.join(data, '13.json'));
        const broken = blank.children.find((c: Child) => c.id === 103);
        assert.ok(broken, 'photo with an undecodable source is kept');
        assert.strictEqual(broken.thumbnailMissing, true);
        const y2005 = await readJson(path.join(data, '15.json'));
        const logo = y2005.children.find((c: Child) => c.id === 104);
        assert.strictEqual(logo.thumbnailUrlPath, 'dreamhack/image/2005/t__c.png.jpg');
        const meta = await sharp(path.join(tmp, 'g2/thumbs', logo.thumbnailUrlPath)).metadata();
        assert.strictEqual(meta.format, 'jpeg');
        assert.strictEqual(logo.thumb_width, 64);
        await assert.rejects(() => fs.access(path.join(tmp, 'g2/thumbs/dreamhack/blank/t__bad.jpg')), 'no thumbnail for the broken file');

        // chosen highlights (PRIO-THEME-02): used for the cell thumbnail and highlightImageUrl; hidden -> fallback
        const rootJson = JSON.parse(await fs.readFile(path.join(data, '7.json'), 'utf8'));
        const dhJson = JSON.parse(await fs.readFile(path.join(data, '10.json'), 'utf8'));
        const rootDh = rootJson.children.find((c: Child) => c.id === 10);
        assert.strictEqual(rootDh.highlightImageUrl, 'dreamhack/lordag2/b.jpg');
        assert.strictEqual(rootDh.thumbnailUrlPath, 'dreamhack/lordag2/t__b.jpg', 'cell shows the chosen highlight');
        assert.strictEqual(rootJson.metadata.highlightImageUrl, 'dreamhack/image/2005/c.png', 'root highlight through 3 albums');
        const dhL1 = dhJson.children.find((c: Child) => c.id === 11);
        assert.strictEqual(dhL1.highlightImageUrl, 'dreamhack/lordag1/a.jpg', 'hidden highlight falls back to the first photo');
        assert.strictEqual(dhL1.thumbnailUrlPath, 'dreamhack/lordag1/t__a.jpg');
        const dhL2 = dhJson.children.find((c: Child) => c.id === 12);
        assert.strictEqual(dhL2.highlightImageUrl, 'dreamhack/lordag2/b.jpg', 'no chosen highlight: first photo');

        // legacy.json (URL-02): Gallery 2 path -> new path for every exported album, photo id -> album id
        const legacy = JSON.parse(await fs.readFile(path.join(data, 'legacy.json'), 'utf8'));
        assert.strictEqual(legacy.albums[''], '/');
        assert.strictEqual(legacy.albums['dreamhack'], '/dreamhack');
        assert.strictEqual(legacy.albums['dreamhack/lordag1'], '/dreamhack/lordag');
        assert.strictEqual(legacy.albums['dreamhack/blank'], '/dreamhack/album_13');
        assert.strictEqual(legacy.albums['dreamhack/image/2005'], '/dreamhack/image/2005');
        assert.ok(!('hidden' in legacy.albums) && !('dreamhack/onlyhidden' in legacy.albums), 'ignored/unexported albums absent');
        assert.deepStrictEqual(legacy.photoAlbum, { 101: 11, 102: 12, 103: 13, 104: 15, 107: 12 }, 'ignored photos absent');

        // childCount (THEME-01): the album's exported items; ignored photos and unexported albums left out
        const dhFile = JSON.parse(await fs.readFile(path.join(data, '10.json'), 'utf8'));
        const childCounts = Object.fromEntries(dhFile.children.map((c: Child) => [c.id, c.childCount]));
        assert.deepStrictEqual(childCounts, { 11: 1, 12: 2, 13: 1, 14: 1 });
        // totalDescendantCount (PRIO-THEME-04): photos + exported sub-albums below
        assert.strictEqual(dhFile.children.find((c: Child) => c.id === 14).totalDescendantCount, 2, 'image: album 2005 + its photo');
        assert.strictEqual(dhFile.metadata.totalDescendantCount, 5 + 5, 'dreamhack: 5 photos + 5 exported albums (16 not exported)');

        // photo-page resizes (PRIO-THEME-05): only photos above the resize size get one
        const l2 = JSON.parse(await fs.readFile(path.join(data, '12.json'), 'utf8'));
        const big = l2.children.find((c: Child) => c.id === 107);
        assert.strictEqual(big.resizeUrlPath, 'dreamhack/lordag2/big.jpg');
        const bigMeta = await sharp(path.join(tmp, 'g2/resized/dreamhack/lordag2/big.jpg')).metadata();
        assert.deepStrictEqual([bigMeta.width, bigMeta.height], [1024, 709]);
        assert.ok(!('resizeUrlPath' in l2.children.find((c: Child) => c.id === 102)), 'small photo: no resize');
        await assert.rejects(() => fs.access(path.join(tmp, 'g2/resized/dreamhack/lordag2/b.jpg')));
        const rootFile = JSON.parse(await fs.readFile(path.join(data, '7.json'), 'utf8'));
        assert.strictEqual(rootFile.children.find((c: Child) => c.id === 10).childCount, 4, '16 (only hidden photos) not counted');

        // ignoreItems (SEC-18): hidden photos are not written, not thumbnailed, not used as album thumbnail
        const l1 = await readJson(path.join(data, '11.json'));
        assert.deepStrictEqual(l1.children.map((c: Child) => c.id), [101], 'ignored photo left out');
        assert.ok(!Object.values(pi).includes(16), 'album whose only photo is ignored is not exported');
        const all = JSON.stringify(await Promise.all((await fs.readdir(data)).filter((f) => f.endsWith('.json')).map((f) => readJson(path.join(data, f)))));
        assert.ok(!/secret/i.test(all), 'no trace of ignored photos in data/');
        await assert.rejects(fs.access(path.join(tmp, 'g2/thumbs/dreamhack/lordag/t__secret.jpg')), 'no thumbnail for an ignored photo');

        // search index written
        const search = await readJson(path.join(data, 'search', 'index.json'));
        assert.ok(search.items.some((i: { id: number }) => i.id === 15));

        // second run: previous output kept, nothing stale
        const again = await runExtraction({ sql: fakeSql, config, projectRoot: tmp, verify: false });
        assert.strictEqual(again.ok, true);
        const siblings = await fs.readdir(tmp);
        assert.ok(siblings.some((d) => d.startsWith('data.prev-')), 'previous output kept as data.prev-*');
    } finally {
        Object.assign(console, quiet);
        await fs.rm(tmp, { recursive: true, force: true });
    }
    console.log('extract e2e tests passed');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});

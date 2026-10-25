/**
 * End-to-end test of the extraction (TEST-03): runExtraction() over an in-memory Gallery 2 tree
 * (fake `sql`) and real image files in a temp dir, asserting on the written JSON and index.json.
 */

import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { runExtraction, type ExtractionSql } from './extract.ts';
import type { Child, Config } from './types.ts';

type Node = { id: number; type: 'GalleryAlbumItem' | 'GalleryPhotoItem'; title: string | null; pc: string; children?: Node[] };

const photo = (id: number, title: string, pc: string): Node => ({ id, type: 'GalleryPhotoItem', title, pc });
const album = (id: number, title: string | null, pc: string, children: Node[]): Node => ({ id, type: 'GalleryAlbumItem', title, pc, children });

const TREE: Node = album(7, 'Lanbilder', '', [
    album(10, 'Dreamhack', 'dreamhack', [
        album(11, 'Lördag', 'lordag1', [photo(105, 'Secret', 'secret.jpg'), photo(101, 'A', 'a.jpg')]), // 105 in ignoreItems
        album(16, 'Only hidden', 'onlyhidden', [photo(106, 'Secret 2', 'secret2.jpg')]), // only an ignored photo
        album(12, 'Lördag', 'lordag2', [photo(102, 'B', 'b.jpg')]), // duplicate title
        album(13, '', 'blank', [photo(103, 'Broken', 'bad.jpg')]), // blank title, truncated JPEG
        album(14, 'image', 'image', [album(15, '2005', '2005', [photo(104, 'Logo', 'c.png')])]), // LOGIC-28 shape
    ]),
    album(20, 'Empty', 'empty', []), // no image descendants: not exported
    album(30, 'Hidden', 'hidden', [photo(301, 'H', 'h.jpg')]), // in ignoreAlbums
]);

function byId(n: Node, id: number): Node | null {
    if (n.id === id) return n;
    for (const c of n.children ?? []) {
        const f = byId(c, id);
        if (f) return f;
    }
    return null;
}

function toChild(n: Node): Child {
    return {
        id: n.id, type: n.type, hasChildren: (n.children?.length ?? 0) > 0, title: n.title, description: null,
        pathComponent: n.pc, timestamp: 1_130_000_000 + n.id, width: 64, height: 48, thumb_width: null, thumb_height: null,
        ownerName: null, summary: null,
    } as Child;
}

const fakeSql = {
    getChildren: async (id: number) => (byId(TREE, id)?.children ?? []).map(toChild),
    getRootAlbumId: async () => 7,
    getRootAlbumInfo: async (id: number) => ({ id, title: 'Lanbilder', description: 'Bilder', timestamp: 1_130_000_000 }),
    getAlbumInfo: async (id: number) => {
        const n = byId(TREE, id)!;
        return { albumId: id, albumTitle: n.title, albumDescription: null, albumTimestamp: 1_130_000_000, ownerName: null };
    },
} as unknown as ExtractionSql;

async function writeImages(albumsRoot: string): Promise<void> {
    const jpg = await sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 200, g: 50, b: 50 } } }).jpeg().toBuffer();
    const png = await sharp({ create: { width: 64, height: 48, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
    const files: Array<[string, Buffer]> = [
        ['dreamhack/lordag1/a.jpg', jpg],
        ['dreamhack/lordag1/secret.jpg', jpg],
        ['dreamhack/onlyhidden/secret2.jpg', jpg],
        ['dreamhack/lordag2/b.jpg', jpg],
        ['dreamhack/blank/bad.jpg', jpg.subarray(0, Math.floor(jpg.length * 0.5))],
        ['dreamhack/image/2005/c.png', png],
        ['hidden/h.jpg', jpg],
    ];
    for (const [rel, buf] of files) {
        await fs.mkdir(path.dirname(path.join(albumsRoot, rel)), { recursive: true });
        await fs.writeFile(path.join(albumsRoot, rel), buf);
    }
}

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
            albumsRoot: 'g2/albums', thumbnailsRoot: 'g2/thumbs', verifyImagePaths: false,
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

        // childCount (THEME-01): the album's exported items; ignored photos and unexported albums left out
        const dhFile = JSON.parse(await fs.readFile(path.join(data, '10.json'), 'utf8'));
        const childCounts = Object.fromEntries(dhFile.children.map((c: Child) => [c.id, c.childCount]));
        assert.deepStrictEqual(childCounts, { 11: 1, 12: 1, 13: 1, 14: 1 });
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

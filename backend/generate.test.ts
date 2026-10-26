/**
 * Equivalence test (Sprint 15 T-04): the one-shot extractor over the fake Gallery 2 tree versus
 * import → SQLite → generateAll, file by file. Thumbnail generation off on both sides (T-05 adds it).
 */
import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { runExtraction } from './extract.ts';
import { importG2 } from './importG2.ts';
import { generateAll } from './generate.ts';
import { updateMedia } from './media.ts';
import sharp from 'sharp';
import { openDb } from './db/db.ts';
import { fakeSql, TREE_CONFIG, writeImages } from './fakeGallery.ts';
import type { Config } from './types.ts';

async function readJson(p: string): Promise<any> {
    return JSON.parse(await fs.readFile(p, 'utf-8'));
}

function sortKeys(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]));
    return v;
}

async function run(): Promise<void> {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'generate-'));
    const quiet = { log: console.log, warn: console.warn };
    console.log = () => {};
    console.warn = () => {};
    try {
        const config = { ...TREE_CONFIG, skipThumbnailGeneration: true } as Config;
        const ext = await runExtraction({ sql: fakeSql, config, projectRoot: tmp, verify: false });
        assert.strictEqual(ext.ok, true);
        const expected = path.join(tmp, 'data');

        const db = openDb();
        await importG2({ sql: fakeSql, config, db });
        const out = path.join(tmp, 'gen');
        const r = await generateAll(db, out, new Date('2026-10-26T12:00:00.000Z'));

        const expectedFiles = (await fs.readdir(expected)).filter((f) => f.endsWith('.json')).sort();
        const gotFiles = (await fs.readdir(out)).filter((f) => f.endsWith('.json')).sort();
        assert.deepStrictEqual(gotFiles, expectedFiles, 'same set of files');
        assert.strictEqual(r.albums, expectedFiles.length - 2, 'album files + index + legacy');
        for (const f of expectedFiles) {
            const a = await readJson(path.join(expected, f));
            const b = await readJson(path.join(out, f));
            if (f === 'index.json') { delete a.generatedAt; delete b.generatedAt; }
            assert.deepStrictEqual(sortKeys(b), sortKeys(a), `${f} differs`);
        }
        const sa = await readJson(path.join(expected, 'search', 'index.json'));
        const sb = await readJson(path.join(out, 'search', 'index.json'));
        delete sa.generatedAt; delete sb.generatedAt;
        sa.items.sort((x: { id: number }, y: { id: number }) => x.id - y.id);
        assert.deepStrictEqual(sortKeys(sb), sortKeys(sa), 'search index differs');

        // key order inside an album file is the extractor's too (byte-for-byte on the fake tree)
        for (const f of expectedFiles) {
            if (f === 'index.json' || f === 'legacy.json') continue;
            assert.strictEqual(await fs.readFile(path.join(out, f), 'utf-8'), await fs.readFile(path.join(expected, f), 'utf-8'), `${f} not byte-identical`);
        }
        db.close();

        // With derivatives (T-05): the extractor generates thumbnails and resizes; the media step
        // does the same from the database and the album files still match byte for byte.
        const tmp2 = await fs.mkdtemp(path.join(os.tmpdir(), 'generate-media-'));
        try {
            await writeImages(path.join(tmp2, 'g2/albums'));
            const cfg = { ...TREE_CONFIG } as Config;
            const ext2 = await runExtraction({ sql: fakeSql, config: cfg, projectRoot: tmp2, verify: false });
            assert.strictEqual(ext2.ok, true);
            const db2 = openDb();
            await importG2({ sql: fakeSql, config: cfg, db: db2 });
            const mediaOpts = {
                albumsRoot: path.join(tmp2, 'g2/albums'), thumbnailsRoot: path.join(tmp2, 'g2/thumbs2'), resizedRoot: path.join(tmp2, 'g2/resized2'),
                thumbOptions: { maxWidth: 400, maxHeight: 400, quality: 80 }, resizeOptions: { maxWidth: 1024, maxHeight: 1024, quality: 85 },
            };
            const m1 = await updateMedia(db2, mediaOpts);
            assert.deepStrictEqual([m1.photos, m1.generated, m1.failed, m1.resized, m1.missing], [5, 4, 1, 1, 0], 'a.jpg b.jpg big.jpg c.png generated, bad.jpg failed, big.jpg resized');
            const out2 = path.join(tmp2, 'gen');
            await generateAll(db2, out2);
            for (const f of (await fs.readdir(path.join(tmp2, 'data'))).filter((n) => /^\d+\.json$/.test(n))) {
                assert.strictEqual(await fs.readFile(path.join(out2, f), 'utf-8'), await fs.readFile(path.join(tmp2, 'data', f), 'utf-8'), `${f} not byte-identical with derivatives`);
            }
            const l2 = await readJson(path.join(out2, '12.json'));
            assert.strictEqual(l2.children.find((c: { id: number }) => c.id === 107).resizeUrlPath, 'dreamhack/lordag2/big.jpg');
            const bigMeta = await sharp(path.join(tmp2, 'g2/resized2/dreamhack/lordag2/big.jpg')).metadata();
            assert.deepStrictEqual([bigMeta.width, bigMeta.height], [1024, 709]);
            assert.strictEqual((await readJson(path.join(out2, '13.json'))).children[0].thumbnailMissing, true, 'the truncated JPEG');
            // second run: everything skipped
            const m2 = await updateMedia(db2, mediaOpts);
            assert.deepStrictEqual([m2.generated, m2.skipped, m2.failed], [0, 5, 0], 'the failed one is skipped too (unchanged file, failure recorded)');
            // a changed file (new mtime/size) is regenerated
            const a = path.join(tmp2, 'g2/albums/dreamhack/lordag1/a.jpg');
            await fs.writeFile(a, await sharp({ create: { width: 80, height: 60, channels: 3, background: { r: 1, g: 2, b: 3 } } }).jpeg().toBuffer());
            const m3 = await updateMedia(db2, mediaOpts);
            assert.strictEqual(m3.generated, 1);
            assert.strictEqual(db2.get<{ thumb_w: number }>('SELECT thumb_w FROM media WHERE item_id = 101')!.thumb_w, 80);
            db2.close();
        } finally {
            await fs.rm(tmp2, { recursive: true, force: true });
        }
    } finally {
        Object.assign(console, quiet);
        await fs.rm(tmp, { recursive: true, force: true });
    }
    console.log('generate equivalence tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

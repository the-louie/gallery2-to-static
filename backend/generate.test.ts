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
import { openDb } from './db/db.ts';
import { fakeSql, TREE_CONFIG } from './fakeGallery.ts';
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
    } finally {
        Object.assign(console, quiet);
        await fs.rm(tmp, { recursive: true, force: true });
    }
    console.log('generate equivalence tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

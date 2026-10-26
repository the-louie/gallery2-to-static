/**
 * Importer test (Sprint 15 T-03): the extraction test's fake Gallery 2 tree → SQLite; ignore lists
 * become hidden rows; highlights and legacy paths; a second run changes nothing.
 */
import assert from 'assert';
import { importG2, photoSegment } from './importG2.ts';
import { openDb } from './db/db.ts';
import { fakeSql, TREE_CONFIG } from './fakeGallery.ts';

async function run(): Promise<void> {
    const db = openDb();
    const r1 = await importG2({ sql: fakeSql, config: TREE_CONFIG, db });
    assert.strictEqual(r1.rootId, 7);
    assert.strictEqual(r1.albums, 9, 'every album below the root, hidden ones included');
    assert.strictEqual(r1.photos, 8);
    assert.strictEqual(r1.hidden, 4, '105, 106 (ignoreItems), 30 and its photo 301 (ignoreAlbums)');
    assert.strictEqual(r1.highlights, 4);

    const item = (id: number) => db.get<{ type: string; parent_id: number | null; position: number; title: string | null; path_component: string; url_segment: string; hidden: number; event_at: number }>('SELECT * FROM items WHERE id = ?', id)!;
    assert.strictEqual(item(7).parent_id, null);
    assert.strictEqual(item(7).title, 'Lanbilder');
    assert.deepStrictEqual([item(10).url_segment, item(10).position], ['dreamhack', 1]);
    // duplicate titles get disambiguated the way the extractor did (segment-id)
    assert.strictEqual(item(11).url_segment, 'lordag');
    assert.strictEqual(item(12).url_segment, 'lordag--12');
    assert.strictEqual(item(13).url_segment, 'album_13', 'blank title -> fallback segment');
    assert.strictEqual(item(101).url_segment, 'a');
    assert.strictEqual(item(101).event_at, 1_130_000_101);
    assert.deepStrictEqual([item(105).hidden, item(106).hidden, item(30).hidden, item(301).hidden, item(101).hidden], [1, 1, 1, 1, 0]);
    assert.strictEqual(item(20).hidden, 0, 'an empty album is kept, not hidden (the generator skips it)');

    const legacy = Object.fromEntries(db.all<{ g2_path: string; item_id: number }>('SELECT * FROM legacy_paths').map((r) => [r.g2_path, r.item_id]));
    assert.strictEqual(legacy[''], 7);
    assert.strictEqual(legacy['dreamhack/lordag2'], 12);
    assert.strictEqual(legacy['dreamhack/image/2005'], 15);

    const hl = Object.fromEntries(db.all<{ album_id: number; photo_id: number }>('SELECT * FROM highlights').map((r) => [r.album_id, r.photo_id]));
    assert.deepStrictEqual(hl, { 7: 104, 10: 102, 11: 105, 14: 104 });
    assert.strictEqual(db.setting('root_id'), '7');
    assert.strictEqual(db.setting('site_name'), 'Lanbilder');
    assert.strictEqual(db.setting('site_description'), 'Bilder');

    // idempotent: same counts, no duplicates, admin changes survive
    db.run("UPDATE items SET deleted_at = '2026-10-26T00:00:00.000Z', view_count = view_count + 5 WHERE id = 101");
    const before = db.get<{ n: number }>('SELECT count(*) AS n FROM items')!.n;
    const r2 = await importG2({ sql: fakeSql, config: TREE_CONFIG, db });
    assert.strictEqual(db.get<{ n: number }>('SELECT count(*) AS n FROM items')!.n, before);
    assert.strictEqual(r2.albums, r1.albums);
    const after = db.get<{ deleted_at: string | null; view_count: number }>('SELECT deleted_at, view_count FROM items WHERE id = 101')!;
    assert.strictEqual(after.deleted_at, '2026-10-26T00:00:00.000Z', 'soft delete kept');
    assert.strictEqual(after.view_count, 5, 'a higher local count is kept');
    assert.strictEqual(db.get<{ n: number }>('SELECT count(*) AS n FROM owners')!.n, 0, 'the fake tree has no owners');

    assert.strictEqual(photoSegment({ id: 1, pathComponent: 'dh/CIMG0053_.JPG', title: null }), 'cimg0053_');
    assert.strictEqual(photoSegment({ id: 1, pathComponent: 'x/bild 225.jpg', title: null }), 'bild_225');
    assert.strictEqual(photoSegment({ id: 9, pathComponent: '', title: null }), 'photo_9');
    db.close();
    console.log('importG2 tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

/**
 * Dirty tracking and the changed-branch run (Sprint 15 T-06): triggers mark albums, the run writes
 * only those files (+ancestors), rebuilds index/legacy/search, moves a no-longer-exported album's
 * file aside, and clears the dirty set.
 */
import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { importG2 } from './importG2.ts';
import { generateAll, generateChanged, dirtyWithAncestors } from './generate.ts';
import { openDb } from './db/db.ts';
import { fakeSql, TREE_CONFIG, writeImages } from './fakeGallery.ts';

const readJson = async (p: string) => JSON.parse(await fs.readFile(p, 'utf-8'));
const dirty = (db: ReturnType<typeof openDb>) => db.all<{ album_id: number }>('SELECT album_id FROM dirty_albums ORDER BY album_id').map((r) => r.album_id);

async function run(): Promise<void> {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'gen-changed-'));
    try {
        await writeImages(path.join(tmp, 'g2/albums'));
        const db = openDb();
        await importG2({ sql: fakeSql, config: TREE_CONFIG, db });
        assert.ok(dirty(db).length > 0, 'the import marks everything dirty');
        const media = {
            albumsRoot: path.join(tmp, 'g2/albums'), thumbnailsRoot: path.join(tmp, 'g2/thumbs'), resizedRoot: path.join(tmp, 'g2/resized'),
            thumbOptions: { maxWidth: 400, maxHeight: 400, quality: 80 }, resizeOptions: { maxWidth: 1024, maxHeight: 1024, quality: 85 },
        };
        const data = path.join(tmp, 'data');
        const { updateMedia } = await import('./media.ts');
        await updateMedia(db, media);
        await generateAll(db, data);
        db.run('DELETE FROM dirty_albums');
        assert.strictEqual(await generateChanged(db, data, media), null, 'nothing dirty -> nothing to do');

        // 1. a changed title: the album, its parent and the root are rewritten; others untouched
        const before = (await fs.stat(path.join(data, '11.json'))).mtimeMs;
        await new Promise((r) => setTimeout(r, 20));
        db.run("UPDATE items SET title = 'Söndag' WHERE id = 12");
        assert.deepStrictEqual(dirty(db), [10, 12]);
        assert.deepStrictEqual([...dirtyWithAncestors(db)].sort((a, b) => a - b), [7, 10, 12]);
        const r1 = await generateChanged(db, data, media);
        assert.deepStrictEqual([r1!.albums, r1!.removed, r1!.dirty], [3, 0, 2]);
        assert.strictEqual((await readJson(path.join(data, '12.json'))).metadata.albumTitle, 'Söndag');
        assert.strictEqual((await readJson(path.join(data, '10.json'))).children.find((c: { id: number }) => c.id === 12).title, 'Söndag');
        assert.strictEqual((await fs.stat(path.join(data, '11.json'))).mtimeMs, before, 'an unrelated album file is not rewritten');
        const search = await readJson(path.join(data, 'search/index.json'));
        assert.strictEqual(search.items.find((i: { id: number }) => i.id === 12).title, 'Söndag');
        assert.deepStrictEqual(dirty(db), [], 'dirty set cleared');
        assert.strictEqual(db.get<{ ok: number; mode: string }>('SELECT ok, mode FROM generation_runs ORDER BY id DESC LIMIT 1')!.ok, 1);

        // 2. a new photo in album 11: its file, thumbnail and the counts up the chain
        const jpg = await sharp({ create: { width: 90, height: 60, channels: 3, background: { r: 9, g: 9, b: 9 } } }).jpeg().toBuffer();
        await fs.writeFile(path.join(tmp, 'g2/albums/dreamhack/lordag1/new.jpg'), jpg);
        db.run("INSERT INTO items (type, parent_id, position, title, path_component, url_segment, event_at, width, height) VALUES ('photo', 11, 9, 'New', 'new.jpg', 'new', 1200000000, 90, 60)");
        assert.deepStrictEqual(dirty(db), [11]);
        const r2 = await generateChanged(db, data, media);
        assert.deepStrictEqual([r2!.albums, r2!.dirty], [3, 1]);
        const a11 = await readJson(path.join(data, '11.json'));
        const added = a11.children.find((c: { title: string }) => c.title === 'New');
        assert.strictEqual(added.urlPath, 'dreamhack/lordag1/new.jpg');
        assert.deepStrictEqual([added.thumb_width, added.thumb_height], [90, 60]);
        await fs.access(path.join(tmp, 'g2/thumbs/dreamhack/lordag1/t__new.jpg'));
        const a10 = await readJson(path.join(data, '10.json'));
        assert.strictEqual(a10.children.find((c: { id: number }) => c.id === 11).childCount, 2);
        assert.strictEqual(a10.metadata.totalDescendantImageCount, 6, '5 + the new photo');
        assert.strictEqual((await readJson(path.join(data, '7.json'))).children.find((c: { id: number }) => c.id === 10).totalDescendantImageCount, 6);
        assert.strictEqual((await readJson(path.join(data, 'legacy.json'))).photoAlbum[String(added.id)], 11);

        // 3. a soft-deleted album: its file moved aside, the parent no longer lists it, index/legacy forget its path
        db.run("UPDATE items SET deleted_at = '2026-10-26T13:00:00.000Z' WHERE id = 12");
        const r3 = await generateChanged(db, data, media);
        assert.deepStrictEqual([r3!.albums, r3!.removed], [2, 1]);
        await assert.rejects(fs.access(path.join(data, '12.json')));
        await fs.access(path.join(data, '.removed/12.json'));
        assert.ok(!(await readJson(path.join(data, '10.json'))).children.some((c: { id: number }) => c.id === 12));
        assert.ok(!('/dreamhack/lordag--12' in (await readJson(path.join(data, 'index.json'))).pathIndex));
        assert.ok(!('dreamhack/lordag2' in (await readJson(path.join(data, 'legacy.json'))).albums));
        assert.ok(!search.items.some((i: { id: number }) => i.id === 12) || !(await readJson(path.join(data, 'search/index.json'))).items.some((i: { id: number }) => i.id === 12));

        // 4. a highlight change and an owner rename mark the right albums
        db.run("INSERT INTO highlights (album_id, photo_id, chosen) VALUES (11, 101, 1) ON CONFLICT(album_id) DO UPDATE SET photo_id = 101");
        assert.deepStrictEqual(dirty(db), [10, 11]);
        db.run('DELETE FROM dirty_albums');
        db.run("INSERT INTO owners (id, nickname) VALUES (5, 'kalle')");
        db.run('UPDATE items SET owner_id = 5 WHERE id = 15');
        db.run('DELETE FROM dirty_albums');
        db.run("UPDATE owners SET nickname = 'Kalle' WHERE id = 5");
        assert.deepStrictEqual(dirty(db), [14, 15]);

        // 5. a change made during a run stays dirty afterwards (cleared rows are matched by their `since`)
        db.run('DELETE FROM dirty_albums');
        db.run("UPDATE items SET title = 'X' WHERE id = 13");
        const since = db.get<{ since: string }>('SELECT since FROM dirty_albums WHERE album_id = 13')!.since;
        db.run("INSERT OR REPLACE INTO dirty_albums (album_id, since) VALUES (13, ?)", since + 'later');
        const r5 = await generateChanged(db, data);
        assert.ok(r5);
        assert.deepStrictEqual(dirty(db), [], 'same rows -> cleared');
        db.close();
    } finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }
    console.log('generate-changed tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

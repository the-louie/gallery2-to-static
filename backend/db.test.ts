/**
 * Tests for the SQLite data master layer (FUT-01, Sprint 15 T-02): migrations, pragmas, helpers,
 * transactions, schema constraints.
 */
import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { openDb, listMigrations } from './db/db.ts';

async function run(): Promise<void> {
    const db = openDb();
    assert.deepStrictEqual(db.migrations(), [1, 2, 3, 4], 'schema (1), users/audit (2, Sprint 16), url lock (3, Sprint 18)');
    assert.strictEqual(db.get<{ foreign_keys: number }>('PRAGMA foreign_keys')?.foreign_keys, 1);
    const tables = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").map((r) => r.name);
    for (const t of ['owners', 'items', 'highlights', 'media', 'legacy_paths', 'view_counts', 'dirty_albums', 'settings', 'generation_runs', 'migrations']) {
        assert.ok(tables.includes(t), `table ${t}`);
    }

    // helpers + settings
    db.setSetting('root_id', '7');
    assert.strictEqual(db.setting('root_id'), '7');
    db.setSetting('root_id', '8');
    assert.strictEqual(db.setting('root_id'), '8');
    assert.strictEqual(db.setting('missing'), null);

    // items: root, album, photo; constraints
    db.run("INSERT INTO owners (id, nickname) VALUES (1, 'Gallery Administrator')");
    const root = db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment, title, owner_id) VALUES (7, 'album', NULL, '', '', 'lanbilder.se', 1)");
    assert.strictEqual(root.lastInsertRowid, 7);
    db.run("INSERT INTO items (id, type, parent_id, position, path_component, url_segment, title) VALUES (211, 'album', 7, 1, 'international', 'internationella', 'Internationella')");
    db.run("INSERT INTO items (id, type, parent_id, position, path_component, url_segment, title, width, height) VALUES (240, 'photo', 211, 1, 'a.jpg', 'a', 'a.jpg', 800, 600)");
    assert.throws(() => db.run("INSERT INTO items (type, parent_id, path_component, url_segment) VALUES ('photo', 211, 'a.jpg', 'x')"), /UNIQUE/, 'same file name under one parent refused');
    assert.throws(() => db.run("INSERT INTO items (type, parent_id, path_component, url_segment) VALUES ('album', 7, 'b', 'internationella')"), /UNIQUE/, 'album url segment unique among siblings');
    db.run("INSERT INTO items (type, parent_id, path_component, url_segment) VALUES ('photo', 211, 'a.JPG', 'a')"); // photo slugs may collide (real data)
    assert.throws(() => db.run("INSERT INTO items (type, parent_id, path_component, url_segment) VALUES ('video', 7, 'v', 'v')"), /CHECK/, 'type checked');
    assert.throws(() => db.run("INSERT INTO items (type, parent_id, path_component, url_segment) VALUES ('album', 999, 'v', 'v')"), /FOREIGN KEY/, 'parent must exist');
    const next = db.run("INSERT INTO items (type, parent_id, path_component, url_segment) VALUES ('album', 7, 'new', 'new')");
    assert.strictEqual(next.lastInsertRowid, 242, 'new ids continue above the imported ones');
    const row = db.get<{ changed_at: string; hidden: number; deleted_at: string | null }>('SELECT changed_at, hidden, deleted_at FROM items WHERE id = 242');
    assert.match(row!.changed_at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/, 'timestamps are ISO UTC');
    assert.strictEqual(row!.hidden, 0);
    assert.strictEqual(row!.deleted_at, null);

    // highlights / media / legacy / view counts / dirty
    db.run('INSERT INTO highlights (album_id, photo_id, chosen) VALUES (211, 240, 1)');
    db.run('INSERT INTO media (item_id, thumb_w, thumb_h, file_size, file_mtime) VALUES (240, 300, 225, 12345, 1700000000)');
    db.run("INSERT INTO legacy_paths (g2_path, item_id) VALUES ('international', 211)");
    db.run('INSERT INTO view_counts (item_id, pending) VALUES (240, 3)');
    assert.ok(db.all('SELECT * FROM dirty_albums').length >= 1, 'the inserts marked albums dirty (T-06 triggers)');

    // transactions roll back on error
    assert.throws(() => db.transaction(() => {
        db.run("INSERT INTO items (type, parent_id, path_component, url_segment) VALUES ('album', 7, 'tx', 'tx')");
        throw new Error('boom');
    }), /boom/);
    assert.strictEqual(db.get("SELECT id FROM items WHERE path_component = 'tx'"), undefined, 'rolled back');
    const v = db.transaction(() => db.run("INSERT INTO items (type, parent_id, path_component, url_segment) VALUES ('album', 7, 'tx2', 'tx2')").lastInsertRowid);
    assert.strictEqual(v, 243);

    // a file-backed database: WAL, migrations recorded once, reopen is idempotent
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'db-'));
    try {
        const file = path.join(tmp, 'g.sqlite');
        const d1 = openDb(file);
        assert.strictEqual(d1.get<{ journal_mode: string }>('PRAGMA journal_mode')?.journal_mode, 'wal');
        d1.setSetting('k', 'v');
        d1.close();
        const d2 = openDb(file);
        assert.deepStrictEqual(d2.migrations(), [1, 2, 3, 4]);
        assert.strictEqual(d2.setting('k'), 'v');
        d2.close();
    } finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }

    // migration files must be numbered from 002
    assert.strictEqual(listMigrations().length, 4);
    assert.strictEqual(listMigrations()[1][1], 'users-audit');
    db.close();
    console.log('db tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

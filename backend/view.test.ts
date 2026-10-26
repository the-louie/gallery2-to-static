/**
 * View counter tests (Sprint 16 T-02): visible items count (insert, then increment), hidden and
 * soft-deleted items and unknown or malformed ids give 404, the reply has no body and no cookie.
 */
import assert from 'assert';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createServer } from './server.ts';
import { countView } from './routes/view.ts';
import { openDb } from './db/db.ts';

async function run(): Promise<void> {
    const db = openDb();
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment, title) VALUES (7, 'album', NULL, '', '', 'root')");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (10, 'album', 7, 'a', 'a')");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment, width, height) VALUES (101, 'photo', 10, 'a.jpg', 'a', 800, 600)");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment, hidden) VALUES (102, 'photo', 10, 'h.jpg', 'h', 1)");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment, deleted_at) VALUES (103, 'photo', 10, 'd.jpg', 'd', '2026-10-01T00:00:00.000Z')");

    // the function
    const pending = (id: number) => { const r = db.get<{ pending: number; updated_at: string }>('SELECT pending, updated_at FROM view_counts WHERE item_id = ?', id); return r && { ...r }; };
    assert.strictEqual(countView(db, 101, new Date('2026-10-26T10:00:00.000Z')), true);
    assert.deepStrictEqual(pending(101), { pending: 1, updated_at: '2026-10-26T10:00:00.000Z' });
    assert.strictEqual(countView(db, 101, new Date('2026-10-26T10:00:01.000Z')), true);
    assert.deepStrictEqual(pending(101), { pending: 2, updated_at: '2026-10-26T10:00:01.000Z' });
    assert.strictEqual(countView(db, 10), true, 'albums count too');
    assert.strictEqual(countView(db, 102), false, 'hidden');
    assert.strictEqual(countView(db, 103), false, 'soft-deleted');
    assert.strictEqual(countView(db, 999), false, 'unknown');
    assert.strictEqual(pending(102), undefined);
    assert.strictEqual(db.all('SELECT * FROM view_counts').length, 2);

    // the route
    const server = createServer({ db, port: 0, log: () => {} });
    await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
        const ok = await fetch(`${base}/api/view/101`, { method: 'POST' });
        assert.strictEqual(ok.status, 204);
        assert.strictEqual(await ok.text(), '');
        assert.strictEqual(ok.headers.get('set-cookie'), null, 'no cookies');
        assert.strictEqual(ok.headers.get('content-type'), null, 'no body');
        assert.strictEqual(pending(101)!.pending, 3);
        for (const id of ['102', '103', '999', 'abc', '-1', '1.5', '101%00']) {
            const r = await fetch(`${base}/api/view/${id}`, { method: 'POST' });
            assert.strictEqual(r.status, 404, `id ${id}`);
        }
        assert.strictEqual((await fetch(`${base}/api/view/101`)).status, 405, 'GET is not allowed');
        assert.strictEqual(pending(101)!.pending, 3, 'refused requests count nothing');
    } finally {
        server.close();
        db.close();
    }
    console.log('view tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

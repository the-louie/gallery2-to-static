/**
 * Album routes (Sprint 18 T-01): create/edit/hide/delete/restore through the HTTP API for an admin
 * and a delegate, the URL-segment lock, the trash moves, the audit rows, the onChange hook.
 */
import assert from 'assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { openDb } from './db/db.ts';
import { createServer } from './server.ts';
import { SESSION_COOKIE, createSession, setSessionTotpOk, signSessionId } from './auth/session.ts';
import { importG2 } from './importG2.ts';
import { fakeSql, TREE_CONFIG } from './fakeGallery.ts';
import { createAuditSink } from './audit.ts';

async function run(): Promise<void> {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'albums-'));
    const albumsRoot = path.join(tmp, 'albums');
    const db = openDb();
    await importG2({ sql: fakeSql, config: TREE_CONFIG, db });
    fs.mkdirSync(path.join(albumsRoot, 'dreamhack', 'lordag1'), { recursive: true });
    fs.writeFileSync(path.join(albumsRoot, 'dreamhack', 'lordag1', 'a.jpg'), 'x');
    db.run("INSERT INTO users (id, email, role, totp_secret, totp_verified_at) VALUES (1, 'admin@example.com', 'admin', 'S', '2026-01-01T00:00:00.000Z')");
    db.run("INSERT INTO users (id, email, role, nickname, totp_secret, totp_verified_at) VALUES (2, 'kalle@example.com', 'user', 'kalle', 'S', '2026-01-01T00:00:00.000Z')");
    db.run('INSERT INTO user_albums (user_id, album_id) VALUES (2, 10)'); // Dreamhack subtree delegated to kalle
    const secret = Buffer.from('s'.repeat(32));
    let changes = 0;
    const server = createServer({ db, port: 0, log: () => {}, sessionSecret: secret, audit: createAuditSink(db, path.join(tmp, 'audit.jsonl')), albumsRoot, onChange: () => { changes += 1; },
        verifyJwt: async (token) => ({ email: token, sub: token, exp: 0 }) });
    await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const cookie = (userId: number) => { const s = createSession(db, userId); setSessionTotpOk(db, s.id); return `${SESSION_COOKIE}=${signSessionId(s.id, secret)}`; };
    const admin = { email: 'admin@example.com', cookie: cookie(1) };
    const kalle = { email: 'kalle@example.com', cookie: cookie(2) };
    const call = async (who: { email: string; cookie: string }, method: string, p: string, body?: unknown) => {
        const res = await fetch(base + p, { method, headers: { 'cf-access-jwt-assertion': who.email, cookie: who.cookie, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
        return { status: res.status, body: res.status === 204 ? null : await res.json() };
    };
    try {
        // root view: admin sees the root; kalle sees the delegated album
        const rootA = await call(admin, 'GET', '/api/albums/root');
        assert.strictEqual(rootA.status, 200);
        assert.strictEqual(rootA.body.album.id, 7);
        assert.ok(rootA.body.children.some((c: { id: number }) => c.id === 30), 'admin sees hidden albums');
        const rootK = await call(kalle, 'GET', '/api/albums/root');
        assert.strictEqual(rootK.body.album, null);
        assert.deepStrictEqual(rootK.body.children.map((c: { id: number; canWrite: boolean }) => [c.id, c.canWrite]), [[10, true]]);
        const view = await call(kalle, 'GET', '/api/albums/10');
        assert.strictEqual(view.body.album.path, '/dreamhack/');
        assert.deepStrictEqual(view.body.breadcrumb.map((b: { title: string }) => b.title), ['Lanbilder', 'Dreamhack']);
        assert.ok(view.body.children.every((c: { canWrite: boolean }) => c.canWrite));
        assert.strictEqual((await call(kalle, 'GET', '/api/albums/20')).body.children.length, 0, 'readable but outside: visible children only');

        // create: kalle under Dreamhack ok, under the root forbidden (403 audited); admin anywhere
        const forbidden = await call(kalle, 'POST', '/api/albums', { parentId: 7, title: 'Nope' });
        assert.strictEqual(forbidden.status, 403);
        const created = await call(kalle, 'POST', '/api/albums', { parentId: 10, title: 'Testlan 2026', description: 'd', eventAt: 1_800_000_000 });
        assert.strictEqual(created.status, 201);
        const a = created.body;
        assert.deepStrictEqual([a.type, a.parentId, a.hidden, a.urlSegment, a.path, a.urlLocked, a.owner, a.canWrite], ['album', 10, true, 'testlan_2026', '/dreamhack/testlan_2026/', false, 'kalle', true]);
        assert.ok(a.id > 301, 'ids continue above the imported ones');
        assert.ok(fs.statSync(path.join(albumsRoot, 'dreamhack', 'testlan_2026')).isDirectory(), 'directory created');
        assert.strictEqual(changes, 1);
        // an unwritable albums root leaves no row behind (the operator's first attempt hit a read-only sandbox)
        fs.chmodSync(path.join(albumsRoot, 'dreamhack'), 0o500);
        const ro = await call(kalle, 'POST', '/api/albums', { parentId: 10, title: 'Nowrite' });
        fs.chmodSync(path.join(albumsRoot, 'dreamhack'), 0o755);
        assert.strictEqual(ro.status, 500);
        assert.match(ro.body.error, /cannot create the album directory/);
        assert.strictEqual(db.get("SELECT 1 FROM items WHERE title = 'Nowrite'"), undefined, 'no row for a failed mkdir');
        const dup = await call(kalle, 'POST', '/api/albums', { parentId: 10, title: 'Testlan 2026' });
        assert.notStrictEqual(dup.body.urlSegment, a.urlSegment, 'a duplicate title gets a distinct segment');
        assert.strictEqual((await call(kalle, 'POST', '/api/albums', { parentId: 10, title: '' })).status, 400);
        assert.strictEqual((await call(kalle, 'POST', '/api/albums', { parentId: 999, title: 'x' })).status, 403, '403 before 404');

        // edit: fields, position; url segment free while unlocked, locked afterwards (admin force)
        const edited = await call(kalle, 'PATCH', `/api/albums/${a.id}`, { title: 'Testlan 2026 (bilder)', summary: 's', urlSegment: 'testlan-2026' });
        assert.strictEqual(edited.status, 200);
        assert.deepStrictEqual([edited.body.title, edited.body.summary, edited.body.urlSegment], ['Testlan 2026 (bilder)', 's', 'testlan-2026']);

        // owner override (OWNER-01): set on album 10 — trimmed, and marks the whole subtree dirty so it
        // cascades; whitespace/'' clears it.
        db.run('DELETE FROM dirty_albums');
        const ov = await call(kalle, 'PATCH', '/api/albums/10', { ownerOverride: '  Glitched ' });
        assert.deepStrictEqual([ov.status, ov.body.ownerOverride], [200, 'Glitched'], 'set + trimmed');
        const dirty = db.all<{ album_id: number }>('SELECT album_id FROM dirty_albums').map((d) => d.album_id);
        assert.ok(dirty.includes(10) && dirty.includes(11), 'owner override cascades dirty to the subtree');
        assert.strictEqual((await call(kalle, 'PATCH', '/api/albums/10', { ownerOverride: '   ' })).body.ownerOverride, null, 'whitespace clears');
        db.run("UPDATE items SET url_locked_at = '2026-10-26T00:00:00.000Z' WHERE id = ?", a.id);
        assert.strictEqual((await call(kalle, 'PATCH', `/api/albums/${a.id}`, { urlSegment: 'other' })).status, 409, 'locked for a user');
        assert.strictEqual((await call(admin, 'PATCH', `/api/albums/${a.id}`, { urlSegment: 'other' })).status, 409, 'admin needs force');
        const forced = await call(admin, 'PATCH', `/api/albums/${a.id}`, { urlSegment: 'other', force: true });
        assert.strictEqual(forced.body.urlSegment, 'other');
        assert.ok(db.get("SELECT 1 FROM legacy_paths WHERE g2_path = 'clean:/dreamhack/testlan-2026/'"), 'the old public path is recorded');
        assert.strictEqual((await call(kalle, 'PATCH', `/api/albums/${a.id}`, { title: 'T', eventAt: 'yesterday' })).status, 400);

        // hidden toggle
        const shown = await call(kalle, 'PUT', `/api/albums/${a.id}/hidden`, { hidden: false });
        assert.strictEqual(shown.body.hidden, false);
        assert.strictEqual((await call(kalle, 'PUT', '/api/albums/7/hidden', { hidden: true })).status, 403);

        // delete (files to .trash) and restore (admin only)
        fs.writeFileSync(path.join(albumsRoot, 'dreamhack', 'testlan_2026', 'p.jpg'), 'y');
        const del = await call(kalle, 'DELETE', `/api/albums/${a.id}`);
        assert.strictEqual(del.status, 204);
        assert.ok(fs.existsSync(path.join(albumsRoot, '.trash', String(a.id), 'p.jpg')), 'files moved to the trash');
        assert.ok(!fs.existsSync(path.join(albumsRoot, 'dreamhack', 'testlan_2026')), 'the directory keeps its path component, not the url segment');
        assert.ok((await call(kalle, 'GET', '/api/albums/10')).body.children.some((c: { id: number; deletedAt: string | null }) => c.id === a.id && c.deletedAt), 'a writer still sees it');
        assert.strictEqual((await call(kalle, 'POST', `/api/albums/${a.id}/restore`)).status, 403, 'restore is admin only');
        const back = await call(admin, 'POST', `/api/albums/${a.id}/restore`);
        assert.strictEqual(back.body.deletedAt, null);
        assert.ok(fs.existsSync(path.join(albumsRoot, 'dreamhack', 'testlan_2026', 'p.jpg')), 'files back in place');
        assert.strictEqual((await call(admin, 'DELETE', '/api/albums/7')).status, 400, 'the root cannot be deleted');

        // thumbnails: an album with a generated highlight thumbnail reports it, photos too
        db.run("INSERT INTO media (item_id, thumb_w, thumb_h, thumb_at, file_size, file_mtime) VALUES (101, 300, 225, '2026-10-26T00:00:00.000Z', 1, 1)");
        const l1 = await call(kalle, 'GET', '/api/albums/11');
        assert.strictEqual(l1.body.album.thumbnailUrl, '/g2data/thumbnails/dreamhack/lordag1/t__a.jpg');
        assert.strictEqual(l1.body.children.find((c: { id: number }) => c.id === 101).thumbnailUrl, '/g2data/thumbnails/dreamhack/lordag1/t__a.jpg');
        assert.strictEqual(l1.body.children.find((c: { id: number }) => c.id === 101).path, '/dreamhack/lordag/a');

        // photos (T-03): edit, highlight, order, delete/restore
        const pe = await call(kalle, 'PATCH', '/api/photos/101', { title: 'Första bilden', eventAt: 1_150_000_000 });
        assert.deepStrictEqual([pe.status, pe.body.title, pe.body.eventAt], [200, 'Första bilden', 1_150_000_000]);

        // photographer (Glitched): single edit trims, whitespace/'' clears; bulk sets many at once in one
        // request, 403 if any id is outside the delegated subtree, 400 on a bad body.
        const pph = await call(kalle, 'PATCH', '/api/photos/101', { photographer: '  Jane Doe  ' });
        assert.deepStrictEqual([pph.status, pph.body.photographer], [200, 'Jane Doe'], 'trimmed');
        assert.strictEqual((await call(kalle, 'PATCH', '/api/photos/101', { photographer: '   ' })).body.photographer, null, 'whitespace clears it');
        const bulk = await call(kalle, 'PATCH', '/api/photos', { ids: [101, 102], photographer: 'Erik Foto' });
        assert.strictEqual(bulk.status, 200);
        assert.deepStrictEqual(
            bulk.body.map((i: { id: number; photographer: string | null }) => [i.id, i.photographer]).sort(),
            [[101, 'Erik Foto'], [102, 'Erik Foto']],
            'both photos updated in one request',
        );
        assert.strictEqual((await call(kalle, 'PATCH', '/api/photos', { ids: [101, 301], photographer: 'x' })).status, 403, 'bulk 403 if any id is outside the subtree');
        assert.strictEqual((await call(kalle, 'GET', '/api/albums/11')).body.children.find((c: { id: number }) => c.id === 101).photographer, 'Erik Foto', 'the 403 bulk wrote nothing: 101 unchanged');
        assert.strictEqual((await call(kalle, 'PATCH', '/api/photos', { ids: [], photographer: 'x' })).status, 400, 'bulk needs a non-empty ids array');
        assert.strictEqual((await call(kalle, 'PATCH', '/api/photos', { ids: [101] })).status, 400, 'bulk needs a field');
        // per-photo owner override (OWNER-02): single and bulk, same mechanism as the photographer
        assert.strictEqual((await call(kalle, 'PATCH', '/api/photos/101', { ownerOverride: '  Anton ' })).body.ownerOverride, 'Anton', 'single owner override, trimmed');
        const bulkOv = await call(kalle, 'PATCH', '/api/photos', { ids: [101, 102], ownerOverride: 'Glitched' });
        assert.strictEqual(bulkOv.status, 200);
        assert.deepStrictEqual(
            bulkOv.body.map((i: { id: number; ownerOverride: string | null }) => [i.id, i.ownerOverride]).sort(),
            [[101, 'Glitched'], [102, 'Glitched']],
            'bulk owner override on both photos',
        );
        assert.strictEqual((await call(kalle, 'PATCH', '/api/photos/301', { title: 'x' })).status, 403, 'outside the delegated subtree');
        assert.strictEqual((await call(kalle, 'GET', '/api/albums/11')).body.album.currentHighlightPhotoId, 101, 'default highlight = the first photo');
        const hl = await call(kalle, 'PUT', '/api/albums/10/highlight', { photoId: 101 });
        assert.deepStrictEqual([hl.status, hl.body.highlightPhotoId, hl.body.currentHighlightPhotoId], [200, 101, 101]);
        assert.strictEqual((await call(kalle, 'PUT', '/api/albums/10/highlight', { photoId: 301 })).status, 404, 'a blocked (Gallery 2 ignore list) photo is never a highlight');
        assert.strictEqual((await call(kalle, 'PUT', '/api/albums/11/highlight', { photoId: 102 })).status, 400, 'a photo outside the album');
        assert.strictEqual((await call(kalle, 'PUT', '/api/albums/10/highlight', { photoId: null })).body.highlightPhotoId, null);
        const kids = (await call(kalle, 'GET', '/api/albums/12')).body.children.map((c: { id: number }) => c.id);
        const ordered = await call(kalle, 'PUT', '/api/albums/12/order', { ids: [...kids].reverse() });
        assert.strictEqual(ordered.status, 200);
        assert.deepStrictEqual((await call(kalle, 'GET', '/api/albums/12')).body.children.map((c: { id: number }) => c.id), [...kids].reverse());
        assert.strictEqual((await call(kalle, 'PUT', '/api/albums/12/order', { ids: [kids[0]] })).status, 400, 'every child must be listed');
        const ph = await call(kalle, 'PUT', '/api/photos/101/hidden', { hidden: true });
        assert.deepStrictEqual([ph.status, ph.body.hidden], [200, true]);
        await call(kalle, 'PUT', '/api/albums/11/highlight', { photoId: 101 });
        assert.strictEqual((await call(kalle, 'GET', '/api/albums/11')).body.album.currentHighlightPhotoId, 101, 'a hidden photo stays the chosen highlight');
        await call(kalle, 'PUT', '/api/photos/101/hidden', { hidden: false });
        const pd = await call(kalle, 'DELETE', '/api/photos/101');
        assert.strictEqual(pd.status, 204);
        assert.ok(fs.existsSync(path.join(albumsRoot, '.trash', '101', 'a.jpg')), 'photo file in the trash');
        assert.strictEqual((await call(kalle, 'POST', '/api/photos/101/restore')).status, 403);
        const pr = await call(admin, 'POST', '/api/photos/101/restore');
        assert.strictEqual(pr.body.deletedAt, null);
        assert.ok(fs.existsSync(path.join(albumsRoot, 'dreamhack', 'lordag1', 'a.jpg')), 'photo file back');
        assert.ok(!fs.existsSync(path.join(albumsRoot, '.trash', '101')), 'its trash directory removed');

        // pending (operator): a changed item shows pending until its album is regenerated
        db.run('DELETE FROM dirty_albums');
        assert.strictEqual((await call(kalle, 'GET', '/api/albums/11')).body.album.pending, false);
        await call(kalle, 'PATCH', '/api/photos/101', { title: 'Pending title' });
        const pv = await call(kalle, 'GET', '/api/albums/11');
        assert.strictEqual(pv.body.album.pending, true, 'the album is dirty');
        assert.strictEqual(pv.body.children.find((c: { id: number }) => c.id === 101).pending, true, 'the changed photo');
        db.run('DELETE FROM dirty_albums');
        assert.strictEqual((await call(kalle, 'GET', '/api/albums/11')).body.children.find((c: { id: number }) => c.id === 101).pending, false, 'published');

        // audit and onChange
        const actions = db.all<{ action: string; result: string }>('SELECT action, result FROM audit_log ORDER BY id').map((r) => `${r.action}:${r.result}`);
        for (const x of ['authorize:denied', 'album create:ok', 'album update:ok', 'album hide:ok', 'album unhide:ok', 'album delete:ok', 'album restore:ok']) assert.ok(actions.includes(x) || actions.includes(x.replace('hide:ok', 'unhide:ok')), `audit has ${x}`);
        assert.ok(changes >= 7, `onChange called per write (${changes})`);
    } finally {
        server.close();
        db.close();
        fs.rmSync(tmp, { recursive: true, force: true });
    }
    console.log('albums tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

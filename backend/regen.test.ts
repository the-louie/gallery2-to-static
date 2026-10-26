/**
 * Regeneration wiring (Sprint 18 T-04): writes ask the queue, the status route reports it, a run
 * locks the URL segments of the albums it published.
 */
import assert from 'assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { openDb } from './db/db.ts';
import { createServer } from './server.ts';
import { RegenQueue } from './regenQueue.ts';
import { SESSION_COOKIE, createSession, setSessionTotpOk, signSessionId } from './auth/session.ts';
import { importG2 } from './importG2.ts';
import { fakeSql, TREE_CONFIG } from './fakeGallery.ts';
import { generateAll } from './generate.ts';

async function run(): Promise<void> {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'regen-'));
    const db = openDb();
    await importG2({ sql: fakeSql, config: TREE_CONFIG, db });
        db.setSetting('album_sort', 'position');
    db.run("INSERT INTO users (id, email, role, totp_secret, totp_verified_at) VALUES (1, 'admin@example.com', 'admin', 'S', '2026-01-01T00:00:00.000Z')");
    const secret = Buffer.from('s'.repeat(32));
    let runs = 0;
    const queue = new RegenQueue(async () => { runs += 1; await new Promise((r) => setTimeout(r, 30)); }, { delayMs: 20 });
    const server = createServer({ db, port: 0, log: () => {}, sessionSecret: secret, audit: () => {}, albumsRoot: path.join(tmp, 'albums'), regen: queue, verifyJwt: async (t) => ({ email: t, sub: t, exp: 0 }) });
    await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const s = createSession(db, 1); setSessionTotpOk(db, s.id);
    const headers = { 'cf-access-jwt-assertion': 'admin@example.com', cookie: `${SESSION_COOKIE}=${signSessionId(s.id, secret)}`, 'content-type': 'application/json' };
    const call = async (method: string, p: string, body?: unknown) => { const r = await fetch(base + p, { method, headers, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json() }; };
    try {
        const idle = await call('GET', '/api/regen/status');
        assert.deepStrictEqual([idle.status, idle.body.pending, idle.body.running, idle.body.lastRun], [200, false, false, null]);
        // a write schedules a run; the status shows pending, then running, then done
        const created = await call('POST', '/api/albums', { parentId: 7, title: 'Nytt' });
        assert.strictEqual(created.status, 201);
        assert.strictEqual((await call('GET', '/api/regen/status')).body.pending, true);
        await queue.idle();
        assert.strictEqual(runs, 1, 'one run for the write');
        assert.strictEqual((await call('GET', '/api/regen/status')).body.pending, false);
        // a manual run (admin)
        assert.deepStrictEqual((await call('POST', '/api/regen')).body, { ok: true });
        await queue.idle();
        assert.strictEqual(runs, 2);

        // the generator locks the URL segment of every album it writes while visible, not hidden ones
        db.run('DELETE FROM dirty_albums');
        const data = path.join(tmp, 'data');
        await generateAll(db, data, new Date('2026-10-26T15:00:00.000Z'));
        const locked = db.all<{ id: number; url_locked_at: string | null; hidden: number }>('SELECT id, url_locked_at, hidden FROM items WHERE type = \'album\' ORDER BY id');
        assert.strictEqual(locked.find((r) => r.id === 10)!.url_locked_at, '2026-10-26T15:00:00.000Z');
        assert.strictEqual(locked.find((r) => r.id === 30)!.url_locked_at, null, 'hidden album not locked');
        assert.strictEqual(locked.find((r) => r.id === created.body.id)!.url_locked_at, null, 'the new (hidden) album not locked');
        assert.strictEqual(locked.find((r) => r.id === 20)!.url_locked_at, null, 'an empty album is not published, so not locked');
        assert.deepStrictEqual(db.all('SELECT album_id FROM dirty_albums'), [], 'locking marks nothing dirty');
        const st = await call('GET', '/api/regen/status');
        assert.deepStrictEqual([st.body.lastRun, st.body.dirty], [null, 0], 'generateAll without the CLI records no run');
    } finally {
        queue.cancel();
        server.close();
        db.close();
        fs.rmSync(tmp, { recursive: true, force: true });
    }
    console.log('regen tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

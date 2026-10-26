/**
 * Profiles (Sprint 18 T-05): nickname rules and uniqueness (users and Gallery 2 owners), full name
 * opt-in reaching the owner row and the generated owner name, pictures, the first-login name copy,
 * the first admin via the CLI flag.
 */
import assert from 'assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { once } from 'node:events';
import { execFileSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import sharp from 'sharp';
import { openDb } from './db/db.ts';
import { createServer } from './server.ts';
import { SESSION_COOKIE, createSession, setSessionTotpOk, signSessionId } from './auth/session.ts';
import { importG2 } from './importG2.ts';
import { fakeSql, TREE_CONFIG } from './fakeGallery.ts';
import { ownerForUser } from './albums.ts';
import { findUserById } from './auth/users.ts';
import { Tree } from './tree.ts';

async function run(): Promise<void> {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-'));
    const db = openDb();
    await importG2({ sql: fakeSql, config: TREE_CONFIG, db });
    db.run("INSERT INTO owners (id, nickname) VALUES (9, 'Gallery Administrator')");
    db.run("INSERT INTO users (id, email, role, totp_secret, totp_verified_at) VALUES (1, 'admin@example.com', 'admin', 'S', '2026-01-01T00:00:00.000Z')");
    db.run("INSERT INTO users (id, email, role, nickname, totp_secret, totp_verified_at) VALUES (2, 'kalle@example.com', 'user', 'kalle', 'S', '2026-01-01T00:00:00.000Z')");
    db.run("INSERT INTO users (id, email, role, totp_secret, totp_verified_at) VALUES (3, 'new@example.com', 'user', 'S', '2026-01-01T00:00:00.000Z')");
    const secret = Buffer.from('s'.repeat(32));
    let changes = 0;
    const avatarsDir = path.join(tmp, 'avatars');
    const server = createServer({ db, port: 0, log: () => {}, sessionSecret: secret, audit: () => {}, avatarsDir, albumsRoot: path.join(tmp, 'albums'), onChange: () => { changes += 1; },
        verifyJwt: async (t) => (t === 'new@example.com' ? { email: t, sub: t, exp: 0, name: 'Nils Ny' } : { email: t, sub: t, exp: 0 }) });
    await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const cookie = (id: number) => { const s = createSession(db, id); setSessionTotpOk(db, s.id); return `${SESSION_COOKIE}=${signSessionId(s.id, secret)}`; };
    const kalle = { 'cf-access-jwt-assertion': 'kalle@example.com', cookie: cookie(2) };
    const admin = { 'cf-access-jwt-assertion': 'admin@example.com', cookie: cookie(1) };
    const call = async (h: Record<string, string>, method: string, p: string, body?: unknown) => { const r = await fetch(base + p, { method, headers: { ...h, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: r.headers.get('content-type')?.includes('json') ? await r.json() : await r.arrayBuffer() }; };
    try {
        const p0 = await call(kalle, 'GET', '/api/me/profile');
        assert.deepStrictEqual(p0.body, { nickname: 'kalle', fullName: null, showFullName: false, hasPicture: false, email: 'kalle@example.com', role: 'user' });
        // nickname rules
        assert.strictEqual((await call(kalle, 'PUT', '/api/me/profile', { nickname: 'k' })).status, 400);
        assert.strictEqual((await call(kalle, 'PUT', '/api/me/profile', { nickname: 'Gallery Administrator' })).status, 409, 'a Gallery 2 owner name');
        assert.strictEqual((await call(kalle, 'PUT', '/api/me/profile', { nickname: 'gallery administrator' })).status, 409, 'case-insensitive');
        db.run("UPDATE users SET nickname = 'Nisse' WHERE id = 3");
        assert.strictEqual((await call(kalle, 'PUT', '/api/me/profile', { nickname: 'nisse' })).status, 409, 'another user');
        // owner row follows the profile and the generated owner name honours the opt-in
        ownerForUser(db, findUserById(db, 2)!);
        db.run('UPDATE items SET owner_id = (SELECT id FROM owners WHERE email = ?) WHERE id = 12', 'kalle@example.com');
        const p1 = await call(kalle, 'PUT', '/api/me/profile', { nickname: 'Kalle K', fullName: 'Kalle Karlsson', showFullName: true });
        assert.deepStrictEqual([p1.status, p1.body.nickname, p1.body.fullName, p1.body.showFullName], [200, 'Kalle K', 'Kalle Karlsson', true]);
        assert.deepStrictEqual({ ...db.get('SELECT nickname, full_name, show_full_name FROM owners WHERE email = ?', 'kalle@example.com') }, { nickname: 'Kalle K', full_name: 'Kalle Karlsson', show_full_name: 1 });
        assert.strictEqual(new Tree(db).byId.get(12)!.owner_name, 'Kalle Karlsson', 'generator shows the full name');
        await call(kalle, 'PUT', '/api/me/profile', { showFullName: false });
        assert.strictEqual(new Tree(db).byId.get(12)!.owner_name, 'Kalle K');
        assert.ok(db.get('SELECT 1 FROM dirty_albums WHERE album_id = 12'), 'the owner change marks the album dirty');
        assert.ok(changes >= 2);
        // picture: upload, fetch, admin fetch, user cannot fetch others
        const png = await sharp({ create: { width: 600, height: 300, channels: 3, background: { r: 10, g: 200, b: 10 } } }).png().toBuffer();
        const form = new FormData(); form.append('file', new Blob([png], { type: 'image/png' }), 'me.png');
        const up = await fetch(`${base}/api/me/picture`, { method: 'PUT', headers: kalle, body: form });
        assert.strictEqual(up.status, 200);
        assert.strictEqual((await up.json()).hasPicture, true);
        const pic = await fetch(`${base}/api/me/picture`, { headers: kalle });
        assert.strictEqual(pic.headers.get('content-type'), 'image/jpeg');
        const meta = await sharp(Buffer.from(await pic.arrayBuffer())).metadata();
        assert.deepStrictEqual([meta.width, meta.height, meta.format], [256, 256, 'jpeg']);
        assert.strictEqual((await fetch(`${base}/api/users/2/picture`, { headers: admin })).status, 200);
        assert.strictEqual((await fetch(`${base}/api/users/2/picture`, { headers: kalle })).status, 403);
        assert.strictEqual((await fetch(`${base}/api/me/picture`, { headers: admin })).status, 404, 'no picture yet');
        const bad = new FormData(); bad.append('file', new Blob([Buffer.from('nope')]), 'x.txt');
        assert.strictEqual((await fetch(`${base}/api/me/picture`, { method: 'PUT', headers: kalle, body: bad })).status, 400);
        assert.strictEqual(fs.readdirSync(path.join(avatarsDir, '.tmp')).length, 0, 'temp files cleaned');
        // first login copies the Access name into an empty full name
        const first = await fetch(`${base}/api/me`, { headers: { 'cf-access-jwt-assertion': 'new@example.com' } });
        assert.strictEqual(first.status, 401, 'totp required, but the session was created');
        assert.strictEqual(findUserById(db, 3)!.full_name, 'Nils Ny');
        // the CLI flag creates an admin
        const dbFile = path.join(tmp, 'cli.sqlite');
        const out = execFileSync(process.execPath, ['--no-warnings=ExperimentalWarning', 'server.ts', '--invite-admin', 'Boss@Example.com'], { cwd: import.meta.dirname, env: { ...process.env, GALLERY_DB: dbFile } }).toString();
        assert.ok(out.includes('"admin invited"'), out);
        const cli = openDb(dbFile);
        assert.deepStrictEqual({ ...cli.get('SELECT email, role, enabled FROM users') }, { email: 'boss@example.com', role: 'admin', enabled: 1 });
        cli.close();
    } finally {
        server.close();
        db.close();
        fs.rmSync(tmp, { recursive: true, force: true });
    }
    console.log('profile tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

/**
 * Admin route tests (Sprint 16 T-05): admin only (403 before 404), invite, enable/disable (not
 * oneself), delegate/undelegate, TOTP reset, bad input, and the audit events each produces.
 */
import assert from 'assert';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createServer } from './server.ts';
import { openDb } from './db/db.ts';
import { SESSION_COOKIE, createSession, setSessionTotpOk, signSessionId } from './auth/session.ts';
import type { AuditEvent } from './auth/guard.ts';

async function run(): Promise<void> {
    const db = openDb();
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (7, 'album', NULL, '', '')");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (10, 'album', 7, 'a', 'a')");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (101, 'photo', 10, 'p.jpg', 'p')");
    db.run("INSERT INTO users (id, email, role, totp_secret, totp_verified_at) VALUES (1, 'admin@example.com', 'admin', 'S', '2026-01-01T00:00:00.000Z')");
    db.run("INSERT INTO users (id, email, role, totp_secret, totp_verified_at) VALUES (2, 'user@example.com', 'user', 'S', '2026-01-01T00:00:00.000Z')");
    const secret = Buffer.from('s'.repeat(32));
    const events: AuditEvent[] = [];
    const server = createServer({
        db, port: 0, log: () => {}, sessionSecret: secret, audit: (e) => events.push(e),
        verifyJwt: async (token) => ({ email: token, sub: token, exp: 0 }),
    });
    await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    /** A TOTP-passed session for a user, as cookie header value. */
    const loggedIn = (userId: number) => {
        const s = createSession(db, userId);
        setSessionTotpOk(db, s.id);
        return `${SESSION_COOKIE}=${signSessionId(s.id, secret)}`;
    };
    const as = (email: string, cookie: string) => async (method: string, path: string, body?: unknown) => {
        const headers: Record<string, string> = { 'cf-access-jwt-assertion': email, cookie };
        if (body !== undefined) headers['content-type'] = 'application/json';
        const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        const text = await res.text();
        return { status: res.status, body: text ? JSON.parse(text) : undefined };
    };
    const admin = as('admin@example.com', loggedIn(1));
    const user = as('user@example.com', loggedIn(2));

    try {
        // not an admin: 403 everywhere, also for unknown users/albums (403 before 404), audited
        for (const [m, p] of [['GET', '/api/admin/users'], ['POST', '/api/admin/users'], ['PUT', '/api/admin/users/999/enabled'], ['PUT', '/api/admin/users/2/albums/999'], ['DELETE', '/api/admin/users/2/albums/10'], ['POST', '/api/admin/users/999/totp/reset']]) {
            const r = await user(m, p, m === 'GET' ? undefined : {});
            assert.strictEqual(r.status, 403, `${m} ${p}`);
            assert.deepStrictEqual(r.body, { error: 'admin required' });
        }
        const denied = events.filter((e) => e.action === 'authorize' && e.result === 'denied');
        assert.strictEqual(denied.length, 6);
        assert.deepStrictEqual([denied[0].userId, denied[0].email, denied[0].target], [2, 'user@example.com', 'GET /api/admin/users']);
        // without the TOTP step even an admin is not in
        const half = createSession(db, 1);
        const r401 = await as('admin@example.com', `${SESSION_COOKIE}=${signSessionId(half.id, secret)}`)('GET', '/api/admin/users');
        assert.strictEqual(r401.status, 401);
        events.length = 0;

        // list
        const list = await admin('GET', '/api/admin/users');
        assert.strictEqual(list.status, 200);
        assert.deepStrictEqual(list.body.users.map((u: { email: string; albums: number[] }) => [u.email, u.albums]), [['admin@example.com', []], ['user@example.com', []]]);
        assert.strictEqual(JSON.stringify(list.body).includes('totp_secret'), false);

        // invite
        const inv = await admin('POST', '/api/admin/users', { email: 'New@Example.com', role: 'user' });
        assert.strictEqual(inv.status, 201);
        assert.deepStrictEqual([inv.body.email, inv.body.role, inv.body.enabled, inv.body.totpEnrolled, inv.body.albums], ['new@example.com', 'user', true, false, []]);
        const newId = inv.body.id as number;
        assert.strictEqual((await admin('POST', '/api/admin/users', { email: 'new@example.com' })).status, 409);
        assert.strictEqual((await admin('POST', '/api/admin/users', { email: 'junk' })).status, 400);
        assert.strictEqual((await admin('POST', '/api/admin/users', { email: 'a@b.se', role: 'god' })).status, 400);
        assert.strictEqual((await admin('POST', '/api/admin/users', {})).status, 400);
        const defaultRole = await admin('POST', '/api/admin/users', { email: 'second@example.com' });
        assert.strictEqual(defaultRole.body.role, 'user', 'role defaults to user');

        // enable / disable
        assert.strictEqual((await admin('PUT', `/api/admin/users/${newId}/enabled`, { enabled: false })).body.enabled, false);
        assert.strictEqual((await as('new@example.com', loggedIn(newId))('GET', '/api/me')).status, 403, 'disabled user is out');
        assert.strictEqual((await admin('PUT', `/api/admin/users/${newId}/enabled`, { enabled: true })).body.enabled, true);
        assert.strictEqual((await admin('PUT', `/api/admin/users/${newId}/enabled`, { enabled: 'yes' })).status, 400);
        assert.strictEqual((await admin('PUT', '/api/admin/users/999/enabled', { enabled: true })).status, 404);
        assert.strictEqual((await admin('PUT', '/api/admin/users/x/enabled', { enabled: true })).status, 404);
        const self = await admin('PUT', '/api/admin/users/1/enabled', { enabled: false });
        assert.strictEqual(self.status, 400, 'an admin cannot lock themself out');

        // delegate / undelegate
        const d1 = await admin('PUT', '/api/admin/users/2/albums/10');
        assert.deepStrictEqual([d1.status, d1.body.albums], [200, [10]]);
        assert.strictEqual((await admin('PUT', '/api/admin/users/2/albums/10')).status, 200, 'idempotent');
        assert.strictEqual((await admin('PUT', '/api/admin/users/2/albums/999')).status, 404);
        assert.strictEqual((await admin('PUT', '/api/admin/users/2/albums/101')).status, 400, 'a photo is not an album');
        assert.strictEqual((await admin('PUT', '/api/admin/users/999/albums/10')).status, 404);
        assert.deepStrictEqual((await user('GET', '/api/me')).body.albums, [10]);
        const u1 = await admin('DELETE', '/api/admin/users/2/albums/10');
        assert.deepStrictEqual([u1.status, u1.body.albums], [200, []]);
        assert.strictEqual((await admin('DELETE', '/api/admin/users/2/albums/10')).status, 404, 'nothing to remove');

        // TOTP reset: secret gone, sessions ended
        assert.strictEqual((await user('GET', '/api/me')).status, 200);
        assert.strictEqual((await admin('POST', '/api/admin/users/2/totp/reset')).status, 204);
        assert.strictEqual(db.get<{ totp_secret: string | null }>('SELECT totp_secret FROM users WHERE id = 2')!.totp_secret, null);
        const afterReset = await user('GET', '/api/me');
        assert.deepStrictEqual([afterReset.status, afterReset.body], [401, { error: 'totp_required', totpSetup: true }]);
        assert.strictEqual((await admin('POST', '/api/admin/users/999/totp/reset')).status, 404);

        // audit trail
        const trail = events.filter((e) => e.userId === 1).map((e) => `${e.action}:${e.result}:${e.target}`);
        for (const expected of [`invite:ok:user:${newId}`, 'invite:error:new@example.com', 'invite:error:junk', `disable:ok:user:${newId}`, `enable:ok:user:${newId}`, 'disable:denied:user:1', 'delegate:ok:user:2', 'undelegate:ok:user:2', 'totp_reset:ok:user:2']) {
            assert.ok(trail.includes(expected), expected);
        }
        assert.ok(events.every((e) => e.ip === '127.0.0.1'));
    } finally {
        server.close();
        db.close();
    }
    console.log('admin tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

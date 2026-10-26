/**
 * Session tests (Sprint 16 T-04): the secret (env or settings row, generated once), signed cookie
 * values, cookie parsing, create/get/expire/delete, the Set-Cookie attributes.
 */
import assert from 'assert';
import { openDb } from './db/db.ts';
import {
    SESSION_COOKIE, SESSION_TTL_MS, sessionSecret, signSessionId, unsignSessionId, parseCookies, sessionIdFromCookie,
    sessionCookie, clearSessionCookie, createSession, getSession, setSessionTotpOk, deleteSession, deleteUserSessions, purgeExpiredSessions,
} from './auth/session.ts';

async function run(): Promise<void> {
    const db = openDb();
    assert.deepStrictEqual(db.migrations(), [1, 2], 'migration 002 applied');

    // secret: env wins, else a settings row generated once and reused
    assert.strictEqual(sessionSecret(db, { SESSION_SECRET: 'x'.repeat(40) }).toString(), 'x'.repeat(40));
    assert.throws(() => sessionSecret(db, { SESSION_SECRET: 'short' }), /32 characters/);
    const s1 = sessionSecret(db, {});
    assert.strictEqual(s1.length, 32);
    assert.match(db.setting('session_secret')!, /^[0-9a-f]{64}$/);
    assert.ok(s1.equals(sessionSecret(db, {})), 'stable across calls');

    // signing
    const id = 'ab'.repeat(32);
    const signed = signSessionId(id, s1);
    assert.strictEqual(unsignSessionId(signed, s1), id);
    assert.strictEqual(unsignSessionId(signed, Buffer.from('y'.repeat(32))), undefined, 'other key');
    assert.strictEqual(unsignSessionId(signed.slice(0, -1) + (signed.endsWith('A') ? 'B' : 'A'), s1), undefined, 'tampered mac');
    assert.strictEqual(unsignSessionId(`cd${signed.slice(2)}`, s1), undefined, 'tampered id');
    assert.strictEqual(unsignSessionId('nodot', s1), undefined);
    assert.strictEqual(unsignSessionId('', s1), undefined);
    assert.strictEqual(unsignSessionId(`${'zz'.repeat(32)}.${signed.split('.')[1]}`, s1), undefined, 'id must be hex');

    // cookie parsing
    assert.deepStrictEqual(parseCookies(undefined), {});
    assert.deepStrictEqual(parseCookies('a=1; b=2=3 ;c; a=9'), { a: '1', b: '2=3' });
    assert.strictEqual(sessionIdFromCookie(`other=1; ${SESSION_COOKIE}=${signed}`, s1), id);
    assert.strictEqual(sessionIdFromCookie(`${SESSION_COOKIE}=${id}`, s1), undefined, 'unsigned id refused');
    assert.strictEqual(sessionIdFromCookie(undefined, s1), undefined);

    // Set-Cookie attributes
    const set = sessionCookie(id, s1);
    assert.ok(set.startsWith(`${SESSION_COOKIE}=${signed}; `));
    for (const attr of ['Path=/', 'HttpOnly', 'Secure', 'SameSite=Strict', `Max-Age=${SESSION_TTL_MS / 1000}`]) assert.ok(set.includes(attr), attr);
    assert.strictEqual(SESSION_TTL_MS, 12 * 3600 * 1000);
    assert.ok(clearSessionCookie().includes('Max-Age=0'));
    assert.ok(clearSessionCookie().startsWith(`${SESSION_COOKIE}=;`));

    // rows
    db.run("INSERT INTO users (id, email, role) VALUES (1, 'a@example.com', 'admin')");
    db.run("INSERT INTO users (id, email, role) VALUES (2, 'b@example.com', 'user')");
    const t0 = new Date('2026-10-26T08:00:00.000Z');
    const a = createSession(db, 1, t0);
    assert.match(a.id, /^[0-9a-f]{64}$/, '32 random bytes');
    assert.deepStrictEqual([a.user_id, a.created_at, a.expires_at, a.totp_ok], [1, t0.toISOString(), '2026-10-26T20:00:00.000Z', 0]);
    const b = createSession(db, 1, t0);
    assert.notStrictEqual(a.id, b.id);
    const c = createSession(db, 2, t0);
    assert.strictEqual(getSession(db, a.id, t0)!.totp_ok, 0);
    setSessionTotpOk(db, a.id);
    assert.strictEqual(getSession(db, a.id, t0)!.totp_ok, 1);
    assert.strictEqual(getSession(db, a.id, new Date(t0.getTime() + SESSION_TTL_MS - 1)) !== undefined, true, 'alive just before expiry');
    assert.strictEqual(getSession(db, a.id, new Date(t0.getTime() + SESSION_TTL_MS)), undefined, 'expired at 12 h');
    assert.strictEqual(getSession(db, a.id, t0), undefined, 'an expired session is deleted');
    assert.strictEqual(getSession(db, 'nope', t0), undefined);
    deleteSession(db, b.id);
    assert.strictEqual(getSession(db, b.id, t0), undefined);
    assert.strictEqual(db.all('SELECT id FROM sessions').length, 1);
    createSession(db, 2, t0);
    assert.strictEqual(deleteUserSessions(db, 2), 2);
    assert.strictEqual(getSession(db, c.id, t0), undefined);
    const d = createSession(db, 2, t0);
    createSession(db, 2, new Date(t0.getTime() + 3600_000));
    assert.strictEqual(purgeExpiredSessions(db, new Date(t0.getTime() + SESSION_TTL_MS)), 1);
    assert.strictEqual(getSession(db, d.id, t0), undefined);
    assert.throws(() => createSession(db, 99, t0), /FOREIGN KEY/, 'a session needs a user');

    db.close();
    console.log('session tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

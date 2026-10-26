/**
 * Login flow tests (Sprint 16 T-04) against a listening server with an injected JWT check:
 * no assertion -> 401, unknown/disabled e-mail -> 403, first request creates the session cookie,
 * /api/me demands the TOTP step, setup -> verify unlocks it, replay and wrong codes refused,
 * lockout after five failures, logout clears everything, cookies of other users are ignored.
 */
import assert from 'assert';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createServer } from './server.ts';
import { openDb } from './db/db.ts';
import { totp } from './auth/totp.ts';
import { SESSION_COOKIE, parseCookies } from './auth/session.ts';
import type { AuditEvent } from './auth/guard.ts';
import { TOTP_MAX_FAILURES, TOTP_LOCK_MS } from './routes/auth.ts';

/** The fake assertion: the token is the e-mail; "bad" fails verification. */
const verifyJwt = async (token: string) => {
    if (token === 'bad') throw new Error('signature invalid');
    return { email: token.toLowerCase(), sub: `sub-${token}`, exp: 0 };
};

async function run(): Promise<void> {
    const db = openDb();
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (7, 'album', NULL, '', '')");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (10, 'album', 7, 'a', 'a')");
    db.run("INSERT INTO users (id, email, role) VALUES (1, 'admin@example.com', 'admin')");
    db.run("INSERT INTO users (id, email, role) VALUES (2, 'user@example.com', 'user')");
    db.run("INSERT INTO users (id, email, role, enabled) VALUES (3, 'off@example.com', 'user', 0)");
    db.run('INSERT INTO user_albums (user_id, album_id) VALUES (2, 10)');

    let clock = Date.parse('2026-10-26T12:00:00Z');
    const events: AuditEvent[] = [];
    const server = createServer({ db, port: 0, log: () => {}, verifyJwt, audit: (e) => events.push(e), now: () => new Date(clock) });
    await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    /** A browser: keeps the session cookie, always sends the assertion for `email`. */
    const browser = (email: string) => {
        let cookie: string | undefined;
        return {
            get cookie() { return cookie; },
            async call(method: string, path: string, body?: unknown, opts: { noAssertion?: boolean } = {}) {
                const headers: Record<string, string> = { 'cf-connecting-ip': '198.51.100.7' };
                if (!opts.noAssertion) headers['cf-access-jwt-assertion'] = email;
                if (cookie) headers.cookie = `${SESSION_COOKIE}=${cookie}`;
                if (body !== undefined) headers['content-type'] = 'application/json';
                const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
                const set = res.headers.get('set-cookie');
                if (set) {
                    const v = parseCookies(set)[SESSION_COOKIE];
                    cookie = v === '' ? undefined : v;
                    assert.ok(set.includes('HttpOnly') && set.includes('Secure') && set.includes('SameSite=Strict') && set.includes('Path=/'), set);
                }
                const text = await res.text();
                return { status: res.status, body: text ? JSON.parse(text) : undefined, setCookie: set };
            },
        };
    };

    try {
        // no assertion / bad assertion / unknown / disabled
        const anon = browser('admin@example.com');
        assert.strictEqual((await anon.call('GET', '/api/me', undefined, { noAssertion: true })).status, 401);
        assert.strictEqual((await browser('bad').call('GET', '/api/me')).status, 401);
        assert.strictEqual((await browser('nobody@example.com').call('GET', '/api/me')).status, 403);
        assert.strictEqual((await browser('off@example.com').call('GET', '/api/me')).status, 403);
        assert.deepStrictEqual(events.map((e) => [e.action, e.result, e.detail && (e.detail as { reason: string }).reason]), [
            ['login', 'denied', 'jwt'], ['login', 'denied', 'unknown'], ['login', 'denied', 'disabled'],
        ]);
        assert.strictEqual(events[2].userId, 3);
        assert.strictEqual(events[2].ip, '198.51.100.7');
        events.length = 0;

        // first authenticated request: session cookie, but TOTP required (and setup needed)
        const admin = browser('Admin@Example.com'); // the assertion's e-mail is case-insensitive
        const me1 = await admin.call('GET', '/api/me');
        assert.strictEqual(me1.status, 401);
        assert.deepStrictEqual(me1.body, { error: 'totp_required', totpSetup: true });
        assert.ok(admin.cookie, 'session cookie set on the denial');
        assert.ok(admin.cookie!.includes('.'), 'signed value');
        const firstCookie = admin.cookie;
        const me2 = await admin.call('GET', '/api/me');
        assert.strictEqual(me2.status, 401);
        assert.strictEqual(me2.setCookie, null, 'the same session is reused');
        assert.strictEqual(db.all('SELECT id FROM sessions').length, 1);

        // verify before setup -> 409; setup hands out the secret once; verify unlocks
        assert.strictEqual((await admin.call('POST', '/api/auth/totp/verify', { code: '000000' })).status, 409);
        const setup = await admin.call('POST', '/api/auth/totp/setup');
        assert.strictEqual(setup.status, 200);
        assert.match(setup.body.secret, /^[A-Z2-7]{32}$/);
        assert.ok(setup.body.otpauthUrl.startsWith('otpauth://totp/lanbilder.se%20admin:admin%40example.com?secret=' + setup.body.secret));
        const wrong = await admin.call('POST', '/api/auth/totp/verify', { code: '000000' });
        assert.strictEqual(wrong.status, 401);
        const okVerify = await admin.call('POST', '/api/auth/totp/verify', { code: totp(setup.body.secret, { now: clock }) });
        assert.deepStrictEqual([okVerify.status, okVerify.body], [200, { ok: true }]);
        const me3 = await admin.call('GET', '/api/me');
        assert.strictEqual(me3.status, 200);
        assert.strictEqual(me3.body.user.email, 'admin@example.com');
        assert.strictEqual(me3.body.role, 'admin');
        assert.deepStrictEqual(me3.body.albums, []);
        assert.strictEqual(me3.body.user.totpEnrolled, true);
        assert.strictEqual(me3.body.user.lastLoginAt, new Date(clock).toISOString());
        assert.strictEqual('totp_secret' in me3.body.user, false, 'the secret never leaves the server');
        assert.strictEqual(JSON.stringify(me3.body).includes(setup.body.secret), false);
        assert.strictEqual((await admin.call('POST', '/api/auth/totp/setup')).status, 409, 'no re-enrolment once verified');

        // replay: the same code (same step) is refused; the next step works
        const u2 = browser('user@example.com');
        assert.deepStrictEqual((await u2.call('GET', '/api/me')).body, { error: 'totp_required', totpSetup: true });
        const s2 = (await u2.call('POST', '/api/auth/totp/setup')).body.secret;
        const code = totp(s2, { now: clock });
        assert.strictEqual((await u2.call('POST', '/api/auth/totp/verify', { code })).status, 200);
        const me4 = await u2.call('GET', '/api/me');
        assert.deepStrictEqual([me4.body.role, me4.body.albums], ['user', [10]]);
        await u2.call('POST', '/api/auth/logout');
        assert.strictEqual(u2.cookie, undefined, 'logout clears the cookie');
        assert.strictEqual((await u2.call('GET', '/api/me')).status, 401, 'new session, TOTP again');
        assert.strictEqual((await u2.call('POST', '/api/auth/totp/verify', { code })).status, 401, 'replayed code');
        clock += 30_000;
        assert.strictEqual((await u2.call('POST', '/api/auth/totp/verify', { code: totp(s2, { now: clock }) })).status, 200);
        assert.strictEqual((await u2.call('GET', '/api/me')).status, 200);

        // a cookie from another user's session does not transfer
        const u2cookie = u2.cookie!;
        const headers = { 'cf-access-jwt-assertion': 'admin@example.com', cookie: `${SESSION_COOKIE}=${u2cookie}` };
        const stolen = await fetch(`${base}/api/me`, { headers });
        assert.strictEqual(stolen.status, 401, 'admin gets a fresh session instead of user 2\'s');
        assert.ok(stolen.headers.get('set-cookie'));
        assert.strictEqual((await fetch(`${base}/api/me`, { headers: { ...headers, cookie: `${SESSION_COOKIE}=${u2cookie.split('.')[0]}.AAAA` } })).status, 401, 'forged signature ignored');

        // lockout after five consecutive failures
        const u3 = browser('user@example.com');
        await u3.call('GET', '/api/me');
        for (let i = 0; i < TOTP_MAX_FAILURES; i++) {
            assert.strictEqual((await u3.call('POST', '/api/auth/totp/verify', { code: '123456' })).status, 401);
        }
        const locked = await u3.call('POST', '/api/auth/totp/verify', { code: totp(s2, { now: clock }) });
        assert.strictEqual(locked.status, 429, 'even the right code is refused while locked');
        clock += TOTP_LOCK_MS + 1000;
        assert.strictEqual((await u3.call('POST', '/api/auth/totp/verify', { code: totp(s2, { now: clock }) })).status, 200);

        // bad bodies
        assert.strictEqual((await u3.call('POST', '/api/auth/totp/verify', { code: 12 })).status, 401);
        assert.strictEqual((await u3.call('POST', '/api/auth/totp/verify')).status, 401);

        // sessions expire after 12 h
        clock += 12 * 3600 * 1000;
        const expired = await u3.call('GET', '/api/me');
        assert.strictEqual(expired.status, 401);
        assert.ok(expired.setCookie, 'a new session replaces the expired one');

        // logout without any session is harmless and still clears the cookie
        const lo = await fetch(`${base}/api/auth/logout`, { method: 'POST' });
        assert.strictEqual(lo.status, 204);
        assert.ok(lo.headers.get('set-cookie')!.includes('Max-Age=0'));

        // the audit trail saw every step and no secret
        const actions = new Set(events.map((e) => `${e.action}:${e.result}`));
        for (const a of ['session:ok', 'totp_setup:ok', 'totp_setup:denied', 'totp_verify:ok', 'totp_verify:denied', 'login:ok', 'logout:ok']) assert.ok(actions.has(a), a);
        assert.strictEqual(JSON.stringify(events).includes(setup.body.secret), false);
        assert.strictEqual(JSON.stringify(events).includes(firstCookie!), false);
        assert.ok(events.some((e) => e.action === 'totp_verify' && e.result === 'denied' && (e.detail as { reason: string }).reason === 'replay'));
        assert.ok(events.some((e) => e.action === 'totp_verify' && e.result === 'denied' && (e.detail as { reason: string }).reason === 'locked'));

        // auth routes answer 503 when neither Access nor a verifier is configured
        const bare = createServer({ db, port: 0, log: () => {} });
        await once(bare, 'listening');
        const r503 = await fetch(`http://127.0.0.1:${(bare.address() as AddressInfo).port}/api/me`, { headers: { 'cf-access-jwt-assertion': 'x' } });
        assert.strictEqual(r503.status, 503);
        bare.close();
    } finally {
        server.close();
        db.close();
    }
    console.log('auth tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

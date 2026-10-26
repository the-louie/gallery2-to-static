/**
 * Audit tests (Sprint 16 T-06): a row plus a JSONL line per event, UPDATE and DELETE on audit_log
 * fail (triggers), listing with limit/before, the sink never throws, the admin-only route, the
 * default sink wired into the server.
 */
import assert from 'assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { openDb } from './db/db.ts';
import { audit, createAuditSink, listAudit, auditFile, DEFAULT_AUDIT_FILE, AUDIT_MAX_LIMIT } from './audit.ts';
import { createServer } from './server.ts';
import { SESSION_COOKIE, createSession, setSessionTotpOk, signSessionId } from './auth/session.ts';

async function run(): Promise<void> {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-'));
    const file = path.join(tmp, 'audit.jsonl');
    const db = openDb();
    try {
        assert.strictEqual(auditFile({}), DEFAULT_AUDIT_FILE);
        assert.ok(DEFAULT_AUDIT_FILE.endsWith(path.join('backend', 'audit.jsonl')));
        assert.strictEqual(auditFile({ AUDIT_LOG_FILE: '/var/log/x.jsonl' }), '/var/log/x.jsonl');

        // a row and a line
        const t = new Date('2026-10-26T13:00:00.000Z');
        const row = audit(db, { userId: 1, email: 'a@example.com', ip: '203.0.113.1', action: 'login', target: null, result: 'ok', detail: { sub: 'x' } }, file, t);
        assert.deepStrictEqual(row, { id: 1, at: t.toISOString(), user_id: 1, email: 'a@example.com', ip: '203.0.113.1', action: 'login', target: null, result: 'ok', detail: '{"sub":"x"}' });
        audit(db, { userId: null, email: null, ip: '203.0.113.2', action: 'login', result: 'denied' }, file, t);
        const lines = fs.readFileSync(file, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
        assert.strictEqual(lines.length, 2);
        assert.deepStrictEqual(lines[0], { ...row, detail: { sub: 'x' } });
        assert.deepStrictEqual([lines[1].id, lines[1].user_id, lines[1].detail, lines[1].target], [2, null, null, null]);
        assert.strictEqual(fs.statSync(file).mode & 0o777, 0o600);

        // append-only
        assert.throws(() => db.run("UPDATE audit_log SET result = 'ok' WHERE id = 2"), /append-only/);
        assert.throws(() => db.run('DELETE FROM audit_log WHERE id = 1'), /append-only/);
        assert.throws(() => db.run('DELETE FROM audit_log'), /append-only/);
        assert.throws(() => db.run("INSERT INTO audit_log (action, result) VALUES ('x', 'maybe')"), /CHECK/);
        assert.strictEqual(db.all('SELECT id FROM audit_log').length, 2);
        assert.strictEqual(db.get<{ result: string }>('SELECT result FROM audit_log WHERE id = 2')!.result, 'denied');

        // listing
        for (let i = 0; i < 10; i++) audit(db, { userId: 2, email: 'b@example.com', ip: '::1', action: 'view', target: `item:${i}`, result: 'ok' }, file);
        const all = listAudit(db);
        assert.strictEqual(all.length, 12);
        assert.strictEqual(all[0].id, 12, 'newest first');
        assert.deepStrictEqual(all[11].detail, { sub: 'x' }, 'detail parsed');
        const page = listAudit(db, { limit: 5 });
        assert.deepStrictEqual(page.map((r) => r.id), [12, 11, 10, 9, 8]);
        const page2 = listAudit(db, { limit: 5, before: 8 });
        assert.deepStrictEqual(page2.map((r) => r.id), [7, 6, 5, 4, 3]);
        assert.deepStrictEqual(listAudit(db, { limit: 0 }).length, 1, 'limit clamped up to 1');
        assert.deepStrictEqual(listAudit(db, { limit: 99999 }).length, 12, `limit clamped to ${AUDIT_MAX_LIMIT}`);
        assert.deepStrictEqual(listAudit(db, { before: 1 }), []);

        // the sink swallows failures (e.g. an unwritable file) and reports them
        const errors: string[] = [];
        const bad = createAuditSink(db, path.join(tmp, 'missing-dir', 'x.jsonl'), (e) => errors.push((e as Error).message));
        bad({ userId: null, email: null, ip: '', action: 'x', result: 'ok' });
        assert.strictEqual(errors.length, 1);
        assert.strictEqual(db.all('SELECT id FROM audit_log').length, 13, 'the row was still written before the file failed');

        // the route: admin only, limit/before, 400 on junk; a user's attempt is itself audited
        db.run("INSERT INTO users (id, email, role, totp_secret, totp_verified_at) VALUES (1, 'a@example.com', 'admin', 'S', '2026-01-01T00:00:00.000Z')");
        db.run("INSERT INTO users (id, email, role, totp_secret, totp_verified_at) VALUES (2, 'b@example.com', 'user', 'S', '2026-01-01T00:00:00.000Z')");
        const secret = Buffer.from('s'.repeat(32));
        const server = createServer({ db, port: 0, log: () => {}, sessionSecret: secret, audit: createAuditSink(db, file), verifyJwt: async (token) => ({ email: token, sub: token, exp: 0 }) });
        await once(server, 'listening');
        const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        const cookie = (userId: number) => { const s = createSession(db, userId); setSessionTotpOk(db, s.id); return `${SESSION_COOKIE}=${signSessionId(s.id, secret)}`; };
        const get = async (email: string, c: string, q: string) => {
            const res = await fetch(`${base}/api/admin/audit${q}`, { headers: { 'cf-access-jwt-assertion': email, cookie: c } });
            return { status: res.status, body: await res.json() };
        };
        try {
            const userCookie = cookie(2);
            assert.strictEqual((await get('b@example.com', userCookie, '')).status, 403);
            const adminCookie = cookie(1);
            const r = await get('a@example.com', adminCookie, '?limit=3');
            assert.strictEqual(r.status, 200);
            assert.strictEqual(r.body.entries.length, 3);
            assert.deepStrictEqual([r.body.entries[0].action, r.body.entries[0].result, r.body.entries[0].user_id], ['authorize', 'denied', 2], 'the 403 is in the log');
            assert.strictEqual(r.body.next, r.body.entries[2].id);
            const r2 = await get('a@example.com', adminCookie, `?limit=3&before=${r.body.next}`);
            assert.strictEqual(r2.body.entries[0].id, r.body.next - 1);
            assert.strictEqual((await get('a@example.com', adminCookie, '?limit=abc')).status, 400);
            assert.strictEqual((await get('a@example.com', adminCookie, '?before=-1')).status, 400);
            const everything = await get('a@example.com', adminCookie, '?limit=1000');
            assert.strictEqual(everything.body.entries.length, db.all('SELECT id FROM audit_log').length);
            assert.strictEqual(fs.readFileSync(file, 'utf8').trim().split('\n').length, everything.body.entries.length - 1, 'file mirrors the table (minus the row whose file write failed above)');
        } finally {
            server.close();
        }

        // the default sink (no `audit` option) writes to AUDIT_LOG_FILE
        const envFile = path.join(tmp, 'env.jsonl');
        process.env.AUDIT_LOG_FILE = envFile;
        const db2 = openDb();
        db2.run("INSERT INTO users (id, email, role) VALUES (1, 'a@example.com', 'admin')");
        const s2 = createServer({ db: db2, port: 0, log: () => {}, verifyJwt: async () => ({ email: 'nobody@example.com', sub: 'n', exp: 0 }) });
        await once(s2, 'listening');
        try {
            const res = await fetch(`http://127.0.0.1:${(s2.address() as AddressInfo).port}/api/me`, { headers: { 'cf-access-jwt-assertion': 'x' } });
            assert.strictEqual(res.status, 403);
            const row2 = db2.get<{ action: string; result: string; email: string }>('SELECT action, result, email FROM audit_log')!;
            assert.deepStrictEqual([row2.action, row2.result, row2.email], ['login', 'denied', 'nobody@example.com']);
            assert.ok(fs.existsSync(envFile));
        } finally {
            s2.close();
            db2.close();
            delete process.env.AUDIT_LOG_FILE;
        }
    } finally {
        db.close();
        fs.rmSync(tmp, { recursive: true, force: true });
    }
    console.log('audit tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

/**
 * Server tests (Sprint 16 T-01): healthz, router params, 404/405, JSON body handling, the
 * response headers every reply carries, request logging without secrets.
 */
import assert from 'assert';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createServer, DEFAULT_HOST, DEFAULT_PORT } from './server.ts';
import { Router, json, intParam } from './http.ts';
import { openDb } from './db/db.ts';

async function run(): Promise<void> {
    assert.deepStrictEqual([DEFAULT_HOST, DEFAULT_PORT], ['127.0.0.1', 3100]);

    // router unit
    const r = new Router().get('/api/view/:id', () => json(200, {})).post('/api/view/:id', () => json(200, {}));
    const m = r.match('GET', '/api/view/42');
    assert.ok(m && 'params' in m && m.params.id === '42');
    assert.strictEqual(r.match('GET', '/api/view'), undefined);
    assert.strictEqual(r.match('GET', '/api/view/1/2'), undefined);
    assert.deepStrictEqual(r.match('PUT', '/api/view/1'), { allow: ['GET', 'POST'] });
    assert.strictEqual(intParam('42'), 42);
    assert.strictEqual(intParam('-1'), undefined);
    assert.strictEqual(intParam('1e3'), undefined);
    assert.strictEqual(intParam(''), undefined);

    const db = openDb();
    const lines: Array<Record<string, unknown>> = [];
    const server = createServer({
        db,
        port: 0,
        log: (e) => lines.push(e),
        routes: (router) => {
            router.post('/echo', (ctx) => json(200, { body: ctx.body, ip: ctx.ip }));
            router.get('/boom', () => { throw new Error('secret detail'); });
        },
    });
    await once(server, 'listening');
    const { address, port } = server.address() as AddressInfo;
    assert.strictEqual(address, '127.0.0.1', 'binds to loopback by default');
    const base = `http://127.0.0.1:${port}`;

    try {
        const h = await fetch(`${base}/healthz`);
        assert.strictEqual(h.status, 200);
        assert.deepStrictEqual(await h.json(), { ok: true });
        assert.strictEqual(h.headers.get('cache-control'), 'no-store');
        assert.strictEqual(h.headers.get('x-content-type-options'), 'nosniff');
        assert.match(h.headers.get('content-type') ?? '', /^application\/json/);

        assert.strictEqual((await fetch(`${base}/nope`)).status, 404);
        const m405 = await fetch(`${base}/healthz`, { method: 'POST' });
        assert.strictEqual(m405.status, 405);
        assert.strictEqual(m405.headers.get('allow'), 'GET');

        // JSON bodies
        const ok = await fetch(`${base}/echo`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' }, body: JSON.stringify({ a: 1 }) });
        assert.deepStrictEqual(await ok.json(), { body: { a: 1 }, ip: '203.0.113.9' });
        const noIpHeader = await fetch(`${base}/echo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
        assert.deepStrictEqual(await noIpHeader.json(), { body: {}, ip: '127.0.0.1' });
        const bad = await fetch(`${base}/echo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{nope' });
        assert.strictEqual(bad.status, 400);
        const arr = await fetch(`${base}/echo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '[1]' });
        assert.strictEqual(arr.status, 400);
        const text = await fetch(`${base}/echo`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' });
        assert.strictEqual(text.status, 415);
        const big = await fetch(`${base}/echo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: 'x'.repeat(70 * 1024) }) });
        assert.strictEqual(big.status, 413);
        const empty = await fetch(`${base}/echo`, { method: 'POST' });
        assert.deepStrictEqual(await empty.json(), { ip: '127.0.0.1' }); // an empty body is undefined (omitted)

        // unhandled errors: 500 without the message, logged
        const boom = await fetch(`${base}/boom`);
        assert.strictEqual(boom.status, 500);
        assert.deepStrictEqual(await boom.json(), { error: 'internal error' });
        const errLine = lines.find((l) => l.level === 'error');
        assert.ok(errLine && errLine.err === 'secret detail');

        // one access-log line per request: method, path, status, ms, ip
        const access = lines.filter((l) => 'status' in l);
        assert.ok(access.length >= 10);
        const first = access[0];
        assert.deepStrictEqual(Object.keys(first).sort(), ['ip', 'method', 'ms', 'path', 'status']);
        assert.strictEqual(first.path, '/healthz');
        assert.strictEqual(first.status, 200);
        assert.ok(typeof first.ms === 'number');
    } finally {
        server.close();
        db.close();
    }
    console.log('server tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

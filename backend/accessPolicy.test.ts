import assert from 'assert';
import { openDb } from './db/db.ts';
import { parsePolicyList, allowedEmails, syncAccessPolicies } from './accessPolicy.ts';

async function run(): Promise<void> {
    assert.deepStrictEqual(parsePolicyList('a:1, b:2'), [{ appId: 'a', policyId: '1' }, { appId: 'b', policyId: '2' }]);
    assert.deepStrictEqual(parsePolicyList(undefined), []);
    assert.throws(() => parsePolicyList('nope'), /appId:policyId/);
    const db = openDb();
    db.run("INSERT INTO users (email, role) VALUES ('b@example.com', 'user'), ('a@example.com', 'admin')");
    db.run("INSERT INTO users (email, role, enabled) VALUES ('off@example.com', 'user', 0)");
    assert.deepStrictEqual(allowedEmails(db), ['a@example.com', 'b@example.com'], 'enabled users only, sorted');
    const calls: Array<{ url: string; method: string; body?: unknown }> = [];
    const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const u = String(url); calls.push({ url: u, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
        if ((init?.method ?? 'GET') === 'GET') return new Response(JSON.stringify({ success: true, result: { name: 'p', decision: 'allow', precedence: 1, include: [{ email: { email: 'old@example.com' } }, { email_domain: { domain: 'louie.se' } }] } }), { status: 200 });
        return new Response(JSON.stringify({ success: true, result: {} }), { status: 200 });
    }) as typeof fetch;
    const r = await syncAccessPolicies(db, { token: 't', accountId: 'acc', policies: [{ appId: 'app1', policyId: 'pol1' }], fetch: fakeFetch });
    assert.deepStrictEqual(r.emails, ['a@example.com', 'b@example.com']);
    assert.deepStrictEqual(r.updated, [{ appId: 'app1', policyId: 'pol1', rules: 3 }]);
    const put = calls.find((c) => c.method === 'PUT')!;
    assert.ok(put.url.endsWith('/accounts/acc/access/apps/app1/policies/pol1'));
    assert.deepStrictEqual((put.body as { include: unknown[] }).include, [{ email_domain: { domain: 'louie.se' } }, { email: { email: 'a@example.com' } }, { email: { email: 'b@example.com' } }], 'domain rule kept, e-mail rules replaced by the user list');
    // an API failure is reported, not swallowed
    const failing = (async () => new Response(JSON.stringify({ success: false, errors: [{ message: 'nope' }] }), { status: 403 })) as typeof fetch;
    await assert.rejects(syncAccessPolicies(db, { token: 't', accountId: 'acc', policies: [{ appId: 'a', policyId: 'p' }], fetch: failing }), /nope/);
    db.close();
    console.log('accessPolicy tests passed');
}
run().catch((e) => { console.error(e); process.exit(1); });

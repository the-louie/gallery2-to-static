/**
 * Access JWT tests (Sprint 16 T-03): a generated RSA key signs tokens; the JWKS is injected. Good
 * token, alg none / HS256, bad signature, wrong iss / aud, expired, nbf in the future, unknown kid
 * (with one forced refresh), missing email, JWKS caching for an hour.
 */
import assert from 'assert';
import * as crypto from 'node:crypto';
import { verifyAccessJwt, clearJwksCache, jwksUrl, AccessError, JWKS_TTL_MS, type Jwks } from './auth/access.ts';

const TEAM = 'example.cloudflareaccess.com';
const AUD = 'a'.repeat(64);
const NOW = Date.parse('2026-10-26T12:00:00Z');
const NOW_SEC = Math.floor(NOW / 1000);

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

function sign(priv: crypto.KeyObject, header: object, claims: object, alg: 'RS256' | 'none' = 'RS256'): string {
    const data = `${b64(header)}.${b64(claims)}`;
    if (alg === 'none') return `${data}.`;
    const sig = crypto.sign('RSA-SHA256', Buffer.from(data), priv).toString('base64url');
    return `${data}.${sig}`;
}

async function run(): Promise<void> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' } as Jwks['keys'][0];
    const jwks: Jwks = { keys: [jwk] };
    let fetches = 0;
    const fetchJwks = async (url: string) => {
        assert.strictEqual(url, jwksUrl(TEAM));
        fetches += 1;
        return jwks;
    };
    const opts = { teamDomain: TEAM, aud: AUD, now: NOW, fetchJwks };
    const header = { alg: 'RS256', typ: 'JWT', kid: 'k1' };
    const claims = { iss: `https://${TEAM}`, aud: [AUD], exp: NOW_SEC + 600, iat: NOW_SEC - 10, nbf: NOW_SEC - 10, email: 'Louie@Example.COM', sub: 'sub-1', country: 'SE' };

    clearJwksCache();
    const id = await verifyAccessJwt(sign(privateKey, header, claims), opts);
    assert.deepStrictEqual(id, { email: 'louie@example.com', sub: 'sub-1', exp: NOW_SEC + 600 });
    assert.strictEqual(fetches, 1);

    // aud as a plain string works too; cache is reused
    await verifyAccessJwt(sign(privateKey, header, { ...claims, aud: AUD }), opts);
    assert.strictEqual(fetches, 1, 'JWKS cached');

    const rejects = async (token: string, re: RegExp, o = opts) => {
        await assert.rejects(verifyAccessJwt(token, o), (e: unknown) => e instanceof AccessError && re.test(e.message), `${re}`);
    };
    await rejects(sign(privateKey, { alg: 'none', kid: 'k1' }, claims, 'none'), /alg/);
    await rejects(sign(privateKey, { alg: 'HS256', kid: 'k1' }, claims), /alg/);
    await rejects(sign(other.privateKey, header, claims), /signature/);
    await rejects(sign(privateKey, header, { ...claims, iss: 'https://evil.cloudflareaccess.com' }), /issuer/);
    await rejects(sign(privateKey, header, { ...claims, aud: ['b'.repeat(64)] }), /audience/);
    await rejects(sign(privateKey, header, { ...claims, aud: [] }), /audience/);
    await rejects(sign(privateKey, header, { ...claims, exp: NOW_SEC - 120 }), /expired/);
    await rejects(sign(privateKey, header, { ...claims, exp: 'soon' }), /expired/);
    await rejects(sign(privateKey, header, { ...claims, nbf: NOW_SEC + 600 }), /not yet valid/);
    await rejects(sign(privateKey, header, { ...claims, email: undefined }), /email/);
    await rejects(sign(privateKey, header, { ...claims, email: 'nope' }), /email/);
    await rejects(sign(privateKey, header, { ...claims, sub: '' }), /sub/);
    await rejects('garbage', /malformed/);
    await rejects('a.b', /malformed/);
    await rejects(`${b64(header)}.${b64(claims)}.!!!`, /malformed/);
    await rejects(`${Buffer.from('[1]').toString('base64url')}.${b64(claims)}.AAAA`, /malformed/);
    // within the 60 s skew, an exp a few seconds ago still passes
    await verifyAccessJwt(sign(privateKey, header, { ...claims, exp: NOW_SEC - 30 }), opts);

    // tampering with the payload after signing
    const good = sign(privateKey, header, claims);
    const [h, , s] = good.split('.');
    await rejects(`${h}.${b64({ ...claims, email: 'admin@example.com' })}.${s}`, /signature/);

    // unknown kid: exactly one forced refresh, then rejection
    const before = fetches;
    await rejects(sign(privateKey, { ...header, kid: 'k9' }, claims), /key unknown/);
    assert.strictEqual(fetches, before + 1, 'one refresh for an unknown kid');

    // key rotation: the refreshed set contains the new key
    const k2 = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    jwks.keys.push({ ...k2.publicKey.export({ format: 'jwk' }), kid: 'k2' } as Jwks['keys'][0]);
    const id2 = await verifyAccessJwt(sign(k2.privateKey, { ...header, kid: 'k2' }, claims), opts);
    assert.strictEqual(id2.sub, 'sub-1');

    // cache expiry after an hour
    const f2 = fetches;
    const longLived = sign(privateKey, header, { ...claims, exp: NOW_SEC + 86400 });
    await verifyAccessJwt(longLived, { ...opts, now: NOW + JWKS_TTL_MS - 1000 });
    assert.strictEqual(fetches, f2, 'still cached');
    await verifyAccessJwt(longLived, { ...opts, now: NOW + JWKS_TTL_MS + 1000 });
    assert.strictEqual(fetches, f2 + 1, 'refetched after the TTL');
    // the ordinary token (exp +600 s) is expired by then
    await rejects(good, /expired/, { ...opts, now: NOW + 3600_000 });

    // a malformed key set is refused
    clearJwksCache();
    await rejects(good, /JWKS malformed/, { ...opts, fetchJwks: async () => ({}) as unknown as Jwks });
    // a key set with a weak key is refused
    clearJwksCache();
    const weak = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
    await rejects(sign(weak.privateKey, header, claims), /unacceptable/, { ...opts, fetchJwks: async () => ({ keys: [{ ...weak.publicKey.export({ format: 'jwk' }), kid: 'k1' } as Jwks['keys'][0]] }) });

    console.log('access tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

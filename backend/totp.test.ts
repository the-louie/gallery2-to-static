/**
 * TOTP tests (Sprint 16 T-04): RFC 6238 appendix B vectors (SHA1, 8 digits), RFC 4226 HOTP
 * vectors, base32 round trip, ±1 step window, replay counter, otpauth URL.
 */
import assert from 'assert';
import { base32Encode, base32Decode, generateTotpSecret, hotp, totp, matchTotp, verifyTotp, otpauthUrl } from './auth/totp.ts';

async function run(): Promise<void> {
    // RFC 4226 appendix D: secret "12345678901234567890", counters 0..9
    const rfcSecret = Buffer.from('12345678901234567890', 'ascii');
    const hotpVectors = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
    hotpVectors.forEach((v, c) => assert.strictEqual(hotp(rfcSecret, c), v, `HOTP ${c}`));

    // RFC 6238 appendix B, SHA1 column (8 digits)
    const secretB32 = base32Encode(rfcSecret);
    assert.strictEqual(secretB32, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    const vectors: Array<[number, string]> = [
        [59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'],
        [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130'],
    ];
    for (const [t, code] of vectors) {
        assert.strictEqual(totp(secretB32, { now: t * 1000, digits: 8 }), code, `TOTP at ${t}`);
    }

    // base32 round trip, case/padding tolerance, rejection of junk
    for (let i = 0; i < 50; i++) {
        const s = generateTotpSecret();
        assert.match(s, /^[A-Z2-7]{32}$/, 'twenty bytes -> 32 characters');
        assert.strictEqual(base32Encode(base32Decode(s)), s);
    }
    assert.deepStrictEqual([...base32Decode('gezd gnbv====')], [...Buffer.from('12345')]);
    assert.throws(() => base32Decode('ABC1'), /invalid base32/);
    assert.deepStrictEqual([...base32Decode(base32Encode(Buffer.from([0xff])))], [0xff]);
    assert.deepStrictEqual([...base32Decode(base32Encode(Buffer.from([1, 2, 3])))], [1, 2, 3]);

    // window ±1: previous, current and next step accepted; two steps away refused
    const secret = generateTotpSecret();
    const now = Date.parse('2026-10-26T12:00:15Z');
    const code = totp(secret, { now });
    assert.strictEqual(verifyTotp(secret, code, { now }), true);
    assert.strictEqual(verifyTotp(secret, code, { now: now - 30_000 }), true);
    assert.strictEqual(verifyTotp(secret, code, { now: now + 30_000 }), true);
    assert.strictEqual(verifyTotp(secret, code, { now: now + 60_000 }), false);
    assert.strictEqual(verifyTotp(secret, code, { now: now - 60_000 }), false);
    assert.strictEqual(verifyTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`, { now }), true, 'spaces are ignored');
    assert.strictEqual(verifyTotp(secret, code + '0', { now }), false, 'seven digits');
    assert.strictEqual(verifyTotp(secret, '', { now }), false);
    assert.strictEqual(verifyTotp(secret, 'abcdef', { now }), false);
    const other = String((Number(code) + 1) % 1_000_000).padStart(6, '0');
    assert.strictEqual(verifyTotp(secret, other, { now }), false);

    // matchTotp returns the step it matched (replay guard material)
    const step = Math.floor(now / 1000 / 30);
    assert.strictEqual(matchTotp(secret, code, { now }), step);
    assert.strictEqual(matchTotp(secret, totp(secret, { now: now - 30_000 }), { now }), step - 1);
    assert.strictEqual(matchTotp(secret, 'no', { now }), undefined);

    // otpauth URL
    const url = otpauthUrl({ secret: 'GEZDGNBVGY3TQOJQ', account: 'louie@example.com', issuer: 'lanbilder.se admin' });
    assert.strictEqual(url, 'otpauth://totp/lanbilder.se%20admin:louie%40example.com?secret=GEZDGNBVGY3TQOJQ&issuer=lanbilder.se+admin&algorithm=SHA1&digits=6&period=30');
    const parsed = new URL(url);
    assert.strictEqual(parsed.protocol, 'otpauth:');
    assert.strictEqual(parsed.searchParams.get('issuer'), 'lanbilder.se admin');

    console.log('totp tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

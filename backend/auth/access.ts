/**
 * Cloudflare Access assertion check (Sprint 16 T-03; TODO.md FUT-02 "Decisions"): Access puts a
 * RS256 JWT in `Cf-Access-Jwt-Assertion`; we verify it ourselves against the team's published keys
 * (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`) and only then trust the e-mail in
 * it. Nothing here touches the database; the caller maps the e-mail to our users table.
 */
import * as crypto from 'node:crypto';

export interface AccessIdentity {
    /** Lower-cased e-mail from the `email` claim. */
    email: string;
    /** Access's stable user id (`sub`). */
    sub: string;
    /** Expiry, seconds since the epoch. */
    exp: number;
}

export interface Jwk {
    kid?: string;
    kty: string;
    alg?: string;
    use?: string;
    n?: string;
    e?: string;
}

export interface Jwks {
    keys: Jwk[];
}

export interface VerifyOptions {
    /** `<team>.cloudflareaccess.com` (no scheme). */
    teamDomain: string;
    /** The Access application's audience tag. */
    aud: string;
    /** Current time in ms (default Date.now()); tests pin it. */
    now?: number;
    /** JWKS loader (default: fetch); tests inject the keys they signed with. */
    fetchJwks?: (url: string) => Promise<Jwks>;
    /** Allowed clock skew in seconds (default 60). */
    skewSeconds?: number;
}

export class AccessError extends Error {}

/** How long a fetched key set is reused. */
export const JWKS_TTL_MS = 60 * 60 * 1000;

const cache = new Map<string, { keys: Jwks; fetchedAt: number }>();

/** Forgets cached key sets (tests). */
export function clearJwksCache(): void {
    cache.clear();
}

export function jwksUrl(teamDomain: string): string {
    return `https://${teamDomain}/cdn-cgi/access/certs`;
}

async function defaultFetchJwks(url: string): Promise<Jwks> {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new AccessError(`JWKS fetch failed: ${res.status}`);
    return (await res.json()) as Jwks;
}

/** The team's keys, from the cache when younger than JWKS_TTL_MS; `force` refetches (unknown kid). */
async function loadJwks(opts: VerifyOptions, now: number, force = false): Promise<Jwks> {
    const url = jwksUrl(opts.teamDomain);
    const hit = cache.get(url);
    if (!force && hit && now - hit.fetchedAt < JWKS_TTL_MS) return hit.keys;
    const keys = await (opts.fetchJwks ?? defaultFetchJwks)(url);
    if (!keys || !Array.isArray(keys.keys)) throw new AccessError('JWKS malformed');
    cache.set(url, { keys, fetchedAt: now });
    return keys;
}

function b64urlDecode(s: string): Buffer {
    if (!/^[A-Za-z0-9_-]*$/.test(s)) throw new AccessError('JWT malformed');
    return Buffer.from(s, 'base64url');
}

function parseJson(buf: Buffer): Record<string, unknown> {
    let v: unknown;
    try {
        v = JSON.parse(buf.toString('utf8'));
    } catch {
        throw new AccessError('JWT malformed');
    }
    if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new AccessError('JWT malformed');
    return v as Record<string, unknown>;
}

/**
 * Verifies an Access JWT and returns the identity it asserts. Throws AccessError on any defect:
 * malformed token, alg other than RS256 (so also `none`), unknown kid, bad signature, wrong issuer
 * or audience, expired or not yet valid, missing e-mail.
 */
export async function verifyAccessJwt(token: string, opts: VerifyOptions): Promise<AccessIdentity> {
    if (typeof token !== 'string' || token.length > 8192) throw new AccessError('JWT malformed');
    const parts = token.split('.');
    if (parts.length !== 3) throw new AccessError('JWT malformed');
    const [h, p, s] = parts;
    const header = parseJson(b64urlDecode(h));
    if (header.alg !== 'RS256') throw new AccessError('JWT alg not RS256');
    if (header.typ !== undefined && header.typ !== 'JWT') throw new AccessError('JWT typ unexpected');
    const kid = typeof header.kid === 'string' ? header.kid : undefined;

    const now = opts.now ?? Date.now();
    let jwks = await loadJwks(opts, now);
    let jwk = pickKey(jwks, kid);
    if (!jwk && kid) {
        jwks = await loadJwks(opts, now, true); // key rotation: one forced refresh
        jwk = pickKey(jwks, kid);
    }
    if (!jwk) throw new AccessError('JWT key unknown');

    const signature = b64urlDecode(s);
    const key = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' });
    if (key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new AccessError('JWT key unacceptable');
    const ok = crypto.verify('RSA-SHA256', Buffer.from(`${h}.${p}`, 'utf8'), { key, padding: crypto.constants.RSA_PKCS1_PADDING }, signature);
    if (!ok) throw new AccessError('JWT signature invalid');

    const claims = parseJson(b64urlDecode(p));
    const skew = opts.skewSeconds ?? 60;
    const nowSec = Math.floor(now / 1000);
    if (claims.iss !== `https://${opts.teamDomain}`) throw new AccessError('JWT issuer mismatch');
    const aud = claims.aud;
    const audList = Array.isArray(aud) ? aud : [aud];
    if (!audList.some((a) => typeof a === 'string' && a.length === opts.aud.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(opts.aud)))) {
        throw new AccessError('JWT audience mismatch');
    }
    if (typeof claims.exp !== 'number' || claims.exp + skew <= nowSec) throw new AccessError('JWT expired');
    if (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || claims.nbf - skew > nowSec)) throw new AccessError('JWT not yet valid');
    if (claims.iat !== undefined && (typeof claims.iat !== 'number' || claims.iat - skew > nowSec)) throw new AccessError('JWT issued in the future');
    if (typeof claims.email !== 'string' || !claims.email.includes('@')) throw new AccessError('JWT without email');
    if (typeof claims.sub !== 'string' || !claims.sub) throw new AccessError('JWT without sub');
    return { email: claims.email.trim().toLowerCase(), sub: claims.sub, exp: claims.exp };
}

function pickKey(jwks: Jwks, kid: string | undefined): Jwk | undefined {
    const rsa = jwks.keys.filter((k) => k && k.kty === 'RSA' && (k.use === undefined || k.use === 'sig') && (k.alg === undefined || k.alg === 'RS256'));
    if (kid !== undefined) return rsa.find((k) => k.kid === kid);
    return rsa.length === 1 ? rsa[0] : undefined; // without a kid only an unambiguous key set is usable
}

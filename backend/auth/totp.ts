/**
 * TOTP (RFC 6238 over HOTP RFC 4226; Sprint 16 T-04): HMAC-SHA1, 30 s steps, 6 digits, ±1 step
 * accepted. Secrets are base32 (RFC 4648, no padding) as authenticator apps expect them. Only
 * `node:crypto`; comparisons are constant-time and never exit early.
 */
import * as crypto from 'node:crypto';

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;
export const TOTP_WINDOW = 1;
/** Secret length in bytes (160 bits, the RFC 4226 recommendation). */
export const TOTP_SECRET_BYTES = 20;

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Uint8Array): string {
    let bits = 0;
    let value = 0;
    let out = '';
    for (const byte of buf) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += B32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += B32[(value << (5 - bits)) & 31];
    return out;
}

/** Decodes base32 (case-insensitive, padding and spaces ignored). Throws on other characters. */
export function base32Decode(s: string): Buffer {
    const clean = s.toUpperCase().replace(/[\s=-]/g, '');
    let bits = 0;
    let value = 0;
    const out: number[] = [];
    for (const ch of clean) {
        const idx = B32.indexOf(ch);
        if (idx < 0) throw new Error('invalid base32');
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(out);
}

/** A fresh random secret, base32. */
export function generateTotpSecret(): string {
    return base32Encode(crypto.randomBytes(TOTP_SECRET_BYTES));
}

/** HOTP (RFC 4226): HMAC-SHA1 of the 8-byte big-endian counter, dynamic truncation, `digits` digits. */
export function hotp(secret: Uint8Array, counter: number, digits: number = TOTP_DIGITS): string {
    const msg = Buffer.alloc(8);
    msg.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
    msg.writeUInt32BE(counter >>> 0, 4);
    const mac = crypto.createHmac('sha1', secret).update(msg).digest();
    const offset = mac[mac.length - 1] & 0x0f;
    const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
    return String(bin % 10 ** digits).padStart(digits, '0');
}

export interface TotpOptions {
    /** Current time in ms (default Date.now()). */
    now?: number;
    stepSeconds?: number;
    digits?: number;
}

/** The time step counter for `now`. */
export function totpCounter(now: number, stepSeconds: number = TOTP_STEP_SECONDS): number {
    return Math.floor(now / 1000 / stepSeconds);
}

/** The current code for a base32 secret. */
export function totp(secretB32: string, opts: TotpOptions = {}): string {
    return hotp(base32Decode(secretB32), totpCounter(opts.now ?? Date.now(), opts.stepSeconds), opts.digits);
}

function equalDigits(a: string, b: string): boolean {
    const ba = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/**
 * Checks `code` against the steps now-window..now+window and returns the matching counter, or
 * undefined. Every candidate is compared (no early exit). Callers remember the returned counter
 * and refuse anything at or below it, so a code is accepted once (RFC 6238 §5.2).
 */
export function matchTotp(secretB32: string, code: string, opts: TotpOptions & { window?: number } = {}): number | undefined {
    const digits = opts.digits ?? TOTP_DIGITS;
    const normalized = String(code).replace(/\s+/g, '');
    if (!new RegExp(`^\\d{${digits}}$`).test(normalized)) return undefined;
    const secret = base32Decode(secretB32);
    const center = totpCounter(opts.now ?? Date.now(), opts.stepSeconds);
    const window = opts.window ?? TOTP_WINDOW;
    let matched: number | undefined;
    for (let c = center - window; c <= center + window; c++) {
        if (equalDigits(hotp(secret, c, digits), normalized) && matched === undefined) matched = c;
    }
    return matched;
}

export function verifyTotp(secretB32: string, code: string, opts: TotpOptions & { window?: number } = {}): boolean {
    return matchTotp(secretB32, code, opts) !== undefined;
}

/** The `otpauth://totp/...` URL an authenticator app scans (as a QR code) or pastes. */
export function otpauthUrl(params: { secret: string; account: string; issuer: string }): string {
    const label = `${encodeURIComponent(params.issuer)}:${encodeURIComponent(params.account)}`;
    const q = new URLSearchParams({ secret: params.secret, issuer: params.issuer, algorithm: 'SHA1', digits: String(TOTP_DIGITS), period: String(TOTP_STEP_SECONDS) });
    return `otpauth://totp/${label}?${q.toString()}`;
}

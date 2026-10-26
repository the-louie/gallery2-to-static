/**
 * Streaming multipart/form-data reader (Sprint 18 T-02). File parts go to temp files as they
 * arrive (never into memory), text fields are collected, and both the per-file and the total size
 * are capped while streaming. Only what the upload route needs; no dependencies.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { HttpError } from './http.ts';

export interface MultipartFile {
    field: string;
    /** the client's file name (untrusted; the upload step sanitises it) */
    filename: string;
    contentType: string;
    /** temp file path */
    path: string;
    size: number;
    /** true when the file was cut at maxFileBytes */
    truncated: boolean;
}

export interface MultipartResult {
    fields: Record<string, string>;
    files: MultipartFile[];
}

export interface MultipartLimits {
    maxFileBytes: number;
    maxTotalBytes: number;
    maxFiles?: number;
}

const CRLF = Buffer.from('\r\n');
const HEADER_END = Buffer.from('\r\n\r\n');

export function boundaryOf(contentType: string | undefined): string {
    const m = /^multipart\/form-data\s*;.*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType ?? '');
    const b = m?.[1] ?? m?.[2];
    if (!b) throw new HttpError(415, 'multipart/form-data with a boundary required');
    return b;
}

function parseHeaders(block: string): { name: string; filename?: string; contentType: string } {
    let name = '', filename: string | undefined, contentType = 'application/octet-stream';
    for (const line of block.split('\r\n')) {
        const i = line.indexOf(':');
        if (i < 0) continue;
        const key = line.slice(0, i).trim().toLowerCase();
        const value = line.slice(i + 1).trim();
        if (key === 'content-disposition') {
            const n = /;\s*name="((?:[^"\\]|\\.)*)"/.exec(value);
            const f = /;\s*filename="((?:[^"\\]|\\.)*)"/.exec(value);
            if (n) name = n[1].replace(/\\"/g, '"');
            if (f) filename = f[1].replace(/\\"/g, '"');
        } else if (key === 'content-type') {
            contentType = value;
        }
    }
    return { name, filename, contentType };
}

/**
 * Reads the request body part by part. Files are written to `tmpDir/<random>`; the caller removes
 * them. Throws 413 when the total exceeds `maxTotalBytes`; a single file over `maxFileBytes` is
 * marked `truncated` (its bytes beyond the limit are discarded) so the caller can reject just that one.
 */
export async function readMultipart(req: IncomingMessage, tmpDir: string, limits: MultipartLimits): Promise<MultipartResult> {
    const boundary = boundaryOf(req.headers['content-type']);
    const delim = Buffer.from(`\r\n--${boundary}`);
    const first = Buffer.from(`--${boundary}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    const result: MultipartResult = { fields: {}, files: [] };
    let buf: Buffer = Buffer.alloc(0);
    let total = 0;
    let state: 'preamble' | 'headers' | 'body' | 'done' = 'preamble';
    let current: { name: string; filename?: string; contentType: string; fd?: number; file?: MultipartFile; text?: Buffer[] } | null = null;

    const closeCurrent = (): void => {
        if (!current) return;
        if (current.fd !== undefined) { fs.closeSync(current.fd); result.files.push(current.file!); }
        else result.fields[current.name] = Buffer.concat(current.text ?? []).toString('utf8').slice(0, 64 * 1024);
        current = null;
    };
    const writeBody = (chunk: Buffer): void => {
        if (!current) return;
        if (current.fd !== undefined) {
            const f = current.file!;
            const room = limits.maxFileBytes - f.size;
            if (room <= 0) { f.truncated = true; return; }
            const part = chunk.length > room ? chunk.subarray(0, room) : chunk;
            if (chunk.length > room) f.truncated = true;
            fs.writeSync(current.fd, part);
            f.size += part.length;
        } else {
            (current.text ??= []).push(chunk);
        }
    };
    const cleanup = (): void => {
        closeCurrent();
        for (const f of result.files) try { fs.unlinkSync(f.path); } catch { /* gone */ }
    };

    try {
        for await (const chunk of req) {
            total += (chunk as Buffer).length;
            if (total > limits.maxTotalBytes) throw new HttpError(413, `request larger than ${limits.maxTotalBytes} bytes`);
            buf = buf.length ? Buffer.concat([buf, chunk as Buffer]) : (chunk as Buffer);
            // consume as much as possible
            for (;;) {
                if (state === 'preamble') {
                    const i = buf.indexOf(first);
                    if (i < 0) { buf = buf.subarray(Math.max(0, buf.length - first.length)); break; }
                    buf = buf.subarray(i + first.length);
                    state = 'headers';
                } else if (state === 'headers') {
                    if (buf.subarray(0, 2).equals(Buffer.from('--'))) { state = 'done'; break; }
                    if (buf.subarray(0, 2).equals(CRLF)) buf = buf.subarray(2);
                    const end = buf.indexOf(HEADER_END);
                    if (end < 0) { if (buf.length > 16 * 1024) throw new HttpError(400, 'multipart headers too long'); break; }
                    const h = parseHeaders(buf.subarray(0, end).toString('utf8'));
                    buf = buf.subarray(end + HEADER_END.length);
                    if (h.filename !== undefined) {
                        if (limits.maxFiles !== undefined && result.files.length >= limits.maxFiles) throw new HttpError(413, `more than ${limits.maxFiles} files`);
                        const p = path.join(tmpDir, `up-${crypto.randomBytes(12).toString('hex')}`);
                        const fd = fs.openSync(p, 'wx', 0o600);
                        current = { ...h, fd, file: { field: h.name, filename: h.filename, contentType: h.contentType, path: p, size: 0, truncated: false } };
                    } else {
                        current = { ...h, text: [] };
                    }
                    state = 'body';
                } else if (state === 'body') {
                    const i = buf.indexOf(delim);
                    if (i < 0) {
                        // keep a delimiter's worth back in case it is split across chunks
                        const keep = delim.length;
                        if (buf.length > keep) { writeBody(buf.subarray(0, buf.length - keep)); buf = buf.subarray(buf.length - keep); }
                        break;
                    }
                    writeBody(buf.subarray(0, i));
                    closeCurrent();
                    buf = buf.subarray(i + delim.length);
                    state = 'headers';
                } else {
                    break;
                }
            }
            if (state === 'done') break;
        }
        if (state !== 'done') throw new HttpError(400, 'multipart body ended early');
        return result;
    } catch (e) {
        cleanup();
        throw e;
    }
}

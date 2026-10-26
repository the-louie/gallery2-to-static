/**
 * Upload pipeline (Sprint 18 T-02): the streaming multipart reader (chunk boundaries, limits), the
 * sniffer, EXIF reading, and the route end to end (JPEG with GPS + date, PNG, HEIC, a text file).
 */
import assert from 'assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import type { AddressInfo } from 'node:net';
import type { IncomingMessage } from 'node:http';
import sharp from 'sharp';
import { openDb } from './db/db.ts';
import { createServer } from './server.ts';
import { SESSION_COOKIE, createSession, setSessionTotpOk, signSessionId } from './auth/session.ts';
import { importG2 } from './importG2.ts';
import { fakeSql, TREE_CONFIG } from './fakeGallery.ts';
import { createAuditSink } from './audit.ts';
import { readMultipart } from './multipart.ts';
import { sniff, readExif, exifDateToUnix, safeFileName } from './upload.ts';

function fakeReq(body: Buffer, boundary: string, chunk: number): IncomingMessage {
    const chunks: Buffer[] = [];
    for (let i = 0; i < body.length; i += chunk) chunks.push(body.subarray(i, i + chunk));
    const r = Readable.from(chunks) as unknown as IncomingMessage;
    (r as unknown as { headers: Record<string, string> }).headers = { 'content-type': `multipart/form-data; boundary=${boundary}` };
    return r;
}

async function run(): Promise<void> {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-'));
    try {
        // --- the reader: fields and files, boundaries split across chunks of 1, 7 and 4096 bytes
        const B = 'XbOuNdArYx';
        const fileBytes = Buffer.concat([Buffer.from('\r\n--not-a-boundary\r\n'), Buffer.alloc(5000, 7)]);
        const body = Buffer.concat([
            Buffer.from(`--${B}\r\nContent-Disposition: form-data; name="title"\r\n\r\nHej å\r\n`),
            Buffer.from(`--${B}\r\nContent-Disposition: form-data; name="files"; filename="a b.JPG"\r\nContent-Type: image/jpeg\r\n\r\n`), fileBytes,
            Buffer.from(`\r\n--${B}\r\nContent-Disposition: form-data; name="files"; filename="small.png"\r\n\r\nxyz\r\n--${B}--\r\n`),
        ]);
        for (const chunk of [1, 7, 4096]) {
            const r = await readMultipart(fakeReq(body, B, chunk), path.join(tmp, 'mp'), { maxFileBytes: 10_000, maxTotalBytes: 100_000 });
            assert.deepStrictEqual(r.fields, { title: 'Hej å' }, `fields (chunk ${chunk})`);
            assert.strictEqual(r.files.length, 2);
            assert.deepStrictEqual([r.files[0].filename, r.files[0].contentType, r.files[0].size, r.files[0].truncated], ['a b.JPG', 'image/jpeg', fileBytes.length, false]);
            assert.ok(fs.readFileSync(r.files[0].path).equals(fileBytes), `file bytes intact (chunk ${chunk})`);
            assert.strictEqual(fs.readFileSync(r.files[1].path, 'utf8'), 'xyz');
            for (const f of r.files) fs.unlinkSync(f.path);
        }
        // limits: a file over maxFileBytes is truncated (not fatal); the request over maxTotalBytes is a 413
        const r2 = await readMultipart(fakeReq(body, B, 100), path.join(tmp, 'mp'), { maxFileBytes: 1000, maxTotalBytes: 100_000 });
        assert.deepStrictEqual([r2.files[0].size, r2.files[0].truncated, r2.files[1].truncated], [1000, true, false]);
        for (const f of r2.files) fs.unlinkSync(f.path);
        await assert.rejects(readMultipart(fakeReq(body, B, 100), path.join(tmp, 'mp'), { maxFileBytes: 10_000, maxTotalBytes: 2000 }), /413|larger/);
        assert.strictEqual(fs.readdirSync(path.join(tmp, 'mp')).length, 0, 'temp files removed after a failure');
        await assert.rejects(readMultipart(fakeReq(body.subarray(0, 200), B, 50), path.join(tmp, 'mp'), { maxFileBytes: 10_000, maxTotalBytes: 100_000 }), /ended early/);

        // --- sniffing and EXIF helpers
        const jpg = await sharp({ create: { width: 40, height: 30, channels: 3, background: { r: 200, g: 50, b: 50 } } }).jpeg().toBuffer();
        const png = await sharp({ create: { width: 40, height: 30, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
        assert.deepStrictEqual([sniff(jpg), sniff(png), sniff(Buffer.from('GIF89a......')), sniff(Buffer.from('hello world!!'))], ['jpeg', 'png', 'gif', null]);
        const withExif = await sharp(jpg).withExif({ IFD0: { Make: 'Test' }, IFD2: { DateTimeOriginal: '2026:10:26 10:00:00' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '59/1 20/1 0/1' } }).toBuffer();
        const ex = readExif((await sharp(withExif).metadata()).exif);
        assert.deepStrictEqual(ex, { dateTimeOriginal: '2026:10:26 10:00:00', hasGps: true });
        assert.strictEqual(exifDateToUnix('2026:10:26 10:00:00', new Date('2026-10-27T00:00:00Z')), Date.UTC(2026, 9, 26, 9, 0, 0) / 1000, 'CET: 10:00 Stockholm = 09:00 UTC');
        assert.strictEqual(exifDateToUnix('2026:07:01 12:00:00', new Date('2026-10-27T00:00:00Z')), Date.UTC(2026, 6, 1, 10, 0, 0) / 1000, 'CEST');
        assert.strictEqual(exifDateToUnix('2099:01:01 00:00:00', new Date('2026-10-27T00:00:00Z')), null, 'a future date is ignored');
        assert.strictEqual(exifDateToUnix('0000:00:00 00:00:00'), null);
        assert.deepStrictEqual([safeFileName('../../etc/Mitt Foto (1).JPEG', 'jpeg'), safeFileName('bild.heic', 'heic'), safeFileName('', 'png'), safeFileName('.hidden', 'gif')], ['Mitt_Foto_1.jpg', 'bild.jpg', 'image.png', 'image.gif']);

        // --- the route end to end
        const albumsRoot = path.join(tmp, 'albums');
        const db = openDb();
        await importG2({ sql: fakeSql, config: TREE_CONFIG, db });
        db.run("INSERT INTO users (id, email, role, nickname, totp_secret, totp_verified_at) VALUES (2, 'kalle@example.com', 'user', 'kalle', 'S', '2026-01-01T00:00:00.000Z')");
        db.run('INSERT INTO user_albums (user_id, album_id) VALUES (2, 10)');
        const secret = Buffer.from('s'.repeat(32));
        let changes = 0;
        const warnings: string[] = [];
        const server = createServer({ db, port: 0, log: (e) => { if (e.level === 'warn') warnings.push(String(e.msg)); }, sessionSecret: secret, audit: createAuditSink(db, path.join(tmp, 'audit.jsonl')), albumsRoot, onChange: () => { changes += 1; },
            thumbnails: { root: path.join(tmp, 'thumbs'), options: { maxWidth: 400, maxHeight: 400, quality: 80 } },
            verifyJwt: async (token) => ({ email: token, sub: token, exp: 0 }) });
        await once(server, 'listening');
        const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
        const s = createSession(db, 2); setSessionTotpOk(db, s.id);
        const headers = { 'cf-access-jwt-assertion': 'kalle@example.com', cookie: `${SESSION_COOKIE}=${signSessionId(s.id, secret)}` };
        try {
            const form = new FormData();
            form.append('files', new Blob([withExif], { type: 'image/jpeg' }), 'IMG 0001.jpeg');
            form.append('files', new Blob([png], { type: 'image/png' }), 'logo.png');
            form.append('files', new Blob([Buffer.from('not an image')], { type: 'text/plain' }), 'notes.txt');
            form.append('files', new Blob([withExif], { type: 'image/jpeg' }), 'IMG 0001.jpeg'); // duplicate name
            let heicOk = false;
            try { form.append('files', new Blob([await sharp(jpg).heif({ compression: 'av1' }).toBuffer()], { type: 'image/heic' }), 'phone.heic'); heicOk = true; } catch { /* no HEIF encoder here */ }
            const res = await fetch(`${base}/api/albums/11/photos`, { method: 'POST', headers, body: form });
            assert.strictEqual(res.status, 201);
            const r = await res.json();
            assert.deepStrictEqual(r.rejected, [{ name: 'notes.txt', reason: 'not a JPEG, PNG, GIF, WebP or HEIC image' }]);
            assert.strictEqual(r.created.length, heicOk ? 4 : 3);
            const [p1, p2, p3] = r.created;
            assert.deepStrictEqual([p1.type, p1.parentId, p1.title, p1.path, p1.width, p1.height, p1.owner, p1.canWrite], ['photo', 11, 'IMG_0001.jpg', '/dreamhack/lordag/img_0001', 40, 30, 'kalle', true]);
            assert.strictEqual(p1.eventAt, Date.UTC(2026, 9, 26, 9, 0, 0) / 1000, 'event date from EXIF DateTimeOriginal');
            assert.strictEqual(p2.title, 'logo.png');
            assert.strictEqual(p1.thumbnailUrl, '/g2data/thumbnails/dreamhack/lordag1/t__IMG_0001.jpg', 'thumbnail generated at upload');
            await fs.promises.access(path.join(tmp, 'thumbs', 'dreamhack', 'lordag1', 't__IMG_0001.jpg'));
            assert.strictEqual(p2.thumbnailUrl, '/g2data/thumbnails/dreamhack/lordag1/t__logo.png.jpg');
            assert.strictEqual(p3.title, 'IMG_0001-2.jpg', 'duplicate file name made unique');
            const stored = path.join(albumsRoot, 'dreamhack', 'lordag1', 'IMG_0001.jpg');
            const storedMeta = await sharp(stored).metadata();
            assert.strictEqual(readExif(storedMeta.exif).hasGps, false, 'GPS stripped');
            if (warnings.some((w) => w.includes('exiftool not installed'))) {
                console.log('  (exiftool not installed here: the lossy fallback ran; lanbilder2 has exiftool)');
            } else {
                assert.strictEqual(readExif(storedMeta.exif).dateTimeOriginal, '2026:10:26 10:00:00', 'other EXIF kept');
                assert.ok(fs.readFileSync(stored).length >= withExif.length - 200, 'exiftool: bytes otherwise untouched');
            }
            if (heicOk) {
                const p4 = r.created[3];
                assert.strictEqual(p4.title, 'phone.jpg', 'HEIC converted to JPEG');
                assert.strictEqual(sniff(fs.readFileSync(path.join(albumsRoot, 'dreamhack', 'lordag1', 'phone.jpg'))), 'jpeg');
            }
            assert.strictEqual(fs.readdirSync(path.join(albumsRoot, '.upload-tmp')).length, 0, 'no temp files left');
            assert.strictEqual(changes, 1);
            assert.ok(db.get("SELECT 1 FROM audit_log WHERE action = 'photo upload' AND result = 'ok'"));
            // forbidden album
            const f2 = new FormData(); f2.append('files', new Blob([png]), 'x.png');
            assert.strictEqual((await fetch(`${base}/api/albums/20/photos`, { method: 'POST', headers, body: f2 })).status, 403);
            // no files
            const f3 = new FormData(); f3.append('title', 'x');
            assert.strictEqual((await fetch(`${base}/api/albums/11/photos`, { method: 'POST', headers, body: f3 })).status, 400);
        } finally {
            server.close();
            db.close();
        }
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
    console.log('upload tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });

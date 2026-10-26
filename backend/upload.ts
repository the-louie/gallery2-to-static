/**
 * The upload pipeline (Sprint 18 T-02; TODO.md FUT-02 decisions): JPEG/PNG/GIF/WebP are kept byte
 * for byte, GPS tags are stripped, HEIC is converted to JPEG (quality 92); every file is sniffed by
 * content and decoded once by sharp (`failOn: 'error'`) before it is accepted; the file name is
 * sanitised and made unique in the album. Limits: 50 MB per file, 500 MB per request.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import type { Db } from './db/db.ts';
import type { User } from './auth/users.ts';
import { HttpError } from './http.ts';
import { getRow, g2Chain, ownerForUser, toAdminItem, type AdminItem } from './albums.ts';
import { photoSegment } from './importG2.ts';
import type { MultipartFile } from './multipart.ts';
import { generateThumbnail, readThumbnailSize, type ThumbnailOptions } from './generateThumbnail.ts';

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 500 * 1024 * 1024;
export const HEIC_JPEG_QUALITY = 92;

const execFileP = promisify(execFile);
const NOW = () => new Date().toISOString();

export type Kind = 'jpeg' | 'png' | 'gif' | 'webp' | 'heic';

/** The image type by its first bytes; null when it is none of the accepted ones. */
export function sniff(head: Buffer): Kind | null {
    if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg';
    if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (head.length >= 6 && (head.subarray(0, 6).toString('latin1') === 'GIF87a' || head.subarray(0, 6).toString('latin1') === 'GIF89a')) return 'gif';
    if (head.length >= 12 && head.subarray(0, 4).toString('latin1') === 'RIFF' && head.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
    if (head.length >= 12 && head.subarray(4, 8).toString('latin1') === 'ftyp') {
        const brand = head.subarray(8, 12).toString('latin1');
        if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis', 'avif'].includes(brand)) return 'heic';
    }
    return null;
}

/** DateTimeOriginal (tag 0x9003) and whether a GPS IFD exists, from a raw EXIF blob (TIFF header first). */
export function readExif(exif: Buffer | undefined): { dateTimeOriginal: string | null; hasGps: boolean } {
    const out = { dateTimeOriginal: null as string | null, hasGps: false };
    if (!exif || exif.length < 8) return out;
    let b = exif;
    if (b.subarray(0, 6).toString('latin1') === 'Exif\0\0') b = b.subarray(6);
    const le = b.subarray(0, 2).toString('latin1') === 'II';
    const u16 = (o: number) => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
    const u32 = (o: number) => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
    if (b.length < 8 || u16(2) !== 42) return out;
    const readIfd = (off: number, want: Set<number>): Map<number, { type: number; count: number; valueOff: number }> => {
        const found = new Map<number, { type: number; count: number; valueOff: number }>();
        if (off + 2 > b.length) return found;
        const n = u16(off);
        for (let i = 0; i < n; i++) {
            const e = off + 2 + i * 12;
            if (e + 12 > b.length) break;
            const tag = u16(e);
            if (want.has(tag)) found.set(tag, { type: u16(e + 2), count: u32(e + 4), valueOff: e + 8 });
        }
        return found;
    };
    const ifd0 = readIfd(u32(4), new Set([0x8769, 0x8825]));
    if (ifd0.has(0x8825)) out.hasGps = true;
    const exifPtr = ifd0.get(0x8769);
    if (exifPtr) {
        const sub = readIfd(u32(exifPtr.valueOff), new Set([0x9003]));
        const d = sub.get(0x9003);
        if (d && d.type === 2 && d.count >= 19) {
            const o = u32(d.valueOff);
            if (o + 19 <= b.length) out.dateTimeOriginal = b.subarray(o, o + 19).toString('latin1');
        }
    }
    return out;
}

/** "2026:10:26 10:00:00" in Europe/Stockholm → unix seconds; null when unparsable or absurd. */
export function exifDateToUnix(s: string | null, now: Date = new Date()): number | null {
    if (!s) return null;
    const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(s);
    if (!m) return null;
    const [y, mo, d, h, mi, se] = m.slice(1).map(Number);
    if (y < 1990 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    // local time of the Swedish server: find the UTC instant whose Stockholm wall clock matches
    const utcGuess = Date.UTC(y, mo - 1, d, h, mi, se);
    const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    for (const offsetH of [1, 2, 0]) {
        const t = utcGuess - offsetH * 3600 * 1000;
        if (fmt.format(new Date(t)).replace(/\D/g, '') === `${y}${String(mo).padStart(2, '0')}${String(d).padStart(2, '0')}${String(h).padStart(2, '0')}${String(mi).padStart(2, '0')}${String(se).padStart(2, '0')}`) {
            if (t > now.getTime() + 86400_000) return null;
            return Math.floor(t / 1000);
        }
    }
    return null;
}

/** A safe file name from the client's: path stripped, NFC, [a-z0-9._-] only, extension by content. */
export function safeFileName(original: string, kind: Kind): string {
    const base = original.split(/[\\/]/).pop() ?? '';
    let stem = base.replace(/\.[^.]*$/, '').normalize('NFC').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._-]+|[._-]+$/g, '').slice(0, 80);
    if (!stem) stem = 'image';
    const ext = kind === 'jpeg' || kind === 'heic' ? 'jpg' : kind;
    return `${stem}.${ext}`;
}

async function hasExiftool(): Promise<boolean> {
    try { await execFileP('exiftool', ['-ver']); return true; } catch { return false; }
}
let exiftoolAvailable: Promise<boolean> | null = null;

/**
 * Removes the GPS tags in place: exiftool (lossless, only the GPS IFD) when installed — it is on
 * lanbilder2 — else sharp re-encodes the image with the orientation applied and no metadata at all
 * (there is no selective strip without exiftool; logged as a warning).
 */
export async function stripGps(file: string, kind: Kind, log?: (l: string) => void): Promise<'exiftool' | 'sharp' | 'none'> {
    exiftoolAvailable ??= hasExiftool();
    if (await exiftoolAvailable) {
        await execFileP('exiftool', ['-gps:all=', '-overwrite_original', '-P', '-q', file]);
        return 'exiftool';
    }
    if (kind === 'gif') return 'none';
    log?.(`exiftool not installed: ${file} re-encoded without metadata to drop GPS`);
    const buf = await sharp(file).rotate().toBuffer();
    fs.writeFileSync(file, buf);
    return 'sharp';
}

export interface UploadOptions {
    albumsRoot: string;
    /** When set, the thumbnail is generated at once (the admin UI shows it before the next regeneration). */
    thumbnails?: { root: string; options: ThumbnailOptions };
    log?: (line: string) => void;
    now?: () => Date;
}

export interface UploadResult {
    created: AdminItem[];
    rejected: Array<{ name: string; reason: string }>;
}

/** Unique path component among the album's items (deleted ones included, their files may come back). */
function uniqueName(db: Db, albumId: number, name: string): string {
    const taken = new Set(db.all<{ p: string }>('SELECT path_component AS p FROM items WHERE parent_id = ?', albumId).map((r) => r.p.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    const dot = name.lastIndexOf('.');
    const stem = name.slice(0, dot), ext = name.slice(dot);
    for (let n = 2; ; n++) {
        const c = `${stem}-${n}${ext}`;
        if (!taken.has(c.toLowerCase())) return c;
    }
}

/** Processes the temp files of one request into the album; every temp file is removed afterwards. */
export async function processUpload(db: Db, albumId: number, files: MultipartFile[], user: User, opts: UploadOptions): Promise<UploadResult> {
    const album = getRow(db, albumId);
    if (!album || album.type !== 'album') throw new HttpError(404, 'album not found');
    if (album.deleted_at) throw new HttpError(409, 'album is deleted');
    const dir = path.join(opts.albumsRoot, ...g2Chain(db, albumId));
    fs.mkdirSync(dir, { recursive: true });
    const result: UploadResult = { created: [], rejected: [] };
    const now = opts.now ?? (() => new Date());
    for (const f of files) {
        try {
            if (f.truncated) throw new Error(`larger than ${MAX_FILE_BYTES} bytes`);
            if (f.size === 0) throw new Error('empty file');
            const fd = fs.openSync(f.path, 'r');
            const head = Buffer.alloc(16);
            fs.readSync(fd, head, 0, 16, 0);
            fs.closeSync(fd);
            const kind = sniff(head);
            if (!kind) throw new Error('not a JPEG, PNG, GIF, WebP or HEIC image');
            const meta = await sharp(f.path, { failOn: 'error' }).metadata();
            if (!meta.width || !meta.height) throw new Error('cannot read the image size');
            const exif = readExif(meta.exif);
            const eventAt = exifDateToUnix(exif.dateTimeOriginal, now()) ?? Math.floor(now().getTime() / 1000);
            const name = uniqueName(db, albumId, safeFileName(f.filename, kind));
            const dest = path.join(dir, name);
            let width = meta.width, height = meta.height;
            if (kind === 'heic') {
                // converted: orientation applied, metadata dropped (GPS with it)
                const info = await sharp(f.path, { failOn: 'error' }).rotate().jpeg({ quality: HEIC_JPEG_QUALITY }).toFile(dest);
                width = info.width; height = info.height;
                fs.unlinkSync(f.path);
            } else {
                fs.renameSync(f.path, dest);
                fs.chmodSync(dest, 0o644); // the spool file is 0600; nginx (www-data) serves the original
                if (exif.hasGps) await stripGps(dest, kind, opts.log);
                if (meta.orientation && meta.orientation >= 5) [width, height] = [height, width]; // shown rotated by the browser
            }
            const id = db.transaction(() => {
                const position = (db.get<{ m: number | null }>('SELECT max(position) AS m FROM items WHERE parent_id = ?', albumId)!.m ?? 0) + 1;
                const nextId = db.get<{ m: number }>('SELECT max(id) AS m FROM items')!.m + 1;
                db.run(`INSERT INTO items (id, type, parent_id, position, title, path_component, url_segment, event_at, width, height, owner_id)
                    VALUES (?, 'photo', ?, ?, ?, ?, ?, ?, ?, ?, ?)`, nextId, albumId, position, name, name, photoSegment({ id: nextId, pathComponent: name, title: name }), eventAt, width, height, ownerForUser(db, user));
                return nextId;
            });
            if (opts.thumbnails) await thumbnailNow(db, id, dest, name, dir, opts);
            result.created.push(toAdminItem(db, getRow(db, id)!, user));
        } catch (e) {
            result.rejected.push({ name: f.filename.slice(0, 200), reason: e instanceof Error ? e.message : String(e) });
            try { fs.unlinkSync(f.path); } catch { /* already moved or gone */ }
        }
    }
    return result;
}

/** The photo's thumbnail right away, recorded in `media` as the media step would (a failure only logs). */
async function thumbnailNow(db: Db, photoId: number, file: string, name: string, dir: string, opts: UploadOptions): Promise<void> {
    const t = opts.thumbnails!;
    try {
        const rel = path.relative(opts.albumsRoot, dir);
        const thumbName = /\.jpe?g$/i.test(name) ? `${db.setting('thumb_prefix') ?? 't__'}${name}` : `${db.setting('thumb_prefix') ?? 't__'}${name}.jpg`;
        const dest = path.join(t.root, rel, thumbName);
        const res = await generateThumbnail(file, dest, t.options);
        if (res !== 'generated' && res !== 'skipped') throw new Error(`thumbnail ${res}`);
        const size = await readThumbnailSize(dest);
        const st = fs.statSync(file);
        db.run(`INSERT INTO media (item_id, thumb_w, thumb_h, thumb_at, thumb_failed, file_size, file_mtime) VALUES (?, ?, ?, ?, 0, ?, ?)
            ON CONFLICT(item_id) DO UPDATE SET thumb_w = excluded.thumb_w, thumb_h = excluded.thumb_h, thumb_at = excluded.thumb_at, thumb_failed = 0, file_size = excluded.file_size, file_mtime = excluded.file_mtime`,
            photoId, size?.width ?? null, size?.height ?? null, NOW(), st.size, Math.floor(st.mtimeMs));
    } catch (e) {
        opts.log?.(`thumbnail at upload failed for ${file} (the regeneration will retry): ${e instanceof Error ? e.message : String(e)}`);
    }
}

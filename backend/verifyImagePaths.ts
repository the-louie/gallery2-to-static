/**
 * Verify image paths emitted during extraction.
 * Reads image-config.json (baseUrl), collects URLs from data/*.json,
 * fetches each to verify, writes deviation report for failures.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const THUMB_PREFIX = 't__';
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_CONCURRENCY = 5;

export interface UrlToVerify {
    url: string;
    albumId: number;
    albumTitle: string;
    type: 'highlight' | 'album-thumb' | 'photo-full' | 'photo-thumb';
}

export interface DeviationEntry {
    url: string;
    albumId: number;
    albumTitle: string;
    type: UrlToVerify['type'];
    status?: number;
    error?: string;
}

export interface VerifyOptions {
    timeoutMs?: number;
    concurrency?: number;
    verifyTimeoutMs?: number;
    verifyConcurrency?: number;
    imageConfigPath?: string;
}

function ensureNoLeadingSlash(s: string | null | undefined): string {
    if (!s || typeof s !== 'string') return '';
    return s.replace(/^\/+/, '');
}

function buildImageUrl(baseUrl: string, pathSegment: string): string | null {
    const p = ensureNoLeadingSlash(pathSegment);
    if (!p) return null;
    const base = baseUrl.replace(/\/+$/, '');
    return base ? `${base}/${p}` : null;
}

function getAlbumThumbnailUrl(child: { thumbnailUrlPath?: string | null; highlightThumbnailUrlPath?: string | null; thumbnailPathComponent?: string | null; highlightImageUrl?: string | null }, baseUrl: string): string | null {
    if (child.thumbnailUrlPath && child.thumbnailUrlPath.length > 0)
        return buildImageUrl(baseUrl, child.thumbnailUrlPath);
    if (child.highlightThumbnailUrlPath && child.highlightThumbnailUrlPath.length > 0)
        return buildImageUrl(baseUrl, child.highlightThumbnailUrlPath);
    if (child.thumbnailPathComponent) {
        const p = ensureNoLeadingSlash(child.thumbnailPathComponent);
        const lastSlash = p.lastIndexOf('/');
        const dir = lastSlash === -1 ? '' : p.slice(0, lastSlash + 1);
        const file = lastSlash === -1 ? p : p.slice(lastSlash + 1);
        return buildImageUrl(baseUrl, dir + THUMB_PREFIX + file);
    }
    if (child.highlightImageUrl && child.highlightImageUrl.length > 0)
        return buildImageUrl(baseUrl, child.highlightImageUrl);
    return null;
}

function getPhotoFullUrl(child: { urlPath?: string | null; pathComponent?: string | null }, baseUrl: string): string | null {
    const pathSegment = child.urlPath ?? child.pathComponent;
    if (!pathSegment || (typeof pathSegment === 'string' && !pathSegment.trim())) return null;
    return buildImageUrl(baseUrl, pathSegment);
}

function getPhotoThumbUrl(child: { thumbnailUrlPath?: string | null; urlPath?: string | null; pathComponent?: string | null }, baseUrl: string): string | null {
    if (child.thumbnailUrlPath && child.thumbnailUrlPath.length > 0)
        return buildImageUrl(baseUrl, child.thumbnailUrlPath);
    const pathSegment = child.urlPath ?? child.pathComponent;
    if (!pathSegment || typeof pathSegment !== 'string') return null;
    const p = ensureNoLeadingSlash(pathSegment);
    const lastSlash = p.lastIndexOf('/');
    const dir = lastSlash === -1 ? '' : p.slice(0, lastSlash + 1);
    const file = lastSlash === -1 ? p : p.slice(lastSlash + 1);
    return buildImageUrl(baseUrl, dir + THUMB_PREFIX + file);
}

function isImageContentType(contentType: string | null | undefined): boolean {
    if (!contentType || typeof contentType !== 'string') return false;
    const type = contentType.split(';')[0].trim().toLowerCase();
    return type.startsWith('image/') || type === 'application/octet-stream';
}

/**
 * Load image-config.json from frontend/public or custom path.
 * Returns baseUrl or null if missing/invalid (caller should skip verification).
 */
export async function loadImageConfigForVerification(
    projectRoot: string,
    imageConfigPath?: string,
): Promise<string | null> {
    const configPath = imageConfigPath
        ? (path.isAbsolute(imageConfigPath) ? imageConfigPath : path.join(projectRoot, imageConfigPath))
        : path.join(projectRoot, 'frontend', 'public', 'image-config.json');
    try {
        const content = await fs.readFile(configPath, 'utf-8');
        const data = JSON.parse(content) as { baseUrl?: string };
        const baseUrl = data?.baseUrl;
        if (!baseUrl || typeof baseUrl !== 'string' || baseUrl.trim() === '') {
            return null;
        }
        return baseUrl.trim().replace(/\/+$/, '') || null;
    } catch {
        return null;
    }
}

/**
 * Collect image URLs from album tree (data/*.json).
 * Aligns with check-album-assets URL construction.
 */
export async function collectImageUrlsFromAlbumTree(
    dataDir: string,
    baseUrl: string,
): Promise<UrlToVerify[]> {
    const indexPath = path.join(dataDir, 'index.json');
    let indexData: { rootAlbumId?: number };
    try {
        const content = await fs.readFile(indexPath, 'utf-8');
        indexData = JSON.parse(content) as { rootAlbumId?: number };
    } catch {
        return [];
    }
    const rootId = indexData.rootAlbumId;
    if (rootId == null) return [];

    const seen = new Set<string>();
    const result: UrlToVerify[] = [];

    async function visit(albumId: number): Promise<void> {
        const filePath = path.join(dataDir, `${albumId}.json`);
        let data: { metadata?: { albumTitle?: string | null; highlightImageUrl?: string | null }; children?: Array<{ type?: string; id?: number; title?: string | null } & Record<string, unknown>> };
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            data = JSON.parse(content) as typeof data;
        } catch {
            return;
        }
        const meta = data.metadata ?? {};
        const children = Array.isArray(data.children) ? data.children : [];
        const albumTitle = meta.albumTitle != null ? String(meta.albumTitle) : `Album ${albumId}`;

        if (meta.highlightImageUrl && meta.highlightImageUrl.length > 0) {
            const u = buildImageUrl(baseUrl, meta.highlightImageUrl);
            if (u && !seen.has(u)) {
                seen.add(u);
                result.push({ url: u, albumId, albumTitle, type: 'highlight' });
            }
        }

        for (const child of children) {
            const type = child.type ?? '';
            if (type === 'GalleryAlbumItem') {
                const thumbUrl = getAlbumThumbnailUrl(child as Parameters<typeof getAlbumThumbnailUrl>[0], baseUrl);
                if (thumbUrl && !seen.has(thumbUrl)) {
                    seen.add(thumbUrl);
                    result.push({ url: thumbUrl, albumId, albumTitle, type: 'album-thumb' });
                }
                if (child.id != null) {
                    await visit(Number(child.id));
                }
            } else if (type === 'GalleryPhotoItem') {
                const fullUrl = getPhotoFullUrl(child as Parameters<typeof getPhotoFullUrl>[0], baseUrl);
                if (fullUrl && !seen.has(fullUrl)) {
                    seen.add(fullUrl);
                    result.push({ url: fullUrl, albumId, albumTitle, type: 'photo-full' });
                }
                const thumbUrl = getPhotoThumbUrl(child as Parameters<typeof getPhotoThumbUrl>[0], baseUrl);
                if (thumbUrl && !seen.has(thumbUrl)) {
                    seen.add(thumbUrl);
                    result.push({ url: thumbUrl, albumId, albumTitle, type: 'photo-thumb' });
                }
            }
        }
    }

    await visit(rootId);
    return result;
}

/**
 * Verify a single image URL via HTTP fetch.
 * Uses HEAD to avoid downloading the full body; falls back to GET if HEAD returns 405.
 */
export async function verifyImageUrl(
    url: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<{ ok: boolean; status?: number; error?: string }> {
    if (!url || !url.startsWith('http')) {
        return { ok: false, error: 'URL not HTTP(S)' };
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
        if (res.status === 405) {
            clearTimeout(timeoutId);
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), timeoutMs);
            try {
                res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller2.signal });
                clearTimeout(timeoutId2);
            } catch (e) {
                clearTimeout(timeoutId2);
                throw e;
            }
        } else {
            clearTimeout(timeoutId);
        }
        if (!res.ok) {
            const err = res.status === 404 ? '404 Not Found' : res.status >= 500 ? `${res.status} server error` : `${res.status}`;
            return { ok: false, status: res.status, error: err };
        }
        const contentType = res.headers.get('Content-Type');
        if (!isImageContentType(contentType)) {
            return { ok: false, status: res.status, error: `not an image (Content-Type: ${contentType ?? 'missing'})` };
        }
        if (res.body) {
            await res.body.cancel().catch(() => {});
        }
        return { ok: true, status: res.status };
    } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        return { ok: false, error: isTimeout ? `timeout after ${timeoutMs}ms` : (err instanceof Error ? err.message : String(err)) };
    }
}

async function runWithConcurrency<T>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<void>,
): Promise<void> {
    let index = 0;
    async function worker(): Promise<void> {
        while (index < items.length) {
            const i = index++;
            await fn(items[i]);
        }
    }
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);
}

/**
 * Verify all URLs with concurrency limit.
 */
export async function verifyUrls(
    items: UrlToVerify[],
    options: VerifyOptions = {},
): Promise<DeviationEntry[]> {
    const timeoutMs = options.timeoutMs ?? options.verifyTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    const rawConcurrency = options.concurrency ?? options.verifyConcurrency ?? DEFAULT_CONCURRENCY;
    const concurrency = Math.max(1, rawConcurrency);
    const deviations: DeviationEntry[] = [];

    const runOne = async (item: UrlToVerify): Promise<void> => {
        const r = await verifyImageUrl(item.url, timeoutMs);
        if (!r.ok) {
            deviations.push({
                url: item.url,
                albumId: item.albumId,
                albumTitle: item.albumTitle,
                type: item.type,
                status: r.status,
                error: r.error,
            });
        }
    };

    await runWithConcurrency(items, concurrency, runOne);
    return deviations;
}

function formatDeviationLine(entry: DeviationEntry): string {
    const typeLabel = entry.type === 'highlight' ? 'Album highlight image' :
        entry.type === 'album-thumb' ? 'Subalbum thumbnail' :
            entry.type === 'photo-full' ? 'Image' : 'Thumbnail';
    const suffix = entry.status != null ? ` (${entry.status})` : '';
    const errPart = entry.error ? ` ${entry.error}` : '';
    return `- ${typeLabel} missing or failed: ${entry.url}${suffix}${errPart}`;
}

/**
 * Write deviation report to project root.
 * Filename: deviation-report_YYYYMMDD-HHMMSS.md
 */
export async function writeDeviationReport(
    projectRoot: string,
    deviations: DeviationEntry[],
    totalChecked: number,
    baseUrl: string,
    generatedAt: string,
): Promise<string> {
    const d = new Date();
    const ts = d.getFullYear().toString() +
        String(d.getMonth() + 1).padStart(2, '0') +
        String(d.getDate()).padStart(2, '0') + '-' +
        String(d.getHours()).padStart(2, '0') +
        String(d.getMinutes()).padStart(2, '0') +
        String(d.getSeconds()).padStart(2, '0');
    const filename = `deviation-report_${ts}.md`;
    const filePath = path.join(projectRoot, filename);

    const byAlbum = new Map<number, { title: string; entries: DeviationEntry[] }>();
    for (const d of deviations) {
        let group = byAlbum.get(d.albumId);
        if (!group) {
            group = { title: d.albumTitle, entries: [] };
            byAlbum.set(d.albumId, group);
        }
        group.entries.push(d);
    }

    const lines: string[] = [
        `# Image Path Deviation Report`,
        ``,
        `Generated: ${generatedAt}`,
        `Base URL: ${baseUrl}`,
        `Total URLs checked: ${totalChecked}`,
        `Deviations: ${deviations.length}`,
        ``,
        `---`,
        ``,
    ];

    const sortedAlbums = Array.from(byAlbum.entries()).sort((a, b) => a[0] - b[0]);
    for (const [albumId, group] of sortedAlbums) {
        lines.push(`# ${group.title} (id ${albumId}) failed`);
        for (const e of group.entries) {
            lines.push(formatDeviationLine(e));
        }
        lines.push('');
    }

    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    return filename;
}

/**
 * Orchestrate verification: load config, collect URLs, verify, write report.
 * Returns { verifiedCount, deviationCount, reportPath } or null if verification skipped.
 */
export async function runVerification(
    dataDir: string,
    projectRoot: string,
    options: VerifyOptions & { verifyImagePaths?: boolean } = {},
): Promise<{ verifiedCount: number; deviationCount: number; reportPath: string | null } | null> {
    if (options.verifyImagePaths === false) {
        return null;
    }
    const baseUrl = await loadImageConfigForVerification(projectRoot, options.imageConfigPath);
    if (!baseUrl) {
        return null;
    }
    if (!baseUrl.startsWith('http')) {
        return null;
    }

    const urls = await collectImageUrlsFromAlbumTree(dataDir, baseUrl);
    if (urls.length === 0) {
        return null;
    }

    const deviations = await verifyUrls(urls, {
        timeoutMs: options.timeoutMs ?? options.verifyTimeoutMs ?? DEFAULT_TIMEOUT_MS,
        concurrency: options.concurrency ?? options.verifyConcurrency ?? DEFAULT_CONCURRENCY,
    });

    let reportPath: string | null = null;
    if (deviations.length > 0) {
        const indexPath = path.join(dataDir, 'index.json');
        let generatedAt = new Date().toISOString();
        try {
            const indexContent = await fs.readFile(indexPath, 'utf-8');
            const indexData = JSON.parse(indexContent) as { generatedAt?: string };
            generatedAt = indexData?.generatedAt ?? generatedAt;
        } catch {
            // use current time
        }
        reportPath = await writeDeviationReport(
            projectRoot,
            deviations,
            urls.length,
            baseUrl,
            generatedAt,
        );
    }

    return {
        verifiedCount: urls.length,
        deviationCount: deviations.length,
        reportPath,
    };
}

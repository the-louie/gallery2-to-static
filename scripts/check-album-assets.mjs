/**
 * Depth-first traversal of all albums; checks image and thumbnail URLs
 * and writes a report of missing/failed assets.
 *
 * Album data (index, JSON) is loaded from the dev server (BASE).
 * Image URLs use the base from /image-config.json (e.g. https://lanbilder.se);
 * images are not served from the dev machine and are intended to live on that domain.
 *
 * Run: node scripts/check-album-assets.mjs
 * Requires dev server at BASE (default http://localhost:5173).
 */

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const DEFAULT_IMAGE_BASE = '/images';
const THUMB_PREFIX = 't__';
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 30_000;
const FULL_OUTPUT = process.argv.includes('--full-output');

function timestamp() {
  return new Date().toISOString();
}

function log(msg) {
  console.log(`[${timestamp()}] ${msg}`);
}

function ensureNoLeadingSlash(s) {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/^\/+/, '');
}

function buildImageUrl(imageBase, path) {
  const p = ensureNoLeadingSlash(path);
  if (!p) return null;
  const base = imageBase.startsWith('http') ? imageBase : BASE + (imageBase.startsWith('/') ? imageBase : '/' + imageBase);
  return base.replace(/\/+$/, '') + '/' + p;
}

function getAlbumThumbnailUrl(child, imageBase) {
  if (child.thumbnailUrlPath && child.thumbnailUrlPath.length > 0)
    return buildImageUrl(imageBase, child.thumbnailUrlPath);
  if (child.highlightThumbnailUrlPath && child.highlightThumbnailUrlPath.length > 0)
    return buildImageUrl(imageBase, child.highlightThumbnailUrlPath);
  if (child.thumbnailPathComponent) {
    const path = ensureNoLeadingSlash(child.thumbnailPathComponent);
    const lastSlash = path.lastIndexOf('/');
    const dir = lastSlash === -1 ? '' : path.slice(0, lastSlash + 1);
    const file = lastSlash === -1 ? path : path.slice(lastSlash + 1);
    return buildImageUrl(imageBase, dir + THUMB_PREFIX + file);
  }
  if (child.highlightImageUrl && child.highlightImageUrl.length > 0)
    return buildImageUrl(imageBase, child.highlightImageUrl);
  return null;
}

function getPhotoFullUrl(child, imageBase) {
  const path = child.urlPath ?? child.pathComponent;
  if (!path || (typeof path === 'string' && !path.trim())) return null;
  return buildImageUrl(imageBase, path);
}

function getPhotoThumbUrl(child, imageBase) {
  if (child.thumbnailUrlPath && child.thumbnailUrlPath.length > 0)
    return buildImageUrl(imageBase, child.thumbnailUrlPath);
  const path = child.urlPath ?? child.pathComponent;
  if (!path || typeof path !== 'string') return null;
  const p = ensureNoLeadingSlash(path);
  const lastSlash = p.lastIndexOf('/');
  const dir = lastSlash === -1 ? '' : p.slice(0, lastSlash + 1);
  const file = lastSlash === -1 ? p : p.slice(lastSlash + 1);
  return buildImageUrl(imageBase, dir + THUMB_PREFIX + file);
}

function isImageContentType(contentType) {
  if (!contentType || typeof contentType !== 'string') return false;
  const type = contentType.split(';')[0].trim().toLowerCase();
  return type.startsWith('image/') || type === 'application/octet-stream';
}

async function checkUrl(url) {
  if (!url) return { ok: true, status: null };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return { ok: false, status: res.status, error: res.status === 404 ? '404 Not Found' : res.status >= 500 ? `${res.status} server error` : `${res.status}` };
    const contentType = res.headers.get('Content-Type');
    if (!isImageContentType(contentType)) {
      return { ok: false, status: res.status, error: `not an image (Content-Type: ${contentType ?? 'missing'})` };
    }
    // Drain body without storing (avoids holding full image in memory; prevents slowdown over long runs)
    const reader = res.body.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
    return { ok: true, status: res.status };
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    return { ok: false, status: null, error: isTimeout ? `timeout after ${FETCH_TIMEOUT_MS}ms` : err.message };
  }
}

function treePrefix(depth, isLastSibling) {
  const bar = depth > 0 ? '│   '.repeat(depth) : '';
  return bar + (isLastSibling ? '└── ' : '├── ');
}

function logProgress(progress, albumTitle, albumId, childCount, depth, isLastSibling) {
  progress.albumsChecked += 1;
  const countPart = progress.totalAlbums != null ? ` [${progress.albumsChecked}/${progress.totalAlbums}]` : '';
  const childrenPart = childCount !== undefined ? ` <${childCount}>` : '';
  const prefix = treePrefix(depth, isLastSibling);
  log(prefix + albumTitle + ' (id ' + albumId + ')' + childrenPart + countPart);
}

async function visitAlbum(albumId, imageBase, reportLines, failuresByAlbum, progress, depth, isLastSibling) {
  const url = `${BASE}/data/${albumId}.json`;
  let data;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logProgress(progress, `Album ${albumId}`, albumId, undefined, depth, isLastSibling);
      const entry = failuresByAlbum.get(albumId) || { name: `Album ${albumId}`, failures: [] };
      entry.failures.push(`Album JSON failed: ${url} → ${res.status}`);
      failuresByAlbum.set(albumId, entry);
      reportLines.push({ albumId, name: `Album ${albumId}`, ok: false });
      return;
    }
    data = await res.json();
  } catch (err) {
    logProgress(progress, `Album ${albumId}`, albumId, undefined, depth, isLastSibling);
    const entry = failuresByAlbum.get(albumId) || { name: `Album ${albumId}`, failures: [] };
    entry.failures.push(`Album JSON error: ${url} → ${err.message}`);
    failuresByAlbum.set(albumId, entry);
    reportLines.push({ albumId, name: `Album ${albumId}`, ok: false });
    return;
  }

  const meta = data.metadata || {};
  const children = Array.isArray(data.children) ? data.children : [];
  const albumTitle = meta.albumTitle != null ? String(meta.albumTitle) : `Album ${albumId}`;
  logProgress(progress, albumTitle, albumId, children.length, depth, isLastSibling);
  const failures = [];
  let urlIndex = 0;

  // Current album highlight image (thumbnail for parent) – no thumb-placeholder allowed
  if (meta.highlightImageUrl && meta.highlightImageUrl.length > 0) {
    urlIndex += 1;
    const u = buildImageUrl(imageBase, meta.highlightImageUrl);
    if (progress.fullOutput) log(`  [${urlIndex}] checking: album highlight`);
    const r = await checkUrl(u);
    if (!r.ok) failures.push(`Album highlight image missing or failed: ${u}${r.status != null ? ` (${r.status})` : ''}${r.error ? ` ${r.error}` : ''}`);
  } else {
    failures.push('Album has no thumbnail (thumb-placeholder not allowed)');
  }

  for (const child of children) {
    const type = child.type || '';
    if (type === 'GalleryAlbumItem') {
      const thumbUrl = getAlbumThumbnailUrl(child, imageBase);
      if (thumbUrl) {
        urlIndex += 1;
        if (progress.fullOutput) log(`  [${urlIndex}] checking: subalbum thumb "${child.title ?? child.id}"`);
        const r = await checkUrl(thumbUrl);
        if (!r.ok) failures.push(`Subalbum thumbnail missing or failed: ${thumbUrl}${r.status != null ? ` (${r.status})` : ''}${r.error ? ` ${r.error}` : ''}`);
      } else {
        failures.push(`Subalbum "${child.title ?? child.id}" has no thumbnail (thumb-placeholder not allowed)`);
      }
    } else if (type === 'GalleryPhotoItem') {
      const fullUrl = getPhotoFullUrl(child, imageBase);
      if (fullUrl) {
        urlIndex += 1;
        if (progress.fullOutput) log(`  [${urlIndex}] checking: full "${child.title ?? child.id}"`);
        const r = await checkUrl(fullUrl);
        if (!r.ok) failures.push(`Image missing or failed: ${fullUrl}${r.status != null ? ` (${r.status})` : ''}${r.error ? ` ${r.error}` : ''}`);
      }
      const thumbUrl = getPhotoThumbUrl(child, imageBase);
      if (thumbUrl) {
        urlIndex += 1;
        if (progress.fullOutput) log(`  [${urlIndex}] checking: thumb "${child.title ?? child.id}"`);
        const r = await checkUrl(thumbUrl);
        if (!r.ok) failures.push(`Thumbnail missing or failed: ${thumbUrl}${r.status != null ? ` (${r.status})` : ''}${r.error ? ` ${r.error}` : ''}`);
      }
    }
  }

  if (failures.length > 0) {
    failuresByAlbum.set(albumId, { name: albumTitle, failures });
    reportLines.push({ albumId, name: albumTitle, ok: false });
  } else {
    reportLines.push({ albumId, name: albumTitle, ok: true });
  }

  // Depth-first: recurse into child albums
  const albumChildren = children.filter((c) => (c.type || '') === 'GalleryAlbumItem' && c.id != null);
  for (let i = 0; i < albumChildren.length; i++) {
    const child = albumChildren[i];
    const isLast = i === albumChildren.length - 1;
    await visitAlbum(Number(child.id), imageBase, reportLines, failuresByAlbum, progress, depth + 1, isLast);
  }
}

async function main() {
  let rootId;
  try {
    const indexRes = await fetch(`${BASE}/data/index.json`);
    if (!indexRes.ok) throw new Error(`index.json ${indexRes.status}`);
    const index = await indexRes.json();
    rootId = index.rootAlbumId;
    if (rootId == null) throw new Error('rootAlbumId missing');
  } catch (err) {
    console.error('Failed to load index:', err.message);
    process.exit(1);
  }

  let imageBase = DEFAULT_IMAGE_BASE;
  try {
    const configRes = await fetch(`${BASE}/image-config.json`);
    if (configRes.ok) {
      const config = await configRes.json();
      if (config.baseUrl) imageBase = config.baseUrl.replace(/\/+$/, '') || DEFAULT_IMAGE_BASE;
    }
  } catch (_) {}

  let totalAlbums = null;
  try {
    const searchRes = await fetch(`${BASE}/data/search/index.json`);
    if (searchRes.ok) {
      const searchIndex = await searchRes.json();
      const items = Array.isArray(searchIndex?.items) ? searchIndex.items : [];
      totalAlbums = items.filter((item) => (item?.type || '') === 'GalleryAlbumItem').length;
    }
  } catch (_) {}

  const reportLines = [];
  const failuresByAlbum = new Map();
  const progress = { albumsChecked: 0, totalAlbums, fullOutput: FULL_OUTPUT };
  log(totalAlbums != null ? `Starting depth-first album traversal (${totalAlbums} albums)…` : 'Starting depth-first album traversal…');
  log('.');
  await visitAlbum(rootId, imageBase, reportLines, failuresByAlbum, progress, 0, true);
  log(`Done. ${progress.albumsChecked} albums checked.\n`);

  // Print report to stderr
  for (const line of reportLines) {
    if (line.ok) {
      console.error(`- ${line.name} OK`);
    } else {
      const entry = failuresByAlbum.get(line.albumId);
      console.error(`# ${line.name} failed`);
      if (entry && entry.failures.length) {
        for (const f of entry.failures) console.error(`- ${f}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

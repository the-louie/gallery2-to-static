/**
 * Depth-first traversal of all albums; checks image and thumbnail URLs
 * against the dev server and writes a report of missing/failed assets.
 * Run with: node scripts/check-album-assets.mjs
 * Requires dev server at BASE (default http://localhost:5173).
 */

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const DEFAULT_IMAGE_BASE = '/images';
const THUMB_PREFIX = 't__';

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

async function checkUrl(url) {
  if (!url) return { ok: true, status: null };
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!res.ok) return { ok: false, status: res.status, error: res.status === 404 ? '404 Not Found' : res.status >= 500 ? `${res.status} server error` : `${res.status}` };
    await res.arrayBuffer();
    return { ok: true, status: res.status };
  } catch (err) {
    return { ok: false, status: null, error: err.message };
  }
}

function logProgress(progress, albumTitle, albumId) {
  progress.albumsChecked += 1;
  console.error(`[${progress.albumsChecked}] Checking: ${albumTitle} (id ${albumId})`);
}

async function visitAlbum(albumId, imageBase, reportLines, failuresByAlbum, progress) {
  const url = `${BASE}/data/${albumId}.json`;
  let data;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logProgress(progress, `Album ${albumId}`, albumId);
      const entry = failuresByAlbum.get(albumId) || { name: `Album ${albumId}`, failures: [] };
      entry.failures.push(`Album JSON failed: ${url} → ${res.status}`);
      failuresByAlbum.set(albumId, entry);
      reportLines.push({ albumId, name: `Album ${albumId}`, ok: false });
      return;
    }
    data = await res.json();
  } catch (err) {
    logProgress(progress, `Album ${albumId}`, albumId);
    const entry = failuresByAlbum.get(albumId) || { name: `Album ${albumId}`, failures: [] };
    entry.failures.push(`Album JSON error: ${url} → ${err.message}`);
    failuresByAlbum.set(albumId, entry);
    reportLines.push({ albumId, name: `Album ${albumId}`, ok: false });
    return;
  }

  const meta = data.metadata || {};
  const children = Array.isArray(data.children) ? data.children : [];
  const albumTitle = meta.albumTitle != null ? String(meta.albumTitle) : `Album ${albumId}`;
  logProgress(progress, albumTitle, albumId);
  const failures = [];

  // Current album highlight image (thumbnail for parent)
  if (meta.highlightImageUrl && meta.highlightImageUrl.length > 0) {
    const u = buildImageUrl(imageBase, meta.highlightImageUrl);
    const r = await checkUrl(u);
    if (!r.ok) failures.push(`Album highlight image missing or failed: ${u}${r.status != null ? ` (${r.status})` : ''}${r.error ? ` ${r.error}` : ''}`);
  }

  for (const child of children) {
    const type = child.type || '';
    if (type === 'GalleryAlbumItem') {
      const thumbUrl = getAlbumThumbnailUrl(child, imageBase);
      if (thumbUrl) {
        const r = await checkUrl(thumbUrl);
        if (!r.ok) failures.push(`Subalbum thumbnail missing or failed: ${thumbUrl}${r.status != null ? ` (${r.status})` : ''}${r.error ? ` ${r.error}` : ''}`);
      }
    } else if (type === 'GalleryPhotoItem') {
      const fullUrl = getPhotoFullUrl(child, imageBase);
      if (fullUrl) {
        const r = await checkUrl(fullUrl);
        if (!r.ok) failures.push(`Image missing or failed: ${fullUrl}${r.status != null ? ` (${r.status})` : ''}${r.error ? ` ${r.error}` : ''}`);
      }
      const thumbUrl = getPhotoThumbUrl(child, imageBase);
      if (thumbUrl) {
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
  for (const child of children) {
    if ((child.type || '') === 'GalleryAlbumItem' && child.id != null) {
      await visitAlbum(Number(child.id), imageBase, reportLines, failuresByAlbum, progress);
    }
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

  const reportLines = [];
  const failuresByAlbum = new Map();
  const progress = { albumsChecked: 0 };
  console.error('Starting depth-first album traversal...');
  await visitAlbum(rootId, imageBase, reportLines, failuresByAlbum, progress);
  console.error(`Done. ${progress.albumsChecked} albums checked.\n`);

  // Print report
  for (const line of reportLines) {
    if (line.ok) {
      console.log(`- ${line.name} OK`);
    } else {
      const entry = failuresByAlbum.get(line.albumId);
      console.log(`# ${line.name} failed`);
      if (entry && entry.failures.length) {
        for (const f of entry.failures) console.log(`- ${f}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

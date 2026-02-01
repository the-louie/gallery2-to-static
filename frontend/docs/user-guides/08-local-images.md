# Local image copy setup

This guide explains how to serve gallery images from a local path (e.g. `/images`) so that thumbnails, album grid, and lightbox load without CORS or OpaqueResponseBlocking. No backend or URL-building code changes are required; only config and path structure.

## Where to put the local image copy

**Recommended:** `frontend/public/images/`

- Vite serves `frontend/public/` at `/`, so files under `frontend/public/images/` are available at `/images/...`.
- Path structure under `images/` must match the path components in your album/photo JSON: `pathComponent`, `thumbnailPathComponent`, `urlPath`, `thumbnailUrlPath`, and `highlightImageUrl` (or equivalent) from backend/extraction output.
- Example: if data has `thumbnailPathComponent: "internationella/event/__t_photo.jpg"`, the file must be at `frontend/public/images/internationella/event/__t_photo.jpg` (URL `/images/internationella/event/__t_photo.jpg`). No flattening; directory structure is preserved.

See also `frontend/public/IMAGES-LOCAL.md` for a short pointer.

## How to point baseUrl at the local path

**Option A – Runtime (recommended for local dev):** Edit `frontend/public/image-config.json` and set:

```json
{
  "baseUrl": "/images"
}
```

Copy from `frontend/public/image-config.json.example.local` if you prefer. No trailing slash. The app loads this at runtime, so no rebuild is needed when switching.

**Option B – Build-time:** Set the environment variable `VITE_IMAGE_BASE_URL=/images` when building or running the dev server. This is applied at build time.

**Precedence:** Runtime `image-config.json` overrides `VITE_IMAGE_BASE_URL`; if both are missing or invalid, the default is `/images` (see `frontend/src/utils/imageConfig.ts`).

When `baseUrl` is `/images`, requests are same-origin; `maybeProxyForDev` does not substitute (proxy is only for HTTP(S) baseUrl matching `VITE_IMAGE_PROXY_TARGET`).

## Verification checklist

With `baseUrl` set to the local path (e.g. `"/images"`) and the app running:

1. **Root album list**
   - Thumbnails load (original theme).
   - Highlight backgrounds load (non-original theme).
2. **Album detail**
   - Album grid thumbnails load (AlbumCard).
3. **Lightbox**
   - Open an image; thumbnail and full-size load.
   - Next/previous; images load.
4. **Browser console**
   - No OpaqueResponseBlocking or CORS errors for image requests.

If any of these fail, check that files exist under `public/images/` with the same relative paths as in your JSON (`pathComponent`, `thumbnailPathComponent`, etc.) and that `baseUrl` is exactly `"/images"` (no trailing slash).

## Switching back to remote or proxy

- **Remote baseUrl:** Set `baseUrl` in `image-config.json` to your remote URL (e.g. `https://cdn.example.com/gallery`) or use `image-config.json.example` as a template.
- **Remote dev with proxy:** Set `VITE_IMAGE_PROXY_TARGET` to your remote base URL so that in dev the app uses the same-origin `/image-proxy` and avoids CORS. See `frontend/src/utils/imageConfig.ts` (`maybeProxyForDev`).

## Backend verification note

Backend `verifyImagePaths` (in `backend/verifyImagePaths.ts`) only verifies HTTP(S) URLs. Local `/images` paths are not verified by the backend. Local verification is browser-based only (use the checklist above).

# TODO

---

## Pending

### Add ability to generate thumbnails from the fullsize images; use a separate directory root but the same directory structure as the fullsize images

**Objective:** (1) Provide a way to generate thumbnail images from fullsize images (e.g. a script or build step that resizes/crops and writes thumbnails). (2) Serve thumbnails from a separate directory root (e.g. `/thumbnails` or a configurable `thumbnailBaseUrl`) while keeping the same relative path structure under that root as under the fullsize root (e.g. fullsize `baseUrl/album/sub/photo.jpg` → thumbnail `thumbnailBaseUrl/album/sub/photo.jpg` or `thumbnailBaseUrl/album/sub/t__photo.jpg`).

**Context:** The app builds image URLs in `frontend/src/utils/imageUrl.ts`: full images use `{baseUrl}/{pathComponent}`; thumbnails use the same `baseUrl` with a filename prefix (e.g. `t__`) so the URL is `{baseUrl}/{dir}t__{filename}`. Album thumbnails use `thumbnailPathComponent` or `thumbnailUrlPath` with the same single base URL. There is no separate "thumbnail base URL" today; fullsize and thumb share one `baseUrl`. Extraction/backend may output `thumbnailPathComponent` with the same path shape as fullsize (directory structure) but with a different filename convention (e.g. `__t_...___...jpg`). To support a separate thumbnail root with the same directory structure: thumbnail URL would become `{thumbnailBaseUrl}/{sameRelativePathAsFullsize}` (or with thumb prefix in filename under that root), so that fullsize and thumb can live on different roots (e.g. `/images` vs `/thumbnails`) while paths like `album/sub/photo.jpg` stay the same under each root.

**Expected behavior:**

- **Generation:** A documented or scripted way to generate thumbnails from fullsize images (e.g. Node script using sharp/jimp, or Python, or existing tooling). Input: fullsize image directory tree. Output: thumbnail directory tree with the same relative structure (same subpaths, filenames may follow existing convention e.g. `t__originalname.jpg` or `__t_...___...jpg`). Optionally configurable size/quality.
- **Separate root, same structure:** Thumbnails are served from a different base (e.g. `thumbnailBaseUrl` or a second path). The relative path under the thumbnail root mirrors the fullsize structure: e.g. fullsize at `baseUrl/internationella/event/photo.jpg`, thumbnail at `thumbnailBaseUrl/internationella/event/t__photo.jpg` (or equivalent). No flattening; directory structure is preserved.
- **Config:** Support a separate thumbnail base URL (e.g. in `image-config.json`: `thumbnailBaseUrl` optional; when absent, thumbnails use `baseUrl` as today). Frontend uses `thumbnailBaseUrl` for thumbnail URLs and `baseUrl` for full image URLs when both are set.
- **URL building:** Update `imageUrl.ts` (and any callers) so thumbnail URLs use `thumbnailBaseUrl` when configured, otherwise fall back to `baseUrl`. Same relative path logic (pathComponent / thumbnailPathComponent) under the chosen base.
- **Verification:** With fullsize and thumbnail roots populated (e.g. local `/images` and `/thumbnails`), verify root album thumbnails, album grid thumbnails, and lightbox thumbnail-then-full flow all load correctly from the two roots.

**Implementation direction:**

1. **Thumbnail generation:** Add or document a script (e.g. in `scripts/` or `backend/`) that: reads fullsize images from a source directory; generates thumbnails (resize, optional crop); writes them to a target directory preserving the same relative path structure (and filename convention expected by the app, e.g. `t__` prefix or legacy `__t_...___...`). Consider integration with existing extraction output (paths from JSON) so only referenced images are processed.
2. **Config:** Extend `image-config.json` (and types in `frontend/src/utils/imageConfig.ts`) with an optional `thumbnailBaseUrl` (string, no trailing slash). When set, thumbnail URLs use this base; when unset, use `baseUrl` (current behavior). Ensure `loadImageConfig` / context exposes this to the app.
3. **URL construction:** In `frontend/src/utils/imageUrl.ts`, update `constructThumbnailUrl`, `getImageUrl`, `getImageUrlWithFormat`, and `getAlbumThumbnailUrl` to accept or use a thumbnail base URL when building thumbnail URLs. Use `thumbnailBaseUrl ?? baseUrl` so a single base still works.
4. **Context:** If image config is loaded in a context (e.g. `ImageConfigContext`), expose `thumbnailBaseUrl` there and pass it through to URL builders (or read from config in the URL module).
5. **Dev proxy (optional):** If using a proxy for cross-origin images, consider whether `thumbnailBaseUrl` also needs proxying in dev (e.g. separate proxy path or same origin).
6. **Verification:** Populate fullsize and thumbnail directories (same structure, separate roots); set `baseUrl` and `thumbnailBaseUrl`; verify root list, album grid, and lightbox load thumbnails from the thumb root and fullsize from the fullsize root. Confirm no regressions when `thumbnailBaseUrl` is omitted (single base).

**Files likely to touch:**

- `frontend/public/image-config.json` and `.example` – add `thumbnailBaseUrl` (optional).
- `frontend/src/utils/imageConfig.ts` – type, load, and expose `thumbnailBaseUrl`.
- `frontend/src/contexts/ImageConfigContext.tsx` – expose `thumbnailBaseUrl` if config is consumed there.
- `frontend/src/utils/imageUrl.ts` – use `thumbnailBaseUrl` for thumbnail URL construction when set.
- New or existing script (e.g. `scripts/generate-thumbnails.mjs` or backend tool) – generate thumbnails from fullsize with same directory structure.
- Docs – how to run thumbnail generation and how to set `thumbnailBaseUrl` for local or production.

**Verification:** Run thumbnail generation from a fullsize tree; serve both roots (e.g. `/images` and `/thumbnails`); set config; confirm root album, album grid, and lightbox show thumbnails from the thumbnail root and fullsize from the fullsize root, with no console errors.

# TODO

---

## Pending

### Incorporate local copy of images and verify that it works correctly

**Objective:** Serve gallery images from a local path (e.g. `/images` or a dev-served directory) instead of a remote base URL, and verify that thumbnails, album grid, lightbox, and root album view all load and display correctly.

**Context:** The app currently uses `public/image-config.json` to set `baseUrl` (e.g. `https://lanbilder.se`). Image URLs are built as `{baseUrl}/{pathComponent}` or `{baseUrl}/{thumbnailPathComponent}`. When `baseUrl` is cross-origin (e.g. from `localhost`), CORS/CORP can cause OpaqueResponseBlocking; a dev proxy (`VITE_IMAGE_PROXY_TARGET`) exists to work around that. Using a local copy avoids cross-origin entirely and simplifies development and offline verification.

**Expected behavior:**

- A local directory (or Vite-served path) contains the same image paths as production (e.g. `internationella/.../__t_...jpg` for thumbnails, full paths for full-size images).
- `image-config.json` (or env) is set so `baseUrl` points at that local path (e.g. `/images` with no trailing slash, matching `DEFAULT_BASE_URL` in `frontend/src/utils/imageConfig.ts`).
- Root album view: all root-level album thumbnails load (RootAlbumListBlock when `isOriginal`, and background/highlight images when not).
- Album detail view: album thumbnails in AlbumGrid (AlbumCard) load.
- Lightbox: thumbnail and full-size images load; progressive loading and preload behave correctly.
- No OpaqueResponseBlocking or CORS errors when using the local base URL (same-origin).
- Optional: document how to populate the local copy (e.g. sync from extraction output or CDN) and how to switch between local and remote baseUrl.

**Implementation direction:**

1. **Local image source:** Decide where the local copy lives (e.g. `frontend/public/images/`, or a Vite dev middleware path like `/data/images/`). Ensure path structure matches what the app expects (same relative paths as `thumbnailPathComponent`, `pathComponent`, `thumbnailUrlPath`, etc.).
2. **Config:** Use `baseUrl: "/images"` (or the chosen path) in `public/image-config.json` for local development, or document `VITE_IMAGE_BASE_URL=/images` so the app uses the local base without editing the JSON.
3. **Serving:** If images are under `public/images/`, Vite serves them at `/images/...` by default. If they live outside `public/`, add or reuse a Vite plugin/middleware to serve that directory at the chosen base path.
4. **Verification:** Manually (or via a small checklist) verify: (a) root album list thumbnails, (b) album grid thumbnails on an album page, (c) lightbox open/next/prev and full-size load, (d) no console errors for image loads. Optionally add or run an existing smoke test that asserts image URLs resolve.
5. **Docs:** Update README or dev docs with: how to set up the local image copy, how to point `baseUrl` at it, and how to verify (and, if relevant, how to use the remote baseUrl or proxy for comparison).

**Files likely to touch:**

- `frontend/public/image-config.json` or `.example` – document local `baseUrl` value.
- `frontend/vite.config.ts` – only if a new path (e.g. outside `public/`) needs to be served.
- Docs (e.g. `README.md`, `frontend/README.md`, or `docs/`) – setup and verification steps.

**Verification:** With `baseUrl` set to the local path, load the app on the root album view and an album detail view; confirm thumbnails and lightbox images load and that the console reports no OpaqueResponseBlocking or CORS errors for image requests.

### Add ability to generate thumbnails from the fullsize images; use a separate directory root but the same directory structure as the fullsize images

**Objective:** (1) Provide a way to generate thumbnail images from fullsize images (e.g. a script or build step that resizes/crops and writes thumbnails). (2) Serve thumbnails from a separate directory root (e.g. `/thumbnails` or a configurable `thumbnailBaseUrl`) while keeping the same relative path structure under that root as under the fullsize root (e.g. fullsize `baseUrl/album/sub/photo.jpg` → thumbnail `thumbnailBaseUrl/album/sub/photo.jpg` or `thumbnailBaseUrl/album/sub/t__photo.jpg`).

**Context:** The app builds image URLs in `frontend/src/utils/imageUrl.ts`: full images use `{baseUrl}/{pathComponent}`; thumbnails use the same `baseUrl` with a filename prefix (e.g. `t__`) so the URL is `{baseUrl}/{dir}t__{filename}`. Album thumbnails use `thumbnailPathComponent` or `thumbnailUrlPath` with the same single base URL. There is no separate “thumbnail base URL” today; fullsize and thumb share one `baseUrl`. Extraction/backend may output `thumbnailPathComponent` with the same path shape as fullsize (directory structure) but with a different filename convention (e.g. `__t_...___...jpg`). To support a separate thumbnail root with the same directory structure: thumbnail URL would become `{thumbnailBaseUrl}/{sameRelativePathAsFullsize}` (or with thumb prefix in filename under that root), so that fullsize and thumb can live on different roots (e.g. `/images` vs `/thumbnails`) while paths like `album/sub/photo.jpg` stay the same under each root.

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


### Undo the renaming of Gallery Administrator to "The Louie"; change it to "Unknown" instead

**Objective:** Revert the backend behavior that replaces the owner display name "Gallery Administrator" (from the Gallery 2 database) with "The Louie" in emitted JSON. Instead, when the source owner name is "Gallery Administrator", output "Unknown" so that albums/images with no meaningful owner attribution display as "Unknown" rather than a specific pseudonym.

**Context:** The backend currently normalizes owner names in `backend/ownerDisplayName.ts`: `normalizeOwnerDisplayName(name)` returns `"The Louie"` when `name === "Gallery Administrator"`, and is used in `backend/sqlUtils.ts` when assigning `ownerName` in `getAlbumInfo` and `getChildren`. This was introduced so that the default Gallery 2 admin label was shown as "The Louie" in the static output. The user now wants to undo that: do not use "The Louie"; use "Unknown" when the source is "Gallery Administrator", to indicate unknown or unspecified ownership.

**Expected behavior:**

- When the raw owner name from the Gallery 2 DB is exactly `"Gallery Administrator"`, the emitted `ownerName` in album metadata and in child items (albums/images) is `"Unknown"`.
- All other owner names (including null, empty string, or any other value) are unchanged.
- Frontend and backend types remain unchanged (`ownerName` is still `string | null`); only the value written for the Gallery Administrator case changes from "The Louie" to "Unknown".
- Any docs or dev-notes that describe the "Gallery Administrator → The Louie" mapping are updated to describe "Gallery Administrator → Unknown".

**Implementation direction:**

1. **Backend – ownerDisplayName.ts:** Change the constant (or literal) used for the replacement value from `"The Louie"` to `"Unknown"`. Update JSDoc and any exported constant (e.g. `OWNER_DISPLAY_NAME_THE_LOUIE` → `OWNER_DISPLAY_NAME_UNKNOWN` or equivalent) so the single source of truth is "Unknown".
2. **Backend – sqlUtils.ts:** No logic change if it only calls `normalizeOwnerDisplayName`; the new return value "Unknown" will flow through automatically. Confirm no hardcoded "The Louie" in sqlUtils.
3. **Tests – ownerDisplayName.test.ts:** Update expectations: `normalizeOwnerDisplayName('Gallery Administrator')` should equal `'Unknown'`. Remove or update tests that assert "The Louie". Add or keep a test that other values (null, other strings) are unchanged.
4. **Docs:** Update `docs/dev-notes/20260125-1300_replace-gallery-administrator-with-the-louie-ownername-backend.md` (or equivalent) to state that "Gallery Administrator" is now replaced with "Unknown", or add a short dev note that the replacement was changed from "The Louie" to "Unknown". If the doc title references "The Louie", consider renaming or superseding the doc.
5. **Verification:** Run backend extraction (or unit tests); confirm that when the DB has owner "Gallery Administrator", emitted JSON has `ownerName: "Unknown"`. Confirm frontend still displays owner correctly (e.g. RootAlbumListBlock, Lightbox metadata).

**Files likely to touch:**

- `backend/ownerDisplayName.ts` – replacement value "The Louie" → "Unknown"; constant name and JSDoc.
- `backend/ownerDisplayName.test.ts` – update expectations to "Unknown".
- `docs/dev-notes/20260125-1300_replace-gallery-administrator-with-the-louie-ownername-backend.md` (or new dev note) – document that replacement is now "Unknown".

**Verification:** Run backend ownerDisplayName tests; run extraction (or a quick manual check) and confirm emitted album/image JSON has `ownerName: "Unknown"` when the source is Gallery Administrator. Spot-check frontend (album block, lightbox) to ensure "Unknown" displays correctly.

### Bug: Single row of images below the fold never loads when scrolling (lazy-load never triggered)

**Objective:** Fix the bug where, for albums that have only one row of images and that row is entirely below the initial viewport, the images are not loaded on first paint and when the user scrolls down the lazy-loading of those images is never triggered, so the row stays empty or placeholder. Example: `http://localhost:5173/#/album/2946`.

**Context:** The image grid uses `ImageThumbnail` (`frontend/src/components/ImageThumbnail/ImageThumbnail.tsx`), which lazy-loads via `IntersectionObserver`: it observes the thumbnail container with `rootMargin: '0px 0px 200px 0px'` and default `root` (viewport). When `entry.isIntersecting` becomes true, it sets `shouldLoad(true)` and the image loads. If the grid (or the album content) is inside a scrollable container that is not the document viewport, then the observer’s root is still the viewport; scrolling that inner container does not change intersection with the viewport, so elements that come into view inside the scrollable area never become “intersecting” and never load. Alternatively, the scroll container might be the document but the observer root or the observed element’s position might be such that after scroll the callback never fires (e.g. root not updated, or observed node not in the right scroll context). Outcome: one row of images below the fold never gets `isIntersecting` and never loads.

**Expected behavior:**

- When the user scrolls down (whether the scroll is on the document or inside a scrollable album/content area), any image row that comes into view (or within a reasonable rootMargin of the visible area) should eventually intersect and trigger loading.
- Albums that have only one row of images below the fold should show those images after the user scrolls to them, not remain blank or placeholder.
- No regression: images that are already in view or that load on initial render should continue to work.

**Implementation direction:**

1. **Identify scroll context:** Determine where the album image grid lives in the DOM and what element is the scroll container (document vs. an inner div with overflow scroll). If the grid is inside a scrollable div, the `IntersectionObserver` used for lazy-loading must use that scroll container as `root` so that when the user scrolls inside it, intersection is computed against that root and entries fire when images enter the visible part of that container.
2. **Observer root:** In `ImageThumbnail` (or a parent that provides context), either (a) use the scroll container element as `root` when it exists (e.g. pass a ref from the album detail/grid layout that points to the scrollable element), or (b) ensure the observed nodes are descendants of the viewport’s scroll and that no intermediate scroll container is the real scroll context; then verify that with default root (viewport) the callback fires when the user scrolls the page. If the layout uses an inner scroll (e.g. main content area with overflow), option (a) is required.
3. **rootMargin:** Keep or tune rootMargin so that images start loading slightly before they enter the visible area (e.g. 200px below); ensure the root used for the observer is the same as the scroll context so that “below” is in the right coordinate system.
4. **Fallback:** If the observer never fires (e.g. element never intersects the root within a short delay), consider a fallback that sets `shouldLoad(true)` after a timeout or when the user scrolls, so that images below the fold eventually load even in edge cases.
5. **Verification:** Reproduce with an album that has only one row of images below the fold (e.g. album 2946). Load the page, scroll down to where the row is; confirm the images load. Test with both document scroll and, if applicable, an inner scroll container.

**Files likely to touch:**

- `frontend/src/components/ImageThumbnail/ImageThumbnail.tsx` – use scroll container as observer `root` when available; or add fallback when intersection never fires.
- Layout or album grid component that wraps the image grid – pass ref to the scroll container so ImageThumbnail (or a context/hook) can use it as observer root.
- Possibly a shared hook or context that provides the scroll root ref for lazy-loaded content.

**Verification:** Open `http://localhost:5173/#/album/2946` (or any album with a single row of images below the fold). Without scrolling, confirm the row is not visible. Scroll down until the row is in view; confirm the images load. Repeat with a narrow viewport if the bug is viewport-dependent.“/” lightbox “back”’s
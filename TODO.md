# TODO

## Cancel all in-flight image GETs when navigating

**Status:** Pending
**Priority:** High
**Complexity:** Medium
**Estimated Time:** 2–4 hours

### Description
When the user navigates away (e.g. changes route from one album to another, or from album to root), every in-flight image HTTP GET request must be canceled. Today, requests triggered by the previous view can still complete after navigation, consuming bandwidth and memory and potentially updating state for unmounted components. All image fetches (thumbnails, full-size, preloads, lightbox next/prev) must be tied to an AbortController (or equivalent) that is aborted on navigation so the browser stops the requests and releases resources.

### Requirements

#### Investigation Tasks
- Find every code path that fetches images: native `<img src>`, `fetch()` for images or blobs, preload hooks (e.g. useImagePreload, useProgressiveImage preload), lightbox full-size or adjacent-image preload, any central image-loading utility.
- For `<img src>`: identify whether any custom loading uses fetch + object URL; if so, ensure that fetch uses a signal. For img-only loading, canceling is limited (browser may not abort img), but any explicit fetch() used for images must accept and use an AbortSignal.
- Determine where "navigation" can be observed: route change (React Router), album id change, or a single navigation context that can provide an AbortSignal to all image-loading code for the current "page" or "album view".

#### Implementation Tasks
- Introduce a per-view or per-route AbortController (e.g. in a context or in the component tree for the album/image view) that is aborted when the user navigates away (e.g. in a React Router cleanup or when albumId/route params change).
- Pass the corresponding AbortSignal into all image fetches (fetch(..., { signal }), and any preload or load helpers that use fetch). Ensure preload queues or in-flight requests are cleared/aborted when the signal fires.
- Where image loading is done only via `<img src>` (no fetch), document that behavior; prefer switching to fetch + object URL with signal where feasible so those GETs can be canceled, or ensure at least unmount removes the img so the browser can discard the request where it supports that.
- Add tests: after navigating away, assert no completed image requests from the previous view (e.g. via mock fetch or network instrumentation), and no state updates from aborted requests.

### Deliverable
On navigation, all in-flight image GETs for the previous view are canceled (aborted). No requests from the previous album/view complete after the user has left; bandwidth and memory from those requests are not retained.

### Testing Requirements
- Navigate from an album with many thumbnails loading to another route; verify (e.g. Network tab or mock) that previous requests are aborted/canceled.
- No console errors or React state-update-after-unmount from aborted fetches; error handlers must treat AbortError as a normal cancellation.
- Returning to an album still loads images correctly (new requests with a new signal).

### Technical Notes
- Use `AbortController.abort()` and pass `controller.signal` to `fetch()` options. On navigation, call `controller.abort()` and create a new controller for the new view.
- React Strict Mode may double-mount; ensure abort logic does not cancel the "current" view's requests prematurely.
- Related to "Reclaim memory for images not currently shown": canceling GETs reduces in-flight work and helps avoid retaining response data for the previous view.

---

## Verify frontend loads images AVIF-first everywhere

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 1–2 hours

### Description
Confirm whether the frontend attempts to load all images as AVIF first (with fallback to WebP then original). The codebase has `getBestFormat()` in `frontend/src/utils/imageFormat.ts` (AVIF → WebP → original) and `getImageUrlWithFormat()` in `frontend/src/utils/imageUrl.ts`; `useProgressiveImage` uses them for thumbnail and full-image URLs. Ensure every image load path (grid thumbnails, full-size, lightbox, album highlights, hero/cover images) goes through format detection and uses the best format so we consistently prefer AVIF when supported.

### Requirements

#### Investigation Tasks
- Trace all places that set image `src` or trigger image load: ImageThumbnail, useProgressiveImage consumers, lightbox/full-size viewer, album highlight images, RootAlbumListBlock or AlbumCard thumbnails, any direct `getImageUrl()` calls without format.
- For each path, determine whether it uses `getBestFormat()` + `getImageUrlWithFormat(..., format)` or equivalent (e.g. useProgressiveImage), or if it uses `getImageUrl()` only (original format).
- Document which code paths are AVIF-first and which are not.

#### Implementation Tasks (if gaps found)
- Use format detection and format-specific URLs for any image load that currently uses original only (e.g. ensure thumbnails and full-size in lightbox use the same AVIF-first logic).
- Optionally add a short note in docs (e.g. architecture or user-guides) that the app prefers AVIF then WebP then original for all user-facing images.

### Deliverable
All image loads that should prefer modern formats go through AVIF-first (then WebP, then original) where the backend serves those variants; any exception documented.

### Testing Requirements
- In a browser that supports AVIF, confirm thumbnails and full-size images load .avif URLs (e.g. via Network tab or existing tests).
- Existing tests in `useProgressiveImage.test.ts` and `imageFormat.test.ts` already cover getBestFormat and AVIF; no regression.

### Technical Notes
- `frontend/src/utils/imageFormat.ts`: `getBestFormat()`, `detectAVIFSupportAsync()`, format support cache.
- `frontend/src/utils/imageUrl.ts`: `getImageUrlWithFormat(image, useThumbnail, format)`.
- `frontend/src/hooks/useProgressiveImage.ts`: uses getBestFormat and getImageUrlWithFormat for thumbnail and full image.
- Backend/export may need to emit or serve .avif/.webp variants for this to have effect; investigation is frontend-only unless missing asset handling is found.

---

## Implement Per-Album Theme Configuration

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 4-5 hours

### Description
Implement per-album theme configuration system that allows each album to have either no theme assigned (uses default theme) or a specific theme. If a specific theme is assigned but doesn't exist, fallback to default theme. Configuration is stored in a JSON file optimized for human editing.

### Requirements

#### Research Tasks
- Research JSON configuration file patterns for human editing (comments, formatting, validation)
- Research theme lookup and application patterns in React context
- Research album ID matching strategies (string vs number, path-based)
- Research configuration file location and loading strategies (static import vs fetch)
- Research configuration validation and error handling patterns

#### Implementation Tasks
- Create `album-themes.json` configuration file in project root with human-friendly structure
- Design JSON schema: default theme field and album themes mapping (album ID → theme name)
- Create TypeScript types/interfaces for theme configuration
- Create utility function to load and parse theme configuration file
- Implement theme lookup function: get theme for album ID with fallback to default
- Extend ThemeContext to support per-album theme lookup
- Integrate per-album theme resolution in AlbumDetail and routing components
- Add configuration validation (theme names must exist, album IDs must be valid)
- Handle configuration loading errors gracefully (fallback to default theme)
- Add configuration file example/documentation
- Write tests for theme configuration loading
- Write tests for theme lookup with fallback logic
- Write tests for invalid configuration handling

### Deliverable
Per-album theme configuration system with JSON file and theme resolution logic

### Testing Requirements
- Verify albums without theme assignment use default theme
- Check albums with valid theme assignment use specified theme
- Ensure albums with invalid theme assignment fallback to default
- Verify configuration file parsing handles various formats correctly
- Check error handling when configuration file is missing or malformed
- Review configuration file is easy to edit manually

### Technical Notes
- Configuration file should be optimized for human editing (clear structure, comments if possible, readable formatting)
- Theme lookup should be efficient (consider caching parsed configuration)
- Fallback logic is critical: invalid themes must not break the application
- Configuration validation should provide clear error messages
- JSON file location should be easily accessible for manual editing
- Theme resolution should integrate seamlessly with existing ThemeContext

---


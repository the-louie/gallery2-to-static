# Closed backlog rows

Rows pruned from `TODO.md` after each sprint, with the proof they were closed on. Newest first.

## Pruned 2026-10-25 (Sprint 06): 3 rows

### ~~BUILD-01 (remaining): test-only type errors behind `npm run typecheck:test` (253 → 273 after the Sprint 04 toolchain upgrades)~~

**CLOSED, verified 2026-10-25 (Sprint 06 T-07 + T-08):** `npm run typecheck:test` → **0 errors** (was 343 at the start, 273 before this sprint). T-07: fixtures typed `Album`/`Image`. T-08: swipe tests pass native TouchEvents through `asReact()` and type their callback mocks (`vi.fn<Callback>()`, Vitest 5); touch helpers set `length` with `defineProperty`; error mocks are real `DataLoadError`s (and include `metadata`); throw-only test components typed; `.at()` (ES2022) replaced; FilterContext test variables not narrowed to `null`; stale `@ts-expect-error` removed; `SortState.setOption` type now admits the updater form the hook already supported; vitest-axe's `toHaveNoViolations` declared on Vitest 5's `Matchers`. Tests unchanged in behaviour: 1487/1487. Original row kept for the record:

_Progress 2026-10-25 (Sprint 06 T-07): `src/__mocks__/mockData.ts` fixtures typed as `Album`/`Image` (they were `Child`, so every use as an `Album`/`Image` prop failed): **273 → 89**. Left: useSwipeGesture TouchEvent helpers (62), FilterContext test (6), small ones (21)._

_2026-10-25: Vitest 5 mock types add `Mock<Procedure | Constructable>` errors (22); the rest are the existing fixture typing (`Child` vs `Image`/`Album`, 104+) and `TouchEvent` helper types (39)._

_Groomed 2026-10-25 (Sprint 01 retro): the build part is closed (T-01..T-04, `npm run build` exits 0). What is left is the test-fixture typing (`mockData.ts` `Child` vs `Album`/`Image`), to burn down with LINT-01._ Original title: `npm run build` fails at the type check — 343 errors, not 3.

**PARTLY CLOSED 2026-10-25 (Sprint 01 T-01):** steps 1–2 done: duplicate block removed (`Breadcrumbs.integration.test.tsx` is now 114 lines, its suite collects: 37 tests pass with the other Breadcrumbs file); `tsconfig.json` now covers shipped code only (`npm run build`/`npm run typecheck`: 82 errors, 0 in test files), tests via `tsconfig.test.json` / `npm run typecheck:test` (343). Steps 3–4 open (Sprint 01 T-02..T-04).
**T-02 (2026-10-25):** `vite/client` types added (33× `import.meta.env`); pages/ and contexts/ at 0 errors (`RouteParams` is now a `type`, `PathResolverPage` state `| undefined`, `SearchIndexItem.summary/ownerName` declared). App type-check: 82 → 27.
**T-03 (2026-10-25):** hooks/, utils/, components/ at 0 errors; **`npm run build` exits 0** (step 3 done). Remaining: step 4 + TEST-01 (T-04), and the 256 test-fixture errors behind `npm run typecheck:test`.
**T-04 (2026-10-25):** step 4 done: `App.test.tsx:11` and `RootAlbumListView.test.tsx:11` import from `@/types` (0× TS2307). BUILD-01 is closed for the build; the **253** test-only type errors (`npm run typecheck:test`, mostly `mockData.ts` fixtures) stay open as follow-up, tracked with LINT-01.

**Confirms list item 1, but the scale was understated by 20x.**

`frontend/src/components/Breadcrumbs/Breadcrumbs.integration.test.tsx` contains its entire
set of `describe` blocks **twice**: the outer `describe` closes at line 114, leaving lines
116-215 orphaned at top level with one surplus `});` (`error TS1128` at 215:1 and 215:2).

That parse error was *masking* the rest of the program. With the file truncated to its
first 114 lines, `tsc --noEmit` reports **343 errors across 63 files**:

- 256 errors in test files (dominant cause: `mockData.ts` fixtures typed as `Child`, i.e.
  `type: string`, assigned to the narrowed `Album`/`Image` discriminated-union types —
  170x `TS2322`)
- **87 errors in production source**, worst offenders `pages/SearchResultsPage.tsx` (12),
  `contexts/ThemeContext.tsx` (9), `hooks/useLocalStorage.ts` (7), `pages/PathResolverPage.tsx` (6)
- 2x `TS2307`: `src/App.test.tsx:11` imports `'../../../backend/types'`, a path that does
  not resolve from `src/`

Test files are in scope because `tsconfig.json` sets `"include": ["src", "**/*.{test,spec}.{ts,tsx}"]`
and the tests are colocated under `src/`.

This has been broken since `689c6ce` (2026-01-24, "Move breadcrumb construction to backend
metadata"); **114 commits** have landed on a red build since.

Steps:
1. Delete the duplicated lines 116-215 of `Breadcrumbs.integration.test.tsx` (quick win —
   also unblocks TEST-01).
2. Decide the typecheck policy for tests: either a separate `tsconfig.test.json` so
   `npm run build` type-checks only shipped code, or fix the 256 fixture errors. Recommend
   splitting the config first so the build goes green, then burning down fixture errors
   behind `npm run typecheck:test`.
3. Fix the 87 production-source errors — these are real and ship today.
4. Fix the `backend/types` import path in `App.test.tsx`.

### ~~TEST-03: no end-to-end test of the backend extraction (found 2026-10-25, Sprint 02 T-03)~~

**CLOSED, verified 2026-10-25 (Sprint 06 T-02 + T-03):** `backend/extract.test.ts` runs `runExtraction()` over an in-memory tree (fake `sql`) with real image files in a temp dir: duplicate-named siblings (`/dreamhack/lordag`, `/dreamhack/lordag--12`), a blank title (`album_13`), an album named `image` with child `2005`, an album without images and an ignored album (both not exported), a truncated JPEG (photo kept, `thumbnailMissing`), a PNG (`t__c.png.jpg`, JPEG content, measured `thumb_width`); every album has one path and every parent link resolves to its child; search index written; a second run keeps `data.prev-*`. Mutation check: with the blank-title fallback removed the test fails with the path-index collision. Still needs the real DB for the LOGIC-11 counts on real data. Original row kept for the record:

_Progress 2026-10-25 (Sprint 06 T-02): `main()` and its helpers moved unchanged into `backend/extract.ts`; `runExtraction({ sql, config, projectRoot, verify? })` returns `{ ok, finalDataDir, dataDir }` instead of setting `process.exitCode`; `index.ts` is the 59-line CLI. The end-to-end test is T-03._

`backend/index.ts` runs everything in a top-level IIFE (`index.ts:563`) and `main()` is not exported,
so the tree walk (segments, path index, child links, thumbnails, JSON writing) has no test; Sprint 02
T-03 could only test the pure helpers. Fix: move `main()` and its helpers into a module that takes
the `sql` object as a parameter, keep `index.ts` as the thin CLI, and add a test with a fake `sql`
(an in-memory tree with duplicate-named siblings, blank titles, a hidden album, a truncated JPEG) that
runs the whole extraction into a temp dir and asserts on the JSON and `index.json`. Also lets the
LOGIC-11 counts (6 bad links / 7 unreachable albums) be re-measured once the real DB is available.

### ~~LOGIC-32: old lanbilder.se path URLs open the home page, not the album (found 2026-10-25, Sprint 05 T-09)~~

**CLOSED, verified 2026-10-25 (Sprint 06 T-01):** `frontend/src/utils/legacyPathRedirect.ts` `legacyPathToHash` + `main.tsx`: before the router mounts, a path other than `/` (or `…/index.html`) without a `#/` hash is replaced by `/#<path><search>` (`history.replaceState`, no reload); PathResolverPage resolves it. Tests: old shapes (`/dreamhack/dreamhack_97/martin_ojes/`, `/badalan/badalan_v1.0/`, percent-encoded Nordic, `index.html`, query), root and app URLs untouched, jsdom location → `#/dreamhack/dreamhack_97/`. Docs: 06-building-deployment (nginx fallback, real 404s for `/data/`, `/g2data/`, `/assets/`), README. Not yet tried in a real browser against the lanbilder2 nginx (needs the deploy). Original row kept for the record:

The app runs under `HashRouter` (`frontend/src/main.tsx:13`), so its album URLs are
`/#/dreamhack/dreamhack_97/...`. Every existing link and search-engine entry for lanbilder.se is a
path URL (`/dreamhack/dreamhack_97/martin_ojes/`). With an nginx fallback to `index.html` such a request
loads the app, but the router reads the (empty) hash and shows the home page; without the fallback it
is a 404. The earlier review's "album folders will probably keep working" did not account for the
hash router. Fix (works on any host, incl. a later Cloudflare Pages move, DECISION-01): before the
router mounts, if `location.pathname` is not `/` (or `/index.html`) and there is no `#/` hash,
`history.replaceState` to `/#<pathname><search>`, so PathResolverPage resolves it (trailing slash
and percent-encoding are already handled there). Test with the old URL shapes in
`docs/dev-notes` / the 59 GB tree (`/dreamhack/dreamhack_97/martin_ojes/`, Nordic names). nginx then
needs `try_files $uri $uri/ /index.html` for non-asset paths (and real 404s for `/data/`, `/g2data/`,
`/assets/`). Must be done before the cutover.

## Pruned 2026-10-25 (Sprint 05 (pre-retro)): 10 rows

### ~~ARCH-07: two ineffective `vite.config.ts` settings~~

**CLOSED, verified 2026-10-25 (Sprint 05 T-08):** `chunkSizeWarningLimit` moved to `build` (no warning; it was ignored inside `rollupOptions`); `manualChunks` matches package directories (`/node_modules/(react-router|react-router-dom)/` before `/node_modules/(react|react-dom|scheduler)/`), so `router-vendor` now exists (index.html preloads it) and other packages containing "react" no longer land in `react-vendor`. size-limit's initial-load entry includes `router-vendor-*`; still passes. Original row kept for the record:

Minor, noticed while verifying BUILD-02/03:

1. `chunkSizeWarningLimit: 500` is at `vite.config.ts:120`, nested inside `rollupOptions`
   instead of `build`. Rollup rejects it outright — the build prints
   `Unknown input options: chunkSizeWarningLimit` and the setting does nothing.
2. `manualChunks` (`:97-115`) tests `id.includes('react')` before `id.includes('react-router')`,
   so router code lands in `react-vendor` and the `router-vendor` chunk never materialises as
   intended. Also matches any `node_modules` path containing the substring "react".

---

### ~~DECISION-01: hosting model — Cloudflare Pages + image server, or one nginx host (needs operator)~~

**DECIDED 2026-10-25 (operator):** start **self-hosted on lanbilder2** for both the JS application and the images (nginx behind the Cloudflare tunnel). A later move (e.g. frontend on Cloudflare Pages, images elsewhere) is not ruled out, so keep the code working for both: fixed same-origin `/g2data/` paths today, images outside `dist/` (BUILD-02). Original row kept for the record:

Operator, 2026-10-25: the code was written for the frontend on **Cloudflare Pages** (load speed)
with the **images on a second server**; feasibility was never finished. The current plan in
`/code/misc/hosting` deploys everything on **lanbilder2** (nginx behind a Cloudflare tunnel). Several
code choices follow from the Pages idea (HashRouter, fixed `/g2data` paths, JSON shipped as static
files) and work on either model. Points to settle before deploy:
- Pages limits (as of writing: 20,000 files per deployment, 25 MiB per file): `dist/` + `data/`
  (~1,400 JSON) fits; the 60,851 images and thumbnails do not, so they need an image origin either way.
- Same-origin vs. a separate image host: `IMAGE_BASE_URL`/`THUMBNAIL_BASE_URL` are fixed `/g2data/…`
  today, so a second host means a Cloudflare route/Worker in front, or making the base URL
  configurable (and CSP `img-src` gets that host).
- Old lanbilder.se direct image links need a server that can serve the legacy tree (nginx can; Pages
  cannot serve 57 GB).

Until decided, tickets keep both models working (e.g. BUILD-02 serves `/g2data/` outside `dist/`).

### ~~LOGIC-31: a photo kept without a thumbnail shows the grid's error state (found 2026-10-25, Sprint 02 T-05)~~

**CLOSED, verified 2026-10-25 (Sprint 05 T-07):** the backend sets `thumbnailMissing: true` on a photo whose thumbnail failed (`index.ts`, new optional field in `types.ts`); `ImageThumbnail.tsx` in grid mode then fetches nothing and shows a "No preview" placeholder (still clickable; the lightbox loads the full image). Test: placeholder shown, no `<img>`, hook disabled, click works. Not testable end to end without TEST-03. Original row kept for the record:

Since LOGIC-12 the backend keeps a photo whose thumbnail could not be generated, but the frontend
builds every photo's thumbnail URL from `urlPath` (`frontend/src/utils/imageUrl.ts:178`
`getImageUrl(image, true)`), not from `thumbnailUrlPath`/`thumb_width`. Such a photo requests a
non-existent `/g2data/thumbnails/.../t__x.jpg` (404) and shows the error tile; the lightbox works.
Fix: emit a flag (or `thumbnailUrlPath: null`) from the backend for these photos and show a
placeholder (or the downscaled full image) instead of the error state.

### ~~LOGIC-24: image URLs are not encoded per segment~~

**CLOSED, verified 2026-10-25 (Sprint 05 T-01):** `frontend/src/utils/imageUrl.ts` encodes each path segment (`encodePathSegments` / `toUrlPath`) in every image, thumbnail and album-highlight URL; `backend/verifyImagePaths.ts` builds URLs the same way and its local check decodes each segment before the traversal check (an encoded `%2e%2e` or `%2F` is still rejected). Tests: `#`, `?`, `%`, space, å/ö in names (frontend, decoded name round-trips) and encoded URL → file on disk, raw `%` rejected, encoded traversal rejected (backend). nginx decodes `%XX` before mapping to files, so the encoded URLs serve the original names. Original row kept for the record:

`frontend/src/utils/imageUrl.ts:178` (`getImageUrl`) and `backend/pathResolution.ts` join raw
`pathComponent`s. There is no `encodeURIComponent` anywhere in either. A filename containing
`#`, `?` or `%` gives a broken URL: `#` cuts the path, `%xx` is decoded to another file. The
backend's local verify uses `fs.realpath` on the raw path, so it reports "ok". Fix: encode each
segment when building URLs. Grep the real file list (`backend/all-lanbilder-files.txt`) for
`[#?%]` to see how many are affected.

### ~~SEC-15: BBCode parse is quadratic, with no length or depth cap~~

**CLOSED, verified 2026-10-25 (Sprint 05 T-02):** `frontend/src/utils/bbcode.ts` `parseBBCode` does not parse input over `BBCODE_MAX_INPUT_LENGTH` (8192 chars) or with more than `BBCODE_MAX_TAGS` (500) `[`; such text is shown with the BBCode tags stripped. Tests: `[b]`×16000 → `"x"` in < 1 s (was 7.6 s), over-long input stripped, normal BBCode still parsed, boundary at 500/501. Original row kept for the record:

`frontend/src/utils/bbcode.ts` (`parseBBCode` at `:581`) has no input length or nesting limit. For
each open tag it scans to the end and re-parses the nested content: `[b]`×16000 renders in 7.6 s,
×4000 in 0.5 s (measured at `9790743`, the parser is unchanged in this respect). The content is
frozen, so this is low risk. Fix: cap the input (e.g. 8 KB) and the depth (e.g. 20), falling back
to plain text.

### ~~LOGIC-27: nested links in the root album list~~

**CLOSED, verified 2026-10-25 (Sprint 05 T-03):** `parseBBCode` has a `links` option (default true); `RootAlbumListBlock.tsx` passes `links: false` for the title and description (inside the block `<Link>`) and for subalbum titles (inside their own links), so `[url]` renders as text there. Per the design note (20260126-1300), the description's URL is shown as the separate website link outside the block link; it now falls back to the description when the summary has no URL, so no link is lost. Tests: no `a a` in the block; description text kept, its URL only outside the block link; `links:false` vs default in `bbcode.test.tsx`. The old test that asserted an anchor inside the description (pre-dating the block link) was updated. Original row kept for the record:

`components/RootAlbumListBlock/RootAlbumListBlock.tsx:105-132`: the album description is rendered
with `parseBBCodeDecoded` **inside** the block-level `<Link>`, so any `[url]` in a description
gives `<a>` inside `<a>`. That is invalid HTML: the click goes to the inner link or the outer one
depending on the browser, and it triggers React hydration warnings. Fix: render the description
outside the link, or strip links (`[url]` → text) in this view.

### ~~SEC-16: `url("…")` escaping in the album block is incomplete~~

**CLOSED, verified 2026-10-25 (Sprint 05 T-04):** new `frontend/src/utils/cssUrl.ts` escapes backslash (first), double quote and CR/LF/FF (CSS hex escapes) before wrapping in `url("…")`; `RootAlbumListBlock.tsx` uses it. Since T-01 the highlight URL is also percent-encoded per segment, which already removes `"`, `\\` and newlines from file names. Tests `cssUrl.test.ts` (quote-breakout, newlines, jsdom parse does not pick up an injected declaration). Original row kept for the record:

`RootAlbumListBlock.tsx:87` escapes only `"`: `url("${highlightImageUrl.replace(/"/g, '\\"')}")`.
A path containing `\"` or a newline breaks out of `url()`. It needs a crafted Gallery 2 filename,
and a strict CSP blocks external images, so this is low risk. Fix: `encodeURI` the path (or
`CSS.escape`), or pass it as a CSS custom property.

### ~~LOGIC-28: album named `image` with a numeric child is unreachable~~

**CLOSED, verified 2026-10-25 (Sprint 05 T-05):** `frontend/src/pages/PathResolverPage.tsx` looks the full path up in the path index first; only if no album has that path is `/…/image/<id>` read as an image. Tests: `/fester/image/2005` with an album at that path → album 12; without → image 2005 of `/fester`; the out-of-range-id test now expects exactly one lookup (the full path). The index is cached (PERF-02), so the extra lookup costs no request. Original row kept for the record:

`pages/PathResolverPage.tsx:16,39`: `IMAGE_PATH_RE = /\/image\/(\d+)$/` is checked before the
path index, so `/x/image/2005` (album "image", sub-album "2005") is read as image 2005 in album
`/x`. Fix: look up the full path in `pathIndex` first; use the image regex only if that misses.

### ~~LOGIC-30: thumbnails are always JPEG but keep the source extension~~

**CLOSED, verified 2026-10-25 (Sprint 05 T-06):** `thumbnailFileName(prefix, name)` in `backend/pathResolution.ts` and (same rule) `frontend/src/utils/imageUrl.ts`: JPEG sources keep their name (`t__photo.jpg`, so existing thumbnails stay valid), other sources get `.jpg` appended (`t__anim.gif.jpg`), which also prevents `a.png`/`a.jpg` colliding. Used for the generated file (`buildPathsFromPathComponent`), backend verification URLs and frontend thumbnail URLs. Thumbnails stay JPEG (PNG transparency on a JPEG background, GIF first frame): keeping alpha/animation would be a format change, not done. Tests both sides. Original row kept for the record:

`backend/generateThumbnail.ts:69` `.jpeg(...)` is used for every source, while the destination
keeps the original name (`t__photo.png`, `t__anim.gif`). PNG transparency turns black, GIF
animation is lost, and the server sends `image/png` for JPEG bytes (browsers sniff it, but
`nosniff` plus a strict MIME check can break it). Fix: write `.jpg` thumbnails and record the path,
or keep the format (`.png()`/`.webp()` for alpha).

### ~~HYGIENE-01: repo and package tidy-up~~

**CLOSED, verified 2026-10-25 (Sprint 05 T-09):** removed the root `package-lock.json` stub, `report_fail_20260130.md` (4.6 MB) and the empty `report_20260130.md`; `.gitignore` adds `report_*.md`, `deviation-report_*.md` (the backend writes these to the root) and `frontend/coverage`. The `public/` extras no longer ship since BUILD-02's allowlist (`check:dist`), so they stay where the backend and docs expect them. Backend `typescript` declared since Sprint 04 T-08. `"engines": { "node": ">=22.23.4" }` in both `package.json`s (the first 22.x with the Brotli fix, SEC-18). README "How" now has install/extract, build, deploy and release-check steps. Original row kept for the record:

- Delete the root `package-lock.json` stub (97 bytes, there is no root `package.json`),
  `report_fail_20260130.md` (4.6 MB) and the empty `report_20260130.md`. Add `report_*.md` and
  `frontend/coverage` to `.gitignore`.
- `frontend/public/` still ships `*.example*`, `image-config.json` (frontend never reads it) and
  `IMAGES-LOCAL.md` into `dist/`: move them out of `public/`.
- Backend: add `typescript` to `devDependencies` (today it arrives only as ts-node's peer).
  Add `"engines": { "node": ">=22" }` to both `package.json`s.
- README: add `npm ci` in both folders and the frontend build/deploy steps (the current README
  only shows the backend run).

## Pruned 2026-10-25 (Sprint 04): 3 rows

### ~~DOCS-01: README links to `__docs/`, which is not in the repository (operator, 2026-10-25; before deploy)~~

**CLOSED, verified 2026-10-25 (Sprint 04 T-11):** `README.md` Browser Support paragraph rephrased to stand on its own (the `__docs/browser-support.md` link removed; the graceful-degradation sentence now gives the concrete case). `frontend/docs/architecture.md`: all 12 `../__docs/` links replaced with links that exist (Backend Usage guide, `backend/index.ts`, `types.ts`, `sqlUtils.ts`, README; all checked); "React 18+" → React 19. `docs/orig-page/README.md` and `theme.css` say the screenshots and site capture are kept outside the repository. `grep __docs` over README, CLAUDE.md, frontend/docs, docs/orig-page: none. Left as they are: 4 historical `docs/dev-notes/` files (session notes, not user docs). Original row kept for the record:

`README.md` ("Browser Support") points to [`__docs/browser-support.md`](__docs/browser-support.md);
`__docs` is git-ignored (`.gitignore`) and private, so the link is dead for anyone else. Rephrase
the paragraph so it stands on its own and remove the reference (check the rest of the README and
`frontend/docs/` for other `__docs` links at the same time).
_Found 2026-10-25: also `frontend/docs/architecture.md` (10 links to `../__docs/architecture.md`, `data-flow.md`, `types.md`, `overview.md`), `docs/orig-page/README.md`, and 4 files in `docs/dev-notes/` (historical notes; decide whether to leave them)._

### ~~SEC-18: no Brotli decoder vulnerable to CVE-2026-111497 is shipped or used (operator, 2026-10-25)~~

**CLOSED for the repository, verified 2026-10-25 (Sprint 04 T-10):** `scripts/check-brotli.mjs` (exit 1 on a finding) checks and prints each item:
1. Node v22.23.4: the fixed 22.x release (sweep doc: ≥ 22.23.4 / 24.22.1 / 26.12.1); `process.versions.brotli` stays `1.1.0`, as expected for the backport.
2. sharp-libvips 1.3.4 (linux-x64, linuxmusl-x64): no brotli in `versions.json`; its build script builds FreeType with `-Dbrotli=disabled` (`build/posix.sh` at tag v1.3.4, line 255). The `WOFF2` string in `libvips-cpp.so` is a format name, there is no decoder.
3. No brotli npm package in either lockfile; since T-09 size-limit no longer pulls puppeteer/Chrome.
4. `frontend/dist`: 28 files, no `.br`, no `.wasm`, no Brotli decoder in the JS.
5. lanbilder2: `libbrotli1 1.1.0-2+deb13u1` (fixed). Node, nginx and cloudflared are not installed there yet: rerun the script on lanbilder2 after they are.
**Finding outside the repo:** this dev/build machine has `libbrotli1 1.1.0-2+b7` (< `1.1.0-2+deb13u1`; apt candidate is the same, so its package lists are stale): needs `apt-get update && apt-get install --only-upgrade libbrotli1` by someone with root. Node does not use the system library, so the build output is unaffected; curl and other system tools on this host are.
Original row kept for the record:

CVE-2026-111497 is in Google's C Brotli decoder 1.0.3–1.2.0 (fixed 1.0.10, 1.1.1, 1.2.1); see
`/srv/share/brotli-cve-2026-111497-phetast.md`. Neither lockfile has a brotli npm package today
(no `node_modules/*brotli*` in either `package-lock.json`), so the decoder can only come in
through the runtimes and native libraries. Check each place and record the version:
1. **Node.js** used for the backend run and the build (bundles brotli; `process.versions.brotli`):
   must be a release with the fix. Note: Node 22.23.4 here reports `process.versions.brotli` = `1.1.0`,
   so the version string alone does not prove the fix (Node may backport without bumping it):
   confirm against the Node security release notes for CVE-2026-111497.
2. **sharp/libvips bundle** (`@img/sharp-libvips-*`, `versions.json`): libvips, libheif, librsvg,
   fonts/woff2 — confirm whether any of them links or bundles brotli, and its version after DEPS-01.
   _2026-10-25 (Sprint 02 T-04): sharp 0.35.5 `sharp.versions` lists no brotli (aom, archive, cairo, cgif, exif, expat, ffi, fontconfig, freetype 2.14.3, fribidi, glib, harfbuzz, heif, highway, imagequant, lcms, mozjpeg, pango, pixman, png, rsvg, tiff, uhdr, vips, webp, xml2, zlib-ng). Still to check: whether the bundled freetype was built with WOFF2 (brotli) — `strings`/`ldd` on `libvips-cpp.so`._
3. **Build and dev tools** that decompress (Vite's compressed-size report, size-limit, puppeteer's
   Chrome download): Node's zlib, so item 1 covers them; list anything that bundles its own copy.
4. **The shipped `dist/`**: no WASM or JS Brotli decoder in the bundle (grep the build output), and
   no `.br` files that need a server-side decoder.
5. **Serving host (lanbilder2)**: nginx serves static files, and the Brotli *encoder* module is fine.
   Confirm `libbrotli1` is Debian 13's fixed `1.1.0-2+deb13u1` or newer, and that cloudflared/curl
   on the host link a fixed version.

Done = each item has a recorded version that is fixed, or proof that no decoder is present. Add a
check script (e.g. `scripts/check-brotli.mjs`) that prints `process.versions.brotli` and greps
`dist/` and the lockfiles, so the release checklist can rerun it.

### ~~BUILD-04: `size-limit` patterns don't match the build~~

**CLOSED, verified 2026-10-25 (Sprint 04 T-09):** `frontend/package.json` `size-limit`: one entry per real chunk name (initial load = `index-*` + `rolldown-runtime-*` + `react-vendor-*` + `vendor-*`, `Lightbox-*`, 5 route chunks, total). `@size-limit/preset-app` (which adds the puppeteer/Chrome timing step) replaced by `@size-limit/file`. `npx size-limit` exits 0: initial 120.95 KB, Lightbox 4.9 KB, routes 0.8–4.2 KB, total 147.2 KB (brotli). Original row kept for the record:

`frontend/package.json:9-24`: `dist/assets/js/lightbox*.js` matches no file (Vite names it
`Lightbox-<hash>.js`, and the case differs), and `*-*.js` matches every chunk and size-limit adds
them up (118 KB brotli vs the 50 KB "per chunk" limit). The check fails because of the globs, not
the bundle. Fix the globs (one entry per named chunk). Note: `size-limit` starts headless Chrome
(puppeteer) for its timing step. Run it with `--why`/without the time plugin, or only in CI.

## Pruned 2026-10-25 (Sprint 03): 5 rows

### ~~LOGIC-14: image search results link to a "Legacy Route Not Supported" page~~

**CLOSED, verified 2026-10-25 (Sprint 03 T-09):** `frontend/src/pages/SearchResultsPage.tsx` links image results to `/album/${parentId}/image/${id}` (legacy `/image/:id` only if an item had no `parentId`, which the backend always sets). Test: photo result with `parentId: 55` → `href="/album/55/image/2"`. Still latent until photos are indexed. Original row kept for the record:

**Partly confirms list item 8 — the dead end is real, but it is unreachable today, so this is latent, not live.**

`frontend/src/pages/SearchResultsPage.tsx:219` builds `<Link to={`/image/${image.id}`}>` for
every `GalleryPhotoItem` — compare the album branch at `:160`, which correctly uses
`album.path`. The route exists (`App.tsx:60`), so it is not a 404; it resolves to an explicit
dead end. `ImageDetailPage.tsx:53-55` sets `albumId: null` for the legacy `:id` param and
`:172-186` renders "Legacy Route Not Supported — The legacy image route requires album
context", with only a "Go to Home" button. No album data loads, no lightbox renders.

"Every image search result leads to a dead end" overstates it only because **there are no
image search results**: all 1,389 entries in `public/data/search/index.json` are
`GalleryAlbumItem` (0 photos), so the Images section at `:203` never renders. The whole
Images UI and the `GalleryPhotoItem` type already ship, though, so this breaks the day
photos are indexed.

Fix: `SearchIndexItem` already carries `parentId` (`searchIndex.ts:46-63`) — the correct
`/album/${parentId}/image/${image.id}` is constructible from data on hand and simply is not
constructed. Do that, and fix it before indexing photos.

### ~~LOGIC-19: zoom limit is ~2500% instead of 400%~~

**CLOSED, verified 2026-10-25 (Sprint 03 T-07):** `frontend/src/hooks/useImageZoom.ts` `maxZoom = ZOOM_MAX` (400; zoom is relative to the fitted image). New test with container dimensions (4000×3000 in 1000×750, 50 zoom-ins → 400, `canZoomIn` false) fails on the old code (checked) and passes now. Original row kept for the record:

`hooks/useImageZoom.ts:121-128`: `fitZoom = Math.min(scaleX, scaleY) * 100` with scales that are
already percentages, then `Math.max(fitZoom, ZOOM_MAX)`. A 4000 px image in a 1000 px container
allows 2500%. Fix: `maxZoom = ZOOM_MAX`, or the ratio without `* 100`.

### ~~LOGIC-25: stored sort value is not validated~~

**CLOSED, verified 2026-10-25 (Sprint 03 T-08):** `frontend/src/hooks/useSort.ts` returns the stored option only if `isSortOption()` (the 7 known values), else `order-asc`. Tests: stored `5`, `{}`, `"colour-asc"`, `null` → default. Original row kept for the record:

`hooks/useSort.ts:68-72` passes whatever `useLocalStorage` parses straight through, and
`utils/sorting.ts:217` calls `sortOption.split('-')`. A stored non-string (`5`, `{}`) throws and
takes down the page. A string that is not a known option silently sorts nothing. Fix: validate
against the `SortOption` list and fall back to `DEFAULT_SORT_OPTION`, as `ThemeContext` already does.

### ~~LOGIC-26: thumbnail object URL revoked while it is displayed~~

**CLOSED, verified 2026-10-25 (Sprint 03 T-10):** `frontend/src/hooks/useProgressiveImage.ts`: the thumbnail effect's cleanup no longer revokes (it re-runs on every `state` change); the image-change and unmount effects revoke, and a second fetch for the same image releases the first URL. Test: after `thumbnail-loaded` the shown `blob:` URL is not revoked and is still returned; on unmount it is. Fails on the old code (checked). Original row kept for the record:

`hooks/useProgressiveImage.ts:224-232`: the thumbnail effect has `state` in its dependencies, and
its cleanup revokes `thumbnailObjectUrlRef.current`. `setState('thumbnail-loaded')` (`:221`)
re-runs the effect, so the cleanup revokes the URL the `<img>` is showing. It works today only
because the browser keeps the decoded pixels; any re-mount or `src` re-assignment shows a broken
image. Fix: revoke only on image change or unmount, not on state change (LOGIC-02 added the
cleanup, but it is too eager).

### ~~LOGIC-29: Swedish name sort is wrong~~

**CLOSED, verified 2026-10-25 (Sprint 03 T-08):** `frontend/src/utils/sorting.ts` `sortByName` compares with a module-level `Intl.Collator('sv', { sensitivity: 'base' })`. Test: apa, Zebra, Ål, Åsna, Ärta, Ödla (asc and desc). Original row kept for the record:

`utils/sorting.ts:66-75` compares `toLowerCase()` strings with `<`/`>` (code point order):
ä (U+00E4) < å (U+00E5) < ö, but Swedish order is å, ä, ö, and accented letters sort after z
inconsistently. Fix: `aTitle.localeCompare(bTitle, 'sv', { sensitivity: 'base' })`, or an
`Intl.Collator('sv')` created once.

## Pruned 2026-10-25 (FUTURE rows added (no sprint end)): 4 rows

### ~~PERF-03: the image cache is wiped and fetches aborted on every lightbox step~~

**CLOSED, verified 2026-10-25 (Sprint 03 T-03):** new `frontend/src/utils/viewKey.ts` `getViewKey(pathname)` drops a trailing `/image/<id>`; `Layout.tsx` clears the image cache and `ViewAbortContext.tsx` renews/aborts its controller only when the view key (or search) changes, not on every lightbox step (and not on opening the lightbox from its album). Tests: `viewKey.test.ts`, ViewAbortContext (image → image keeps the signal, other album aborts), Layout (cache kept between images, cleared for another album). Full vitest 1448/1448. Original row kept for the record:

`components/Layout/Layout.tsx:48-55` runs `getImageCache().clear()` on every `pathname`/`key`
change, and `ViewAbortContext` aborts its controller on every `pathname` change. Each lightbox
next/previous changes the path, so the neighbours that `useImagePreload` just fetched are aborted
or revoked. Fix: don't clear or abort when only the image id changes within the same album.

### ~~LOGIC-16: the lightbox ignores the grid's sort and filters~~

**CLOSED, verified 2026-10-25 (Sprint 03 T-04):** new `frontend/src/utils/visibleImages.ts` `getVisibleImages(items, criteria, sortOption)` (images only → `applyFilters` → `sortItems`) is used by both `ImageGrid.tsx` and `ImageDetailPage.tsx` (with `useFilter()` + `useSort('images')`), so the lightbox list, next/previous and "N of M" match the grid. Tests: `visibleImages.test.ts` (JSON order, date/name sort, filter). Original row kept for the record:

`pages/ImageDetailPage.tsx:83` builds the lightbox list as `albumData.filter(isImage)`, in raw JSON
order. To reproduce: sort by date descending, open the 3rd thumbnail, press →. You get the next
image in JSON order, and "N of M" counts images the filter hid. Fix: build the list with the same
`applyFilters` + sort the grid uses (`useSort('images')`, `FilterContext`).

### ~~LOGIC-17: closing the lightbox pushes history; album scroll position is lost~~

**CLOSED, verified 2026-10-25 (Sprint 03 T-05):** opening an image from the album (`AlbumDetail.tsx` `handleImageClick`, and `useLightbox.openLightbox`) navigates with state `{ fromAlbum: true }` and remembers `window.scrollY` per album path (`utils/albumScroll.ts`, sessionStorage, guarded); next/previous keep that state; `closeLightbox` goes `navigate(-1)` when it is set, else replaces the image entry with the album. `AlbumDetail` restores the remembered position on a POP once its data is shown. Tests: `useLightbox.test.tsx` (close → POP to album; next then close → POP; deep link → REPLACE), `albumScroll.test.ts`, `AlbumDetail.test.tsx` (restore on POP, click remembers + state). Not done: scroll-to-top on forward navigation (not in the row's fix). Original row kept for the record:

`hooks/useLightbox.ts:196-197`: `closeLightbox` calls `navigate(pathForAlbum(), { replace: false })`.
History becomes [album, image, album], so Back reopens the lightbox. The album page is unmounted
while the image is open. `useScrollPosition` only saves (its own doc comment, lines 6 and 15, leaves
restore to "React Router/browser"), but `HashRouter` has no `<ScrollRestoration>`, so nothing
restores it. Closing lands at an arbitrary spot in a 500-image album. Fix: `navigate(-1)` when the
lightbox was opened from the album (track it in location state), otherwise `replace: true`. Restore
the saved scroll position on album mount.

### ~~LOGIC-18: date filter can't be enabled, and would hide everything~~

**CLOSED, verified 2026-10-25 (Sprint 03 T-06):** `DateRangeFilter.tsx` keeps both input values in local state and builds the range with `dateInputsToRange` (local start of day … last ms of the end day; one-sided with `DATE_RANGE_OPEN_START`/`_END`; reversed dates swapped). `filterUtils.ts` `matchesDateRange` compares `item.timestamp * 1000` (items are Unix seconds, ranges ms). `FilterBadges` shows "from …"/"until …" for one-sided ranges. Tests rewritten: the old ones encoded the bug ("does not create dateRange when only start date is set", ms item timestamps in 5 fixture files); new ones cover start only, end only, both with inclusive end, reversed, and seconds timestamps. Full vitest 1461/1461. Original row kept for the record:

- **Can't be enabled:** `components/FilterPanel/DateRangeFilter.tsx:105-140` sets
  `dateRange = undefined` when only one date is set ("Only start date provided, don't create
  dateRange yet"). The inputs are controlled by `criteria.dateRange`, so the first date clears
  itself and the second can never be entered.
- **Would hide everything:** `dateStringToTimestamp` (`:73`) returns `getTime()` (milliseconds).
  `utils/filterUtils.ts` `matchesDateRange` compares that with `item.timestamp`, which is Unix
  **seconds** (`Lightbox.tsx:341` multiplies by 1000). Every item would fail the filter.
- **End date:** it is start-of-day, so the last day is excluded.

Fix: keep both input values in local state, store seconds, and make `end` inclusive (end of day).

## Pruned 2026-10-25 (catch-up after Sprints 01–02 + S03 T-01..T-02): 18 rows

### ~~BUILD-02: the build copies the whole image tree into `dist/` (and currently just fails)~~

**CLOSED, verified 2026-10-25 (Sprint 01 T-05):** `frontend/vite.config.ts` sets `build.copyPublicDir: false` and emits only `PUBLIC_FILES_TO_SHIP` (`album-themes.json`, the one public file the app fetches, `albumThemesConfig.ts:163`). Tested with a `public/g2data` symlink to a 1 MB scratch tree: old config → `dist/g2data/albums/a/x.jpg` + 6 example/config files; new config → `dist/` = `index.html`, `album-themes.json`, `assets/`, `stats.html` (T-06). New `npm run check:dist` (`frontend/scripts/check-dist.mjs`) fails on images or `g2data/` in `dist/`. Docs: 06-building-deployment.md, 08-local-images.md, public/IMAGES-LOCAL.md. The `frontend/public/data/` copy noted below does not exist in this checkout. Original row kept for the record:

**Confirms list item 4.**

`frontend/vite.config.ts` sets neither `publicDir` nor `build.copyPublicDir`, so Vite
defaults to copying all of `frontend/public/` — which is where the docs tell you to put the
images: `frontend/docs/user-guides/06-building-deployment.md:123` ("Copy or symlink your
image tree so paths match the JSON data"), `08-local-images.md:3`, `public/IMAGES-LOCAL.md:3`.
`frontend/public/g2data` is a symlink here, and Vite's `copyDir` uses `fs.statSync` (not
`lstatSync`), so it follows the link and byte-copies every file.

The only exclusion in the config is dev-server-only and has no effect on `vite build`:

```ts
// vite.config.ts:85-88
watch: { ignored: ['**/public/g2data/**'] },
```

Verified by running the build to a scratch outDir:

```
error during build:
ENOENT: no such file or directory, stat '/workspace/frontend/public/g2data'
    at copyDir (vite/dist/node/chunks/dep-BK3b2jBa.js:17094:30)
    at prepareOutDir (...:65764:7)
```

So on this machine (symlink target `/mnt/h/...` not mounted) the build **fails outright** —
a second, independent blocker from BUILD-01. On a machine where the target *is* mounted, it
instead succeeds and writes the full image tree into `dist/`, then `emptyDir` deletes it on
the next build.

Fix: set `build.copyPublicDir: false` and copy only the small static files
(`album-themes.json`, `image-config.json`, `data/`) deliberately, or move `g2data` out of
`public/` and serve it alongside `dist/` at deploy time. Note `frontend/public/data/` is a
second full copy of the 1,397 root `data/*.json` files — fold that into the same decision.

---

### ~~LOGIC-11: blank album titles make the parent album unreachable~~

**CLOSED, verified 2026-10-25 (Sprint 02 T-02 + T-03):** T-02 below; T-03: `backend/index.ts` computes each child album's segment **once**, in the parent, in list order (`childPathByAlbumId`), and passes it down as `ownPath` (the shared `usedSegmentsByParentId` map and the second computation are gone), so the index key and the emitted link are the same string. After extraction `findPathIndexProblems` (`pathSegments.ts`) checks that every emitted link resolves to its own album and no album has two paths; problems are listed and the run exits 1. Fixture tests in `pathSegments.test.ts` (self-link, wrong sibling, duplicate-named siblings deterministic). Not re-run against the real DB (none here): the 6/7 counts are not re-measured; see TEST-03. Original row kept for the record:

**PARTLY CLOSED 2026-10-25 (Sprint 02 T-02):** `backend/pathSegments.ts` `getSegmentForAlbum` now maps segments that clean to `''`, `.` or `..` to `album_<id>` (`fallbackSegment`), and disambiguation loops until unique (`a`, `a--3`, `a` → `a--3--2`); `addToPathIndex` throws on a path that already belongs to another album instead of overwriting (`index.ts:301`). Tests in `pathSegments.test.ts`. Still open: the segment is computed twice (index key vs emitted child link) — Sprint 02 T-03.

**Confirms list item 9 (empty-title half); the duplicate-title half has a different, subtler cause.**

**Empty titles — confirmed.** `backend/pathSegments.ts:50-54`:

```ts
export function appendSegment(parentPath: string, segment: string): string {
  const base = parentPath === '' || parentPath === '/' ? '' : parentPath.replace(/\/+$/, '');
  if (!segment) return base || '/';        // collapses to the PARENT's path
  return base ? `${base}/${segment}` : `/${segment}`;
}
```

There is no id fallback for an empty segment, and the index insertion has no collision
guard — `backend/index.ts:301` is a bare `pathIndex.set(currentPath, root)`, and the
Map→object flattening at `:728-731` is equally unguarded. So a blank-titled child
overwrites its parent's entry. The frontend has the same hole (`albumPath.ts:69-71`,
`:113-125`, plus `normalizePathForLookup` in `dataLoader.ts:506-509` stripping the trailing
slash back to the parent path).

This is live in the committed data, not hypothetical:

- `/demoparties/birdie/birdie_18/dinet` → 508065, a *child* of 507876. Album **507876 is in
  the path index under no key at all** and `data/507876.json` is unreachable.
- `/dreamhack/dreamhack_summer_08/deltagare/whistler` → 510711 (`title: ""`), a child of
  510709. Album **510709 is unreachable**, taking its "Söndag till tisdag" subalbum with it.

**Duplicate titles — partly confirmed.** `getSegmentForAlbum` *does* de-duplicate with a
`--id` suffix (`pathSegments.ts:23-35`), so the map itself never silently overwrites. The
bug is that the suffix is computed **twice, independently**, and the two computations
disagree:

| | index key (`index.ts:287-299`) | emitted child link (`index.ts:389-401`) |
|---|---|---|
| used-segment Set | per-parent, shared across recursion | fresh local `Set` per album |
| null-title fallback | `` `Album ${root}` `` → `album_71175` | raw `child.title` → `''` |
| membership | only children that recursed (`:314`) | all album children |
| ordering | inside concurrent `Promise.all` (`:387`) — scheduling-dependent | deterministic array order |

A cross-check of all 1,388 index entries against every emitted child link found **6 child
links that do not resolve to their own album** (two of them self-links back to the parent,
e.g. `/demoparties/birdie/birdie_16/dinet` → 71173) and **7 album JSON files reachable by
no path at all** (`99283, 362248, 375894, 507876, 510709, 564586, 565620`).

Fix: fall back to the album id when a segment normalizes empty; make the index insertion
assert on collision rather than overwrite; and compute each album's segment **once**,
threading the result to both the index key and the emitted link instead of re-deriving it.
Add a post-extraction invariant check that every album id appears in the index exactly once
and every emitted link resolves to its own album — the 6/7 figures above make a good
regression fixture.

### ~~SEC-13: a 12-character shared search link locks the visitor's tab~~

**CLOSED, verified 2026-10-25 (Sprint 01 T-07):** `frontend/src/utils/searchUtils.ts` `matchSubsequence` is now a linear two-pointer scan (no `new RegExp` left in the app's search path); `MAX_SEARCH_QUERY_LENGTH = 32`, also `maxLength` on the SearchBar input. The 2000-char combined cap is gone (it only existed for the regex and made descriptions over ~1950 chars unsearchable). Tests: 1000 × `eeeeeeeeeezz` against a 1,100-char Swedish text < 500 ms; 500 random cases give the same indices as the old lazy regex. Moving `search()` off the main thread was not needed for this and is not done. Original row kept for the record:

**Confirms list item 7's impact, but the stated mechanism is wrong — and the real one is harder to spot.**

The query **is** escaped. `frontend/src/utils/searchUtils.ts:86-90` is the only `new RegExp`
in the app:

```ts
const escapedChars = trimmedQuery.split('').map(escapeRegex).join('.*?');
const regexPattern = new RegExp(escapedChars, 'i');
```

No attacker-controlled metacharacter survives, and no invalid-regex throw is reachable. So
"builds a regular expression from the query" is not the hazard — **`.*?` between every
character is.** `e.*?e.*?e...` is the textbook exponential-backtracking shape, built from
input that is entirely innocuous-looking.

The existing guards (`searchUtils.ts:77` query ≤ 50 chars, `:80` query + text ≤ 2000) do
apply on the URL path, but are nowhere near tight enough. Measured against the real shipped
index (a 934-char description containing 63 `e`), for a **single** description:

| query | length | time |
|---|---|---|
| `eeeeeeeeeezz` | 12 | 2.9 s |
| `eeeeeeeeeeeeeezz` | 16 | 9.3 s |
| `e`×24 + `zz` | 26 | 11.5 s |

`search()` is synchronous and loops all 1,389 items (`searchIndex.ts:152-154`), and
`SearchResultsPage.tsx:65-67` runs it from the `q` URL param in a `useEffect` **on page
load**. With `q=eeeeeeeeeezz` the first 40 items did not finish in 115 s; a full search is
hours of blocked main thread. `SearchHighlight` (`searchHighlight.ts:68`) re-enters the same
function per rendered result.

Fix: replace the regex subsequence match with a linear two-pointer scan (same semantics, no
backtracking) — this is the real fix and it is small. Then additionally cap the query hard
(≤ 32 chars, plus a `maxLength` on the `SearchBar` input, which has none today) and
consider moving `search()` off the main thread.

### ~~BUILD-03: production builds ship source maps and a bundle report~~

**CLOSED, verified 2026-10-25 (Sprint 01 T-06):** `frontend/vite.config.ts` is now `defineConfig(({ mode }) => …)`: `sourcemap: mode === 'analyze'` and the visualizer is only added for `mode === 'analyze'`; `build:analyze` = `vite build --mode analyze` (explicit mode, as the row advised, not `production`). `npm run build` → `dist/` 27 files, 487 KB (was 3.4 MB), no `*.map`, no `stats.html`, no `sourceMappingURL`; `build:analyze` still writes both, and `check:dist` now fails on them. Original row kept for the record:

**Confirms list item 10.**

`frontend/vite.config.ts:92` — `sourcemap: true`, unconditional, so full `.map` files for
every chunk and stylesheet land in `dist/assets/` and the original TypeScript is
reconstructable from a deploy.

`vite.config.ts:61-66` — the visualizer sits in the top-level `plugins` array with no
gating at all (no mode check, no env check, no conditional spread), writing
`./dist/stats.html` via its own `fs.writeFile`, i.e. a publicly reachable
bundle-composition report inside the artifact.

One subtlety worth recording so nobody "fixes" this the wrong way: `"build": "tsc && vite build"`
and `"build:analyze": "vite build --mode production"` are **functionally identical** —
`vite build` already defaults to mode `production` (`resolveConfig(inlineConfig, "build", "production", "production")`).
Gating the visualizer on `mode === 'production'` would therefore change nothing. Gate on an
explicit flag (e.g. `process.env.ANALYZE`) and give `build:analyze` that flag.

---

### ~~PERF-01: album grids download every full-size original~~

**CLOSED, verified 2026-10-25 (Sprint 03 T-01):** `useProgressiveImage(image, useThumbnail, { loadFull, enabled })`: `loadFull: false` stops after the thumbnail, `enabled: false` fetches nothing. `ImageThumbnail.tsx` passes `loadFull: !useThumbnail` and `enabled: shouldLoad` (lazy-load flag), and in grid mode never renders the full `<img>`; the thumbnail carries the alt text. Lightbox unchanged (defaults). Tests: hook (`loadFull:false` → only `t__` fetched; `enabled:false` → no fetch until enabled; default still loads full) and component (thumbnail src, hook options before/after intersection). The old test "renders with thumbnail URL when useThumbnail is true" asserted the full-size URL, i.e. the bug; corrected. Full vitest 1439/1439. Original row kept for the record:

**Confirms list item 3, at the cited line.**

`frontend/src/components/ImageThumbnail/ImageThumbnail.tsx:124`:

```ts
const progressiveImage = useProgressiveImage(image, true);
```

Called at the top of the component body — not gated on `shouldLoad`, not on hover, not on
the lightbox, second argument hard-coded `true`. It also **ignores the `useThumbnail`
prop** entirely (that prop only feeds `getAspectRatioWithFallback` at `:130`), so
`ImageGrid.tsx:115` passing `useThumbnail={true}` has no effect on what is fetched.

The IntersectionObserver gates only JSX (`:266`, `:302`), and even that gate opens after an
unconditional 300 ms fallback (`:161-229`). The hook then fetches **both** sizes in
sequence: thumbnail at `useProgressiveImage.ts:164`, then the full-size original at `:253`
as soon as `state === 'thumbnail-loaded'` — which the thumbnail path always sets.

So a card merely mounted in the grid (VirtualGrid mounts visible rows + 200px +
`overscan={50}`, `VirtualGrid.tsx:138-139`) pulls `/g2data/albums/.../photo.jpg` down the
wire and into a blob. Tens to hundreds of MB per album page view, repeated in blob memory,
on mobile data too.

Fix: fetch the full-size image only for the lightbox / image-detail view. Honour
`useThumbnail`, and gate the hook's second argument on actual need rather than `true`.

### ~~LOGIC-12: a thumbnail failure deletes the photo from its album, permanently~~

**CLOSED, verified 2026-10-25 (Sprint 02 T-05):** `backend/generateThumbnail.ts`: `failOn: 'truncated'` (probe: "2 extraneous bytes before marker 0xda" fails at `'warning'`, passes at `'truncated'`; a truncated JPEG fails at both); output written to `<dest>.tmp-<pid>` and renamed, temp removed on failure; skip only when the thumbnail is non-empty and not older than the source. `backend/index.ts`: an `'invalid'` result or a thrown error keeps the photo (warns "photo kept"), so `descendantImageCounts` stay right; summary says "failed (photo kept without thumbnail)". Tests in `generateThumbnail.test.ts`: extraneous-bytes JPEG → generated; truncated → invalid twice, no dest, no temp file; 0-byte and stale thumbnails regenerated. Follow-up, not done: the frontend builds the thumbnail URL from `urlPath`, so a kept photo without thumbnail shows the grid's error state (lightbox works). Original row kept for the record:

**Confirms list item 5a and 5c; the run-to-run behaviour is worse than reported.**

**Over-strict decode (5c, confirmed).** `backend/generateThumbnail.ts:67` passes
`{ failOnError: true }`, which `sharp/lib/input.js:80-86` maps to `failOn: 'warning'` — the
*least* tolerant level. Any recoverable libjpeg warning (premature EOF, extraneous bytes,
bad Huffman code) throws, discarding an image libvips had already decoded fine.

**And the caller drops the photo, rather than keeping it thumbnail-less.** `backend/index.ts:355-372`:

```ts
} else if (result === 'invalid') {
    console.warn(`Invalid/corrupted image excluded: ${sourcePath}`);
    thumbnailContext.excludedCount++;
    return null;
}
```

Those nulls are stripped at `index.ts:386` and never reach `childrenForFile`
(`:544`, written `:550-553`). The photo vanishes from the album entirely — title,
description, full-size link and all. The `'missing'` branch two lines up proves the gentler
option was understood: a missing source only warns and keeps the child.

**Zero-byte / truncated leftovers (5a, partly confirmed — and it flip-flops).** The skip
check is existence-only, `generateThumbnail.ts:50-55`:

```ts
await fs.access(destPath);
return 'skipped';
```

No `stat`, no `size > 0`, no mtime comparison. `.toFile(destPath)` writes the destination
in place with no temp-and-rename and no `unlink` in the catch (`:71-73`). Metadata-level
corruption aborts before the file is created, but a **mid-decode** failure — the common
"slightly corrupt old JPEG" case — leaves a truncated or zero-length file behind forever.
("Truncated" is the likelier artifact than literally 0 bytes; both are invisible to an
existence check.)

The consequence is a silent flip: run 1 drops the photo from the JSON; run 2 sees the
remnant, returns `'skipped'`, and includes the photo pointing at a broken thumbnail — and
reports it in the summary (`index.ts:702-704`) as a healthy "skipped". No rerun ever repairs
it.

Aggravating: `descendantImageCounts` is computed before this filtering (`index.ts:268-269`,
consumed at `:431`, `:538-541`), so albums keep advertising photos that were dropped, and an
album whose photos are all slightly corrupt can be emptied while still showing a nonzero count.

Fix: `failOn: 'truncated'` (or `'none'`); on failure keep the child and emit it without a
thumbnail rather than `return null`; write to a temp file and rename on success, unlinking on
error; and make the skip check require `size > 0` and a newer mtime than the source.

`backend/generateThumbnail.test.ts` cannot catch any of this — its invalid fixture is the
literal string `'not an image'` (line 44), which fails at metadata level, the one case that
leaves no remnant and that fails at every `failOn` level. Needs a valid-header-but-truncated
JPEG fixture.

### ~~SEC-14: upgrade `sharp` (3 high advisories) and `mysql2`~~

**CLOSED, verified 2026-10-25 (Sprint 02 T-04):** `backend/package.json`: `sharp ^0.35.5` (libvips 8.18.7, libheif 1.23.5, librsvg 2.63.2 per `sharp.versions`), `mysql2 ^3.24.6`, `@types/node ^22.20.5`; `npm audit` in backend: **0 vulnerabilities** (was 2 high). `failOnError: true` (removed in 0.35) → `failOn: 'warning'`, the same level; the level itself is LOGIC-12. Clean `npm ci` + backend tests 10/10, tsc clean. (`npm ls` lists `@img/sharp-wasm32`/`@emnapi/runtime`/`tslib` as extraneous: optional wasm fallback that npm installs but does not match this platform; harmless.) Original row kept for the record:

**Confirms list item 6's substance; the 59 GB figure is not substantiated in-repo.**

`backend/package-lock.json:717-719` pins `sharp` exactly `0.33.5`, bundling
`@img/sharp-libvips-linux-x64@1.0.4` → **libvips 8.15.3, libheif 1.18.2, librsvg 2.58.93**
(`versions.json`). `npm audit` reports 3 high advisories, all direct:

| Advisory | Title | Affected |
|---|---|---|
| `GHSA-f88m-g3jw-g9cj` | inherited libvips vulns (CVE-2026-33327/33328/35590/35591) | `<0.35.0` |
| `GHSA-rgj7-g3m4-5g8c` | libheif heap buffer overflow (CWE-122) | `<0.35.4` |
| `GHSA-wq5f-xc86-pv6w` | librsvg use-after-free (CVE-2026-96889) | `<0.35.5` |

`fixAvailable: sharp@0.35.5`, `isSemVerMajor: true`. No CVSS vectors are published for any
of the three.

It does decode originals, not pre-made derivatives: `index.ts:340-354` calls
`generateThumbnail` for every exported photo and `generateThumbnail.ts:67-70` feeds the
on-disk original straight into `sharp()`. `backend/all-lanbilder-files.txt` lists **60,851
image paths** — the file count is real; "59 GB" appears nowhere in the repo and
`public/g2data` is unmounted locally, so treat the byte figure as unverified.

Note the existing error handling is not a mitigation: `failOnError` plus `catch { return 'invalid' }`
catches JS-level decode errors, but memory corruption in libvips/libheif/librsvg happens in
native code before any JS exception exists.

**Also found, not on the list:** `mysql2 <= 3.23.0` carries `GHSA-3f6p-5ww8-9rcr` (high,
CWE-522 — auth-plugin downgrade leaking plaintext credentials) and `GHSA-rgwj-5xj2-c3m3`
(moderate, CVSS 5.9 — decompression-bomb DoS). Non-breaking `npm audit fix`. This one
matters because `backend/config.json:5` holds a plaintext DB password next to it.

Steps: take `sharp@0.35.5` (breaking — re-check the `failOnError`→`failOn` call site, which
LOGIC-12 touches anyway, and note `autoOrient` becomes available, which LOGIC-13 wants);
`npm audit fix` for `mysql2`; re-run the backend suite.

---

### ~~LOGIC-13: EXIF-rotated portrait photos come out sideways~~

**CLOSED, verified 2026-10-25 (Sprint 02 T-06):** `backend/generateThumbnail.ts` calls `.autoOrient()` before `.resize()` (available since sharp 0.34; T-04 moved to 0.35.5). Photo `thumb_width`/`thumb_height` now come from the generated file (`readThumbnailSize`, set in `index.ts`), not the Gallery 2 derivative columns; null when there is no thumbnail. Test: an 80×40 JPEG with Orientation 6 gives a 40×80 thumbnail with no orientation tag left; without `autoOrient` the test fails (checked). The album *highlight* `thumbnailWidth/Height` (`index.ts:235`) still read the DB columns: latent, unused by the frontend. Original row kept for the record:

**Confirms list item 5b.**

The full sharp chain is `generateThumbnail.ts:67-70` — no `.rotate()`, no `withMetadata()`,
no `autoOrient` (which does not exist in sharp 0.33.5; it arrived in 0.34, so this depends
on SEC-14). Without `.rotate()` libvips ignores EXIF `Orientation`, and because
`withMetadata()` is absent the tag is stripped from the output too, so the browser cannot
compensate either. `fit: 'inside'` compounds it: a 4000x3000 portrait-tagged original is
fitted as landscape, giving a 400x300 thumbnail where 300x400 was wanted.

Separately — and unrelated to EXIF — `thumb_width`/`thumb_height` are not measured from the
generated file at all. They are read from the *legacy Gallery 2* derivative table
(`sqlUtils.ts:33-34`, surfaced at `index.ts:235-236`), so they describe a different image at
a different size than the 400x400-bounded file the frontend loads. Currently latent: those
fields appear unused for rendering (only a doc comment at `frontend/src/types/index.ts:58`),
but they will mislay the layout the moment anyone uses them for aspect-ratio reservation.

Fix: add `.rotate()` before `.resize()`, and populate the thumbnail dimensions from sharp's
own output metadata rather than the legacy DB columns.

### ~~TEST-01: 2 suites fail to load; the reported 214 failures do not reproduce~~

**CLOSED, verified 2026-10-25 (Sprint 01 T-01 + T-04):** Breadcrumbs duplicate removed (T-01); `src/test/setup.ts` now stubs `URL.createObjectURL`/`revokeObjectURL` when jsdom lacks them (T-04). Full vitest (2 forks): **81/81 files, 1432/1432 tests pass**. Original row kept for the record:

**Does not confirm the "214 of 1249 tests fail" report.** Actual state of `npx vitest run`
at `61c80e6`: **1421 passed, 0 failed, 2 suites failed to collect** (81 files, 79 passed).
No individual test fails. I could not reproduce the reported numbers in any form — they may
predate the 1,421-test fix in `ffed1f2`, or come from a different checkout. Worth asking
before anyone spends time on "tests that no longer match the code".

The two collection failures are both trivial:

1. `src/components/Breadcrumbs/Breadcrumbs.integration.test.tsx` — the BUILD-01 syntax error
   (`esbuild: Unexpected "}"` at 215:0). Fixed by the same edit.
2. `src/utils/fetchImageAsObjectUrl.test.ts:9` — `Error: revokeObjectURL does not exist`;
   `vi.spyOn(URL, 'revokeObjectURL')` at module scope, but jsdom does not provide it and
   `src/test/setup.ts` does not stub it. Add `URL.revokeObjectURL`/`createObjectURL` stubs
   to the global setup.

Because both files fail at *collection*, their tests never run — so the true total is above
1,421, and neither suite has been exercised since January.

### ~~TEST-02: backend `pathSegments.test.ts` fails on a stale expectation~~

**CLOSED, verified 2026-10-25 (Sprint 02 T-01):** decided dots stay legal (old lanbilder.se URLs contain them, e.g. `/badalan/badalan_v1.0/`; `test-vectors/nordic-path-normalization.json:24` and `frontend/src/utils/albumPath.test.ts:31` already expect `backspace_2.0`); `backend/pathSegments.test.ts:21` now expects `backspace_2.0`. `.`/`..` as whole segments are handled in LOGIC-11. New `npm test` in backend (`runTests.mjs`): 10/10 test files pass (`verifyImagePaths.test.ts` now runs in ~1 s). Original row kept for the record:

9 of 10 backend test files pass. `pathSegments.test.ts:20` asserts
`titleToSegment('Backspace 2.0') === 'backspace_2_0'`; actual is `'backspace_2.0'`.

`RE_ILLEGAL` is identical in `backend/cleanupUipath.ts:22` and
`frontend/src/utils/albumPath.ts:18` and excludes `.` in both, so backend/frontend parity
holds and this is a stale test expectation rather than a normalization bug. Decide
deliberately, though: dots are currently legal in path segments, which is worth a conscious
look alongside LOGIC-11's traversal guards. Then fix the test or the regex to match.

### ~~LOGIC-15: a failed `index.json` load leaves path URLs spinning forever~~

**CLOSED, verified 2026-10-25 (Sprint 01 T-08):** `frontend/src/pages/PathResolverPage.tsx` wraps both `resolvePathToAlbumId` calls (`resolveOrFail`); a rejection sets `loadFailed` and renders `role="alert"` "Could not load the gallery" with a Retry button (re-runs the effect via an `attempt` counter); `null` still goes to `/not-found`. Tests: `PathResolverPage.test.tsx` reject → alert → Retry → album page; image-path variant. Original row kept for the record:

`frontend/src/pages/PathResolverPage.tsx:30-66`: the async IIFE wraps only `decodeURIComponent`
in a try/catch. `resolvePathToAlbumId` → `loadPathIndex` → `loadIndex` (`dataLoader.ts:380-395`)
throws `NetworkError` on a 5xx, on a network failure or on bad JSON. That rejection is unhandled,
`resolved` stays `undefined`, and the spinner never ends. Every path-based URL (all the old
lanbilder.se album links) depends on this. Fix: catch the error and render an error state with
Retry. Treat `null` (404) as not-found, as today.

### ~~PERF-02: every path navigation re-downloads and re-parses the whole `index.json`~~

**CLOSED, verified 2026-10-25 (Sprint 03 T-02):** `frontend/src/utils/dataLoader.ts` `loadIndex()` memoises its promise (failures are not cached, so Retry refetches; `clearCache()` resets it). `PathResolverPage.tsx` no longer resets `resolved` to `undefined` on a path change, so the current page stays mounted until the new path resolves. Tests: `dataLoader.test.ts` (2 calls + resolve + loadPathIndex → 1 fetch; 500 then OK → 2 fetches), `PathResolverPage.test.tsx` (no spinner while the next path resolves). Full vitest 1442/1442. Original row kept for the record:

`loadIndex()` (`dataLoader.ts:380`) has no cache. `loadPathIndex()` (`:515`) calls it on every
resolve, and `PathResolverPage.tsx:27` runs `setResolved(undefined)` first, so the page unmounts.
Pressing → in the lightbox on a path URL shows a spinner flash, refetches the full path index
(1,388+ entries), remounts the Lightbox (zoom reset, focus jumps) and drops the neighbour preloads.
Fix: memoise the `loadIndex()` promise at module level (drop it on failure so Retry works), and keep
the previous `resolved` until the new one is ready.

### ~~LOGIC-20: `DataLoadError` imported as a type but used as a value~~

**CLOSED, verified 2026-10-25 (Sprint 01 T-03):** `frontend/src/hooks/useSiteMetadata.ts:19` is now `import { loadIndex, DataLoadError }` (value import); the 4 TS1361 errors are gone from `npm run typecheck`. Original row kept for the record:

`hooks/useSiteMetadata.ts:19` has `import { loadIndex, type DataLoadError }`, and `:65,67,97,99` use
`instanceof DataLoadError` / `new DataLoadError(...)`. esbuild drops type-only imports, so the
error path throws `ReferenceError: DataLoadError is not defined`, the site name never loads and
loading never ends. It probably also appears among BUILD-01's 87 production errors (TS1361).
Fix: a value import.

### ~~LOGIC-21: backend: one failing subtree crashes the run without cleanup~~

**CLOSED, verified 2026-10-25 (Sprint 02 T-07):** every child walk in `backend/index.ts` is wrapped in `settleSubtree` (`backend/subtreeFailures.ts`) as it starts, so the rejection is handled at once (no unhandled rejection while the parent awaits its photos); the failure (album id + message) is collected, the rest of the tree is still extracted, and the run prints "N album subtree(s) FAILED (output incomplete)" with the list and exits 1. Test `subtreeFailures.test.ts`: an immediately rejecting walk + 50 ms parent delay → no `unhandledRejection`, failure recorded and reported. Original row kept for the record:

`backend/index.ts:312-387`: the `recursivePromises` (child `main()` calls) start at `:316` but are
only awaited at `:387`, after `await Promise.all(processedChildrenRaw)` (`:338`). If a subtree
rejects while the thumbnails are still running, it is an unhandled rejection, and Node 22 exits
without running the catch/finally or writing `index.json`. Fix: `Promise.allSettled` (or attach a
handler right away), log the failing album id, and exit non-zero at the end.

### ~~LOGIC-22: backend: JSON for removed or excluded albums is never removed, and writes are not atomic~~

**CLOSED, verified 2026-10-25 (Sprint 02 T-09):** `backend/outputDir.ts` + `index.ts`: output goes to `data.new-<stamp>/`; only a run without errors (`process.exitCode !== 1`: no failed subtrees, path check OK) renames `data/` → `data.prev-<stamp>/` (kept, not deleted) and the staging dir → `data/`, then lists files the previous output had and the new one lacks. A crash or a failed run leaves `data/` unchanged. Tests `outputDir.test.ts` (first run, failed run, stale `8.json` listed and not published, previous kept). Docs: 03-backend-usage.md; `.gitignore` covers `data.new-*`/`data.prev-*`. Original row kept for the record:

`backend/index.ts:550,719,754` write in place with `fs.writeFile`; nothing deletes or reports
`data/<id>.json` files that a run did not produce. An album deleted, added to `ignoreAlbums` or
excluded by SEC-12 stays published under its old id. A crash mid-run leaves a mix of old and new
files. Fix: write to a fresh directory and swap it in at the end; list stale files (don't delete
silently; production data has a no-delete policy).

### ~~LOGIC-23: backend: non-numeric concurrency silently does nothing~~

**CLOSED, verified 2026-10-25 (Sprint 02 T-08):** `backend/configValidation.ts` `findConfigErrors` checks `rootId`, both concurrencies, `verifyTimeoutMs`, thumbnail width/height/quality are integers in range (or absent); `index.ts` stops at config load and lists every invalid field. `verifyImagePaths.ts:352` falls back to the default on a non-finite value too. Tests `configValidation.test.ts` ("x", "5", 0, 101, 2.5, -1, multiple errors). Docs: 02-configuration.md. Original row kept for the record:

`backend/index.ts:650` `Math.max(1, config.thumbnailConcurrency ?? 5)` and `verifyImagePaths.ts:352`
`Math.max(1, rawConcurrency)` give `NaN` for a string or other bad value. The semaphore never
grants, and the run exits 0 having written nothing / "0 deviations". The `Number.isFinite` guard
at `:22` only covers `ignoreAlbums`. Fix: validate the numeric config fields once, at load time.

### ~~SEC-17: backend: config prefixes go into SQL unvalidated; login names published~~

**CLOSED, verified 2026-10-25 (Sprint 02 T-10):** `backend/configValidation.ts` rejects `tablePrefix`/`columnPrefix` that are not `/^\w*$/` (tests: `g2_; DROP TABLE x; --`, backticks, non-string). `backend/sqlUtils.ts:25,94` now select `NULLIF(TRIM(fullName), '') as ownerName`: no login-name fallback, and an empty/blank full name is null (shown as no owner). **Choice made for privacy, reversible:** the operator may prefer the old fallback to `userName`; say so and it goes back. Not run against MySQL here (no DB); `NULLIF`/`TRIM` are standard MySQL. Original row kept for the record:

- **Prefixes:** `backend/sqlUtils.ts` interpolates `gallerySettings.tablePrefix`/`columnPrefix`
  into every query. Only trusted config sets them, but validate with `/^\w*$/` at load time.
- **Login names:** `sqlUtils.ts:25,94` use `COALESCE(fullName, userName)`, so a user with NULL
  `fullName` is published by their **login name**, and an empty `''` fullName isn't replaced
  either. Decide whether owners should be shown at all; otherwise use `NULLIF(fullName,'')` and
  show nothing when it is missing.

### ~~ARCH-08: toolchain upgrade (dev-only, not blocking)~~

**SUPERSEDED 2026-10-25 (Sprint 01 retro) by DEPS-01** (operator: every dependency on its latest version before deploy, not "can wait"). Original row kept for the record:

`npm audit` (full) reports 43 issues (5 critical), all in build/test tools that don't ship:
vite 5 (→ 8), vitest 1 (→ 5), eslint 8 (EOL, → 9 flat config), `@typescript-eslint` 6 (→ 8),
puppeteer via size-limit. React 18.3 can stay. Plan it after BUILD-01, since the type and lint
burn-down touches the same files.

---

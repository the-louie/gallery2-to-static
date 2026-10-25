# TODO

Backlog rebuilt 2026-10-25 from a colleague's review list, after verifying every claim
against the code at `61c80e6`. Numbering continues the existing `SEC-`/`LOGIC-`/`ARCH-`
series (see `.claude/plans/`); `BUILD-`, `PERF-` and `TEST-` are new prefixes.

**Verification summary:** 8 of 10 "must fix" items confirmed as described, 2 confirmed
with a materially different mechanism (#7, #8), 1 understated by a wide margin (#1).
The reported test failures (214/1249) could **not** be reproduced — see TEST-01.

---

## P0 — Blocks all other work

Nothing below this line can be validated until the build runs.

### BUILD-01 (remaining): 253 test-only type errors behind `npm run typecheck:test`

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

## P1 — Must be fixed before anything is published

### SEC-12: no Gallery 2 permission check anywhere — private albums are exported

**Confirms list item 2.**

All SQL lives in `backend/sqlUtils.ts` and there are exactly four queries.
`SQL_GET_CHILDREN` (`sqlUtils.ts:15-63`) joins eight tables and filters on nothing but:

```sql
WHERE e.g_entityType in ('GalleryAlbumItem', 'GalleryPhotoItem') AND ce.g_parentId = ?
```

A repo-wide search for `g2_PermissionSetMap`, `g2_AccessMap`, `g2_AccessSubscriberMap`,
`g2_UserGroupMap`, `g_isLinkable` and `g_viewedSinceTimestamp` returns **zero hits** in any
`.ts`/`.tsx`/`.json`/`.md` file. The only filtering that exists is a hand-written numeric
blacklist, `config.ignoreAlbums: [99283, 362248]` (applied at `backend/index.ts:276-280`),
and empty-album pruning. (`onlyAlbums` is declared in `types.ts:136` but never read — there
is no allowlist mechanism, live or dead.)

Worse, the output carries nothing the frontend could filter on: neither `Child`
(`types.ts:1-72`), `AlbumMetadata` (`types.ts:90-108`) nor `SearchIndexItem`
(`index.ts:245-254`) has a visibility, ACL or owner-group field. Album titles, descriptions
and full ancestor paths go into `data/search/index.json` unconditionally
(`index.ts:476-490`, written at `:711-719`), so restricted content is not just browsable
but keyword-searchable.

Fix: join the Gallery 2 permission tables in `SQL_GET_CHILDREN` and resolve effective view
permission for the anonymous/"everybody" group, excluding anything that group cannot view.
Re-extraction is required — this cannot be patched in the frontend, because the information
never leaves MySQL. Treat any already-published `data/` output as leaked.

## P2 — Correctness and cost

## P3 — Quality, hygiene and latent bugs

### LOGIC-14: image search results link to a "Legacy Route Not Supported" page

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

### LINT-01: 117 lint errors — including 6 real conditional-hook violations

**Partly confirms the report's "127 errors"** — actual is **117 errors + 15 warnings (132
problems) across 52 files**:

| count | rule |
|---|---|
| 64 | `@typescript-eslint/no-explicit-any` |
| 43 | `@typescript-eslint/no-unused-vars` |
| 10 | `react-hooks/exhaustive-deps` |
| 6 | `react-hooks/rules-of-hooks` |
| 5 | `react-refresh/only-export-components` |

Most are cosmetic, but the 6 `rules-of-hooks` errors are a genuine crash, all in
`frontend/src/components/ThemeDropdown/ThemeDropdown.tsx`: an early `return` for the
"no themes available" case at `:83-99` sits **before** four `useCallback`s (`:102`, `:110`,
`:119`, `:127`), a `useEffect` (`:179`) and a `useLayoutEffect` (`:204`). If
`availableThemes` were ever empty React would throw on hook-order mismatch. Latent today —
`availableThemes` comes from the frozen, non-empty `THEME_REGISTRY` — so the fix is cheap
insurance: move the early return below the hooks.

Do the `rules-of-hooks` fix now; schedule the `any`/unused-vars burn-down with BUILD-01,
since both touch the same fixture-typing problem.

### ARCH-07: two ineffective `vite.config.ts` settings

Minor, noticed while verifying BUILD-02/03:

1. `chunkSizeWarningLimit: 500` is at `vite.config.ts:120`, nested inside `rollupOptions`
   instead of `build`. Rollup rejects it outright — the build prints
   `Unknown input options: chunkSizeWarningLimit` and the setting does nothing.
2. `manualChunks` (`:97-115`) tests `id.includes('react')` before `id.includes('react-router')`,
   so router code lands in `react-vendor` and the `router-vendor` chunk never materialises as
   intended. Also matches any `node_modules` path containing the substring "react".

---

## Added 2026-10-25: second pass of the review, verified at `c750fbf`

These come from the full review (`code-review-rc1.md`, items B1–B16 and C), which was written
against the older `9790743`. Each one was re-checked against `c750fbf`; only items that are still
open are listed here. The items already fixed are at the end of "Not reproduced / no action".

### P1 additions

### DECISION-01: hosting model — Cloudflare Pages + image server, or one nginx host (needs operator)

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

### DEPS-01: all dependencies on their latest version (operator, 2026-10-25)

Operator requirement before deploy: every dependency in `frontend/package.json` and
`backend/package.json` (direct and dev) on its latest release, lockfiles regenerated, and
`npm audit` (full, not only `--omit=dev`) clean in both folders. This includes the majors that
SEC-14 and ARCH-08 list:
- frontend: vite 5 → current, vitest 1 → current, eslint 8 → current (flat config),
  `@typescript-eslint` 6 → current, React 18 → 19, react-router 6 → current, `@vitejs/plugin-react`,
  jsdom, Testing Library, size-limit;
- backend: sharp 0.33 → current, mysql2 → current, ts-node/typescript, `@types/node` matching the
  Node major we deploy on (22).

Split per toolchain (build, test, lint, runtime libraries, backend) so each step lands green.
_Progress 2026-10-25 (Sprint 02 T-04): backend runtime libraries done (sharp 0.35.5, mysql2 3.24.6, @types/node 22.20.5). Backend open: typescript (7.x latest; ts-node 10.9.2 needs checking against it) and ts-node._
Verify with `npm outdated` (empty) + `npm audit` (0) in both folders, `npm run build`, the full
vitest run and the backend tests. Add `engines` (HYGIENE-01) so the Node version is pinned too.
Supersedes the "can wait" note in ARCH-08 and the version part of SEC-14.

### SEC-18: no Brotli decoder vulnerable to CVE-2026-111497 is shipped or used (operator, 2026-10-25)

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

### TEST-03: no end-to-end test of the backend extraction (found 2026-10-25, Sprint 02 T-03)

`backend/index.ts` runs everything in a top-level IIFE (`index.ts:563`) and `main()` is not exported,
so the tree walk (segments, path index, child links, thumbnails, JSON writing) has no test; Sprint 02
T-03 could only test the pure helpers. Fix: move `main()` and its helpers into a module that takes
the `sql` object as a parameter, keep `index.ts` as the thin CLI, and add a test with a fake `sql`
(an in-memory tree with duplicate-named siblings, blank titles, a hidden album, a truncated JPEG) that
runs the whole extraction into a temp dir and asserts on the JSON and `index.json`. Also lets the
LOGIC-11 counts (6 bad links / 7 unreachable albums) be re-measured once the real DB is available.

### LOGIC-31: a photo kept without a thumbnail shows the grid's error state (found 2026-10-25, Sprint 02 T-05)

Since LOGIC-12 the backend keeps a photo whose thumbnail could not be generated, but the frontend
builds every photo's thumbnail URL from `urlPath` (`frontend/src/utils/imageUrl.ts:178`
`getImageUrl(image, true)`), not from `thumbnailUrlPath`/`thumb_width`. Such a photo requests a
non-existent `/g2data/thumbnails/.../t__x.jpg` (404) and shows the error tile; the lightbox works.
Fix: emit a flag (or `thumbnailUrlPath: null`) from the backend for these photos and show a
placeholder (or the downscaled full image) instead of the error state.

### P2 additions

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

### LOGIC-19: zoom limit is ~2500% instead of 400%

`hooks/useImageZoom.ts:121-128`: `fitZoom = Math.min(scaleX, scaleY) * 100` with scales that are
already percentages, then `Math.max(fitZoom, ZOOM_MAX)`. A 4000 px image in a 1000 px container
allows 2500%. Fix: `maxZoom = ZOOM_MAX`, or the ratio without `* 100`.

### P3 additions

### LOGIC-24: image URLs are not encoded per segment

`frontend/src/utils/imageUrl.ts:178` (`getImageUrl`) and `backend/pathResolution.ts` join raw
`pathComponent`s. There is no `encodeURIComponent` anywhere in either. A filename containing
`#`, `?` or `%` gives a broken URL: `#` cuts the path, `%xx` is decoded to another file. The
backend's local verify uses `fs.realpath` on the raw path, so it reports "ok". Fix: encode each
segment when building URLs. Grep the real file list (`backend/all-lanbilder-files.txt`) for
`[#?%]` to see how many are affected.

### SEC-15: BBCode parse is quadratic, with no length or depth cap

`frontend/src/utils/bbcode.ts` (`parseBBCode` at `:581`) has no input length or nesting limit. For
each open tag it scans to the end and re-parses the nested content: `[b]`×16000 renders in 7.6 s,
×4000 in 0.5 s (measured at `9790743`, the parser is unchanged in this respect). The content is
frozen, so this is low risk. Fix: cap the input (e.g. 8 KB) and the depth (e.g. 20), falling back
to plain text.

### LOGIC-25: stored sort value is not validated

`hooks/useSort.ts:68-72` passes whatever `useLocalStorage` parses straight through, and
`utils/sorting.ts:217` calls `sortOption.split('-')`. A stored non-string (`5`, `{}`) throws and
takes down the page. A string that is not a known option silently sorts nothing. Fix: validate
against the `SortOption` list and fall back to `DEFAULT_SORT_OPTION`, as `ThemeContext` already does.

### LOGIC-26: thumbnail object URL revoked while it is displayed

`hooks/useProgressiveImage.ts:224-232`: the thumbnail effect has `state` in its dependencies, and
its cleanup revokes `thumbnailObjectUrlRef.current`. `setState('thumbnail-loaded')` (`:221`)
re-runs the effect, so the cleanup revokes the URL the `<img>` is showing. It works today only
because the browser keeps the decoded pixels; any re-mount or `src` re-assignment shows a broken
image. Fix: revoke only on image change or unmount, not on state change (LOGIC-02 added the
cleanup, but it is too eager).

### LOGIC-27: nested links in the root album list

`components/RootAlbumListBlock/RootAlbumListBlock.tsx:105-132`: the album description is rendered
with `parseBBCodeDecoded` **inside** the block-level `<Link>`, so any `[url]` in a description
gives `<a>` inside `<a>`. That is invalid HTML: the click goes to the inner link or the outer one
depending on the browser, and it triggers React hydration warnings. Fix: render the description
outside the link, or strip links (`[url]` → text) in this view.

### SEC-16: `url("…")` escaping in the album block is incomplete

`RootAlbumListBlock.tsx:87` escapes only `"`: `url("${highlightImageUrl.replace(/"/g, '\\"')}")`.
A path containing `\"` or a newline breaks out of `url()`. It needs a crafted Gallery 2 filename,
and a strict CSP blocks external images, so this is low risk. Fix: `encodeURI` the path (or
`CSS.escape`), or pass it as a CSS custom property.

### LOGIC-28: album named `image` with a numeric child is unreachable

`pages/PathResolverPage.tsx:16,39`: `IMAGE_PATH_RE = /\/image\/(\d+)$/` is checked before the
path index, so `/x/image/2005` (album "image", sub-album "2005") is read as image 2005 in album
`/x`. Fix: look up the full path in `pathIndex` first; use the image regex only if that misses.

### LOGIC-29: Swedish name sort is wrong

`utils/sorting.ts:66-75` compares `toLowerCase()` strings with `<`/`>` (code point order):
ä (U+00E4) < å (U+00E5) < ö, but Swedish order is å, ä, ö, and accented letters sort after z
inconsistently. Fix: `aTitle.localeCompare(bTitle, 'sv', { sensitivity: 'base' })`, or an
`Intl.Collator('sv')` created once.

### LOGIC-30: thumbnails are always JPEG but keep the source extension

`backend/generateThumbnail.ts:69` `.jpeg(...)` is used for every source, while the destination
keeps the original name (`t__photo.png`, `t__anim.gif`). PNG transparency turns black, GIF
animation is lost, and the server sends `image/png` for JPEG bytes (browsers sniff it, but
`nosniff` plus a strict MIME check can break it). Fix: write `.jpg` thumbnails and record the path,
or keep the format (`.png()`/`.webp()` for alpha).

### BUILD-04: `size-limit` patterns don't match the build

`frontend/package.json:9-24`: `dist/assets/js/lightbox*.js` matches no file (Vite names it
`Lightbox-<hash>.js`, and the case differs), and `*-*.js` matches every chunk and size-limit adds
them up (118 KB brotli vs the 50 KB "per chunk" limit). The check fails because of the globs, not
the bundle. Fix the globs (one entry per named chunk). Note: `size-limit` starts headless Chrome
(puppeteer) for its timing step. Run it with `--why`/without the time plugin, or only in CI.

### HYGIENE-01: repo and package tidy-up

- Delete the root `package-lock.json` stub (97 bytes, there is no root `package.json`),
  `report_fail_20260130.md` (4.6 MB) and the empty `report_20260130.md`. Add `report_*.md` and
  `frontend/coverage` to `.gitignore`.
- `frontend/public/` still ships `*.example*`, `image-config.json` (frontend never reads it) and
  `IMAGES-LOCAL.md` into `dist/`: move them out of `public/`.
- Backend: add `typescript` to `devDependencies` (today it arrives only as ts-node's peer).
  Add `"engines": { "node": ">=22" }` to both `package.json`s.
- README: add `npm ci` in both folders and the frontend build/deploy steps (the current README
  only shows the backend run).

## Not reproduced / no action

- **"No XSS path and no committed secrets"** — confirmed for secrets. `backend/config.json`
  is ignored at `.gitignore:1`, has never appeared in any of the 228 commits
  (`git log --all -- backend/config.json` is empty), and no `.env`/secret/credential file is
  tracked among the 375 tracked files. Note the file does hold a plaintext password on disk,
  which is why SEC-14's `mysql2` advisory matters.
- **"214 of 1249 tests fail"** — see TEST-01. Not reproducible; please confirm the source.
- **Already fixed at `c750fbf` (from the second pass, no action):**
  - stale album response after fast back/forward: `useAlbumData` `requestIdRef` (LOGIC-01);
  - thumbnail path traversal: `validateNoTraversal` (SEC-05) and component checks (SEC-11);
  - `/album/7abc` accepted: strict `/^\d+$/` in `routeParams.ts`;
  - raw `ownerId` in the output: rows are now mapped field by field (LOGIC-05), `ownerId` is not emitted.
- **Not re-verified:** per-album themes for paths with é/æ/ø (`albumThemesConfig.ts`, depends on
  whether `location.pathname` is percent-encoded under `HashRouter`). Check in a browser.

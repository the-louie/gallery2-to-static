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

### BUILD-01 (remaining): test-only type errors behind `npm run typecheck:test` (253 → 273 after the Sprint 04 toolchain upgrades)

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

### LINT-01: 117 lint errors — including 6 real conditional-hook violations

_2026-10-25 (Sprint 04 T-07, ESLint 9 flat config + typescript-eslint 8): 128 problems (110 errors, 18 warnings): no-explicit-any 68, no-unused-vars 29 (v8 also reports unused caught errors), exhaustive-deps 10, only-export-components 8, rules-of-hooks 6, no-useless-escape 3, no-constant-binary-expression 3 (new rule, test file), no-empty-object-type 1 (new rule). Same files and scope as before; the increase is stricter rule versions, not new code._

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

### DEPS-01 (remaining): two majors blocked upstream — ESLint 10, TypeScript 7 (operator, 2026-10-25)

_Groomed 2026-10-25 (Sprint 04 retro): everything else is on its latest release and `npm audit` is 0 in both folders (see the progress notes below). Open: **eslint 10 / @eslint/js 10** — waits for eslint-plugin-react to support ESLint 10 (7.37.5 supports ≤ 9); **typescript 7** — waits for typescript-eslint (< 6.1.0) and ts-node (needs the JS API; alternative: run the backend with Node's type stripping or tsx instead of ts-node). Recheck both at each sprint start._ Original title: all dependencies on their latest version.

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
_Progress 2026-10-25 (Sprint 04 T-01): frontend in-range updates done (Font Awesome 7.3.1 / react-fontawesome 3.5.0, react-virtuoso 4.18.19, react-router-dom 6.30.6, user-event 14.6.8, prettier 3.9.10, @types/react 18.3.31). `npm audit --omit=dev` still 1 moderate: react-router < 7.18 (T-06). dist 488 → 512 KB (Font Awesome)._
_Progress 2026-10-25 (Sprint 04 T-02, with T-03): Vite 8.3.5 (+ @vitejs/plugin-react 6.1.2, rollup-plugin-visualizer 7.1.1), Vitest 5.0.5 (+ coverage-v8, ui), jsdom 30.1.3, @types/jsdom 30; lockfile regenerated. `minify: 'esbuild'` dropped (Vite 8 uses Oxc). Test mocks of `Image`/`IntersectionObserver`/`SearchIndex` changed from arrow functions to `function` (Vitest 3+ constructs mocks with `new`). Build OK, 1468/1468._
_Progress 2026-10-25 (Sprint 04 T-04): @testing-library/react 16.3.3 (+ @testing-library/dom 10.4.2 as explicit peer), jest-dom 7.0.1 (setup and tsconfig.test use `@testing-library/jest-dom/vitest`; tsconfig.test adds `node` types). `src/test/setup.ts` shims a global `jest.advanceTimersByTime` → Vitest's, because Testing Library 10 only detects Jest fake timers (SearchBar's userEvent tests hung). 1468/1468._
_Progress 2026-10-25 (Sprint 04 T-05): React 19.3.1, react-dom 19.3.1, @types/react(-dom) 19.3.0. `JSX` namespace now imported from React (5 files); 2 timer tests wrapped in `act()` (React 19 flushes updates only there). Test-log warnings unchanged vs React 18 (measured on a T-04 worktree: same act()/Router warnings, 435 ThemeProvider etc.). dist 517 → 595 KB (React 19 runtime)._
_Progress 2026-10-25 (Sprint 04 T-06): react-router-dom 7.18.4 (re-exports react-router 7). `npm audit --omit=dev`: **0**. No relative `to`/`navigate` paths in the app, so v7's splat-route resolution change does not apply; the two v7 future-flag warnings are gone from the test log. dist 611 KB._
_Progress 2026-10-25 (Sprint 04 T-07): ESLint 9.39.5 (flat config `eslint.config.js`), typescript-eslint 8.72.0 (replaces the two @typescript-eslint packages), eslint-plugin-react 7.37.5, react-hooks 7.1.1, react-refresh 0.5.7, eslint-config-prettier 10.1.8, globals 17. **ESLint 10 not possible yet:** eslint-plugin-react 7.37.5 (latest) supports ESLint ≤ 9. Remaining full-audit items (14 high: basic-ftp, extract-zip, nanoid, zod 3) all come from size-limit's puppeteer chain (T-09)._
_Progress 2026-10-25 (Sprint 04 T-08): TypeScript 6.0.3 in frontend and backend. **TypeScript 7 (7.0.2, latest) not possible yet:** it is the native compiler and has no classic JS API (`typescript` exports only a version and `unstable/*`); typescript-eslint 8.72 requires `typescript <6.1.0` and ts-node needs the JS API. TS 6 deprecations fixed rather than silenced (frontend `baseUrl` removed; backend `module`/`moduleResolution` `node16`, `types: ["node"]` because TS 6 no longer includes all `@types` by default; the dynamic `import('./generateThumbnail')` became a static import, which `node16` requires)._
_Progress 2026-10-25 (Sprint 04 T-09): size-limit 14.3.0 with `@size-limit/file` 14.3.0 (preset-app dropped: its `@size-limit/time` pulled puppeteer + Chrome and all remaining dev advisories), web-vitals 6.2.3. **Frontend full `npm audit`: 0.** `npm outdated` lists only the two blocked majors: eslint/@eslint/js 10 (eslint-plugin-react) and typescript 7 (typescript-eslint, ts-node). Backend: `@types/node` stays on 22.x on purpose (Node 22 runtime)._
Verify with `npm outdated` (empty) + `npm audit` (0) in both folders, `npm run build`, the full
vitest run and the backend tests. Add `engines` (HYGIENE-01) so the Node version is pinned too.
Supersedes the "can wait" note in ARCH-08 and the version part of SEC-14.

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

### P3 additions

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

## FUTURE (after production deploy)

Operator, 2026-10-25. Not scheduled until lanbilder.se runs on the new code. The notes under each
row are first answers to the questions asked, to verify when the row is planned.

### FUT-01: SQLite as the master of the data; regenerate only changed branches

All data in a SQLite database whose schema preserves everything the JSON carries (albums, images,
paths, breadcrumbs, highlight images, descriptions, owners, counts, themes). The database is the
master; the JSON files are generated from it. Every album/image row records when it last changed,
so a run regenerates only the affected branch (the albums on the path from the root to the changed
item, plus their search-index entries) instead of the whole tree.
- First import: from the Gallery 2 extraction (the current backend), then Gallery 2 is retired.
- Changed-at must propagate: a changed image marks its album and every ancestor (counts, highlight)
  dirty. Deletes must be recorded too (tombstones), so stale JSON is reported (see LOGIC-22's
  no-delete policy).
- Fits DECISION-01 either way: the generator writes the same static files.

### FUT-02: admin can add albums and delegate them; delegated users add subalbums and images

An ADMIN creates an album and delegates it to a user; that user can create subalbums and
upload/add images under it. Requirements (operator):
- Authentication **must** be secure: federated login (GitHub / Google / Facebook were named).
- The admin part is **not linked** from the gallery, lives on its **own, not easily guessed
  subdomain**, and its code must **not be served at all** to unauthenticated users (separate build
  and origin, not a hidden route in the public SPA).
- Enforce login in Cloudflare (Access application on the admin hostname), and verify again in our
  backend, independently of Cloudflare, that the authenticated identity is on our own user list,
  without a second login: validate the `Cf-Access-Jwt-Assertion` JWT (signature against the team's
  public keys, `aud`, expiry) and map its subject/email to our user table.
- Authorisation: a user ↔ album table (0..n albums per user, inherited down the subtree); every
  write checks it in the backend.
- MFA, not email-based (token or key): to research. GitHub can require 2FA for members of an
  organisation; Google can enforce it only for Workspace accounts; whether Cloudflare Access can
  require MFA for social logins must be checked. A dependable option is our own WebAuthn/passkey
  step in the admin backend after the Access login.
- Uploads go through the image pipeline (sharp, failOn, size limits, EXIF strip) and into FUT-01's
  database, then trigger a branch regeneration.

### FUT-03: user profiles

Each user has a profile with a nickname and a profile picture. The federated providers usually
supply a display name and a picture (Google: `name`, `picture`; GitHub: `login`, `name`,
`avatar_url`; Facebook: name and picture): check what reaches us through Cloudflare Access (the
JWT, `/cdn-cgi/access/get-identity`) and copy it at first login, editable afterwards. Also worth
having: a stable internal user id (not the email), the linked provider identities, role (admin /
user), the delegated albums, created/last-login timestamps, and an "enabled" flag to lock a user
out without deleting them. Pictures should be stored by us (not hot-linked from the provider).

### FUT-04: audit logging

Every user action, login and other event is logged, successful or not: logins and denials (ours
and Cloudflare Access's audit log), album/image create/edit/delete/upload, delegation changes,
profile changes, admin actions, failed authorisation checks. Append-only (writes only, no
updates/deletes from the application), with timestamp, user id, source IP (`CF-Connecting-IP`),
action, target, result. Decide retention and who can read it.

### FUT-05: privacy-friendly statistics (European)

Visitor statistics similar to Google Analytics, preferably a European service with a healthier
privacy policy. Candidates to compare: Matomo (France; can be self-hosted), Plausible (EU, Estonia;
has a self-hostable Community Edition), Simple Analytics (Netherlands), Pirsch (Germany). Prefer
cookieless operation (no consent banner) and a self-hosted or EU-hosted instance. Any of them adds a
script/endpoint origin to the CSP (`script-src`, `connect-src`). Cloudflare Web Analytics exists but
is not European.

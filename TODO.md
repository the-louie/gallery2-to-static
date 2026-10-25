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

### LINT-01 (remaining): 18 lint warnings — exhaustive-deps 10, only-export-components 8

_Original title: 117 lint errors — including 6 real conditional-hook violations. Errors are at 0 since Sprint 06 T-06._

_Progress 2026-10-25 (Sprint 06 T-05): no-unused-vars, no-useless-escape, no-constant-binary-expression, no-empty-object-type at 0 (eslint config: `_`-prefixed names are the project's "deliberately unused" convention; unused `catch (error)` → `catch {`; unused test imports removed; `RE_ILLEGAL` without redundant escapes, same 12,288-char set). Lint now 86: no-explicit-any 68, exhaustive-deps 10, only-export-components 8._
_Progress 2026-10-25 (Sprint 06 T-06): all 68 `no-explicit-any` were in tests/mocks (production code has none); turned off for test files only (`eslint.config.js`). **Lint: 0 errors, 18 warnings** (exhaustive-deps 10, only-export-components 8); `npm run lint` (`--max-warnings 0`) still fails on those: each exhaustive-deps warning needs a look at the effect, not a blind dependency add._

_Progress 2026-10-25 (Sprint 06 T-04): the 6 `rules-of-hooks` errors fixed (`ThemeDropdown.tsx` early return moved below the hooks; new `ThemeDropdown.empty.test.tsx` fails on the old code with a hook-order error). Lint now: 122 {'@typescript-eslint/no-unused-vars': 29, '@typescript-eslint/no-explicit-any': 68, 'react-hooks/exhaustive-deps': 10, 'react-refresh/only-export-components': 8, '@typescript-eslint/no-empty-object-type': 1, 'no-useless-escape': 3, 'no-constant-binary-expression': 3}._

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

## Added 2026-10-25: second pass of the review, verified at `c750fbf`

These come from the full review (`code-review-rc1.md`, items B1–B16 and C), which was written
against the older `9790743`. Each one was re-checked against `c750fbf`; only items that are still
open are listed here. The items already fixed are at the end of "Not reproduced / no action".

### P1 additions

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

### P2 additions

### P3 additions

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

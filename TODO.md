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

## P1 — Must be fixed before anything is published

### CONF-01: put the blacklisted album IDs in `config.ignoreAlbums` before the production extraction (operator, 2026-10-25)

`backend/config_example.json:13` ships `"ignoreAlbums": []`. The review text cites `99283, 362248` from an older config; the operator confirms the full list. Check after extraction: none of the IDs (or their titles) appears in `data/search/index.json` or under `data/`.

### LINT-02: review the @eslint-react rules that are off (Sprint 08 T-02)

Moving to ESLint 10 replaced eslint-plugin-react with @eslint-react, whose `recommended-typescript` set adds rules the old set did not have. They fired 75 times and are off in `frontend/eslint.config.js` so the lint coverage stays as before: `set-state-in-effect` 49, `no-array-index-key` 7, `use-state` 5, `no-context-provider` 3, `no-use-context` 3, `naming-convention-ref-name` 2, `web-api-no-leaked-intersection-observer` 1 (`exhaustive-deps` 5 duplicates react-hooks and stays off). Review each: fix real bugs (the leaked IntersectionObserver first), turn the rule on, or keep it off with a reason.

## P2 — Correctness and cost

## P3 — Quality, hygiene and latent bugs

## Added 2026-10-25: second pass of the review, verified at `c750fbf`

These come from the full review (`code-review-rc1.md`, items B1–B16 and C), which was written
against the older `9790743`. Each one was re-checked against `c750fbf`; only items that are still
open are listed here. The items already fixed are at the end of "Not reproduced / no action".

### P1 additions

### DEPS-01 (remaining): two majors blocked upstream — ESLint 10, TypeScript 7 (operator, 2026-10-25)

_Sprint 08 T-02 (2026-10-25): **ESLint 10 done** — eslint 10.13.0, @eslint/js 10.0.1, eslint-plugin-react replaced by @eslint-react/eslint-plugin 5.28.8 (`frontend/eslint.config.js`); new core rule `preserve-caught-error` fixed in `frontend/src/utils/searchIndexLoader.ts` (`cause`, lib `ES2022.Error`). TypeScript 7 open (T-03)._

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

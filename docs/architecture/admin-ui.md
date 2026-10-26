# The admin UI (`admin/`, Sprint 18 T-06..T-08)

**Status:** implemented 2026-10-26 on branch `s18-admin-ui`. Builds against the contract in
`admin-api.md` (albums, photos, uploads, regeneration, profile) and `admin-service.md` (session,
TOTP, users, audit). Binding decisions: `TODO.md` FUT-02 and FUT-03 "Decisions".

## What it is

A separate Vite + React 19 + TypeScript single-page app in `admin/`, with its own `package.json`.
It is **not** part of `frontend/` (the public gallery): the public SPA never imports, links to or
ships any of this code (FUT-02: the admin code must not be served to unauthenticated visitors).
The build is a static `admin/dist/` served by the admin vhost (`deploy/nginx-admin.conf`,
`root /mnt/storage/lanbilder-app/admin-ui`) on the admin hostname behind Cloudflare Access; the
same vhost proxies `/api/` to `lanbilder-admin` on `127.0.0.1:3100`. All API calls are same-origin
`fetch(..., {credentials: "include"})`, so the `__Host-lbadmin` session cookie travels along and
no CORS is involved.

Dependencies: `react`, `react-dom`, `react-router-dom` (hash router), `qrcode` (TOTP enrolment
QR). Dev: `vite`, `typescript`, `vitest`, `jsdom`, `@testing-library/*`, `prettier`. No CSS
framework, no icon library: system font, one accent colour (`--accent`), plain CSS per component.

## Structure

```
admin/
  index.html                 entry (noindex), loads src/main.tsx
  vite.config.ts             base "./" (relative asset paths), /api + /g2data dev proxy, vitest config
  tsconfig.json              strict, noUncheckedIndexedAccess; tsconfig.test.json adds the test types
  mock/server.mjs            in-memory mock of the whole contract for `npm run dev`
  src/
    main.tsx                 StrictMode + <App/>
    App.tsx                  AuthGate > HashRouter > Layout > routes
    api.ts                   typed client (ApiError, api.*, uploadPhotos via XMLHttpRequest, date helpers)
    types.ts                 AdminItem, AlbumView, RegenStatus, Profile, AdminUser, Me, AuditEntry, …
    config.ts                VITE_PUBLIC_SITE → publicImageUrl() for thumbnails
    session/SessionContext   {me, isAdmin, refresh, logout} provided by the gate; useSession()
    hooks/useAlbum.ts        GET /api/albums/:id with a request counter; in-place child updates
    hooks/useRegenStatus.ts  GET /api/regen/status every 5 s while pending/running; notifyWrite()
    hooks/useAlbumTitles.ts  album ids → titles (delegation chips)
    components/
      AuthGate/              status gate; TotpSetup (QR + secret), TotpVerify (6 digits)
      Layout/                top bar: nav, RegenIndicator, user, Log out
      RegenIndicator/        "Publishing…" / "Published" / "Publish failed"
      Breadcrumb/            Albums › … › current
      AlbumList/             child albums (thumb, title, path, child count, badges)
      PhotoGrid/             PhotoGrid + PhotoCard: inline edit, ↑/↓, highlight, delete/restore
      AlbumToolbar/          New album, Edit, Hidden, Default highlight, Delete, Restore
      AlbumForm/             new (POST) / edit (PATCH) album; URL segment while !urlLocked
      UploadZone/            picker + drop zone, XHR progress, per-file created/rejected
      AlbumPicker/           browse or search the tree by title (for delegation)
      ItemBadges/, Thumb/    hidden / pending / deleted / highlight / read-only badges; thumbnail or placeholder
    pages/
      AlbumPage/             /#/albums/:id ("root" = entry point)
      UsersPage/             /#/users (admin)
      AuditPage/             /#/audit (admin)
      ProfilePage/           /#/profile
    test/                    setup.ts, mockFetch.ts (route-keyed fetch stub), renderWithSession.tsx
```

Conventions (CLAUDE.md): named exports only, `index.ts` barrels, one `.css` per component imported
by the component, JSDoc on components and hooks, tests next to the code, Prettier settings copied
from `frontend/.prettierrc`, strict TypeScript without `any`.

## Screens

**Status gate** (`AuthGate`). `GET /api/me` on load. 200 → the app, with the session in context.
401 `{error: "totp_required", totpSetup}` → enrolment (`POST /api/auth/totp/setup`; the
`otpauth://` URL as a QR code drawn client-side with `qrcode`, plus the secret as text) followed
by the code form, or only the code form (`POST /api/auth/totp/verify`; 401 = wrong code, 429 =
locked for five minutes). 403 → "Not invited" with the e-mail when the error body carries one.
Anything else → "Cannot reach the admin service" with Retry. Log out (`POST /api/auth/logout`) is
available on the TOTP screens and in the top bar; it ends the session and shows "Log in again"
(Cloudflare Access still knows the visitor, so the next `/api/me` just starts a new session).

**Albums** (`AlbumPage`, `/#/albums/root` then `/#/albums/:id`). Breadcrumb from the reply,
header with title, path, event date, owner, views and badges (hidden, pending, deleted, read-only), then
sub-albums (albums first) and the photo grid. Thumbnails use `thumbnailUrl`; `null` shows a
placeholder. Deleted items are greyed. For a delegated user the root is the synthetic list of
their albums (`album: null`). Every write action is rendered only when the item's `canWrite` is
true; restore only for admins.

- Toolbar: **New album** (form → `POST /api/albums`; the server starts it hidden, the form says
  so), **Edit** (`PATCH`; the URL segment is editable only while `!urlLocked`, admins get an
  "override" checkbox that sends `force: true`), **Hidden** checkbox (`PUT …/hidden`),
  **Default highlight** (`PUT …/highlight {photoId: null}`, shown when a highlight is set),
  **Delete** (`DELETE`, confirm dialog, soft) and **Restore** (`POST …/restore`, admins).
- Photo cards: Edit (inline title/description → `PATCH /api/photos/:id`), ↑/↓ (`PUT …/order`
  with the **full** list of direct child ids, albums kept in place), Set as highlight
  (`PUT …/highlight`), Delete / Restore.
- Upload: file picker + drop zone → `POST /api/albums/:id/photos` as multipart `files[]` through
  `XMLHttpRequest` (progress bar, Cancel aborts). Files over 50 MB or batches over 500 MB are
  refused before sending. The reply's `created` items are appended to the grid, `rejected` rows
  are listed with their reason.
- After every write `notifyWrite()` wakes the regeneration indicator, which polls
  `GET /api/regen/status` every 5 s while `pending || running` and shows "Publishing…", then
  "Published" (or "Publish failed" when `lastRun.ok` is false).

**Users** (`UsersPage`, admins). Table of `GET /api/admin/users` (e-mail, nickname, role,
enabled, TOTP enrolled, delegated albums as chips with titles, last login). Invite form (e-mail +
role → `POST`, 409 shown), Enable/Disable (`PUT …/enabled`; own account disabled in the UI, as the
server refuses it), Reset TOTP (`POST …/totp/reset`, confirm), undelegate (× on a chip →
`DELETE …/albums/:albumId`) and "+ Delegate", which opens the `AlbumPicker`: browse level by level
through `GET /api/albums/:id`, or type two characters to search titles across the tree (breadth-
first through the same routes, cached, capped at 150 fetches) → `PUT …/albums/:albumId`.

**Audit** (`AuditPage`, admins). `GET /api/admin/audit?limit=100`, newest first; "Older" fetches
`&before=<next>` and appends until a short page or `next: null`. Denied/error results are red.

**Profile** (`ProfilePage`). `GET /api/me/profile`; the form sends only changed fields with
`PUT /api/me/profile` (nickname = the public "Owner:" name, optional full name, "show my full name
instead" opt-in; 409 → "nickname taken" explanation per FUT-03). Picture: `PUT /api/me/picture`
(multipart `file`, 2 MB checked client-side), preview from `GET /api/me/picture?v=n` (pictures are
admin-side only).

## Running

```
cd admin && npm install
npm run mock          # terminal 1: mock API on 127.0.0.1:3101 (MOCK_SKIP_TOTP=1 skips TOTP, MOCK_ROLE=user plays a delegate)
npm run dev           # terminal 2: Vite on http://localhost:5174, /api and /g2data proxied to the mock
```

**Album order** (operator, 2026-10-26): sub-albums alphabetically (Swedish collation) with
"Internationella" then "Demoparties" pinned on top, from `shared/albumOrder.ts` (the generator
uses the same module for the public site).

**Pending** (operator, 2026-10-26): an item whose `pending` flag is set (changed since its
album's last publish run, `admin-api.md`) gets a yellow background (`is-pending`, tokens
`--pending-bg/--pending-border/--pending-text`) and a "pending" pill. When the regeneration
poll sees a finished run (`lastRun.finishedAt` changed) it fires `onPublished`, and the album
page reloads so the marks clear.

The mock (`mock/server.mjs`, Node built-ins only) implements every route of the contract with
in-memory data: an admin and a delegated user, a small album tree with hidden and deleted items,
uploads that accept image files and return `created`/`rejected`, a regeneration status that is
pending for 5 s and running for 4 s after each write, profile and picture, users and a padded
audit log. Any 6-digit code except `000000` passes TOTP.

Against the real service: `ADMIN_API=http://127.0.0.1:3100 npm run dev` proxies `/api` to a
locally running `backend/server.ts` (see admin-service.md "Running", `DEV_FAKE_ACCESS_EMAIL`).
Thumbnails then come from the public site: set `VITE_PUBLIC_SITE=https://lanbilder.se` for dev
and for the production build.

Checks: `npm test` (vitest, jsdom; 40 tests), `npm run typecheck` / `typecheck:test`,
`npm run format:check`, `npm run build` (tsc + vite → `admin/dist/`).

## Build and serving

`VITE_PUBLIC_SITE=https://lanbilder.se npm run build` writes `admin/dist/` (`index.html` plus
hashed `assets/`, relative paths because of `base: "./"`, one JS chunk of about 100 kB gzipped).
Deploy = copy `admin/dist/*` to `/mnt/storage/lanbilder-app/admin-ui/` on lanbilder2; the admin
vhost serves it with `try_files $uri /index.html` and `Cache-Control: no-store`, only to requests
that carry a Cloudflare Access assertion (the vhost returns 403 without one). The hash router
means no path-based rewrites are needed. The public frontend's build, deploy and `check:dist`
are untouched: `admin/` is never copied into the public `dist/`.

`VITE_PUBLIC_SITE` is the only build-time setting (default "" = same origin). The admin vhost does
not serve `/g2data/`, so set it to the public origin in production; the thumbnails are plain
`<img>` loads of public files, no credentials involved.

## Open points

- `deploy/nginx-admin.conf` has `client_max_body_size 50m`; a 500 MB multi-file batch (the
  contract's upper bound) needs `500m` there, or the UI's batch limit should drop to 50 MB.
- The 403 "not invited" screen shows the e-mail only if the service adds it to the error body;
  today `auth/guard.ts` sends `{error: "not an enabled user"}` without it.
- Reordering is offered for photos only (albums keep their positions in the list that is sent).
- No ESLint config in `admin/` yet (frontend's flat config could be copied); Prettier is wired.

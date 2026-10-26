# The admin service and its authentication (Sprint 16, FUT-02/03/04)

**Status:** implemented 2026-10-26 on branch `s16-auth` (T-01..T-07). Binding decisions:
`TODO.md` FUT-02, FUT-03, FUT-04 "Decisions" (operator interview 2026-10-26).

## What it is

`backend/server.ts` is `lanbilder-admin`: a `node:http` service on `127.0.0.1:3100` (systemd unit
`deploy/lanbilder-admin.service`, `User=lanbilder`, `MemoryMax=2G`). It is the only process that
writes `gallery.sqlite` at runtime (data-master.md). nginx (`deploy/nginx-admin.conf`) proxies two
things to it: the view counter from the public lanbilder.se vhost, and everything under `/api/` from
the admin hostname, which sits behind Cloudflare Access. The SPA never talks to it except for the
view counter. Only Node built-ins are used (`node:http`, `node:crypto`, `node:sqlite`).

Files: `backend/http.ts` (router, reply helpers, JSON body reader), `backend/server.ts` (wiring,
request log, CLI), `backend/regenQueue.ts` (debounced regeneration, 5 s, one run at a time, requests
during a run coalesce into one follow-up run; to be connected to `generate.ts --changed` by the
first write route), `backend/auth/access.ts` (Access JWT), `backend/auth/totp.ts` (RFC 6238),
`backend/auth/session.ts` (sessions + cookie), `backend/auth/users.ts` (users, delegation,
`canWrite`), `backend/auth/guard.ts` (`requireUser`), `backend/audit.ts`, `backend/routes/*.ts`.

## Routes

| Route | Who | Does |
|---|---|---|
| `GET /healthz` | anyone (loopback) | `{ok:true}` |
| `POST /api/view/:id` | public, anonymous | `view_counts.pending += 1` for a visible item; 204 no body/no cookie; 404 otherwise |
| `GET /api/me` | user, TOTP passed | `{user, role, albums: [delegated album ids], session}` |
| `POST /api/auth/totp/setup` | user, session (no TOTP yet) | new secret + `otpauth://` URL; 409 once enrolled |
| `POST /api/auth/totp/verify` `{code}` | user, session | sets `sessions.totp_ok`; 401 wrong/replayed code, 429 after 5 failures (5 min lock) |
| `POST /api/auth/logout` | cookie only | deletes the session, clears the cookie, 204 |
| `GET /api/admin/users` | admin | all users with their delegated albums |
| `POST /api/admin/users` `{email, role?}` | admin | invite (role defaults to `user`); 409 exists, 400 bad e-mail/role |
| `PUT /api/admin/users/:id/enabled` `{enabled}` | admin | enable/disable (disabling ends sessions; not your own account) |
| `PUT /api/admin/users/:id/albums/:albumId` | admin | delegate an album (must be an album; idempotent) |
| `DELETE /api/admin/users/:id/albums/:albumId` | admin | undelegate |
| `POST /api/admin/users/:id/totp/reset` | admin | forget the secret, end sessions; the user enrols again |
| `GET /api/admin/audit?limit=&before=` | admin | newest first, `limit` 1..1000 (default 100), `before` = id for paging; `next` = last id |

Replies are JSON with `cache-control: no-store`; errors are `{error: "..."}`. Unknown path 404,
wrong method 405, body over 64 KB 413, non-JSON body 415. Status codes for admins: 403 (not admin)
is decided before any lookup, so a non-admin never learns whether a user or album exists.

The API returns users without `totp_secret`, ever (`publicUser`). Request logs (one JSON line per
request on stdout: method, path, status, ms, ip) carry no headers, cookies or bodies.

## Content routes (Sprint 18)

The album, photo, upload, highlight, order, regeneration and profile routes are specified in
[admin-api.md](./admin-api.md) (the contract the admin UI is built against) and implemented in
`routes/albums.ts`, `routes/regen.ts`, `routes/profile.ts` over `albums.ts`, `upload.ts`,
`multipart.ts`, `profile.ts`. Rules that hold for all of them:

- **Authorisation**: `canWrite(user, item)` on the target (for a new album: on the parent);
  admins everywhere. 403 is decided before any lookup and audited (`authorize denied`).
- **Publishing cadence** (operator, 2026-10-26): the service ticks every minute (`REGEN_TICK_MS`) and
  publishes the dirty albums whose last change (the album row or any child) is older than
  `REGEN_SETTLE_MS` (60 s), so a finished album goes out while someone keeps uploading into
  another; the waiting ones stay dirty for the next tick. A write also asks the queue (debounced 5 s,
  same settle rule). `POST /api/regen` ("Publish now", admin) runs without the settle time; the
  nightly run too. `GET /api/regen/status` reports `dirty` and `settleMs`.
- **Every write** is audited (`album create|update|hide|unhide|delete|restore|highlight|order`,
  `photo upload|update|delete|restore`, `profile update|picture`, `regen request`) and asks the
  regeneration queue, so the public site follows within about a minute (`GET /api/regen/status`).
- **Soft delete only**: `deleted_at` on the item (its subtree follows by the parent chain); the files
  move to `<albumsRoot>/.trash/<id>/` and come back on restore (admin only).
- **New albums start hidden** (`hidden = 1`) and get their directory under `albumsRoot` at once;
  their URL segment comes from the title (`getSegmentForAlbum` among the siblings) and is **locked**
  (`items.url_locked_at`) the first time the generator publishes the album; afterwards only an
  admin may change it with `force: true`, which records the old clean path in `legacy_paths`.
- **Uploads** (`POST /api/albums/:id/photos`, multipart `files[]`): streamed to temp files
  (`<albumsRoot>/.upload-tmp/`), 50 MB per file (a larger file is rejected, not the request),
  500 MB per request (413), at most 500 files; the type is sniffed from the bytes (JPEG, PNG, GIF,
  WebP, HEIC), sharp decodes with `failOn: 'error'`; JPEG/PNG/GIF/WebP are stored byte for byte
  (the browser applies the EXIF orientation; `width`/`height` are stored as displayed), GPS tags
  are removed losslessly with `exiftool` (installed on lanbilder2; without it the file is re-encoded
  without metadata and a warning is logged); HEIC is converted to JPEG quality 92 with the
  orientation applied; the event date comes from EXIF `DateTimeOriginal` (Stockholm time), else
  now; the file name is sanitised (`[A-Za-z0-9._-]`, extension by content) and made unique in the
  album; the item's owner is the user's `owners` row (by e-mail).
- **Profiles**: nickname 3–40 characters, unique across users and Gallery 2 owners
  (case-insensitive); full name shown publicly only with `showFullName`; the picture is a 256×256
  JPEG under `avatars/` next to the database, served only through the API. At first login the
  Access token's `name` claim (when present) fills an empty full name.
- **Access policies follow the user list** (`backend/accessPolicy.ts`): after every add/enable/disable the
  service rewrites the e-mail rules of the Access policies named in `CF_ACCESS_POLICIES`
  (`appId:policyId,…`) with the enabled users' addresses (`CF_API_TOKEN` scoped to Access: Apps and
  Policies: Edit, `CF_ACCOUNT_ID`); domain/group rules are kept. Without those variables the service
  logs a warning and the operator keeps the policies by hand.
- **First admin**: `node --no-warnings=ExperimentalWarning server.ts --invite-admin <email>` on
  lanbilder2 (as user lanbilder, `GALLERY_DB` set as in the unit).

## The auth flow: Access -> JWT -> session -> TOTP

```
browser ──(GitHub/Google login)──> Cloudflare Access ──tunnel──> nginx ──> 127.0.0.1:3100
                                   adds Cf-Access-Jwt-Assertion
```

1. **Cloudflare Access** owns the login (GitHub and Google IdPs). Only identities allowed by the
   Access policy reach nginx at all; Access adds the header `Cf-Access-Jwt-Assertion` (RS256 JWT).
   nginx refuses requests without it (`deploy/nginx-admin.conf`), then forwards it.
2. **JWT verification, ours** (`auth/access.ts`, `verifyAccessJwt`): header `alg` must be `RS256`
   (so `none`/HS256 are refused), key by `kid` from `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`
   (cached 1 h, one forced refresh on an unknown kid, RSA >= 2048 bits), signature, `iss ===
   https://<team>`, `aud` contains our application audience (constant-time), `exp`/`nbf`/`iat` with
   60 s skew, `email` and `sub` present. The e-mail is lower-cased. Nothing from the token is
   trusted before the signature passed.
3. **Our user list** (`auth/users.ts`): the e-mail must be an `enabled` row in `users`. Unknown or
   disabled -> 403 and an audit entry (`login denied`). Accounts are invite-only: the admin adds the
   e-mail first (and to the Access policy).
4. **Session** (`auth/session.ts`): if the request carries no valid session cookie for this user, a
   row is inserted in `sessions` (id = 32 random bytes hex, 12 h, `totp_ok = 0`) and the cookie is
   set. A cookie whose session belongs to another user, is expired, or whose signature does not
   match is ignored (a new session is created). Sessions end on logout, after 12 h, when the user is
   disabled, and on a TOTP reset.
5. **TOTP** (`auth/totp.ts`, `routes/auth.ts`): every new session must pass a code (FUT-02: required
   every session). First login: `/api/auth/totp/setup` returns the secret and the `otpauth://` URL
   (the UI shows a QR code), allowed only until a code has verified it; afterwards only an admin
   reset reopens enrolment. `/api/auth/totp/verify` accepts the current step ±1 (30 s, 6 digits,
   HMAC-SHA1, constant-time comparison of every candidate), refuses a step at or below the last
   accepted one (no replay), locks the user for 5 minutes after 5 consecutive failures (in memory),
   and on success sets `sessions.totp_ok = 1`, `users.totp_verified_at` (first time),
   `users.totp_last_step` and `users.last_login_at`. Until then protected routes answer
   `401 {error: "totp_required", totpSetup: <bool>}`.
6. **Authorisation**: `requireUser(deps, handler, {admin})` for admin routes (403 audited).
   `canWrite(db, userId, itemId)` for the write routes of later sprints: admin, or the item or one
   of its ancestors (`items.parent_id` chain) is in `user_albums` for that user. Delegation covers
   the whole subtree (FUT-02); only admins create, delegate and undelegate top-level albums.

## Cookie

`__Host-lbadmin=<session id>.<HMAC-SHA256(session id, server secret) base64url>`;
`Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`. The `__Host-` prefix makes browsers
enforce Secure, Path=/ and no Domain. The server secret is env `SESSION_SECRET` (32+ characters) or,
when unset, the `settings` row `session_secret` (32 random bytes, generated once on first start).
Signature check and session lookup are constant-time (`crypto.timingSafeEqual`).

## The migration (`backend/db/migrations/002-users-audit.sql`)

```
users        (id, email UNIQUE lower-case, role admin|user, enabled 0/1, nickname UNIQUE, full_name,
              show_full_name, totp_secret, totp_verified_at, totp_last_step, created_at, last_login_at)
user_albums  (user_id, album_id, PRIMARY KEY both)
sessions     (id, user_id, created_at, expires_at, totp_ok)
audit_log    (id, at, user_id, email, ip, action, target, result ok|denied|error, detail JSON)
              triggers RAISE on UPDATE and DELETE (append-only)
triggers     a users.nickname may not equal an owners.nickname (case-insensitive) (FUT-03)
```

`db.ts` applies it automatically on open (`migrations` table). Nicknames/full names (FUT-03 profile
editing) and pictures are columns only; the profile routes come with the admin UI sprint.

## Audit (`backend/audit.ts`, FUT-04)

Every event is one row in `audit_log` and one JSON line appended to `AUDIT_LOG_FILE` (default
`backend/audit.jsonl`; the unit sets `/mnt/storage/lanbilder-app/db/audit.jsonl`, mode 600). Events:
`login` ok/denied (jwt, unknown, disabled), `session` (new session, with the Access `sub`),
`totp_setup`, `totp_verify` (wrong code, replay, locked), `logout`, `authorize denied` (every 403),
`invite`, `enable`, `disable`, `delegate`, `undelegate`, `totp_reset`. The `ip` is
`CF-Connecting-IP` (nginx forwards it), else the socket peer. Rows are never updated or deleted
(triggers); a logging failure never fails the request. Read: `GET /api/admin/audit`.

## What the operator configures in Cloudflare Access

1. **Identity providers**: GitHub and Google (Zero Trust -> Settings -> Authentication). No
   one-time-PIN provider (the second factor is ours).
2. **Application** (Access -> Applications -> Self-hosted): domain = the admin hostname
   (proposal `82j17zj.phetast.nu`), session duration e.g. 12 h. Copy the **Application Audience
   (AUD) tag** into `/etc/lanbilder-admin.env` as `CF_ACCESS_AUD`, and the team domain
   (`<team>.cloudflareaccess.com`) as `CF_ACCESS_TEAM_DOMAIN`.
3. **Policy**: Allow, include "Emails" = exactly the invited e-mails (the same list as `users`).
   Adding a user = both: `POST /api/admin/users` and the policy. Nothing else (no "everyone").
4. **Tunnel**: a public hostname entry for the admin hostname -> `http://127.0.0.1:8080` (or
   whatever `deploy/nginx-admin.conf` listens on). The public lanbilder.se vhost gets the
   `/api/view/` location from the same file.
5. Optional: Access's own audit log keeps the IdP logins; ours keeps everything after the wall.

## Running

Production (`deploy/lanbilder-admin.service`): `WorkingDirectory=/mnt/storage/lanbilder-app/backend`,
`ExecStart=/usr/bin/node --no-warnings=ExperimentalWarning server.ts`, env `GALLERY_DB`,
`AUDIT_LOG_FILE`, `PORT`, `HOST`, plus `/etc/lanbilder-admin.env` with `CF_ACCESS_TEAM_DOMAIN`,
`CF_ACCESS_AUD` (and optionally `SESSION_SECRET`). Without the two `CF_ACCESS_*` values the
authenticated routes answer 503 and the start logs a warning. First admin: insert the row by hand
once, `sqlite3 gallery.sqlite "INSERT INTO users (email, role) VALUES ('you@example.com', 'admin')"`.

Locally, without Cloudflare in front:

```
cd backend
GALLERY_DB=/tmp/dev.sqlite DEV_FAKE_ACCESS_EMAIL=you@example.com node --no-warnings=ExperimentalWarning server.ts
sqlite3 /tmp/dev.sqlite "INSERT INTO users (email, role) VALUES ('you@example.com', 'admin')"
curl -i -X POST -H 'cf-access-jwt-assertion: x' http://127.0.0.1:3100/api/auth/totp/setup   # note the Set-Cookie
```

`DEV_FAKE_ACCESS_EMAIL` treats every request as that e-mail (the assertion header must still be
present but is not verified); it is refused unless `HOST` is loopback and it logs a warning on
start. Browsers accept the `Secure` cookie on `http://localhost` / `127.0.0.1`.

Tests: `cd backend && npm test` (all `*.test.ts`, plain `assert`; `npm test -- auth` for a subset),
`npm run typecheck`. Relevant files: `server`, `view`, `regenQueue`, `access` (RSA key pair signs
tokens, JWKS injected), `totp` (RFC 6238/4226 vectors), `session`, `auth` (whole login flow against
a listening server), `users`, `admin`, `audit`.

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

## P2 — Correctness and cost

## P3 — Quality, hygiene and latent bugs

## Added 2026-10-25: second pass of the review, verified at `c750fbf`

These come from the full review (`code-review-rc1.md`, items B1–B16 and C), which was written
against the older `9790743`. Each one was re-checked against `c750fbf`; only items that are still
open are listed here. The items already fixed are at the end of "Not reproduced / no action".

### P1 additions

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
- **Per-album themes for paths with é/æ/ø** (was "not re-verified"): checked 2026-10-25 (Sprint 11 T-02): all 1,389 `pathIndex` keys are ASCII (titles are transliterated), so a percent-encoded `location.pathname` (BrowserRouter) cannot miss a key.

## BEFORE GO-LIVE (operator 2026-10-26: "lift FUT tasks to before go-alive so we are ready to add new albums")

Operator, 2026-10-25, lifted 2026-10-26: **all five rows ship before lanbilder.se switches** to the new
site (interview 2026-10-26, decision 1: "All five rows"). The notes under each row are first answers
to the questions asked; the **Decisions** blocks are the operator's rulings from the interview.

### FUT-02: admin can add albums and delegate them; delegated users add subalbums and images

**Done so far (Sprint 16, merged 2026-10-26):** the `lanbilder-admin` service (`backend/server.ts`, installed on lanbilder2), Cloudflare Access JWT verification (`backend/auth/access.ts`), TOTP + sessions (`auth/totp.ts`, `auth/session.ts`), invite-only users with roles and delegation (`auth/users.ts`, migration 002, `canWrite`), the admin routes (`docs/architecture/admin-service.md`). **Open:** album create/edit/hide/soft-delete routes, uploads (pipeline, HEIC, GPS strip), sub-albums, highlights, the admin UI, wiring `RegenQueue` to `generate.ts --changed`; the operator's Cloudflare Access application on the admin hostname.

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

**Decisions (interview 2026-10-26):**
- Admin hostname: a random label under **phetast.nu** (proposed `82j17zj.phetast.nu`; own nginx vhost
  on lanbilder2, same tunnel, Cloudflare Access in front).
- Login providers in Access: **GitHub and Google** (Microsoft and Facebook not now; Facebook needs
  Meta business verification).
- Second factor: **our own TOTP step** (authenticator app) in the admin backend after the Access
  login, required every session; the admin can reset a user's secret.
- Accounts: **invite-only by email** — the admin adds the email first (admin UI + the Access policy);
  unknown identities are refused at both walls. Users are keyed by email.
- Delegate rights: **everything inside the delegated subtree** — edit the delegated album's own text
  and date, add/edit/soft-delete any sub-album or image below it, choose highlights. Only the admin
  creates, delegates and un-delegates top-level albums, and only the admin restores or purges
  soft-deleted items (no-delete policy: soft delete = hidden + file moved to a trash area).
- Publishing: **immediate, debounced regeneration** (one run a few seconds after the last change);
  **new albums start hidden** until their creator unticks "hidden"; no publish button.
- Uploads: JPEG/PNG/GIF/WebP kept byte for byte (orientation applied), **GPS tags stripped**, other
  EXIF kept; **HEIC converted to JPEG** (quality 92); 50 MB per file, 500 MB per batch.

### FUT-03: user profiles

**Done so far (Sprint 16):** `users` carries `nickname` (unique, may not equal a Gallery 2 owner name: trigger), `full_name`, `show_full_name`. **Open:** profile routes (edit nickname/full name, picture stored by us), copying name/picture at first login, the owner link from `items` to admin users.

Each user has a profile with a nickname and a profile picture. The federated providers usually
supply a display name and a picture (Google: `name`, `picture`; GitHub: `login`, `name`,
`avatar_url`; Facebook: name and picture): check what reaches us through Cloudflare Access (the
JWT, `/cdn-cgi/access/get-identity`) and copy it at first login, editable afterwards. Also worth
having: a stable internal user id (not the email), the linked provider identities, role (admin /
user), the delegated albums, created/last-login timestamps, and an "enabled" flag to lock a user
out without deleting them. Pictures should be stored by us (not hot-linked from the provider).

**Decisions (interview 2026-10-26):**
- Public site shows the **nickname only** as "Owner:"; a user may opt in to showing their full name
  instead. Pictures appear only in the admin UI (stored by us, copied at first login).
- Nicknames are unique and may not collide with the historical Gallery 2 owner names.

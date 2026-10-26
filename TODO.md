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

### ~~FUT-01: SQLite as the master of the data; regenerate only changed branches~~

**CLOSED, verified 2026-10-26 (Sprint 15 T-07):** `/mnt/storage/lanbilder-app/db/gallery.sqlite` on lanbilder2 (58,648 items, 145 owners, 1,353 highlights, 57,149 media rows) imported from Gallery 2 by `backend/importG2.ts`; `backend/generate.ts --all` regenerated the 1,389 album files, `index.json`, `legacy.json` and the search index (1,388 entries) — the semantic diff against the extractor's output (`/root/datadiff.py` on lanbilder2) shows 0 differences except 42 photo titles that were NUL bytes and are now null; `--changed` after a re-import rewrote only the dirty branches in 57 s; the test site serves the generated files; first backup `/mnt/storage/backup/gallery-20261026-0941.sqlite`. The service (`server.ts`, RegenQueue, view counter endpoint) landed on branch `s16-auth` (Sprint 16, merged); the frontend beacon and the nightly fold are Sprint 15 T-09. Original row kept for the record:

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

**Decisions (interview 2026-10-26):**
- Runs on lanbilder2 itself: a Node service on 127.0.0.1 holding the SQLite file, writing the static
  files in place into the directory nginx serves; the operator raises the VM's RAM 3.9 → 8 GB when
  convenient (reboot + manual unlock of the encrypted disk).
- View counters keep counting: a small endpoint on lanbilder2 records page views; the regeneration
  folds the counts into the JSON daily. Old Gallery 2 comments are **not** imported (they stay in the
  Gallery 2 backup only).
- Settled without asking: the originals keep the Gallery 2 directory layout (`g2data/albums/<album
  path>/<file>`; uploads get sanitised file names); an album's URL segment is derived from its title
  and locked once the album has been public; the event date is editable; the highlight defaults to
  the first image and can be chosen.

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

### FUT-04: audit logging

Every user action, login and other event is logged, successful or not: logins and denials (ours
and Cloudflare Access's audit log), album/image create/edit/delete/upload, delegation changes,
profile changes, admin actions, failed authorisation checks. Append-only (writes only, no
updates/deletes from the application), with timestamp, user id, source IP (`CF-Connecting-IP`),
action, target, result. Decide retention and who can read it.

**Decisions (interview 2026-10-26):**
- **Kept forever, full entries** (source address included); **read by the admin only** (admin-UI page
  with export). Settled without asking: an append-only SQLite table (triggers forbid update/delete)
  mirrored to a JSONL file; a daily copy to the operator share is optional, say if wanted.

### FUT-05: privacy-friendly statistics (European)

Visitor statistics similar to Google Analytics, preferably a European service with a healthier
privacy policy. Candidates to compare: Matomo (France; can be self-hosted), Plausible (EU, Estonia;
has a self-hostable Community Edition), Simple Analytics (Netherlands), Pirsch (Germany). Prefer
cookieless operation (no consent banner) and a self-hosted or EU-hosted instance. Any of them adds a
script/endpoint origin to the CSP (`script-src`, `connect-src`). Cloudflare Web Analytics exists but
is not European.

**Decisions (interview 2026-10-26):**
- **Plausible Community Edition, self-hosted on lanbilder2** (Docker: ClickHouse + PostgreSQL),
  cookieless; needs the RAM raise to 8 GB; one script origin added to the CSP.

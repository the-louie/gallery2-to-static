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

## Added 2026-10-26: operator QA round after Sprint 12 (test site, phone + desktop)

Operator list, 2026-10-26 morning ("0. do the housekeeping and clean up … 10. banners ok"). Each row
verified against the code at `b79dc10` before planning (Sprint 13).

- ~~**QA-00: housekeeping and clean-up**~~ — **CLOSED, done 2026-10-26 (before Sprint 13):** on
  lanbilder2 all but the newest of `data.prev-*` (8 of 9), `frontend/dist.prev-*` (29 of 30) and
  `g2data/published.prev-*` (3 of 4) removed, `/mnt/storage` 65 → 64 GB used; on the build machine
  the 89 Chrome temp directories in `/tmp` owned by this user (634 MB) removed, `/tmp` 1.7 → 1.1 GB.
  Original row kept for the record: "0. do the housekeeping and clean up".
- **QA-01: all thumbnails square** — "when clicking around i saw some rectangle, like
  003_skateramp.jpg in https://lanbilder-new.phetast.nu/dreamhack/dreamhack_summer_02/ahnberg/".
  Classic: `MatrixAlbum.css:113` forces 150×150 `object-fit: cover` on `.giThumbnail`, so the
  rectangle must come from another path (the modern grid, a missing-thumbnail fallback, or the
  thumbnail file itself). Find it with the album page in both themes; all thumbnails square in all
  themes.
- **QA-02: modern themes: the album's head image on the root page is a link to the album** — like
  the "...and more!" link. `RootAlbumListBlock.tsx:95` renders the highlight as a
  `role="presentation"` background div outside the block link.
- ~~**QA-03: modern themes: more vertical margin above "...and more!"**~~ — **CLOSED, verified 2026-10-26 (Sprint 13 T-03):** `frontend/src/styles/modern.css` `.root-album-list-block-subalbums-more` gets `margin-top: 0.85rem` (the chip rows have a 0.4rem gap); screenshot with T-04's deploy.
  Original row kept for the record: "when there are many sub-albums the '...and more' button is too close to the sub-album buttons". `RootAlbumListBlock.css:269` has `margin-top: auto` and no gap from the list.
- ~~**QA-04: modern themes: the header description is cut off**~~ — **CLOSED, verified 2026-10-26 (Sprint 13 T-02):** `frontend/src/styles/modern.css` `.layout-header-description` has no line clamp any more (wraps, max 72ch) and is shown on phones at 0.74rem; screenshot with T-04's deploy.
  Original row kept for the record: "lanbilder.se är världens största samling lanparty-bilder. Om du vill visa..." `modern.css:333` clamps `.layout-header-description` to one line (`-webkit-line-clamp: 1`).
- ~~**QA-05: classic theme: "Theme: modern" goes to the dark variant**~~ — **CLOSED, verified 2026-10-26 (Sprint 13 T-01):** `frontend/src/components/MatrixSidebar/MatrixSidebar.tsx:133` calls `setTheme('dark')`; test `MatrixSidebar.test.tsx` asserts it.
  Original row kept for the record: `MatrixSidebar.tsx:133` calls `setTheme('light')`.
- **QA-06: classic theme on phones: thumbnails flow two per row without gaps** — Pixel 9
  screenshot `inspo/qa/Skärmbild 2026-10-26 074305.png`: every table row of three becomes 2 + 1,
  the third cell alone on its own line. `MatrixAlbum.css:131` makes each `tr` its own flex row with
  50% cells. Fix: let the cells flow as one wrapping row (`tr { display: contents }`), 2 per row at
  phone widths; root album, sub-album lists and photo lists alike.
- **QA-08: search failure: "Try again" does nothing** — "when a search fails (network restarting in
  this case) the 'try again' button doesn't work". `SearchResultsPage.tsx:95` shows only "Go to
  Home" on an error, so the button is the ErrorBoundary's "Try Again" (`ErrorFallback.tsx:82`,
  `resetError`) or the browser's; reproduce with the search index request failing, then make retry
  re-run the search (and reload the index if its load failed; `searchIndex.ts:121` caches the
  load).
- **QA-09: alternative classic theme with the 2013 list view on the root album** — "make an
  alternative classic theme with a list view (all albums, no pagination) for the root album. use
  the gallery2 code to figure out how it worked. for a visual example see
  https://web.archive.org/web/20130410092639/http://www.lanbilder.se/main.php … we switched to this
  list view sometime between 2007-2012 i believe due to the number of albums in the root becoming
  large and it being hostile-ux to page on the front-page. (keep the three buttons at the bottom
  from the current implementation (xhtml1.0, gallery 2, unpossible), love them)". The 2013 page is
  Gallery 2's **Classic** theme (`themes/classic/templates/album.tpl`, extracted to
  `inspo/gallery2-source/gallery2/themes/classic/`): one table row per album — `giAlbumCell`
  thumbnail, a cell with "Album: title", description, Date/Size/Views, and a `td.tree` with
  "Subalbums:" and the sub-album list — with `columns = 1` and all 45 albums on one page
  ("Page: 1"). New theme `classic-list`: root album in that layout, other pages as `classic`;
  reachable from the sidebar theme block and the modern theme dropdown; footer badges kept.
- **QA-10: banner in the page, size by window width** — "banners ok, include them in the page, use
  windows size to select a approriate sized banner". The classic frame already has the
  `<picture>` (468 below 760px, 728, 970 from 1024px; `MatrixFrame.tsx:73`); the modern themes have
  no banner slot. Show it in every theme and check the chosen file at 390, 800, 1280 and 1920px.

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

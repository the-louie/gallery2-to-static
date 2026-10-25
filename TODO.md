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

### PRIO-THEME-01: "Owner: Unknown" where Gallery 2 showed "Gallery Administrator" (Sprint 11 T-13, 2026-10-25)

`backend/ownerDisplayName.ts` `normalizeOwnerDisplayName` maps "Gallery Administrator" to "Unknown"; the 2006 root page showed "Owner: Gallery Administrator". Decide: show the Gallery 2 name (1:1) or keep "Unknown". Seen on the root album header and on every album the admin owned.

### ~~PRIO-THEME-02: album highlight = Gallery 2's chosen highlight, not the first photo (Sprint 11 T-13)~~ — **CLOSED, verified 2026-10-25 (Sprint 12 T-01):** `backend/sqlUtils.ts` `getAlbumHighlight` (recursive CTE over `g2_Derivative`), `backend/extract.ts` `findChosenHighlight` used for `highlightImageUrl` and the cell `thumbnailUrlPath`, first-photo fallback kept for hidden/missing; tests `sqlUtils.test.ts`, `extract.test.ts`. Original row kept for the record:

The export takes the first photo of the subtree as an album's thumbnail (`findFirstPhotoRecursive`, `backend/extract.ts`); Gallery 2 used the highlight the owner picked. The pick is in the database: the album item's thumbnail derivative (`g2_Derivative` row whose `g_id` = the album's `g2_DerivativeImage` id, `g_derivativeSourceId` → the source photo). Join it in `sqlUtils.ts` and prefer it; fall back to the first photo. Root page in 2006 vs now: 9 of 12 cells show a different image.

### PRIO-THEME-03: thumbnails with Gallery 2's crop (Sprint 11 T-13)

The 2006 thumbnails were 150×150 crops made by Gallery 2 (`g2_Derivative.g_derivativeOperations`, e.g. `crop|x,y,w,h;thumbnail|150`, percentages, sometimes chosen by hand). We generate 300px thumbnails of the whole photo and crop them to a square with `object-fit: cover` (centre), so most cells show a slightly different cut. Export the crop operation per photo and apply it in `generateThumbnail.ts` (sharp `extract`), keeping the 2× size.

### PRIO-THEME-04: "(N items total)" should count sub-albums too (Sprint 11 T-13)

Gallery 2's `descendentCount` counted every item below an album; `totalDescendantImageCount` counts photos. 2006: "Size: 9 items (878 items total)"; now "(864 items total)" for DH-Photo (14 sub-albums not counted). Export a `totalDescendantCount` (photos + albums) next to it and show that.

### PRIO-THEME-05: serve a 1024px resize on photo pages, as Gallery 2 did (Sprint 11 T-13)

The 2006 photo page served a 768×1024 resized JPEG (`g2_imageViewsIndex=0`, about 100 KB) and linked the original as "Full size". `MatrixPhoto` shows the original scaled to 1024px with CSS (1–2 MB per photo), so the page is slower than the old one on the same photo. Generate the resize in the export (`sharp`, longest side 1024, next to the thumbnail) and use it as the default view; `?size=full` keeps the original.

## P3 — Quality, hygiene and latent bugs

### SEARCH-01: search results show raw BBCode in descriptions (found 2026-10-25, Sprint 11 T-11)

`frontend/src/pages/SearchResultsPage.tsx:171-176` renders `album.description` through `SearchHighlight` as plain text, so `[url=http://…]here[/url]` and `[b]` show as typed (e.g. album 23281 "DH-Photo"). The album page parses it (`parseBBCodeDecoded`). Fix: strip or parse BBCode for the result text (the search index already carries it stripped for matching?: check `backend/extract.ts` searchItem) and keep highlighting on the stripped text.

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

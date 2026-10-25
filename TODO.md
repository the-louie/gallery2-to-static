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

### THEME-01: the default ("classic") theme becomes a 1:1 copy of Gallery 2's Matrix theme as lanbilder.se ran it (operator, 2026-10-25)

Operator, verbatim: "it is intended to be a 1:1 mimic (with some removed elements in the left sidebar) of the default theme of Menalto Gallery 2 with adaptations for the original lanbilder.se site." Template for **every** album page, the root included: https://web.archive.org/web/20060208090028/http://www.lanbilder.se/v/dreamhack/dhw05/dhphotos/ ("extra good specimen"). The 2006 root (main.php) used the Classic theme's list layout; the operator wants the Matrix layout there too. Known template bug not to copy: the sidebar peer list on `/v/dreamhack/dhw05/` has no line breaks and overflows.
Reference material (`/srv/share/lanbilder2/inspo/`): `wayback-2006/` (raw HTML of main.php, dhw05, dhphotos, a photo page; 2006 `themes/matrix/theme.css`, `classic/theme.css`, `icons.css`, `gallery.gif`), `gallery2-source/` (Gallery 2.3.2 full tarball + sha256 and extracted `themes/matrix`, icon pack, core block templates; 2.0 is no longer on SourceForge, the 2006 CSS differs from 2.3.2 by 139 diff lines), `screens/` (1280px screenshots: `wb-dhphotos.png`, `wb-main.png`, `wb-photo.png`, today's `new-battlefrag.png`).
Measured gap (screenshots, 2026-10-25): today's page has a 70px site title + description header, a theme dropdown, an "Up" button, "/"-separated breadcrumbs in the content area, a sort dropdown, a 4-column justified grid of 234px thumbnails with no captions, every photo of the album on one page (287), no Date/Views per item, no peer list, no pager; the photo opens a lightbox, Gallery 2 opened a photo page.
Template elements: nav bar (breadcrumb "lanbilder.se » DreamHack » … » current", `gcBorder1`); sidebar column (search box "Search the Gallery" + "Advanced Search"; item links "View Slideshow", "View Slideshow (Fullscreen)" with icons; peer list "1. DH-Photo … 6. G3 … 18. mave" with the current album bold and a "..." neck); content: header block (h2 title, description, right 30% "Date: 11/26/2005 / Owner / Size: 287 items"), navigator bar (first/previous, next/last with arrow icons), `gsThumbMatrix` 3 columns × 4 rows, 150px thumbnails, bold title, "Date:" and "Views:" lines, navigator again, pager "Page: 1 2 3 4 5 6 ... 24"; footer badges (XHTML 1.0, Gallery 2, Unpossible). Photo page: same frame, header block with Date/Owner/Size select/"Full size: 1200x1600" link, navigator, the image (768px view), navigator; sidebar peer list of the album's photos.
**Leave out (operator):** Login / Register links, "Add Comment", the ad banner text and AdSense, the "About us" block under the footer.
**Login / Register, for the future (operator: "create detailed notes, we will need it"):** in the nav bar, right-aligned (`gbSystemLinks`, `block-core-SystemLink`), two text links in the link colour, "Login" then "Register", 11px bold like the breadcrumb. Gallery 2.0 targets: `main.php?g2_view=core.UserAdmin&g2_subView=core.UserLogin&g2_return=<current URL>&g2_returnName=album` and `…&g2_subView=register.UserSelfRegistration&…`; after login Gallery 2 returned to `g2_return`. When logged in Gallery 2 showed "Your account" (`core.UserAdmin` / `core.UserPreferences`) and "Logout" (`core.Logout`) in the same place, and the sidebar item links grew the admin entries visible in `inspo/gallery2_theme/107388-81263-i_rc.jpg` (Album bearbeiten, Album hinzufügen, … RSS-Feeds). For FUT-02: keep the two links in the public theme hidden, show them only on the admin hostname, point them at the Cloudflare Access login, return to the page they came from.

### URL-01: clean URLs instead of hash URLs; no PHP-style URLs (operator, 2026-10-25)

Operator: "one important modernization is the urls, they should not mimic the old php site". Chosen form: `/` root, `/dreamhack/dhw05/dhphotos/` album (today's title-slug paths, trailing slash), `?page=2` page, `/dreamhack/dhw05/dhphotos/<photo slug>` photo, `/search?q=…`. No `#`, no `/v/`, no `main.php`, no session ids. Today: `HashRouter` (`App.tsx`), nginx serves `index.html` for unknown paths already.

_Progress 2026-10-25 (Sprint 11 T-02): **done except `?page=N`**, which arrives with the pager (T-06). `BrowserRouter` (`frontend/src/main.tsx`); album links end with `/` (`withTrailingSlash`, `utils/albumPath.ts`); photos `/<album path>/<slug>` (`getPhotoSlug`: file name without extension, dots → `_`; 0 collisions among 57,149 photos), resolved in `PathResolverPage` (`findPhotoBySlug`); hash URLs and `index.html` rewritten before the router (`utils/legacyPathRedirect.ts`). Checked on lanbilder-new in Chrome: album, photo slug, `/#/…`, `/dreamhack/index.html`, unknown slug → 404 page, search links._

### URL-02: old Gallery 2 URLs redirect to the new ones (operator, 2026-10-25)

301 for `/v/<G2 path>/` (album), `/v/<G2 path>/<file>.html` (photo), `main.php?g2_itemId=N` and `main.php?g2_view=core.ShowItem&g2_itemId=N`; Gallery 2 path components differ from the new title slugs (`dhw05/dhphotos` vs `dreamhack_winter_05/battlefrag.com`), the export already carries `pathComponent` per item. `/d/<id>-<n>/<file>` image files return 402 like the other old image links. Query noise (`g2_GALLERYSID`, `g2_highlightId`, `g2_page` → `page`) handled.

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

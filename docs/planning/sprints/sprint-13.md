# Sprint 13: operator QA round (QA-01..QA-10)

**Status:** in progress (opened 2026-10-26)
**Current ticket:** T-08 (`todo` — Banner in every theme, chosen by window width)
**Last completed:** T-07 (`done` — commit `a9a3975`)

**Goal:** every item on the operator's morning list fixed on the test site: square thumbnails everywhere, the modern root page's card image and "...and more!" fixed, the header text readable, the classic theme's phone layout flowing, search retry working, the banner in every theme, and a new `classic-list` theme with the 2013 root-album list.

**Demo:** https://lanbilder-new.phetast.nu/ on a Pixel 9 and a desktop: the root album in classic shows 2 thumbnails per row with no orphan cells; `classic-list` shows all root albums as the 2013 list (thumbnail | title, description, Date/Size/Views | Subalbums) with no pager and the three footer badges; the modern themes show the banner and the full header sentence; a failed search recovers with "Try again".

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | "Theme: modern" goes to the dark variant | QA-05 | 0.5h | – | done | `MatrixSidebar.tsx`: `setTheme('dark')`; test updated; sprint-12 note in `theme-matrix.md` corrected. Landed in `b14b800` |
| T-02 | Header description not cut off (modern) | QA-04 | 0.5h | – | done | `modern.css`: no line clamp on `.layout-header-description`; wraps to 2–3 lines at 1280px, hidden or full on phones (check 390px); screenshot. Landed in `4ffca9f` |
| T-03 | More space above "...and more!" (modern) | QA-03 | 0.5h | – | done | `RootAlbumListBlock.css`/`modern.css`: margin-top ≥ 0.75rem between the chip list and the link; screenshot of a card with > 10 sub-albums. Landed in `18f30d1` |
| T-04 | Root card head image links to the album (modern) | QA-02 | 1h | – | done | the highlight band becomes (or sits inside) a `Link` to the album; keyboard focusable once (no duplicate tab stop: `aria-hidden`/`tabIndex={-1}` on the image link, or make the whole band part of the existing block link); test: clicking the image navigates. Landed in `7044f2c` |
| T-05 | Phone thumbnails flow two per row (classic) | QA-06 | 1h | – | done | `MatrixAlbum.css` phone block: `tbody` flex-wrap, `tr { display: contents }`, cells 50%; flush cells hidden; `mobilecheck.cjs` 66/66; screenshot at 412×915 of root, sub-album list and a photo list. Landed in `57f7dfc` |
| T-06 | All thumbnails square | QA-01 | 2h | – | done | find the rectangle on `/dreamhack/dreamhack_summer_02/ahnberg/` (classic and modern); fix at the source (CSS in the modern grid/`ImageThumbnail`, the fallback path, or the exported thumbnail); every thumbnail element 1:1 in all themes; test. Landed in `9b0708b` |
| T-07 | Search failure recovers with "Try again" | QA-08 | 2h | – | done | reproduce with the index request failing (Chrome request interception); the search page gets its own "Try again" that re-runs the search and re-loads the index when its load failed; the ErrorBoundary's "Try Again" also works for errors thrown from the page; tests. Landed in `a9a3975` |
| T-08 | Banner in every theme, chosen by window width | QA-10 | 1.5h | – | todo | the modern `Layout` shows the same `<picture>` banner (468 < 760px, 728, 970 ≥ 1024px) above or below the header; check with Chrome at 390, 800, 1280, 1920 which file is requested; `docs/user-guides` updated |
| T-09 | `classic-list`: the 2013 root-album list | QA-09 | 4h | – | todo | new theme `classic-list` in `config/themes.ts` (+ `themes.css` vars same as classic); root album renders `MatrixAlbumList` from the Classic `album.tpl` structure: header block as today, then `gsThumbMatrix` with one row per album (`giAlbumCell` thumbnail 150×150 \| "Album: title" + description + Date/Size/Views \| `td.tree` "Subalbums:" list), all albums, no navigator/pager; CSS values from `themes/classic/theme.css`; other pages unchanged (same frame, sidebar, footer badges); tests |
| T-10 | Theme switching for `classic-list` + comparison | QA-09 | 2h | T-09 | todo | sidebar bottom block: "Theme: classic list" / "Theme: classic" toggle next to "Theme: modern"; modern dropdown lists it; `compare.cjs` of the 2013 root page vs ours at 1280px (block geometry), result into `theme-matrix.md`; docs (`themes.md`, user guide) |
| T-11 | Deploy, phone + desktop QA, docs | – | 1h | T-01..T-10 | todo | `deploy-dist.sh`; Chrome screenshots of the demo list at 412×915 and 1280 into `inspo/screens/qa-s13/`; `esxi-todo.md` note; retro |

Total ≈ 16h.

## Open points
- QA-00 (housekeeping) was done before the sprint opened: see the struck row in `TODO.md`.
- QA-09: the 2013 page also had "RSS Feed for this Album" in the sidebar and Login/Register links; both stay left out (THEME-01 decision), noted for FUT-02.

## Retro
(filled at sprint end)

## Demo notes
(filled at sprint end)

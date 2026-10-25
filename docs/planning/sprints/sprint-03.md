# Sprint 03: browsing that behaves

**Status:** done (opened and closed 2026-10-25)
**Current ticket:** —
**Last completed:** T-10 (`done` — commit `ec7b49c`)

**Goal:** browsing the gallery fetches only what is shown, the lightbox follows the grid and
returns you where you were, and filters, sort and zoom do what they say.

**Demo:** opening an album fetches only thumbnails (full images only in the lightbox); stepping
through the lightbox makes no `index.json` request and keeps the neighbour preloads; the lightbox
follows the grid's sort/filter and Back/close return to the same scroll position; a date range
filters correctly; zoom stops at 400%; a broken stored sort value falls back to the default.

**Constraints:** vitest with 2 forks; no Chrome/size-limit; commit locally to `master`.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Grid cells fetch only the thumbnail; full image only for lightbox/detail; honour `useThumbnail`/`shouldLoad` | PERF-01 | 3h | – | done | test: grid mount → no full-size fetch. Landed in `fe49444` |
| T-02 | Cache the `loadIndex` promise (reset on failure); keep previous `resolved` while re-resolving | PERF-02 | 2h | – | done | test: 3 navigations → 1 fetch; no spinner flash. Landed in `3d19978` |
| T-03 | Don't clear image cache / abort when only the image id changes in the same album | PERF-03 | 2h | T-02 | done | test: next/prev keeps preloaded neighbour. Landed in `08c3f79` |
| T-04 | Lightbox list uses the grid's sort + filters | LOGIC-16 | 2h | – | done | test: date-desc sort → → gives grid's next. Landed in `3857e19` |
| T-05 | Close via `navigate(-1)` when opened from the album; restore album scroll position | LOGIC-17 | 3h | T-04 | done | test: open/close → history length same, scroll restored. Landed in `c215da5` |
| T-06 | Date filter: local input state, seconds, inclusive end | LOGIC-18 | 2h | – | done | test: start only, end only, both; last day included. Landed in `e6c636f` |
| T-07 | Zoom max = 400% | LOGIC-19 | 1h | – | done | existing "respects max zoom limit" test meaningful. Landed in `9f22000` |
| T-08 | Validate stored sort option; Swedish collation for name sort | LOGIC-25, LOGIC-29 | 2h | – | done | `5`/`{}`/unknown → default; å < ä < ö. Landed in `496f991` |
| T-09 | Image search results link to `/album/:parentId/image/:id` | LOGIC-14 | 1h | – | done | test with a photo index item. Landed in `d0764ee` |
| T-10 | Thumbnail object URL revoked only on image change/unmount | LOGIC-26 | 2h | T-01 | done | test: state change keeps URL valid. Landed in `ec7b49c` |

Total ≈ 20h.

## Retro
**Worked:** checking each new regression test against the old code (zoom, object URL) proved the tests catch the bug. Small shared helpers (`getVisibleImages`, `getViewKey`, `albumScroll`) kept the fixes testable without touching the big components much.
**Didn't:** several existing tests encoded the bugs themselves (grid test expected the full-size URL; date-filter tests expected no range with one date; five fixture files used millisecond item timestamps) and had to be rewritten, not just kept green. The prune ran mid-sprint once (operator asked for the FUTURE rows and the prune rule at the same time).
**Backlog grooming:** closed PERF-01, PERF-02, PERF-03, LOGIC-16, LOGIC-17, LOGIC-18, LOGIC-19, LOGIC-25, LOGIC-29, LOGIC-14, LOGIC-26 (11). New: DOCS-01 (operator), FUT-01..05 (operator, after deploy). Pruned to `docs/planning/done.md`.

## Demo notes
Grid: only `t__` thumbnails fetched, only when a cell is near the viewport (hook fetch-count tests). Lightbox steps: one `index.json` fetch per page load, no remount, cache and preloads kept; order and "N of M" follow the grid's sort/filter; close goes Back and the album returns to its scroll position. Date filter: one or two dates, end day inclusive, seconds vs ms fixed. Zoom stops at 400%. Stored sort `5`/`{}` → default; Swedish order å < ä < ö. Image search results open in their album. Full vitest 1468/1468 (85 files), build + `check:dist` OK (488 KB), backend 13/13.

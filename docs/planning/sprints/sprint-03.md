# Sprint 03: browsing that behaves

**Status:** in progress (opened 2026-10-25)
**Current ticket:** T-07 (`todo` — Zoom max = 400%)
**Last completed:** T-06 (`done` — commit `e6c636f`)

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
| T-07 | Zoom max = 400% | LOGIC-19 | 1h | – | todo | existing "respects max zoom limit" test meaningful |
| T-08 | Validate stored sort option; Swedish collation for name sort | LOGIC-25, LOGIC-29 | 2h | – | todo | `5`/`{}`/unknown → default; å < ä < ö |
| T-09 | Image search results link to `/album/:parentId/image/:id` | LOGIC-14 | 1h | – | todo | test with a photo index item |
| T-10 | Thumbnail object URL revoked only on image change/unmount | LOGIC-26 | 2h | T-01 | todo | test: state change keeps URL valid |

Total ≈ 20h.

## Retro
(filled at end of sprint)

## Demo notes
(filled at end of sprint)

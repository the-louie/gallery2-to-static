# Sprint 10: state effects → derived or initial state (REFAC-01)

**Status:** in progress (opened 2026-10-25)
**Current ticket:** T-04 (`in-progress` — ImageThumbnail, Lightbox, SearchBar)
**Last completed:** T-03 (`done` — commit `953fe98`)

**Goal:** no effect sets state only to reset or mirror an input; `@eslint-react/set-state-in-effect` on.

**Demo:** lint 0/0 with the rule on; vitest green; behaviour unchanged (existing tests untouched except where they assert an extra render).

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | useSiteMetadata: initial state from the cache | REFAC-01 | 0.5h | – | done | 6 hits gone. Landed in `a6198aa` |
| T-02 | useAlbumMetadata, useAlbumData | REFAC-01 | 1.5h | – | done | 6 hits. Landed in `e265a5c` |
| T-03 | useImageZoom, DateRangeFilter, AlbumCard, PathResolverPage | REFAC-01 | 1.5h | – | done | 6 hits. Landed in `953fe98` |
| T-04 | ImageThumbnail, Lightbox, SearchBar | REFAC-01 | 2h | – | in-progress | 7 hits |
| T-05 | ThemeContext, ViewAbortContext | REFAC-01 | 1h | – | todo | 2 hits |
| T-06 | useLightbox | REFAC-01 | 2h | – | todo | 8 hits |
| T-07 | useProgressiveImage | REFAC-01 | 3h | – | todo | 14 hits |
| T-08 | Rule on; REFAC-01 struck | REFAC-01 | 0.5h | T-01..T-07 | todo | lint 0/0 |

Total ≈ 12h.

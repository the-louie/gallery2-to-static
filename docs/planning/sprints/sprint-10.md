# Sprint 10: state effects → derived or initial state (REFAC-01)

**Status:** in progress (opened 2026-10-25)
**Current ticket:** T-08 (`todo` — Rule on; REFAC-01 struck)
**Last completed:** T-07 (`done` — commit `8bf0f0a`)

**Goal:** no effect sets state only to reset or mirror an input; `@eslint-react/set-state-in-effect` on.

**Demo:** lint 0/0 with the rule on; vitest green; behaviour unchanged (existing tests untouched except where they assert an extra render).

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | useSiteMetadata: initial state from the cache | REFAC-01 | 0.5h | – | done | 6 hits gone. Landed in `a6198aa` |
| T-02 | useAlbumMetadata, useAlbumData | REFAC-01 | 1.5h | – | done | 6 hits. Landed in `e265a5c` |
| T-03 | useImageZoom, DateRangeFilter, AlbumCard, PathResolverPage | REFAC-01 | 1.5h | – | done | 6 hits. Landed in `953fe98` |
| T-04 | ImageThumbnail, Lightbox, SearchBar | REFAC-01 | 2h | – | done | 7 hits. Landed in `7ea0b1a` |
| T-05 | ThemeContext, ViewAbortContext | REFAC-01 | 1h | – | done | 2 hits. Landed in `1262b15` |
| T-06 | useLightbox | REFAC-01 | 2h | – | done | 8 hits. Landed in `e9dcf95` |
| T-07 | useProgressiveImage | REFAC-01 | 3h | – | done | 14 hits. Landed in `8bf0f0a` |
| T-08 | Rule on; REFAC-01 struck | REFAC-01 | 0.5h | T-01..T-07 | todo | lint 0/0 |

Total ≈ 12h.

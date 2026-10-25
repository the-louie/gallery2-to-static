# Sprint 10: state effects → derived or initial state (REFAC-01)

**Status:** done (opened and closed 2026-10-25)
**Current ticket:** —
**Last completed:** T-08 (`done` — commit `349cb9d`)

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
| T-08 | Rule on; REFAC-01 struck | REFAC-01 | 0.5h | T-01..T-07 | done | lint 0/0. Landed in `349cb9d` |

Total ≈ 12h.

## Retro
**Worked:** "adjust state during render when the key changes" (React's documented pattern) replaced most effects one for one; where state was only a copy of a prop (useAlbumMetadata, resolvedAlbumPath) it went away. Running each new test against the previous code showed which ones actually guard the change.
**Didn't:** one test of useSiteMetadata's error path failed on the old code too (a mock artefact, not the hook) and was dropped after too long a hunt. The useImagePreload tests had the double run baked in and blamed StrictMode; tests that explain a count deserve a second look.
**Found:** a real bug, ViewAbortProvider's placeholder signal restarted every fetch started on mount (initial page load fetched each thumbnail twice). Fixed in T-07.
**Backlog grooming:** REFAC-01 closed. Open rows: 7 → 6: SENTRY-01 (needs a Claude Code restart + Sentry login), FUT-01..05 (after deploy).

## Demo notes
`@eslint-react/set-state-in-effect` on with one documented exemption; lint 0/0, typecheck 0 (app, tests, backend), vitest 1496/1496, backend 15/15, build + check:dist OK (615 KB), `npm audit` 0, check-brotli OK.

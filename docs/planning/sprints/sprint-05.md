# Sprint 05: the remaining correctness and hygiene rows

**Status:** in progress (opened 2026-10-25)
**Current ticket:** T-02 (`todo` — BBCode: input length and nesting caps, plain-text fallback)
**Last completed:** T-01 (`done` — commit `eb4f756`)

**Goal:** close the remaining P3 correctness rows (URLs, BBCode, links, routing, thumbnails) and the
repo tidy-up, so only test/lint debt, operator decisions and blocked upgrades remain.

**Demo:** a filename with `#`, `?`, `%`, space or å loads; `[b]`×16000 renders in under a second;
no `<a>` inside `<a>` in the root list; an album named "image" with a numeric child resolves; PNG/GIF
sources get `.jpg` thumbnails that load; a photo without thumbnail shows a placeholder, not an error;
the stray files are gone from the repo and from `dist/`.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Encode each path segment in image/thumbnail URLs (frontend), and in backend URL building where used for HTTP | LOGIC-24 | 2h | – | done | tests with `#`, `?`, `%`, space, å. Landed in `eb4f756` |
| T-02 | BBCode: input length and nesting caps, plain-text fallback | SEC-15 | 2h | – | todo | `[b]`×16000 < 1 s; normal BBCode unchanged |
| T-03 | Root list: description links not nested inside the block link | LOGIC-27 | 2h | – | todo | test: no `a a` in DOM |
| T-04 | Safe background-image URL in the album block | SEC-16 | 1h | T-01 | todo | test with `\"`, `\\`, newline |
| T-05 | Path index lookup before the `/image/<n>` rule | LOGIC-28 | 1h | – | todo | test: album "image" + child "2005" |
| T-06 | Backend thumbnails written as `.jpg` (path recorded), frontend uses the recorded thumbnail path | LOGIC-30 | 3h | – | todo | PNG/GIF sources → `t__x.jpg`, URL matches |
| T-07 | Photo without thumbnail: backend flag, frontend placeholder | LOGIC-31 | 2h | T-06 | todo | test: no error tile |
| T-08 | vite.config: `chunkSizeWarningLimit` placement, `manualChunks` router order | ARCH-07 | 1h | – | todo | router-vendor chunk exists; no warning |
| T-09 | Repo tidy-up (stray lock, reports, gitignore, public/ extras, engines, README steps) | HYGIENE-01 | 2h | – | todo | per row |

Total ≈ 16h.

## Retro
(filled at end of sprint)

## Demo notes
(filled at end of sprint)

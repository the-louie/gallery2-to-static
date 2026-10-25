# Sprint 05: the remaining correctness and hygiene rows

**Status:** done (opened and closed 2026-10-25)
**Current ticket:** —
**Last completed:** T-09 (`done` — commit `db6a567`)

**Goal:** close the remaining P3 correctness rows (URLs, BBCode, links, routing, thumbnails) and the
repo tidy-up, so only test/lint debt, operator decisions and blocked upgrades remain.

**Demo:** a filename with `#`, `?`, `%`, space or å loads; `[b]`×16000 renders in under a second;
no `<a>` inside `<a>` in the root list; an album named "image" with a numeric child resolves; PNG/GIF
sources get `.jpg` thumbnails that load; a photo without thumbnail shows a placeholder, not an error;
the stray files are gone from the repo and from `dist/`.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Encode each path segment in image/thumbnail URLs (frontend), and in backend URL building where used for HTTP | LOGIC-24 | 2h | – | done | tests with `#`, `?`, `%`, space, å. Landed in `eb4f756` |
| T-02 | BBCode: input length and nesting caps, plain-text fallback | SEC-15 | 2h | – | done | `[b]`×16000 < 1 s; normal BBCode unchanged. Landed in `c2131b2` |
| T-03 | Root list: description links not nested inside the block link | LOGIC-27 | 2h | – | done | test: no `a a` in DOM. Landed in `2183442` |
| T-04 | Safe background-image URL in the album block | SEC-16 | 1h | T-01 | done | test with `\"`, `\\`, newline. Landed in `47e11ce` |
| T-05 | Path index lookup before the `/image/<n>` rule | LOGIC-28 | 1h | – | done | test: album "image" + child "2005". Landed in `c7f4867` |
| T-06 | Backend thumbnails written as `.jpg` (path recorded), frontend uses the recorded thumbnail path | LOGIC-30 | 3h | – | done | PNG/GIF sources → `t__x.jpg`, URL matches. Landed in `a0af0a1` |
| T-07 | Photo without thumbnail: backend flag, frontend placeholder | LOGIC-31 | 2h | T-06 | done | test: no error tile. Landed in `eaa3d44` |
| T-08 | vite.config: `chunkSizeWarningLimit` placement, `manualChunks` router order | ARCH-07 | 1h | – | done | router-vendor chunk exists; no warning. Landed in `b91050f` |
| T-09 | Repo tidy-up (stray lock, reports, gitignore, public/ extras, engines, README steps) | HYGIENE-01 | 2h | – | done | per row. Landed in `db6a567` |

Total ≈ 16h.

## Retro
**Worked:** reading the design note before changing the root-block links (T-03) turned a "remove the link" fix into the intended one (URL kept as the separate website link, with a description fallback). Mirroring rules on both sides (URL encoding, thumbnail names) with tests on each side.
**Didn't:** writing the README deploy step exposed that the app uses `HashRouter`, so old lanbilder.se path URLs would land on the home page; the first review missed it. Recorded as LOGIC-32 (P1, before cutover) instead of widening this sprint. Several test edits via sed broke syntax and needed a second pass.
**Backlog grooming:** closed LOGIC-24, SEC-15, LOGIC-27, SEC-16, LOGIC-28, LOGIC-30, LOGIC-31, ARCH-07, HYGIENE-01 (9) and DECISION-01 (operator: self-hosted on lanbilder2). New: LOGIC-32.

## Demo notes
Image URLs: `#`, `?`, `%`, space, å/ö encoded per segment, backend check decodes and still rejects encoded traversal. `[b]`×16000 renders in < 1 s. Root block: no `a a`, description URL only as the website link. `/fester/image/2005` resolves to the album when it exists. PNG/GIF thumbnails named `t__x.png.jpg`; photos without a thumbnail show "No preview". `router-vendor` chunk exists, `chunkSizeWarningLimit` applied. Stray files gone; engines `>=22.23.4`; README has full steps. Vitest 1483/1483, backend 13/13, build + check:dist + size-limit OK.

# Sprint 02: backend output you can trust

**Status:** in progress (opened 2026-10-25)
**Current ticket:** T-01 (`in-progress` — Backend npm ci; fix pathSegments.test.ts stale expectation (dots stay )
**Last completed:** —

**Goal:** the extractor's output is correct and complete for the real tree: every album reachable by
exactly one path, no photo silently dropped, thumbnails upright, a failing run fails loudly, and
the image-decoding libraries have no known CVEs.

**Demo:** backend test suite all green (`npx ts-node <file>.test.ts` for every test file); a new
invariant check (`every album id in pathIndex once, every emitted child link resolves to its own
album`) passes on fixtures built from the 6 broken links / 7 unreachable albums LOGIC-11 lists; a
truncated-JPEG fixture keeps its photo in the album JSON; a portrait EXIF-6 fixture gives a
portrait thumbnail; `npm audit` in backend: 0 high.

**Constraints:** no Gallery 2 database here (unit tests and fixtures only); shared machine (one
heavy job at a time); commit locally to `master`.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Backend `npm ci`; fix `pathSegments.test.ts` stale expectation (dots stay legal, parity with frontend) | TEST-02 | 1h | – | in-progress | all backend test files pass |
| T-02 | Empty / `.` / `..` segments fall back to an id segment; index insertion asserts on collision | LOGIC-11 (part 1) | 2h | T-01 | todo | tests for "", "[b][/b]", ".", "..", null title |
| T-03 | Compute each child's segment once in the parent and pass it to both the index key and the emitted link; post-extraction invariant check | LOGIC-11 (part 2) | 4h | T-02 | todo | invariant check on fixture tree with duplicate-named siblings passes deterministically |
| T-04 | sharp → latest (0.35.x+), mysql2 → latest; adapt `failOnError` call site | SEC-14, DEPS-01 (backend runtime) | 2h | T-01 | todo | backend `npm audit` 0 high; tests pass |
| T-05 | Thumbnails: `failOn: 'truncated'`, keep the photo when its thumbnail fails, temp file + rename, skip only if size > 0 and newer than source | LOGIC-12 | 3h | T-04 | todo | truncated-JPEG fixture: photo kept, no 0-byte file, rerun regenerates |
| T-06 | `.rotate()`/`autoOrient` before resize; thumbnail dimensions from sharp's output | LOGIC-13 | 2h | T-04 | todo | EXIF-6 fixture → portrait thumb, dims recorded |
| T-07 | Subtree failures: `allSettled`/handled rejections, album id logged, non-zero exit | LOGIC-21 | 2h | T-01 | todo | test: a rejecting subtree → summary lists it, exit code 1 |
| T-08 | Validate numeric config (concurrency etc.) at load | LOGIC-23 | 1h | T-01 | todo | "x" → clear error, exit 1 |
| T-09 | Write output to a fresh dir and swap at the end; report stale files (no silent delete) | LOGIC-22 | 3h | T-07 | todo | crash mid-run leaves previous output intact; stale ids listed |
| T-10 | Validate table/column prefixes; `NULLIF(fullName,'')`, no login-name fallback | SEC-17 | 1h | T-01 | todo | bad prefix rejected; owner null when fullName empty |

Total ≈ 21h.

## Retro
(filled at end of sprint)

## Demo notes
(filled at end of sprint)

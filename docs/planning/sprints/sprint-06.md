# Sprint 06: old links work; tests and lint you can trust

**Status:** in progress (opened 2026-10-25)
**Current ticket:** T-03 (`todo` — End-to-end extraction test with a fake sql tree (duplicates, blank tit)
**Last completed:** T-02 (`done` — commit `a982fa0`)

**Goal:** every old lanbilder.se album link opens its album (LOGIC-32, before cutover); the backend
extraction has an end-to-end test; lint and the test type check are clean enough to gate on.

**Demo:** opening `/dreamhack/dreamhack_97/` (path URL) shows that album; a fake-`sql` extraction run
writes a data tree whose path index passes the invariant check; `npm run lint` and
`npm run typecheck:test` report 0 errors (or a documented, much smaller remainder).

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Pathname → hash redirect before the router mounts; deploy docs (nginx fallback) | LOGIC-32 | 2h | – | done | test: `/a/b/` → `/#/a/b/`; `/` and `/#/x` untouched; assets not affected. Landed in `cb1f4d6` |
| T-02 | Extract `main()` into a module taking `sql`; thin CLI in index.ts | TEST-03 | 3h | – | done | behaviour unchanged, backend tests green. Landed in `a982fa0` |
| T-03 | End-to-end extraction test with a fake `sql` tree (duplicates, blank titles, bad JPEG) | TEST-03 | 3h | T-02 | todo | JSON + index.json asserted; invariant check passes |
| T-04 | Fix the 6 rules-of-hooks errors (ThemeDropdown) | LINT-01 | 1h | – | todo | 0 rules-of-hooks |
| T-05 | Lint: unused vars, useless escapes, constant expressions, empty object type | LINT-01 | 2h | T-04 | todo | those rules at 0 |
| T-06 | Lint: no-explicit-any in production code | LINT-01 | 3h | T-05 | todo | 0 in src (tests may keep a file-level override) |
| T-07 | Test types: mockData fixtures typed as Album/Image | BUILD-01 | 3h | – | todo | typecheck:test drops by the fixture share (~120) |
| T-08 | Test types: TouchEvent helpers, Vitest mock types, rest | BUILD-01 | 3h | T-07 | todo | typecheck:test 0 |

Total ≈ 20h.

## Retro
(filled at end of sprint)

## Demo notes
(filled at end of sprint)

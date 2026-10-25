# Sprint 08: owner-name fallback, ESLint 10, TypeScript 7

**Status:** done (opened and closed 2026-10-25)
**Current ticket:** —
**Last completed:** T-03 (`done` — commit `c24c44b`)

**Goal:** owners show their full name or, failing that, their user name; ESLint 10 and TypeScript 7 in use.

**Demo:** backend tests show the four owner cases; `npm ls eslint typescript` shows 10.x / 7.x; lint, typecheck, vitest, backend tests and build green.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Owner name: trimmed fullName, else trimmed userName | OWNER-01 | 1h | – | done | Pure resolver with tests for full / NULL / '' / spaces; SQL selects both columns. Landed in `e90d6b4` |
| T-02 | ESLint 10: replace eslint-plugin-react with @eslint-react/eslint-plugin | DEPS-01 | 2h | – | done | eslint 10 + @eslint/js 10; lint 0/0. Landed in `893b49f` |
| T-03 | TypeScript 7 for type checks; backend on Node type stripping instead of ts-node | DEPS-01 | 4h | T-02 | done | typecheck with tsc 7; TS 6 kept only where typescript-eslint needs it; backend tests + start run without ts-node. Landed in `c24c44b` |

Total ≈ 7h.

## Retro
**Worked:** resolving the owner name in TypeScript instead of SQL made all four cases testable without a database. Type stripping needed no new dependency; the only runtime fix was the one `require`.
**Didn't:** Node only strips types, so the backend lost the type check that ts-node did on every run; caught before close and added as `npm run typecheck`. Both TypeScript packages ship a `tsc` bin, so the frontend scripts call TS 7 by path.
**Backlog grooming:** OWNER-01 and DEPS-01 closed, LINT-02 added (rules off after the @eslint-react switch). Open rows: 7 → 7: CONF-01 (blacklisted album IDs, operator), LINT-02 (schedulable), FUT-01..05 (after deploy).

## Demo notes
Owner: `Anna Svensson`/`anna` → Anna Svensson; NULL/`kalle83` → kalle83; `''`/`fotograf` → fotograf; `'   '`/`admin` → admin (`backend/ownerDisplayName.test.ts`). `npm ls`: eslint 10.13.0, typescript 7.0.2 (frontend `typescript7`, backend `typescript`). Lint 0/0, typecheck 0 (frontend, test, backend), vitest 1487/1487, backend 14/14, build + check:dist OK (614 KB), `npm audit` 0 in both.

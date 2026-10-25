# Sprint 08: owner-name fallback, ESLint 10, TypeScript 7

**Status:** in progress (opened 2026-10-25)
**Current ticket:** T-01 (`todo` — Owner name: trimmed fullName, else trimmed userName)
**Last completed:** —

**Goal:** owners show their full name or, failing that, their user name; ESLint 10 and TypeScript 7 in use.

**Demo:** backend tests show the four owner cases; `npm ls eslint typescript` shows 10.x / 7.x; lint, typecheck, vitest, backend tests and build green.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Owner name: trimmed fullName, else trimmed userName | OWNER-01 | 1h | – | todo | Pure resolver with tests for full / NULL / '' / spaces; SQL selects both columns |
| T-02 | ESLint 10: replace eslint-plugin-react with @eslint-react/eslint-plugin | DEPS-01 | 2h | – | todo | eslint 10 + @eslint/js 10; lint 0/0 |
| T-03 | TypeScript 7 for type checks; backend on Node type stripping instead of ts-node | DEPS-01 | 4h | T-02 | todo | typecheck with tsc 7; TS 6 kept only where typescript-eslint needs it; backend tests + start run without ts-node |

Total ≈ 7h.

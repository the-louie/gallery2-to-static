# Sprint 07: lint clean, so it can gate

**Status:** done (opened and closed 2026-10-25)
**Current ticket:** —
**Last completed:** T-03 (`done` — commit `367c82f`)

**Goal:** `npm run lint` (with `--max-warnings 0`) passes, every remaining hook-dependency choice is
either fixed or documented in place.

**Demo:** `npm run lint` exits 0; vitest green; each `exhaustive-deps` suppression carries the reason.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Review the 10 exhaustive-deps warnings: fix real gaps, document deliberate ones in place | LINT-01 | 3h | – | done | 0 exhaustive-deps; tests green. Landed in `cfd9eda` |
| T-02 | only-export-components: ThemeIcons constant out of the component file; contexts/test-utils (provider + hook files) exempted in config | LINT-01 | 1h | – | done | 0 warnings. Landed in `55d5206` |
| T-03 | `npm run lint` passes; note in CLAUDE.md that lint gates | LINT-01 | 0.5h | T-01, T-02 | done | exit 0. Landed in `367c82f` |

Total ≈ 4.5h.

## Retro
**Worked:** separating "missing dependency" from "keyed on identity on purpose" per hook kept the effects' behaviour unchanged; suppressions carry their reason at the line.
**Didn't:** one Python edit cut `getThemeIcon` without writing it out; recovered from HEAD before committing.
**Backlog grooming:** LINT-01 closed. Open rows: 8 → 7, none schedulable without the operator or upstream: SEC-12 (needs the Gallery 2 DB / answer), DEPS-01 (ESLint 10, TypeScript 7 blocked upstream), FUT-01..05 (after production deploy).

## Demo notes
`npm run lint`: exit 0 (0 errors, 0 warnings; was 117 errors + 15 warnings). `typecheck` and `typecheck:test`: 0. Vitest 1487/1487.

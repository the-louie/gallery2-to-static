# TODO Summarized

Generated 2026-10-25 from `TODO.md` (Sprint 05). Closed rows: `docs/planning/done.md`.

## P0 — Blocks all other work

- **BUILD-01**: test-only type errors behind `npm run typecheck:test` (253 → 273 after the Sprint 04 toolchain upgrades)

## P1 — Must be fixed before anything is published

- **SEC-12**: no Gallery 2 permission check anywhere — private albums are exported

## P3 — Quality, hygiene and latent bugs

- **LINT-01**: 117 lint errors — including 6 real conditional-hook violations

## P1 (second review pass)

- **DEPS-01**: two majors blocked upstream — ESLint 10, TypeScript 7 (operator, 2026-10-25)
- **TEST-03**: no end-to-end test of the backend extraction (found 2026-10-25, Sprint 02 T-03)
- **LOGIC-32**: old lanbilder.se path URLs open the home page, not the album (found 2026-10-25, Sprint 05 T-09)

## FUTURE (after production deploy)

- **FUT-01**: SQLite as the master of the data; regenerate only changed branches
- **FUT-02**: admin can add albums and delegate them; delegated users add subalbums and images
- **FUT-03**: user profiles
- **FUT-04**: audit logging
- **FUT-05**: privacy-friendly statistics (European)

---

## Summary

**Open rows:** 11

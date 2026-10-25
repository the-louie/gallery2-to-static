# TODO Summarized

Generated 2026-10-25 from `TODO.md` (Sprint 04). Closed rows: `docs/planning/done.md`.

## P0 — Blocks all other work

- **BUILD-01**: test-only type errors behind `npm run typecheck:test` (253 → 273 after the Sprint 04 toolchain upgrades)

## P1 — Must be fixed before anything is published

- **SEC-12**: no Gallery 2 permission check anywhere — private albums are exported

## P3 — Quality, hygiene and latent bugs

- **LINT-01**: 117 lint errors — including 6 real conditional-hook violations
- **ARCH-07**: two ineffective `vite.config.ts` settings

## P1 (second review pass)

- **DECISION-01**: hosting model — Cloudflare Pages + image server, or one nginx host (needs operator)
- **DEPS-01**: two majors blocked upstream — ESLint 10, TypeScript 7 (operator, 2026-10-25)
- **TEST-03**: no end-to-end test of the backend extraction (found 2026-10-25, Sprint 02 T-03)
- **LOGIC-31**: a photo kept without a thumbnail shows the grid's error state (found 2026-10-25, Sprint 02 T-05)

## P3 (second review pass)

- **LOGIC-24**: image URLs are not encoded per segment
- **SEC-15**: BBCode parse is quadratic, with no length or depth cap
- **LOGIC-27**: nested links in the root album list
- **SEC-16**: `url("…")` escaping in the album block is incomplete
- **LOGIC-28**: album named `image` with a numeric child is unreachable
- **LOGIC-30**: thumbnails are always JPEG but keep the source extension
- **HYGIENE-01**: repo and package tidy-up

## FUTURE (after production deploy)

- **FUT-01**: SQLite as the master of the data; regenerate only changed branches
- **FUT-02**: admin can add albums and delegate them; delegated users add subalbums and images
- **FUT-03**: user profiles
- **FUT-04**: audit logging
- **FUT-05**: privacy-friendly statistics (European)

---

## Summary

**Open rows:** 20

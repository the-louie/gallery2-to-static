# TODO Summarized

Generated 2026-10-25 from `TODO.md` (catch-up after Sprints 01–02 + S03 T-01..T-02). Closed rows: `docs/planning/done.md`.

## P0 — Blocks all other work

- **BUILD-01**: 253 test-only type errors behind `npm run typecheck:test`

## P1 — Must be fixed before anything is published

- **SEC-12**: no Gallery 2 permission check anywhere — private albums are exported

## P3 — Quality, hygiene and latent bugs

- **LOGIC-14**: image search results link to a "Legacy Route Not Supported" page
- **LINT-01**: 117 lint errors — including 6 real conditional-hook violations
- **ARCH-07**: two ineffective `vite.config.ts` settings

## P1 (second review pass)

- **DECISION-01**: hosting model — Cloudflare Pages + image server, or one nginx host (needs operator)
- **DEPS-01**: all dependencies on their latest version (operator, 2026-10-25)
- **SEC-18**: no Brotli decoder vulnerable to CVE-2026-111497 is shipped or used (operator, 2026-10-25)
- **TEST-03**: no end-to-end test of the backend extraction (found 2026-10-25, Sprint 02 T-03)
- **LOGIC-31**: a photo kept without a thumbnail shows the grid's error state (found 2026-10-25, Sprint 02 T-05)

## P2 (second review pass)

- **PERF-03**: the image cache is wiped and fetches aborted on every lightbox step
- **LOGIC-16**: the lightbox ignores the grid's sort and filters
- **LOGIC-17**: closing the lightbox pushes history; album scroll position is lost
- **LOGIC-18**: date filter can't be enabled, and would hide everything
- **LOGIC-19**: zoom limit is ~2500% instead of 400%

## P3 (second review pass)

- **LOGIC-24**: image URLs are not encoded per segment
- **SEC-15**: BBCode parse is quadratic, with no length or depth cap
- **LOGIC-25**: stored sort value is not validated
- **LOGIC-26**: thumbnail object URL revoked while it is displayed
- **LOGIC-27**: nested links in the root album list
- **SEC-16**: `url("…")` escaping in the album block is incomplete
- **LOGIC-28**: album named `image` with a numeric child is unreachable
- **LOGIC-29**: Swedish name sort is wrong
- **LOGIC-30**: thumbnails are always JPEG but keep the source extension
- **BUILD-04**: `size-limit` patterns don't match the build
- **HYGIENE-01**: repo and package tidy-up

---

## Summary

**Open rows:** 26

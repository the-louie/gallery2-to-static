# Sprint 01: green, safe production build

**Status:** done (opened and closed 2026-10-25)
**Current ticket:** —
**Last completed:** T-08 (`done` — commit `ee0fa4b`)

**Goal:** `npm run build` passes from a clean checkout and produces a deployable `dist/` without
images, sourcemaps or the bundle report; the two P1 frontend blockers are fixed.

**Demo:** clean checkout → `npm ci && npm run build` exits 0; `dist/` has no `g2data/`, `*.map`
or `stats.html`; `#/search?q=eeeeeeeeeezz` returns at once; a path URL with `index.json`
returning 500 shows an error with Retry instead of a spinner.

**Constraints (shared machine):** vitest with `--pool=forks --poolOptions.forks.maxForks=2`; no
`size-limit` / Chrome; commit locally to `master`, no push.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Remove duplicated block in `Breadcrumbs.integration.test.tsx`; split type-check: `tsconfig.json` (app, no tests) for `npm run build`, `tsconfig.test.json` + `npm run typecheck:test` | BUILD-01 1–2 | 2h | – | done | parse error gone; `tsc -p tsconfig.json` checks only shipped code; suite collects. Landed in `43b1266` |
| T-02 | Fix production-source type errors, part 1 (pages/, contexts/) | BUILD-01 3 | 3h | T-01 | done | 0 errors in those dirs; tests of touched files pass. Landed in `171de9d` |
| T-03 | Fix production-source type errors, part 2 (hooks/, utils/, components/, `vite/client` types) | BUILD-01 3 | 3h | T-01 | done | `npm run build` type-check 0 errors. Landed in `63be6cb` |
| T-04 | `App.test.tsx` backend/types import; `fetchImageAsObjectUrl` URL stubs in setup | BUILD-01 4, TEST-01 | 1h | T-01 | done | both suites collect and pass. Landed in `be78370` |
| T-05 | Don't copy `public/` image tree into `dist/` (`copyPublicDir:false` + explicit copy of small files); docs | BUILD-02 | 2h | T-03 | done | build with a `g2data` symlink present: `dist/` has no images; docs updated. Landed in `efbf0c6` |
| T-06 | No sourcemaps / `stats.html` in production; visualizer behind `ANALYZE=1` | BUILD-03 | 1h | T-03 | done | `dist/` has no `*.map`, no `stats.html`; `build:analyze` still writes it. Landed in `f9138be` |
| T-07 | Linear subsequence match, query cap 32, `maxLength` on SearchBar | SEC-13 | 2h | – | done | regression test: `eeeeeeeeeezz` vs real-size text < 50 ms; existing search tests pass. Landed in `ed542b2` |
| T-08 | PathResolverPage error state + Retry on index load failure | LOGIC-15 | 2h | – | done | test: 500 → error + Retry; retry success → album. Landed in `ee0fa4b` |

Total ≈ 16h.

## Retro
**Worked:** every row was re-verified before work (BUILD-01's duplicate block, the `.*?` regex, the missing try/catch all reproduced as described). The tsconfig split turned an 82-error wall into small, file-grouped fixes. Full vitest with 2 forks takes 36 s, so a full run per ticket is cheap on the shared machine.
**Didn't:** `--poolOptions.forks.maxForks=2` alone fails (min > max); needs `minForks=1`. T-02/T-03 boundaries were by folder, but one fix (`vite/client` types) cleared 33 errors across both.
**Backlog grooming:** closed BUILD-02, BUILD-03, SEC-13, LOGIC-15, LOGIC-20, TEST-01. BUILD-01 narrowed to the 253 test-only type errors. ARCH-08 superseded by DEPS-01 (operator: all deps latest). New rows: DEPS-01, SEC-18, DECISION-01 (operator). Open rows: 42 → 35.

## Demo notes
Clean clone → `npm ci && npm run build` exits 0; `npm run check:dist` OK: 27 files, 487 KB (`index.html`, `album-themes.json`, `assets/`; no `g2data/`, no `*.map`, no `stats.html`). With a `public/g2data` symlink the old config copied the tree into `dist/`, the new one does not. `#/search?q=eeeeeeeeeezz`: 1000 matches against a 1,100-char text in < 500 ms (was ~2.9 s for one). Path URL with a failing index: alert "Could not load the gallery" + Retry, Retry loads the album. Full vitest: 81 files, 1435 tests pass (was 79 collectable files, 1421).

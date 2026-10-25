# Sprint 01: green, safe production build

**Status:** in progress (opened 2026-10-25)
**Current ticket:** T-03 (`in-progress` — Fix production-source type errors, part 2 (hooks/, utils/, components/)
**Last completed:** T-02 (`done` — commit `171de9d`)

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
| T-03 | Fix production-source type errors, part 2 (hooks/, utils/, components/, `vite/client` types) | BUILD-01 3 | 3h | T-01 | in-progress | `npm run build` type-check 0 errors |
| T-04 | `App.test.tsx` backend/types import; `fetchImageAsObjectUrl` URL stubs in setup | BUILD-01 4, TEST-01 | 1h | T-01 | todo | both suites collect and pass |
| T-05 | Don't copy `public/` image tree into `dist/` (`copyPublicDir:false` + explicit copy of small files); docs | BUILD-02 | 2h | T-03 | todo | build with a `g2data` symlink present: `dist/` has no images; docs updated |
| T-06 | No sourcemaps / `stats.html` in production; visualizer behind `ANALYZE=1` | BUILD-03 | 1h | T-03 | todo | `dist/` has no `*.map`, no `stats.html`; `build:analyze` still writes it |
| T-07 | Linear subsequence match, query cap 32, `maxLength` on SearchBar | SEC-13 | 2h | – | todo | regression test: `eeeeeeeeeezz` vs real-size text < 50 ms; existing search tests pass |
| T-08 | PathResolverPage error state + Retry on index load failure | LOGIC-15 | 2h | – | todo | test: 500 → error + Retry; retry success → album |

Total ≈ 16h.

## Retro
(filled at end of sprint)

## Demo notes
(filled at end of sprint)

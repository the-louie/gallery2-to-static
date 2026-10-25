# Sprint 04: everything on current versions, no vulnerable Brotli

**Status:** in progress (opened 2026-10-25)
**Current ticket:** —
**Last completed:** T-11 (`done` — commit `856b416`)

**Goal:** every frontend and backend dependency on its latest release (operator, DEPS-01), the
Brotli check (SEC-18) recorded and scripted, and the README/docs free of private `__docs` links.

**Demo:** `npm outdated` empty and `npm audit` (full) 0 in both folders; `npm run build`,
`check:dist`, full vitest, lint and backend tests green on the new toolchain; `scripts/check-brotli`
prints a fixed version or "no decoder" for every item in SEC-18; README has no `__docs` link.

**Constraints:** one toolchain per ticket so each lands green; vitest with 2 forks; no Chrome
(puppeteer download skipped, `size-limit` timing not run); commit locally.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | In-range updates: Font Awesome, user-event, prettier, react-virtuoso, react-router-dom 6.30.6 (audit) | DEPS-01 | 1h | – | done | build + tests green; prod audit 0. Landed in `99cbaa5` |
| T-02 | Vite 5 → 8, @vitejs/plugin-react 6, rollup-plugin-visualizer 7 | DEPS-01 | 3h | T-01 | done | build, dev config, check:dist. Landed in `585e385` |
| T-03 | Vitest 1 → 5 (+ coverage-v8, ui), jsdom 30, @types/jsdom | DEPS-01 | 3h | T-02 | done | full suite green. Merged into T-02 (vitest 1 only accepts vite 5, so they had to move together) |
| T-04 | Testing Library react 16, jest-dom 7 | DEPS-01 | 2h | T-03 | done | full suite green. Landed in `22fac89` |
| T-05 | React 19 + @types/react(-dom) 19 | DEPS-01 | 3h | T-04 | done | build + suite; no React warnings new. Landed in `d8db9e5` |
| T-06 | react-router 7 (HashRouter, routes, Link state) | DEPS-01 | 3h | T-05 | done | suite; routes + lightbox state work. Landed in `5b9dee4` |
| T-07 | ESLint 10 flat config, typescript-eslint 8, react-hooks 7, react-refresh, eslint-config-prettier 10 | DEPS-01 | 4h | T-05 | done | lint runs (errors may remain = LINT-01, no new ones). Landed in `9a8ddfa` + `b1dfd7c` (files missed from the first commit) |
| T-08 | TypeScript 7 (frontend + backend); backend runner without ts-node if ts-node can't use TS 7 | DEPS-01 | 3h | T-07 | done | tsc both; backend npm test/start work. Landed in `7f7c94f` |
| T-09 | size-limit 14, web-vitals 6; fix size-limit globs (no timing run) | DEPS-01, BUILD-04 | 2h | T-02 | done | `size-limit --why`-free static check passes. Landed in `ff01682` |
| T-10 | Brotli check: record versions, `scripts/check-brotli.mjs` | SEC-18 | 2h | T-08 | done | each SEC-18 item answered. Landed in `c46e949` |
| T-11 | README/docs: remove `__docs` references, rephrase | DOCS-01 | 1h | – | done | no `__docs` in README, frontend/docs. Landed in `856b416` |

Total ≈ 27h.

## Retro
(filled at end of sprint)

## Demo notes
(filled at end of sprint)

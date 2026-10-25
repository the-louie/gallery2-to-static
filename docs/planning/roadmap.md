# Roadmap

Backlog: `TODO.md` (repo root). Sprints are scope-boxed (~20–40h, tickets 1–4h) and end on a demo.

**After every sprint (operator, 2026-10-25):** prune `TODO.md` and regenerate `TODO-summarized.md`: `python3 docs/planning/prune_todo.py . "Sprint NN"` moves closed (~~struck~~) rows, with their proof, to `docs/planning/done.md`.

**Active sprint:** [Sprint 05](./sprints/sprint-05.md) — in progress.
**Current ticket:** [Sprint 05 T-04](./sprints/sprint-05.md) (`in-progress` — Safe background-image URL in the album block)
**Last completed:** Sprint 05 T-03 (commit `2183442`).

| Sprint | Goal |
|---|---|
| S01 ✅ | Green, safe production build: `npm run build` passes from a clean checkout, `dist/` holds no images, sourcemaps or bundle report; the two P1 frontend blockers (search ReDoS, stuck path resolver) fixed. |
| S02 ✅ | Data correctness in the backend: path segments computed once (LOGIC-11), thumbnail failure handling + sharp upgrade (LOGIC-12, SEC-14, LOGIC-13), run robustness (LOGIC-21..23). |
| S03 ✅ | Frontend behaviour: grid bandwidth (PERF-01..03), lightbox (LOGIC-16, 17, 19), filters/sort (LOGIC-18, 25, 29), error paths (LOGIC-20). |
| S04 ✅ | DEPS-01 frontend half (latest vite/vitest/eslint/React, one toolchain per ticket) + backend typescript/ts-node; SEC-18 brotli check. |
| S05 | Remaining P3 correctness rows + repo tidy-up. |
| S06 | Test and lint debt: TEST-03 (backend e2e harness), LINT-01, BUILD-01 test types. |
| Operator | SEC-12 (needs the Gallery 2 DB / answer), DECISION-01 (hosting). DEPS-01: ESLint 10 / TS 7 when upstream allows. FUT-01..05 after deploy. |
| (old) S05+ | P3 items, SEC-18 brotli check, hygiene, test-fixture type burn-down (BUILD-01 rest, LINT-01). DECISION-01 (hosting) with the operator. SEC-12 (permissions) when the Gallery 2 DB is available to test against. |

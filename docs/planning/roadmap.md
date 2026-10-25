# Roadmap

Backlog: `TODO.md` (repo root). Sprints are scope-boxed (~20–40h, tickets 1–4h) and end on a demo.

**Active sprint:** [Sprint 01](./sprints/sprint-01.md) — in progress.
**Current ticket:** [Sprint 01 T-07](./sprints/sprint-01.md) (`todo` — Linear subsequence match, query cap 32, maxLength on SearchBar)
**Last completed:** Sprint 01 T-06 (commit `f9138be`).

| Sprint | Goal |
|---|---|
| S01 | Green, safe production build: `npm run build` passes from a clean checkout, `dist/` holds no images, sourcemaps or bundle report; the two P1 frontend blockers (search ReDoS, stuck path resolver) fixed. |
| S02 | Data correctness in the backend: path segments computed once (LOGIC-11), thumbnail failure handling + sharp upgrade (LOGIC-12, SEC-14, LOGIC-13), run robustness (LOGIC-21..23). |
| S03 | Frontend behaviour: grid bandwidth (PERF-01..03), lightbox (LOGIC-16, 17, 19), filters/sort (LOGIC-18, 25, 29), error paths (LOGIC-20). |
| S04+ | P3 items, hygiene, test-fixture type burn-down, toolchain upgrade. SEC-12 (permissions) when the Gallery 2 DB is available to test against. |

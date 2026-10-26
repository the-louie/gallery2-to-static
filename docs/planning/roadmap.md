# Roadmap

Backlog: `TODO.md` (repo root). Sprints are scope-boxed (~20–40h, tickets 1–4h) and end on a demo.

**After every sprint (operator, 2026-10-25):** prune `TODO.md` and regenerate `TODO-summarized.md`: `python3 docs/planning/prune_todo.py . "Sprint NN"` moves closed (~~struck~~) rows, with their proof, to `docs/planning/done.md`.

**Active sprint:** [Sprint 15](./sprints/sprint-15.md) — in progress (FUT-01, the data master); in parallel (operator 2026-10-26): [Sprint 16](./sprints/sprint-16.md) auth/service on `s16-auth`, [Sprint 17](./sprints/sprint-17.md) statistics on `s17-stats`; merged into master when done.
**Current ticket:** [Sprint 15 T-10](./sprints/sprint-15.md) (`todo` — Docs, runbook, retro)
**Last completed:** Sprint 15 T-09 (commit `685c74b`).

| Sprint | Goal |
|---|---|
| S01 ✅ | Green, safe production build: `npm run build` passes from a clean checkout, `dist/` holds no images, sourcemaps or bundle report; the two P1 frontend blockers (search ReDoS, stuck path resolver) fixed. |
| S02 ✅ | Data correctness in the backend: path segments computed once (LOGIC-11), thumbnail failure handling + sharp upgrade (LOGIC-12, SEC-14, LOGIC-13), run robustness (LOGIC-21..23). |
| S03 ✅ | Frontend behaviour: grid bandwidth (PERF-01..03), lightbox (LOGIC-16, 17, 19), filters/sort (LOGIC-18, 25, 29), error paths (LOGIC-20). |
| S04 ✅ | DEPS-01 frontend half (latest vite/vitest/eslint/React, one toolchain per ticket) + backend typescript/ts-node; SEC-18 brotli check. |
| S05 ✅ | Remaining P3 correctness rows + repo tidy-up. |
| S06 ✅ | LOGIC-32 (old path URLs, before cutover) + test and lint debt: TEST-03 (backend e2e harness), LINT-01, BUILD-01 test types. |
| S07 ✅ | LINT-01 warnings: lint gates. |
| S08 ✅ | OWNER-01 owner-name fallback; DEPS-01 ESLint 10 + TypeScript 7. |
| S09 ✅ | LINT-02 @eslint-react rules. |
| S10 ✅ | REFAC-01 state effects. |
| S11 ✅ | THEME-01 Gallery 2 Matrix look (template: 2006 dhphotos page), URL-01 clean URLs, URL-02 old Gallery 2 redirects, mobile checks. |
| S12 ✅ | PRIO-THEME-01..05 + SEARCH-01 + HIDE-02 + BANNER-01; operator additions: "Theme: modern" link, modern light/dark redesign; final comparison 0 block differences. |
| S13 ✅ | Operator QA round 2026-10-26: square thumbnails, modern root-card fixes, phone thumbnail flow, search retry, banner in every theme, `classic-list` theme with the 2013 root list. |
| S14 ✅ | THEME-02: the list root becomes the `classic` theme; `classic-list` removed. BANNER-02: header image under random names, ad-blocker safe. |
| S15 (planned) | FUT-01 the data master: SQLite on lanbilder2, generator, branch regeneration, `lanbilder-admin` service skeleton, view counter. |
| S16 (sketch) | FUT-02 part 1: admin hostname + Cloudflare Access + TOTP + user table + audit log (FUT-04) + album create/delegate. |
| S17 (sketch) | FUT-02 part 2: uploads (pipeline, HEIC, GPS strip), sub-albums, soft delete, hidden flag, highlights; FUT-03 profiles. |
| S18 (sketch) | FUT-05 Plausible CE on lanbilder2; go-live rehearsal. |
| Operator | SENTRY-01 (after a Claude Code restart + Sentry login). DECISION-01: self-hosted on lanbilder2. FUT-01..05 **before** go-live (2026-10-26). |
| (old) S05+ | P3 items, SEC-18 brotli check, hygiene, test-fixture type burn-down (BUILD-01 rest, LINT-01). DECISION-01 (hosting) with the operator. SEC-12 (permissions) when the Gallery 2 DB is available to test against. |

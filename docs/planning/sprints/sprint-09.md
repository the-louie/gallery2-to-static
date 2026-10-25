# Sprint 09: the @eslint-react rules that are off (LINT-02)

**Status:** done (opened and closed 2026-10-25)
**Current ticket:** —
**Last completed:** T-04 (`done` — commit `3d54c34`)

**Goal:** every @eslint-react rule switched off in Sprint 08 is either on (code fixed) or off with the reason in `eslint.config.js`.

**Demo:** `eslint.config.js` lists no rule off without a reason; lint 0/0, vitest green.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | IntersectionObserver cleanup in ImageThumbnail; enable the rule | LINT-02 | 1h | – | done | cleanup disconnects the instance; one disconnect per intersection (existing test). Landed in `43f0449` |
| T-02 | React 19 context idioms, ref and useState naming; enable the 4 rules | LINT-02 | 1.5h | – | done | `<Ctx>` provider, `use(Ctx)`, names per rule; tests green. Landed in `0dafa53` |
| T-03 | Array-index keys: stable keys or documented exemption | LINT-02 | 1h | – | done | skeletons/tests/SearchHighlight reviewed. Landed in `c677490` |
| T-04 | set-state-in-effect (49): review, fix real cases, decide the rule | LINT-02 | 3h | – | done | each file reviewed; rule on, or off with reason; LINT-02 struck. Landed in `3d54c34` |

Total ≈ 6.5h.

## Retro
**Worked:** listing each hit with its code line before deciding per rule; three rules turned out to flag correct code, and the exemptions now say why.
**Didn't:** the first observer fix disconnected twice (cleanup after the callback); the existing test caught it.
**Backlog grooming:** LINT-02 closed; REFAC-01 (P3) added for the 49 set-state-in-effect effects. Also landed between tickets, on operator request: UX-01 (blurred thumbnail sized like the full image). Open rows: 7 → 7: SENTRY-01 (needs a Claude Code restart + Sentry login), REFAC-01 (P3), FUT-01..05 (after deploy).

## Demo notes
`frontend/eslint.config.js`: every @eslint-react rule is on or off with a reason. Lint 0/0, typecheck 0 (app, tests, backend), vitest 1489/1489, backend 15/15, build + check:dist OK (615 KB), `npm audit` 0 in both. The UX-01 build is live on https://lanbilder-new.phetast.nu/.

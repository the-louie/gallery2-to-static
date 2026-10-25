# Sprint 09: the @eslint-react rules that are off (LINT-02)

**Status:** in progress (opened 2026-10-25)
**Current ticket:** T-03 (`in-progress` — Array-index keys: stable keys or documented exemption)
**Last completed:** T-02 (`done` — commit `0dafa53`)

**Goal:** every @eslint-react rule switched off in Sprint 08 is either on (code fixed) or off with the reason in `eslint.config.js`.

**Demo:** `eslint.config.js` lists no rule off without a reason; lint 0/0, vitest green.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | IntersectionObserver cleanup in ImageThumbnail; enable the rule | LINT-02 | 1h | – | done | cleanup disconnects the instance; one disconnect per intersection (existing test). Landed in `43f0449` |
| T-02 | React 19 context idioms, ref and useState naming; enable the 4 rules | LINT-02 | 1.5h | – | done | `<Ctx>` provider, `use(Ctx)`, names per rule; tests green. Landed in `0dafa53` |
| T-03 | Array-index keys: stable keys or documented exemption | LINT-02 | 1h | – | in-progress | skeletons/tests/SearchHighlight reviewed |
| T-04 | set-state-in-effect (49): review, fix real cases, decide the rule | LINT-02 | 3h | – | todo | each file reviewed; rule on, or off with reason; LINT-02 struck |

Total ≈ 6.5h.

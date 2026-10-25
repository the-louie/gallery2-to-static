# Sprint 07: lint clean, so it can gate

**Status:** in progress (opened 2026-10-25)
**Current ticket:** T-02 (`in-progress` — only-export-components: ThemeIcons constant out of the component file;)
**Last completed:** T-01 (`done` — commit `cfd9eda`)

**Goal:** `npm run lint` (with `--max-warnings 0`) passes, every remaining hook-dependency choice is
either fixed or documented in place.

**Demo:** `npm run lint` exits 0; vitest green; each `exhaustive-deps` suppression carries the reason.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Review the 10 exhaustive-deps warnings: fix real gaps, document deliberate ones in place | LINT-01 | 3h | – | done | 0 exhaustive-deps; tests green. Landed in `cfd9eda` |
| T-02 | only-export-components: ThemeIcons constant out of the component file; contexts/test-utils (provider + hook files) exempted in config | LINT-01 | 1h | – | in-progress | 0 warnings |
| T-03 | `npm run lint` passes; note in CLAUDE.md that lint gates | LINT-01 | 0.5h | T-01, T-02 | todo | exit 0 |

Total ≈ 4.5h.

## Retro
(filled at end of sprint)

## Demo notes
(filled at end of sprint)

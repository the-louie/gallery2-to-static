# Sprint 14: one classic theme (THEME-02)

**Status:** in progress (opened 2026-10-26)
**Current ticket:** —
**Last completed:** T-01 (`done` — commit `031c44d`)

**Goal:** the classic theme shows the root album as the 2013 list; the separate `classic-list` theme is gone.

**Demo:** https://lanbilder-new.phetast.nu/ in the classic theme shows the list root; the sidebar's theme block has only "Theme: modern"; the modern dropdown lists Light, Dark, Classic; a browser that stored `classic-list` lands in classic.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | One classic theme: the list root | THEME-02 | 1.5h | – | done | `HomePage` passes `list` for `isClassic`; registry back to three themes; `themes.css` selectors back to `[data-theme="classic"]`; `isClassicList` removed; sidebar toggle removed; ThemeContext maps a stored `classic-list` to `classic` (test); docs (CLAUDE.md, themes.md, features guide, theme-matrix.md); deploy + screenshot. Landed in `031c44d` |

## Retro
(filled at sprint end)

## Demo notes
(filled at sprint end)

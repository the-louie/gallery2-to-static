# Sprint 14: one classic theme (THEME-02)

**Status:** in progress (opened 2026-10-26)
**Current ticket:** T-01 (`in-progress` — One classic theme: the list root)
**Last completed:** —

**Goal:** the classic theme shows the root album as the 2013 list; the separate `classic-list` theme is gone.

**Demo:** https://lanbilder-new.phetast.nu/ in the classic theme shows the list root; the sidebar's theme block has only "Theme: modern"; the modern dropdown lists Light, Dark, Classic; a browser that stored `classic-list` lands in classic.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | One classic theme: the list root | THEME-02 | 1.5h | – | in-progress | `HomePage` passes `list` for `isClassic`; registry back to three themes; `themes.css` selectors back to `[data-theme="classic"]`; `isClassicList` removed; sidebar toggle removed; ThemeContext maps a stored `classic-list` to `classic` (test); docs (CLAUDE.md, themes.md, features guide, theme-matrix.md); deploy + screenshot |

## Retro
(filled at sprint end)

## Demo notes
(filled at sprint end)

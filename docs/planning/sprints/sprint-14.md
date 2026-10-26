# Sprint 14: one classic theme (THEME-02)

**Status:** in progress (opened 2026-10-26)
**Current ticket:** —
**Last completed:** T-02 (`done` — commit `6d8030d`)

**Goal:** the classic theme shows the root album as the 2013 list; the separate `classic-list` theme is gone; the banner is no longer caught by ad-blockers.

**Demo:** https://lanbilder-new.phetast.nu/ in the classic theme shows the list root; the sidebar's theme block has only "Theme: modern"; the modern dropdown lists Light, Dark, Classic; a browser that stored `classic-list` lands in classic.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-02 | Banner under random names, markup without banner hints | BANNER-02 | 1h | – | done | random directory and file names on lanbilder2 (nginx alias, `/srv/share/lanbilder2/banner/README.txt` records the mapping), `.env.production.local` updated; markup: no "banner" in id/class/alt/title, no width/height size attributes; test the HTML; check with Chrome that the image loads and with an EasyList pass (uBlock-style rules) that no URL/selector matches. Landed in `6d8030d` |
| T-01 | One classic theme: the list root | THEME-02 | 1.5h | – | done | `HomePage` passes `list` for `isClassic`; registry back to three themes; `themes.css` selectors back to `[data-theme="classic"]`; `isClassicList` removed; sidebar toggle removed; ThemeContext maps a stored `classic-list` to `classic` (test); docs (CLAUDE.md, themes.md, features guide, theme-matrix.md); deploy + screenshot. Landed in `031c44d` |

## Retro
(filled at sprint end)

## Demo notes
(filled at sprint end)

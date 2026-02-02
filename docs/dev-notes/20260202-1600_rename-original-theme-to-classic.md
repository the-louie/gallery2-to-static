# Rename "Original" Theme to "Classic"

**Date:** 2026-02-02

## Summary

The "original" theme was renamed to "classic" across the codebase. The identifier, display name, CSS selectors, context property (`isOriginal` → `isClassic`), and all documentation were updated. Migration logic ensures users with `original` stored in localStorage and config files with `"original"` receive the new `classic` theme automatically.

## Changes

- **Theme config:** `themes.ts` — name `original` → `classic`, displayName `Original` → `Classic`, `DEFAULT_THEME` → `classic`
- **ThemeContext:** `isOriginal` → `isClassic`; migration in `getInitialTheme` when stored theme is `original`
- **albumThemesConfig:** Migration of `defaultTheme` and `albumThemes` values from `original` to `classic` when loading config
- **Components:** ThemeSwitcher, ThemeDropdown, Layout, RootAlbumListBlock — all references updated
- **CSS:** `[data-theme="original"]` → `[data-theme="classic"]` in themes.css, Layout.css, RootAlbumListBlock.css
- **Config files:** album-themes.json, album-themes.json.example — `defaultTheme: "classic"`
- **Tests:** themes.test.ts, ThemeContext.test.tsx, ThemeSwitcher.test.tsx, ThemeDropdown.test.tsx, albumThemesConfig.test.ts — all updated; added migration tests
- **Documentation:** docs/theming/*.md, docs/dev-notes/*.md — theme references updated

## Migration

- **localStorage:** When `gallery-theme` contains `"original"`, it is migrated to `"classic"` on read and the stored value is updated
- **album-themes.json:** When the config file contains `defaultTheme: "original"` or `albumThemes: { "7": "original" }`, values are migrated to `classic` during load

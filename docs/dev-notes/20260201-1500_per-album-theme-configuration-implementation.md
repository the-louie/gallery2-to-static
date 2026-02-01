# Per-Album Theme Configuration Implementation

**Date:** 2026-02-01
**Task:** Implement Per-Album Theme Configuration (from TODO.md)

## Summary

Implemented per-album theme configuration allowing each album to have an optional theme override. Configuration is stored in `frontend/public/album-themes.json` and loaded at runtime.

## Key Changes

- **Types:** Added `AlbumThemesConfig` in `frontend/src/types/albumThemes.ts` with `defaultTheme` and `albumThemes` (album ID to theme name mapping).

- **Config loader:** Created `frontend/src/utils/albumThemesConfig.ts` with `loadAlbumThemesConfig()`, `getThemeForAlbum()`, `getAlbumIdFromPath()`, `clearAlbumThemesConfigCache()`, and `isValidAlbumThemesConfig()`. Follows the same fetch-and-cache pattern as `imageConfig.ts`.

- **ThemeContext:** Extended to support effective theme. `ThemeProvider` uses `useLocation()` to extract album ID from path, loads album-themes config asynchronously, and resolves `effectiveTheme = albumOverride ?? userStoredTheme`. `isDark`, `isLight`, `isOriginal` now derive from `effectiveTheme`.

- **Config files:** Created `frontend/public/album-themes.json` and `album-themes.json.example` with `defaultTheme` and `albumThemes` structure.

- **Documentation:** Added Per-Album Theme Configuration section to `frontend/docs/user-guides/05-features.md`.

## Behavior

- On home (`/`) and search (`/search`): user's stored theme preference is used.
- On album pages (`/album/7`, `/album/7/image/10`): theme from album-themes config is used if the album has an override; otherwise `defaultTheme` from config (or app default).
- Invalid theme names in config fall back to `defaultTheme`.
- Missing or malformed config file falls back to default config (no overrides).

## Files Modified

- `frontend/src/contexts/ThemeContext.tsx` - Added album override resolution, `effectiveTheme`
- `frontend/src/contexts/ThemeContext.test.tsx` - Wrapped with MemoryRouter, added effectiveTheme and album override tests
- `frontend/src/types/index.ts` - Export AlbumThemesConfig
- `frontend/docs/user-guides/05-features.md` - Per-album theme documentation
- `TODO.md`, `TODO-summarized.md` - Removed completed task

## Files Created

- `frontend/src/types/albumThemes.ts`
- `frontend/src/utils/albumThemesConfig.ts`
- `frontend/src/utils/albumThemesConfig.test.ts`
- `frontend/public/album-themes.json`
- `frontend/public/album-themes.json.example`

# Theme System Architecture

## Overview

The theming system uses CSS custom properties (variables) scoped by a `data-theme` attribute on the document root. Theme state is managed by React Context, persisted to localStorage, and can be overridden per album via a JSON configuration file.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Theme Resolution Flow                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   useLocation()  ──►  getAlbumIdFromPath()  ──►  albumId or null        │
│         │                        │                       │               │
│         │                        │                       ▼               │
│         │                        │         ┌─────────────────────────┐  │
│         │                        │         │ albumId === null?       │  │
│         │                        │         │   YES: user preference  │  │
│         │                        │         │   NO:  load config ────►│  │
│         │                        │         │        getThemeForAlbum │  │
│         │                        │         └─────────────────────────┘  │
│         │                        │                       │               │
│         ▼                        ▼                       ▼               │
│   effectiveTheme = albumOverride ?? validatedTheme (user preference)     │
│         │                                                                 │
│         ▼                                                                 │
│   document.documentElement.setAttribute('data-theme', effectiveTheme)     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
main.tsx
└── HashRouter
    └── ThemeProvider          ← useLocation(), loadAlbumThemesConfig
        └── App
            └── Layout         ← uses useTheme().isOriginal for sidebar
                └── ThemeDropdown  ← uses useTheme().theme, setTheme
```

ThemeProvider must be inside a Router because it uses `useLocation()` to determine the current path and extract album ID for per-album theme resolution.

## Key Modules

### Theme Registry (`frontend/src/config/themes.ts`)

- Defines `THEME_REGISTRY` with name, displayName, description, cssSelector for each theme
- Exports `ThemeName`, `DEFAULT_THEME`, `getTheme()`, `getAllThemes()`, `isValidTheme()`
- Single source of truth for which themes exist

### Theme Context (`frontend/src/contexts/ThemeContext.tsx`)

- `ThemeProvider`: Wraps app; manages user preference (localStorage), resolves effective theme from path + album-themes config
- `useTheme()`: Returns `{ theme, effectiveTheme, setTheme, availableThemes, isDark, isLight, isOriginal }`
- `theme`: User's stored preference (for ThemeDropdown)
- `effectiveTheme`: Theme actually applied (may be album override)
- `isDark`, `isLight`, `isOriginal`: Derived from `effectiveTheme`

### Album Themes Config (`frontend/src/utils/albumThemesConfig.ts`)

- `loadAlbumThemesConfig()`: Fetches `/album-themes.json`, parses, validates, caches
- `getThemeForAlbum(albumId, config)`: Returns theme for album or default
- `getAlbumIdFromPath(pathname)`: Extracts album ID from `/album/7` or `/album/7/image/10`
- Returns default config on 404, parse error, or invalid schema

### CSS Variables (`frontend/src/styles/themes.css`)

- `:root`: Base/fallback (light theme values)
- `[data-theme="light"]`: Explicit light theme
- `[data-theme="dark"]`: Dark theme
- `[data-theme="original"]`: Gallery 2 Classic theme
- Components use `var(--color-text-primary)` etc.; values change when `data-theme` changes

## Theme Application

1. `ThemeProvider` mounts; reads user preference from localStorage
2. On path change, `getAlbumIdFromPath(pathname)` returns album ID or null
3. If album ID: `loadAlbumThemesConfig()` (cached) → `getThemeForAlbum()` → `albumOverrideTheme`
4. `effectiveTheme = albumId === null ? validatedTheme : (albumOverrideTheme ?? validatedTheme)`
5. `useLayoutEffect` calls `applyTheme(effectiveTheme)` → sets `document.documentElement.setAttribute('data-theme', effectiveTheme)`
6. CSS cascade applies variables from matching `[data-theme="..."]` block

## Persistence and Migration

- User preference stored in `localStorage` under key `gallery-theme`
- Old key `gallery-theme-preference` (values: light, dark, system) migrated on first load
- Migration: light→light, dark→dark, system→original
- Migration flag `gallery-theme-migrated` prevents repeated migration

## Error Handling

- Invalid theme in localStorage: fallback to `DEFAULT_THEME`
- Invalid theme in album-themes.json: fallback to config's `defaultTheme` or `DEFAULT_THEME`
- Missing/malformed album-themes.json: use default config (no overrides)
- All errors log warnings in development only

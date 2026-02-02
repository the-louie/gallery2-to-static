# Theming Documentation

This directory contains comprehensive documentation for the gallery application's theming system.

## Contents

- **[Architecture](architecture.md)** — Theme system architecture, data flow, and integration points
- **[Available Themes](themes.md)** — Light, Dark, and Classic (Gallery 2 Classic) theme specifications
- **[CSS Variables Reference](css-variables.md)** — Complete list of CSS custom properties used for theming
- **[Per-Album Configuration](per-album-configuration.md)** — Assigning themes to specific albums via `album-themes.json`
- **[Adding New Themes](adding-themes.md)** — Step-by-step guide for adding new themes to the system
- **[Theme Components](components.md)** — ThemeContext, ThemeDropdown, ThemeSwitcher, and related components

## Quick Reference

| File | Purpose |
|------|---------|
| `frontend/src/config/themes.ts` | Theme registry and validation |
| `frontend/src/contexts/ThemeContext.tsx` | Theme state and per-album resolution |
| `frontend/src/utils/albumThemesConfig.ts` | Per-album config loading |
| `frontend/src/styles/themes.css` | CSS variables for all themes |
| `frontend/public/album-themes.json` | Per-album theme overrides (optional) |

## Key Concepts

- **Theme**: Named visual style (light, dark, classic) applied via `data-theme` on `document.documentElement`
- **Effective theme**: The theme actually applied; may differ from user preference when viewing an album with an override
- **User preference**: Theme selected via ThemeDropdown; persisted in localStorage
- **Per-album override**: Theme assigned to a specific album in `album-themes.json`; takes precedence when viewing that album

# Font Awesome Icons UI Migration

## Summary

Replaced all UI icons with Font Awesome free solid icons for consistency and to support the requested person-cane icon for the classic theme.

## Changes

### Theme Icons (ThemeSwitcher, ThemeDropdown)
- **Classic theme**: Replaced frame/layout SVG with `faPersonCane` (person-cane) per user request.
- **Light theme**: Replaced custom sun SVG with `faSun`.
- **Dark theme**: Replaced custom moon SVG with `faMoon`.
- **ThemeDropdown**: Replaced dropdown arrow SVG with `faChevronDown`, checkmark with `faCheck`.

### SearchBar
- Search icon: `faMagnifyingGlass`.
- Clear icon: `faXmark`.

### Lightbox
- Close: `faXmark`.
- Previous/Next: `faChevronLeft`, `faChevronRight`.
- Zoom in/out/reset: `faPlus`, `faMinus`, `faRotateRight`.
- Error placeholder: `faImage`.

### AlbumCard
- Folder placeholder: `faFolder` (replaced emoji).

### ImageThumbnail
- Error placeholder: `faImage` (replaced emoji).

### ErrorFallback
- Warning icon: `faTriangleExclamation` (replaced emoji).

### OfflineIndicator
- Warning icon: `faTriangleExclamation` (replaced emoji).

### Unchanged
- SortDropdown: Uses inline data-URI SVG for dropdown arrow (minimal, no Font Awesome needed).
- Layout sidebar links: No icons (layout-sidebar-link-icon is a padding class only).

## Dependencies Added

- `@fortawesome/fontawesome-svg-core`
- `@fortawesome/free-solid-svg-icons`
- `@fortawesome/react-fontawesome`

All icons used are from the free tier. Icons are imported individually for tree-shaking.

## Test Updates

- ErrorFallback and OfflineIndicator tests updated to query by `.error-fallback-icon` and `.offline-indicator-icon` instead of emoji text, since Font Awesome renders SVG.

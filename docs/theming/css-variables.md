# CSS Variables Reference

All theme colours and component tokens are defined as CSS custom properties in `frontend/src/styles/themes.css`. Components reference these variables (e.g. `var(--color-text-primary)`) so they adapt when the theme changes.

## Naming Convention

- **Semantic:** `--color-{category}-{element}-{state}` (e.g. `--color-text-primary`, `--color-primary-hover`)
- **Component-specific:** `--{component}-{element}-{property}` (e.g. `--album-card-bg`, `--lightbox-focus`)
- **State variants:** `-hover`, `-focus`, `-active`, `-disabled`

## Variable Categories

### Base / Semantic Colours

| Variable | Purpose |
|----------|---------|
| `--color-primary` | Primary brand colour (buttons, links) |
| `--color-primary-hover` | Primary hover state |
| `--color-primary-active` | Primary active/pressed state |
| `--color-primary-light` | Light variant for backgrounds |
| `--color-primary-dark` | Dark variant |
| `--color-secondary` | Secondary accent |
| `--color-accent` | Call-to-action accent |
| `--color-accent-hover` | Accent hover |

### Backgrounds

| Variable | Purpose |
|----------|---------|
| `--color-background-primary` | Main page background |
| `--color-background-secondary` | Secondary surfaces |
| `--color-background-tertiary` | Tertiary/alternate |

### Text

| Variable | Purpose |
|----------|---------|
| `--color-text-primary` | Primary text |
| `--color-text-secondary` | Secondary text |
| `--color-text-tertiary` | Tertiary/muted text |
| `--color-text-inverse` | Text on dark backgrounds |
| `--color-text-muted` | Muted/disabled text |
| `--color-text` | Alias for primary (FilterPanel, etc.) |
| `--color-background` | Alias for background primary |

### Borders

| Variable | Purpose |
|----------|---------|
| `--color-border` | Default border |
| `--color-border-light` | Light border |
| `--color-border-dark` | Dark border |

### Focus

| Variable | Purpose |
|----------|---------|
| `--color-focus` | Focus ring colour |
| `--color-focus-ring` | Focus ring |
| `--focus-color` | Alias |

### Status Colours

| Variable | Purpose |
|----------|---------|
| `--color-error`, `--color-error-bg`, `--color-error-text` | Error state |
| `--color-success`, `--color-success-bg`, `--color-success-text` | Success state |
| `--color-warning`, `--color-warning-bg`, `--color-warning-text` | Warning state |
| `--color-info`, `--color-info-bg`, `--color-info-text` | Info state |

### Layout

| Variable | Purpose |
|----------|---------|
| `--header-bg`, `--header-border`, `--header-text` | Header |
| `--footer-bg`, `--footer-border`, `--footer-text` | Footer |
| `--skip-link-bg`, `--skip-link-color` | Skip link |

### Component Tokens

Each major component has a set of variables:

- **AlbumCard:** `--album-card-bg`, `--album-card-border`, `--album-card-focus`, etc.
- **AlbumGrid / ImageGrid:** `--album-grid-gap`, `--album-grid-error-*`, etc.
- **ImageThumbnail:** `--image-bg`, `--image-border`, `--image-focus`
- **Lightbox:** `--lightbox-backdrop`, `--lightbox-close-*`, `--lightbox-nav-*`, etc.
- **Breadcrumbs:** `--breadcrumb-link-color`, `--breadcrumb-link-hover-*`, etc.
- **AlbumDetail:** `--album-detail-back-button-*`, `--album-detail-title-color`, etc.
- **ThemeSwitcher:** `--theme-switcher-*`
- **SortDropdown:** `--sort-dropdown-*`

### Gradients

| Variable | Purpose |
|----------|---------|
| `--gradient-bg-start`, `--gradient-bg-end` | Page background gradient |
| `--gradient-card-start`, `--gradient-card-end` | Card gradient |
| `--gradient-cta-start`, `--gradient-cta-end` | CTA button gradient |

### Neutral / Gray Scale

| Variable | Purpose |
|----------|---------|
| `--color-gray-50` … `--color-gray-900` | Gray scale for consistency |

### Shadows and Radius

| Variable | Purpose |
|----------|---------|
| `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl` | Box shadows |
| `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full` | Border radius |

## Theme Blocks

Variables are defined in four places:

1. **`:root`** — Base/fallback (defaults to light)
2. **`[data-theme="light"]`** — Explicit light overrides
3. **`[data-theme="dark"]`** — Dark theme overrides
4. **`[data-theme="classic"]`** — Classic (G2 Classic) overrides

When `document.documentElement` has `data-theme="dark"`, all `[data-theme="dark"]` variables apply. Unset variables inherit from `:root`.

## Transitions

Theme changes use smooth transitions (0.3s) for `background-color`, `color`, `border-color`, `box-shadow`. Transitions are disabled when `prefers-reduced-motion: reduce` is set.

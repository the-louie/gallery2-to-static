# Available Themes

## Light

**Identifier:** `light`

**Description:** Light theme with bright, warm backgrounds and dark text. Uses a 2026-inspired colour palette with muted bases and vivid accents (Terracotta, Navy, Mocha Mousse).

**Characteristics:**
- Background: warm greys (#f5f3ef, #ebe8e2)
- Text: dark brown (#2e2a26)
- Links/accents: Terracotta (#E2725B), Navy (#101585)
- Gradients on cards and backgrounds
- Header and footer: light grey

**CSS selector:** `[data-theme="light"]`

---

## Dark

**Identifier:** `dark`

**Description:** Dark theme with dark backgrounds and light text for low-light environments.

**Characteristics:**
- Background: dark greys (#1a1816, #0d0c0b)
- Text: light grey/white
- Accents: purple/violet (#A78BFA)
- Reduced contrast for comfort in dark settings
- Error states: dark red variants

**CSS selector:** `[data-theme="dark"]`

---

## Classic (Gallery 2 Matrix, as lanbilder.se ran it)

**Identifier:** `classic`

**Description:** Reproduces Gallery 2.0's Matrix theme as lanbilder.se served it in 2006, page for page (THEME-01, Sprint 11). Spec: [frontend/docs/theme-matrix.md](../../frontend/docs/theme-matrix.md); captured pages and CSS: [docs/orig-page](../orig-page/README.md). Earlier versions were built from a CSS reconstructed from screenshots; that analysis (`dev-notes/2026-01-25-1200_original_design_analyzis_1.md`) is superseded.

**Characteristics:**
- Backgrounds: white (#fff), light grey (#eee, #e7e7e7)
- Text: dark grey (#333), base 10px Verdana (62.5%), headings 13px Trebuchet MS
- Links: bold blue (#6b8cb7) with orange underlined hover (#f4560f)
- Metadata: grey (#888), 9px
- Borders: (#ccc)
- Current item in the sidebar peer list: (#0b6cff)

**Layout when Classic is active (`MatrixFrame`, rendered by `Layout`):**
- No app header, footer, theme or sort dropdown
- Nav bar with the breadcrumb (`lanbilder.se » DreamHack » …`, built from the URL by `useMatrixLocation`)
- 175px sidebar column (search, slideshow links, peer list) and the content column
- Footer badges (XHTML 1.0, Gallery 2, Unpossible)
- Below 700px: sidebar under the content, 13px base font

**CSS selector:** `[data-theme="classic"]`

---

## Default Theme

The application default is `classic`. This can be overridden per album via `album-themes.json` (`defaultTheme` field).

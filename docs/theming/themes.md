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

## Original (Gallery 2 Classic)

**Identifier:** `original`

**Description:** Reproduces the Gallery 2 Classic (lanbilder.se) colour palette and semantics. Based on the design analysis of the original Gallery 2 theme.

**Source:** See [dev-notes/2026-01-25-1200_original_design_analyzis_1.md](../dev-notes/2026-01-25-1200_original_design_analyzis_1.md) and [20260125-1200_original-theme-implementation.md](../dev-notes/20260125-1200_original-theme-implementation.md).

**Characteristics:**
- Backgrounds: white (#fff), light grey (#eee, #e7e7e7)
- Text: dark grey (#333)
- Links: blue (#6b8cb7) with orange hover (#f4560f)
- Metadata: grey (#888)
- Borders: (#ccc)
- Focus/current accent: (#0b6cff)
- Typography: Verdana, Arial, Helvetica
- Layout: Two-column with sidebar (200px) when `isOriginal`; search in sidebar, "Album:" prefix on titles
- No gradient backgrounds on root album blocks; solid colours only

**Layout differences when Original is active:**
- Sidebar layout with search block, RSS/Slideshow links
- Site name in header is plain text (not a link)
- Search bar and Sort dropdown moved to sidebar
- Root album blocks: "Album: " prefix before titles
- Background image on root blocks hidden

**CSS selector:** `[data-theme="original"]`

---

## Default Theme

The application default is `original`. This can be overridden per album via `album-themes.json` (`defaultTheme` field).

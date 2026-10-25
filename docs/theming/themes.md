# Available Themes

## Light

**Identifier:** `light` (operator's "modern" themes, redesigned 2026-10-25, Sprint 12 T-11)

Soft off-white page (`#f4f6fb`) with white elevated cards, ink text (`#0f172a`), one accent (blue `#2563eb`) used for links, focus rings and the title mark; a faint blue/indigo glow at the top of the page. System sans stack (`--font-sans`), tight bold headings, 12–16px radii, light shadows. The tokens live in `src/styles/modern.css` (`[data-theme="light"]`), the component restyles under `:is([data-theme="light"], [data-theme="dark"]) …` so the classic theme is untouched (`modern.test.ts` checks every selector).

**Layout:** compact sticky frosted header (site name with a gradient mark, one-line description, search pill, theme and sort dropdowns); content up to 1440px. Root page: a card grid (`auto-fill, minmax(340px, 1fr)`) with the album's highlight photo as a cover band that fades into the card, title, 2-line description, "Date · Owner · Images" line, sub-albums as chips. Album page: breadcrumb pills, "← Up" pill, large title, description, owner/count chips, sub-album cards with 4:3 covers, photo tiles with 12px radius and a hover lift. Lightbox: dark frosted overlay, round translucent buttons. Phones: header wraps with a full-width search, one card per row.

## Dark

**Identifier:** `dark` (Sprint 12 T-11)

Same layout and components as Light with the dark palette: deep navy page (`#0b0f19`) with surfaces `#121826` / `#1a2236`, light text (`#e6edf7`), sky-blue accent (`#38bdf8`), a faint cyan/indigo glow at the top, deeper shadows. Search highlights in amber. Switching: the header dropdown (Light / Dark / Classic); from the classic theme the sidebar's "Theme: modern" button lands in Light.

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

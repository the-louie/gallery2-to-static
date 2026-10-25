# Original Gallery 2 (lanbilder.se) page assets

**Source URL:** https://web.archive.org/web/20071220141404/http://www.lanbilder.se/main.php

**Fetch note:** Direct retrieval of the live Wayback URL returned "Access is forbidden or source is unavailable" when using automated fetch. The files in this folder were therefore reconstructed from:

- Reference screenshots (kept outside the repository, not published), which capture the root album list, album list detail, DreamHack album view, DreamHack Summer 06, album cards, sidebar, and breadcrumbs.
- Standard Menalto Gallery 2 theme structure and selectors (e.g. `#gsHeader`, `#gsLeft`, `#gsRight`, `.giItem`) as described in the screenshot analysis and typical G2 themes.

**Contents:**

- `main.html` — Reconstructed root/main album list page structure (header, sidebar, main content). No Wayback toolbar block; gallery layout and semantics preserved.
- `theme.css` — Reconstructed CSS for layout, colours, and typography derived from the screenshots and consistent with Gallery 2 Classic-style themes.

**Downloaded site (canonical source):** A full capture of the same page was used during development (kept outside the repository, not published). It contains the original Gallery 2 Classic theme CSS (`theme.css`) and all referenced images/scripts. The analysis document was refined using this download to align selectors, colours, and dimensions with the actual site (see “Refinement from downloaded site” in the analysis).

**Usage:** These assets support the design analysis in `docs/dev-notes/2026-01-25-1200_original_design_analyzis_1.md`. For implementation of the Classic theme, treat the analysis document as the primary specification; this folder provides the structural and style reference.

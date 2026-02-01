# Original Gallery 2 (lanbilder.se) design analysis

Design analysis of the lanbilder.se Gallery 2 page (Menalto Gallery 2 Classic–style theme). Source: docs/orig-page/main.html and docs/orig-page/theme.css; cross-checked with reference screenshots in __docs/original-design/. Refined using the downloaded site at __docs/original-design/lanbilder.se.htm and __docs/original-design/lanbilder.se-filer/ (actual Gallery 2 Classic theme.css and HTML). Verified 2026-01-25. A future Classic theme implementation should use this document as the specification; the “Refinement from downloaded site” section is the source-of-truth from the captured page.

---

## Layout

- **High-level structure:** Fixed-width, horizontally centred main container. Top header bar spans full width; below it, two-column layout: narrow left sidebar, wider main content; footer at bottom.
- **Regions:**
  - **Header (`#gsHeader`):** Top strip with optional disclaimer row (e.g. “Varför har vi reklam på Sidan?”) and Login/Register links; below it, breadcrumb row (e.g. “lanbilder.se » DreamHack”).
  - **Sidebar (`#gsLeft`):** Left column containing search block, action links (RSS, View Slideshow, View Slideshow Fullscreen), and hierarchical album list.
  - **Main content (`#gsRight`):** Right column: on root view, site description, root metadata, then vertical list of album rows; on album detail view, album title, description, metadata, then grid of sub-album/item thumbnails.
  - **Footer (`#gsFooter`):** Single line (e.g. “Gallery 2.1”).
- **Layout method:** Float-based. `#gsContainer` wraps `#gsLeft` (float left) and `#gsRight` (margin-left equal to sidebar width). No flex/grid in the reconstructed theme.

---

## Dimensions and proportions

| Element | Value | Source |
|--------|--------|--------|
| Page/body background | Full viewport | theme.css `body` |
| Main container max-width | 950px | theme.css `#gsContainer`; screenshots suggest fixed width ~950–1000px |
| Main container | Centred (`margin: 0 auto`) | theme.css `#gsContainer` |
| Left sidebar width | 160px | theme.css `#gsLeft`; screenshot (Attached_image1) ~160px |
| Main content area | Remaining width (margin-left: 160px) | theme.css `#gsRight` |
| Gutter sidebar/main | Implicit (sidebar border 1px) | theme.css `#gsLeft` border-right |
| Header | No fixed height; padding 4px/6px | theme.css `.gsHeaderTop`, `.gsHeaderMain` |
| Search input width | 140px | theme.css `.gsSearch` |
| Album list thumbnail (root) | ~120×90px (example in HTML) | main.html; visuals ~100–140px wide |
| Album grid item (`.giItem`) | 180px width, padding 10px | theme.css `.giItem` |
| Album detail grid | Multiple columns (screenshots show 3–5 columns) | From __docs/original-design (e.g. Attached_image3, Attached_image6) |

All dimensions above are backed by `docs/orig-page/theme.css` or `main.html` except where noted “screenshot”/“from __docs/original-design”.

---

## Colour scheme

**Source:** `docs/orig-page/theme.css` and __docs/original-design screenshots.

| Role | Colour | Selector / note |
|------|--------|------------------|
| Page background | #E6E6E6 | body |
| Main content / sidebar background | #FFFFFF | #gsContainer, #gsLeft, #gsRight |
| Header background | #EEEEEE | #gsHeader |
| Footer background | #EEEEEE | #gsFooter |
| Primary text | #333333 | body, .gsBlock h2, .gsAlbumTitle a, .gsPagination |
| Secondary / metadata text | #666666 | .gsHeaderDisclaimer, .gsMetadata, .gsAlbumMeta, .giItem .giMeta, #gsFooter |
| Link (default) | #0066CC | a, .gsHeaderLinks a, .gsBreadcrumb a |
| Header bottom border | #CFCFCF | #gsHeader border-bottom |
| Section borders / dividers | #CCCCCC | #gsLeft border-right, .gsBlock, .gsSearch, .gsAlbumList, .gsAlbumRow, .giItem |
| Thumbnail border | #CCCCCC | .gsAlbumThumb img, .giItem img |
| Active sidebar link (album list) | Bold blue; optional background | From screenshot (Attached_image3, Attached_image6): active item e.g. “10. DreamHack” / “13. DreamHack…” — inferred from screenshot: background can be light blue (#DDEEFF or similar); not in reconstructed theme.css, document as “inferred from screenshot” |

Hover states were not verified from archived screenshots.

---

## Typography

| Element | Font family | Size | Weight | Source |
|---------|-------------|------|--------|--------|
| Body | Arial, Helvetica, Verdana, sans-serif | 12px | normal | theme.css body |
| Header disclaimer / small | — | 11px | normal | .gsHeaderTop |
| Breadcrumb | — | 12px | normal | .gsHeaderMain, .gsBreadcrumb |
| Sidebar block title (Search, site name) | — | 14px | bold | .gsBlock h2 |
| Sidebar links / content | — | 12px | normal | .gsBlockContent |
| Main description | — | 12px | normal | .gsDescription |
| Root/metadata line | — | 11px | normal | .gsMetadata |
| Album title (root list) | — | 14px | bold | .gsAlbumTitle |
| Album description / link line | — | 12px | normal | .gsAlbumInfo p |
| Album metadata (Date, Size, Views) | — | 11px | normal | .gsAlbumMeta |
| Subalbums heading | — | 12px | bold | .gsSubalbums strong |
| Subalbum links | — | 12px | normal | .gsSubalbums (inherited) |
| Pagination | — | 11px | normal | .gsPagination |
| Footer | — | 11px | normal | #gsFooter |
| Grid item title (album detail) | — | 14px | bold | .giItem .giTitle |
| Grid item description | — | 12px | normal | .giItem .giDesc |
| Grid item metadata | — | 11px | normal | .giItem .giMeta |

Font stack from theme.css; hierarchy consistent with __docs/original-design (titles bold and larger, metadata smaller and grey).

---

## Components

- **Search box:** Wrapped in `.gsBlock` in `#gsLeft`. Heading “Search the Gallery” (`.gsBlock h2`). Input `.gsSearch`: background not set in theme.css (default white per screenshots), 1px solid #CCCCCC, width 140px, padding 4px. “Advanced Search” link below (blue, 12px). See theme.css .gsBlock, .gsSearch; main.html first .gsBlock.
- **Album list (root view):** Container `.gsAlbumList`; each row `.gsAlbumRow` with bottom border #CCCCCC. Row contains: `.gsAlbumThumb` (float left, image with #CCCCCC border), `.gsAlbumInfo` (title “Album: [link]”, description, `.gsAlbumMeta`), `.gsSubalbums` (“Subalbums:” + list of links). main.html .gsAlbumRow; theme.css .gsAlbumThumb, .gsAlbumInfo, .gsAlbumMeta, .gsSubalbums.
- **Thumbnails (root list):** Image inside .gsAlbumThumb; border 1px solid #CCCCCC; approximate size from content ~120×90px in example.
- **Subalbum list:** `.gsSubalbums` with `<strong>Subalbums:</strong>` and `<ul>` of links; list-style none. Links blue (#0066CC), 12px.
- **Breadcrumbs:** In header (`.gsHeaderMain`); segment separator »; links blue. main.html .gsBreadcrumb; theme.css .gsBreadcrumb a.
- **Pagination:** Text “Page: 1” in `.gsPagination` (11px, #333333), left-aligned at bottom of #gsRight. theme.css .gsPagination; main.html.
- **Album detail grid:** Items with class `.giItem`: floated, 180px width, white background, 1px solid #CCCCCC, padding 10px; image on top (centred, border #CCCCCC); then .giTitle (bold), .giDesc, .giMeta. Grid column count not fixed in CSS; screenshots show about 3–5 columns. theme.css .giItem; __docs/original-design Attached_image3, Attached_image5, Attached_image6.
- **Action links (sidebar):** “RSS Feed for this Album”, “View Slideshow”, “View Slideshow (Fullscreen)” in .gsBlockContent; block display, blue. main.html second .gsBlock.
- **Album navigation list (sidebar):** Third .gsBlock; h2 “lanbilder.se”; numbered album links. Active item style (bold/background) inferred from screenshots; see Colour scheme.

---

## Refinement from downloaded site (source-of-truth)

The following details are taken directly from `__docs/original-design/lanbilder.se.htm` and `__docs/original-design/lanbilder.se-filer/theme.css`. Use them as the canonical reference for the Classic theme; the sections above retain the simplified/reconstructed model for quick reference.

### Actual HTML structure

- **Page container:** `#gallery` (not #gsContainer). Body has class `gallery`.
- **Top:** Disclaimer row (e.g. “Varför har vi reklam på Sidan?”) and ad slot appear above the gallery bar; they are outside `#gsHeader`. `#gsHeader` is present but empty in the capture.
- **Nav bar:** `#gsNavBar` with class `gcBorder1`. Contains:
  - `div.gbSystemLinks` — Login and Register links (spans with class `block-core-SystemLink`).
  - `div.gbBreadCrumb` → `div.block-core-BreadCrumb` → `span.BreadCrumb-1` for “lanbilder.se”.
- **Layout:** Table with two columns: `<td id="gsSidebarCol">` and a sibling `<td>` for content. Not float-based in the source.
- **Sidebar:** `#gsSidebar` (inside first td), class `gcBorder1`. Contains:
  - `div.block-search-SearchBlock.gbBlock` — search form; input `#searchCriteria`, `size="18"`, class `textbox`.
  - `div.block-core-ItemLinks.gbBlock` — RSS Feed, View Slideshow, View Slideshow (Fullscreen) links (class `gbAdminLink` etc.).
  - (In other views) `div.block-core-PeerList` for album tree; current item has `span.current` (styled #0b6cff in theme.css).
- **Main content:** `#gsContent` with class `gcBorder1`. Root album view:
  - `div.gbBlock.gcBackground1` — site title `<h2>`, `.giDescription`, and `.block-core-ItemInfo.giInfo` (date, owner, size as `.date.summary`, `.owner.summary`, `.size.summary`).
  - `div.gbBlock` → table `#gsThumbMatrix` (width 100%). Each row: `<td class="giAlbumCell gcBackground1">` (thumbnail cell), `<td>` (title/description/info), `<td class="tree">` (subalbums).
- **Album row (root list):** Thumbnail cell contains an anchor and `img.giThumbnail` with `width="150"` `height="150"`. Middle cell: `p.giTitle` (“Album: ” plus bold title), `p.giDescription`, `div.block-core-ItemInfo.giInfo` with `.date.summary`, `.size.summary`, `.viewCount.summary`. Subalbum cell: `h4` “Subalbums:”, then `ul` with `li` and `a`.
- **Footer:** `#gsFooter` (padding-top 4px in theme.css). “Gallery 2.1” / pagination live in or below this.

### Actual CSS (theme.css in lanbilder.se-filer)

- **#gallery:** padding 8px; font-family Verdana, Arial, Helvetica, sans-serif; font-size 62.5%; color #333; background-color #fff. body.gallery: background #fff.
- **Backgrounds:** .gcBackground1 #eee; .gcBackground2 #e7e7e7.
- **Borders:** .gcBorder1 border 0 solid #ccc; .gcBorder2 0 solid #888.
- **#gsNavBar:** border-top-width 1px; border-bottom-width 1px. div.gbBreadCrumb: padding 4px 8px; font-size 1.1em; font-weight bold. div.gbSystemLinks: padding 4px 6px; float right.
- **#gsSidebar:** border-right-width 1px; width 175px; overflow hidden. #gsSidebarCol: width 1% (shrink-to-fit).
- **Links:** #gallery a — font-weight bold; text-decoration none; color #6b8cb7. a:hover — underline; color #f4560f. a:active — none; color #f9c190.
- **Headings:** #gallery h2, h3, h4 — font-family "Trebuchet MS", Arial, Verdana, Helvetica, sans-serif. .giTitle, #gallery h2, h3, h4 — font-size 1.3em; font-weight bold.
- **Text:** .giDescription — font-size 1.1em; line-height 1.4em. .giInfo — font-size 0.9em; color #888. .giSubtitle — 0.9em.
- **Album cells:** td.giAlbumCell, td.giItemCell — padding 1em; text-align center; width 1%. #gallery img — border-width 0 (no visible border on thumbs in theme).
- **Sidebar peer list (current album):** div#gsSidebar div.block-core-PeerList span.current — color #0b6cff.
- **Focus:** #gallery input:focus, textarea:focus — background #ffc; color #000.
- **#gsFooter:** padding-top 4px.

### Dimensions and colours (from downloaded theme.css)

| Item | Value | Selector |
|------|--------|----------|
| Sidebar width | 175px | #gsSidebar |
| Base font size | 62.5% | #gallery |
| Body text colour | #333 | #gallery |
| Page/section background | #fff | body.gallery, #gallery |
| Block background (alternate) | #eee | .gcBackground1 |
| Border colour | #ccc | .gcBorder1 |
| Link default | #6b8cb7 | #gallery a |
| Link hover | #f4560f | #gallery a:hover |
| Link active | #f9c190 | #gallery a:active |
| Metadata / secondary text | #888 | .giInfo |
| Current album (sidebar) | #0b6cff | div#gsSidebar div.block-core-PeerList span.current |
| Thumbnail size (root list) | 150×150 | img.giThumbnail in HTML |

Layout is table-based; sidebar column has width 1% so it shrinks to content (175px from #gsSidebar). Album list rows use #gsThumbMatrix; no fixed main column width in theme.css.

---

## Verification

- **Layout:** Layout and Dimensions sections checked against docs/orig-page/main.html and theme.css. Selectors #gsHeader, #gsLeft, #gsRight, .gsAlbumRow, .gsAlbumThumb, .gsAlbumInfo, .gsSubalbums, .giItem exist in the reconstructed docs/orig-page; dimensions match the reconstructed theme.css.
- **Refinement section:** Every claim in “Refinement from downloaded site” was verified against __docs/original-design/lanbilder.se.htm and __docs/original-design/lanbilder.se-filer/theme.css. Actual structure (#gallery, #gsNavBar, #gsSidebarCol, #gsSidebar, #gsContent, #gsThumbMatrix, .giAlbumCell, .giThumbnail, .giTitle, .giDescription, .giInfo, .tree), colours (#6b8cb7, #f4560f, #eee, #888, #0b6cff), and dimensions (175px sidebar, 150×150 thumbnails, 62.5% base font) match the downloaded files.
- **Colours:** Reconstructed theme used #0066CC for links; the actual theme uses #6b8cb7 (default), #f4560f (hover), #f9c190 (active). Metadata #888 and current-album #0b6cff are from the real theme.css.
- **Typography:** Real theme uses 62.5% base, 1.3em for titles, 1.1em for description, 0.9em for .giInfo; font stack Verdana, Arial, Helvetica and “Trebuchet MS” for headings.
- **Components:** Reconstructed components approximate the layout; the refinement section documents the true selectors (e.g. .block-search-SearchBlock, #searchCriteria, .block-core-ItemLinks, .block-core-ItemInfo.giInfo, td.tree with h4 + ul).
- **Screenshot limitation:** Hover states and some interactive states could not be verified from the archived screenshots; hover/active colours are from theme.css.

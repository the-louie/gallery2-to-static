# TODO

## Make Root Album List Block Title (h2) Twice as Large

**Status:** Pending
**Priority:** Low
**Complexity:** Trivial
**Estimated Time:** 5–10 minutes

### Description
Increase the font size of the root album block title so that `h2.root-album-list-block-title` is twice as large as it is now. This applies to the album title heading on the root album page (each block showing a root-level album with title, description, subalbums).

### Context
- Component: `frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx` — the title is rendered as `<h2 className="root-album-list-block-title">` with a link inside.
- Styles: `frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.css` — `.root-album-list-block-title` currently uses `font-size: 1.25rem` (base). In a media query (e.g. narrower viewport), it is set to `font-size: 1.125rem`. “Twice as large” means double those values (e.g. 2.5rem and 2.25rem respectively), unless the design intent is to double only the base and scale the breakpoint proportionally.

### Requirements

#### Implementation Tasks
- In `RootAlbumListBlock.css`, update `.root-album-list-block-title` font-size to double the current value(s). Current base: `1.25rem` → use `2.5rem`. If there is a media-query override (e.g. `1.125rem`), double it to `2.25rem` to keep hierarchy consistent.
- Optionally adjust line-height, margin, or padding if the larger title affects layout (e.g. clipping, overlapping). No change to HTML or component logic.

### Deliverable
`h2.root-album-list-block-title` displays at twice the current font size on the root album page.

### Testing Requirements
- Visual check on root album view: title text is noticeably larger and readable; no layout break or overlap with description/subalbums.
- If responsive breakpoints exist, confirm the doubled size is applied at all breakpoints where the title is styled.

### Technical Notes
- File: `frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.css`. Only CSS changes; no TypeScript/React changes required.

---

## Fix HTML Entity &#039; Not Decoded in Album 23390 and Parent Titles

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 45–60 minutes

### Description
Album 23390.json (and its parent albums in the breadcrumb, down to root) do not decode the HTML entity `&#039;` (apostrophe) correctly in the title. The entity appears literally in the UI instead of as a single quote (`'`)—e.g. "DigitalChaos&#039;05" instead of "DigitalChaos'05". The fix must ensure the apostrophe entity is decoded in the current album title and in every breadcrumb segment title when displayed.

### Context
- `&#039;` is the decimal HTML entity for apostrophe ('); `&#39;` is equivalent without the leading zero. Both should render as a single quote.
- Backend: `backend/decodeHtmlEntities.ts` is used when building album metadata (e.g. in `sqlUtils.ts` for `albumTitle`, and when building breadcrumb items). It already lists `['&#039;', "'"]` and `['&#39;', "'"]` in NAMED_ENTITIES and has a generic `&#(\d+);` replacement. If the stored or incoming title uses a variant (e.g. no semicolon, or different escaping in JSON), it may not match.
- Frontend: `frontend/src/utils/decodeHtmlEntities.ts` has the same mappings. Display typically goes through `parseBBCodeDecoded()`, which calls `decodeHtmlEntities(text)` before BBCode parsing. So titles shown via `parseBBCodeDecoded(item.title)` or `parseBBCodeDecoded(metadata.albumTitle)` should be decoded. If the backend emits the raw entity in JSON (e.g. due to a code path that doesn’t run decode, or double-encoding), the frontend must decode it.
- Places that show album/breadcrumb titles: `Breadcrumbs` (each `item.title`), `AlbumDetail` (metadata title), `RootAlbumListBlock` (album title, subalbum labels), `AlbumCard`, etc. All should show decoded text.
- Data: `data/23390.json` metadata has `albumTitle` and `breadcrumbPath[].title`. If the bug is “still shows &#039;”, then either the JSON still contains the literal entity (backend not decoding in the export that produced this file) or the frontend has a path that doesn’t run decode.

### Requirements

#### Implementation Tasks
- Confirm where the literal `&#039;` appears: in the emitted JSON (backend) or only in the UI (frontend display path not decoding).
- Backend: Ensure every place that sets `albumTitle` or breadcrumb item `title` runs through `decodeHtmlEntities` (or equivalent) and that `&#039;` / `&#39;` and numeric `&#39;` / `&#039;` are decoded. Check `backend/index.ts` (breadcrumb construction, metadata), `backend/sqlUtils.ts` (getAlbumInfo, getChildren), and `backend/decodeHtmlEntities.ts` (support all common apostrophe entity forms, including `&#039;` with no semicolon if present in data).
- Frontend: Ensure every display of album title and breadcrumb item title uses a path that decodes HTML entities (e.g. `decodeHtmlEntities(...)` or `parseBBCodeDecoded(...)`). Verify Breadcrumbs, AlbumDetail header, RootAlbumListBlock, AlbumCard, and any other title render paths.
- Add or extend a unit test that asserts `decodeHtmlEntities('DigitalChaos&#039;05')` (and `&#39;`, and `&#039` without semicolon if applicable) equals `DigitalChaos'05`. Fix backend and/or frontend so album 23390 and its breadcrumb show "DigitalChaos'05" (and correct decoding for parent titles).

### Deliverable
Album 23390 and all parent albums in the breadcrumb show the apostrophe correctly (e.g. "DigitalChaos'05"); no literal `&#039;` or `&#39;` in titles anywhere in the chain to root.

### Testing Requirements
- Load album 23390 (or equivalent data with `&#039;` in title); confirm page title and breadcrumb show "DigitalChaos'05" and parent titles are decoded.
- Unit test: `decodeHtmlEntities('x&#039;y')` and `decodeHtmlEntities('x&#39;y')` return `x'y`; run for both backend and frontend decode modules if they are separate.
- Regression: other entities (e.g. &auml;, &#228;) still decode correctly.

### Technical Notes
- Backend and frontend each have a `decodeHtmlEntities` module; keep behavior aligned for entity set and order (e.g. `&amp;` first).
- If the source data has the entity without a trailing semicolon (`&#039`), add support or normalize before decode so it still decodes.

---

## Make Root Album List Block Entire Article Link to Album (With Exclusions)

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 45–60 minutes

### Description
On the root album page, make the whole `article.root-album-list-block` act as a link to that album's page so that clicking anywhere on the block (title, description, metadata, background) navigates to `/album/{album.id}`. **Important exclusions:** (1) Any "link to homepage for the event" (the optional website link extracted from BBCode in summary/description, currently `.root-album-list-block-website-link`) must remain a separate control—clicks on it must open the external URL and must not navigate to the album. (2) The entire `section.root-album-list-block-subalbums` must be excluded: clicks on that section (including subalbum links and "...and more!") must not navigate to the parent album; subalbum links must continue to go to their respective `/album/{sub.id}` or stay as-is.

### Context
- Component: `frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx`. The block currently has a title link (`.root-album-list-block-title-link`) and, in original theme, a thumb link—both to the album. The rest of the block (description, metadata, background) is not clickable as a whole.
- The "event homepage" link is rendered when `extUrl` is set (from `extractUrlFromBBCode(album.summary ?? album.description)`), in a paragraph with `.root-album-list-block-website-link` (external `href`, `target="_blank"`, `rel="noopener noreferrer"`).
- The subalbums section (`.root-album-list-block-subalbums`) contains a list of links to child albums (`.root-album-list-block-subalbum-link`) and optionally "...and more!" text.
- Goal: single large click target for "open this album" while keeping the website link and subalbums section as distinct click targets with their current behavior.

### Requirements

#### Implementation Tasks
- In `RootAlbumListBlock.tsx`, implement "whole block links to album" with exclusions. Acceptable approaches (choose one that fits project patterns):
  - **Link wrapper:** Wrap the parts of the article that should link to the album in a single `<Link to={linkTo}>` (or an anchor with equivalent routing). Do not wrap the website link paragraph or the `section.root-album-list-block-subalbums`; keep them as siblings (or outside the wrapper) so their links handle clicks.
  - **Click handler:** Add a click handler on the article that navigates to `linkTo` when the click target is not inside `.root-album-list-block-website-link` or `.root-album-list-block-subalbums`; use `event.preventDefault()` / `event.stopPropagation()` only where needed so the website link and subalbum links work normally.
- Ensure the optional "event homepage" link (`.root-album-list-block-website-link`) always opens the external URL and never triggers navigation to the album page.
- Ensure the entire subalbums section (`.root-album-list-block-subalbums`) is excluded: clicks on subalbum links go to the subalbum; no part of that section should trigger navigation to the parent album.
- Preserve accessibility: avoid nested links; if using a wrapper link, ensure it does not contain another `<a>` or `<Link>` (so exclude website link and subalbums from the wrapper). If using a click handler, ensure keyboard accessibility (e.g. role and tabIndex if the article becomes focusable) and that focusable elements inside exclusions retain their behavior.
- Preserve existing ARIA and semantics (e.g. `aria-labelledby`, `aria-label` on sections).

### Deliverable
On the root album view, clicking anywhere on `article.root-album-list-block` except the event website link and the subalbums section navigates to the album page; the website link and subalbums section keep their current behavior.

### Testing Requirements
- Click on block area (title, description, metadata, background/inner area not in exclusions) navigates to `/album/{album.id}`.
- Click on "event homepage" / website link opens the external URL (same tab or new tab per current implementation); does not navigate to album.
- Click on a subalbum link in `section.root-album-list-block-subalbums` navigates to that subalbum's page; does not navigate to the parent album.
- No nested interactive elements (no link inside link); keyboard and screen reader behavior remain correct.
- Update or add tests in `RootAlbumListBlock.test.tsx` as needed for the new behavior and exclusions.

### Technical Notes
- File: `frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx`. Styling in `RootAlbumListBlock.css` may need minor updates (e.g. cursor, hover) if the block or a wrapper becomes the clickable area.
- The block has two main content regions: `.root-album-list-block-main` (album info) and `.root-album-list-block-subalbums`. The wrapper link or clickable area must include only the main section minus the website paragraph, and must exclude the subalbums section; the thumb link in original theme can remain or be merged into the same "block link" behavior so long as nested links are avoided.

---

## Place Gallery Order Dropdown to the Right of Theme Selector

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30–45 minutes

### Description
The Gallery order dropdown (SortDropdown) is currently placed below the theme selector dropdown in the header when the layout wraps or on certain viewports. It should instead be placed to the right of the theme selector dropdown so both controls appear on the same horizontal row.

### Context
- In `Layout.tsx`, the header actions area (`.layout-header-actions`) contains, in order: SearchBar (when not original theme), ThemeDropdown, SortDropdown.
- `.layout-header-actions` uses `display: flex`, `flex-wrap: wrap`, and `justify-content: flex-end`. When space is limited, the SortDropdown wraps to a new line and appears below the ThemeDropdown.
- Layout test in `Layout.test.tsx` asserts “sort dropdown is positioned after theme dropdown” (DOM order); the requirement is to preserve that order but change visual placement so the two dropdowns are side-by-side (theme left, gallery order right).

### Requirements

#### Implementation Tasks
- In `frontend/src/components/Layout/Layout.css`: Ensure the theme selector and Gallery order dropdown stay on one row. Options (choose one or combine as needed):
  - Wrap ThemeDropdown and SortDropdown in a flex container that has `flex-wrap: nowrap` (would require a wrapper in Layout.tsx) so they never wrap independently, or
  - Adjust `.layout-header-actions` (or a new subgroup class) so that the two dropdowns are in a non-wrapping row (e.g. a wrapper div with `display: flex; flex-wrap: nowrap;` around ThemeDropdown and SortDropdown only), allowing the search bar to wrap separately if needed.
- Preserve DOM order: ThemeDropdown then SortDropdown (accessibility and tests).
- Preserve responsive behavior: on very small screens, ensure the two dropdowns remain side-by-side where possible, or document any intentional stacking and when it occurs.
- No change to Layout.test.tsx assertion that sort dropdown is after theme dropdown in DOM order; update or add a test only if checking visual position (e.g. getBoundingClientRect or visible layout) is desired.

### Deliverable
Theme selector dropdown and Gallery order dropdown appear in a single horizontal row (theme left, gallery order right) in the header; layout/styling only, no change to component behavior.

### Testing Requirements
- Visual check: at desktop and tablet widths, both dropdowns are on the same row to the right of the search bar.
- Confirm DOM order remains SearchBar → ThemeDropdown → SortDropdown.
- Existing Layout tests (including theme dropdown and sort dropdown presence and order) still pass.
- If a viewport exists where they must stack, confirm it is intentional and document or add a simple test.

### Technical Notes
- `Layout.css`: `.layout-header-actions` currently uses `flex-wrap: wrap`; consider a wrapper around the two dropdowns with `flex-wrap: nowrap` so only the group (search vs dropdowns) wraps, not the dropdowns relative to each other.
- Component files: `frontend/src/components/Layout/Layout.tsx`, `frontend/src/components/Layout/Layout.css`.

---

## Add highlightThumbnailUrlPath to Album Children (highlightImageId / first-descendant)

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 2–3 hours

### Description
Add `highlightThumbnailUrlPath` to child objects that are albums (`GalleryAlbumItem`) in album JSON, using the same URL path convention as existing `thumbnailUrlPath`. The thumbnail source must be: (1) the image designated by `highlightImageId` in the database when present, or (2) when no highlight image is set, the first descendant image found by repeatedly taking the first child until an image (`GalleryPhotoItem`) is reached—that image’s thumbnail is then used as the highlight thumbnail for the album (and conceptually for ancestors when resolving recursively).

### Context
- Album children currently have `thumbnailUrlPath` (from the first direct photo in the album via `findFirstPhoto`) and `highlightImageUrl` (full-size URL from recursive first-image fallback; no `highlightImageId` in schema today).
- Goal: `highlightThumbnailUrlPath` on album children should be the thumbnail version of the same image used for highlight (either highlight-image or first-descendant image), so parent lists can show a consistent thumbnail.

### Requirements

#### Implementation Tasks
- In `backend/index.ts`, when building album child entries (`GalleryAlbumItem`) in `processedChildrenWithThumbnails`:
  - Resolve the “highlight image” for the album: if the database exposes a `highlightImageId` (or equivalent) for the album, load that photo and use it; otherwise resolve “first descendant image” by traversing: get children of the album, take the first child; if it is an album, recurse into it (first child again); repeat until the first child is a `GalleryPhotoItem`, then use that image.
  - From that resolved image, compute the thumbnail URL path with the same convention as current `thumbnailUrlPath` (same `uipath`/dir and `getThumbTarget(cleanedTitle, rawPath, thumbPrefix)`).
  - Add `highlightThumbnailUrlPath` to the album child object. If no highlight image can be resolved (empty album or no images in subtree), omit the field or set per existing convention.
- Add optional `highlightThumbnailUrlPath?: string | null` to `Child` in `backend/types.ts` for album children if not already present from the image-children todo, and document it.
- If `highlightImageId` is not yet in the schema: either add a DB/schema prerequisite to the todo or implement the first-descendant traversal first and add highlightImageId support when the column exists.

#### Behavior Summary
- **highlightImageId available:** use that photo’s thumbnail for `highlightThumbnailUrlPath`.
- **No highlightImageId:** use first-descendant image (first child; if album, first child of that album; repeat until image); use that image’s thumbnail for `highlightThumbnailUrlPath`.
- Path format: same as existing `thumbnailUrlPath` (directory + `getThumbTarget` filename).

### Deliverable
Album JSON children of type `GalleryAlbumItem` include `highlightThumbnailUrlPath` when a highlight image (or first-descendant image) can be resolved; backend types updated; behavior unchanged when no image is found.

### Testing Requirements
- Album with `highlightImageId` set: `highlightThumbnailUrlPath` matches the thumbnail URL of that photo.
- Album without `highlightImageId`, with direct photos: same as current behavior (first photo’s thumbnail); optionally assert `highlightThumbnailUrlPath` equals current `thumbnailUrlPath` where applicable.
- Album without `highlightImageId` and no direct photos but subalbums: traverse to first descendant image; assert `highlightThumbnailUrlPath` is the thumbnail of that image.
- Album with no images in subtree: no `highlightThumbnailUrlPath` or null.
- Confirm existing `highlightImageUrl` and current `thumbnailUrlPath` semantics remain correct.

### Technical Notes
- Current code uses `findFirstPhoto(albumChildren)` for album thumbnail; first-descendant logic extends this by recursing into child albums when the first child is an album.
- Reuse existing path helpers: `getThumbTarget`, `cleanup_uipathcomponent`, and the same directory construction used for `thumbnailUrlPath`. The UI path for the thumbnail is the album’s `uipath` (and the resolved photo’s pathComponent for building the full path to the image).
- If the Gallery 2 schema does not yet have `highlightImageId`, document that in the todo or implement only the first-descendant path until the column is added.

---

## Implement Per-Album Theme Configuration

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 4-5 hours

### Description
Implement per-album theme configuration system that allows each album to have either no theme assigned (uses default theme) or a specific theme. If a specific theme is assigned but doesn't exist, fallback to default theme. Configuration is stored in a JSON file optimized for human editing.

### Requirements

#### Research Tasks
- Research JSON configuration file patterns for human editing (comments, formatting, validation)
- Research theme lookup and application patterns in React context
- Research album ID matching strategies (string vs number, path-based)
- Research configuration file location and loading strategies (static import vs fetch)
- Research configuration validation and error handling patterns

#### Implementation Tasks
- Create `album-themes.json` configuration file in project root with human-friendly structure
- Design JSON schema: default theme field and album themes mapping (album ID → theme name)
- Create TypeScript types/interfaces for theme configuration
- Create utility function to load and parse theme configuration file
- Implement theme lookup function: get theme for album ID with fallback to default
- Extend ThemeContext to support per-album theme lookup
- Integrate per-album theme resolution in AlbumDetail and routing components
- Add configuration validation (theme names must exist, album IDs must be valid)
- Handle configuration loading errors gracefully (fallback to default theme)
- Add configuration file example/documentation
- Write tests for theme configuration loading
- Write tests for theme lookup with fallback logic
- Write tests for invalid configuration handling

### Deliverable
Per-album theme configuration system with JSON file and theme resolution logic

### Testing Requirements
- Verify albums without theme assignment use default theme
- Check albums with valid theme assignment use specified theme
- Ensure albums with invalid theme assignment fallback to default
- Verify configuration file parsing handles various formats correctly
- Check error handling when configuration file is missing or malformed
- Review configuration file is easy to edit manually

### Technical Notes
- Configuration file should be optimized for human editing (clear structure, comments if possible, readable formatting)
- Theme lookup should be efficient (consider caching parsed configuration)
- Fallback logic is critical: invalid themes must not break the application
- Configuration validation should provide clear error messages
- JSON file location should be easily accessible for manual editing
- Theme resolution should integrate seamlessly with existing ThemeContext

---


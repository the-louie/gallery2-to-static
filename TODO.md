# TODO

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
- Layout test in `Layout.test.tsx` asserts "sort dropdown is positioned after theme dropdown" (DOM order); the requirement is to preserve that order but change visual placement so the two dropdowns are side-by-side (theme left, gallery order right).

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
Add `highlightThumbnailUrlPath` to child objects that are albums (`GalleryAlbumItem`) in album JSON, using the same URL path convention as existing `thumbnailUrlPath`. The thumbnail source must be: (1) the image designated by `highlightImageId` in the database when present, or (2) when no highlight image is set, the first descendant image found by repeatedly taking the first child until an image (`GalleryPhotoItem`) is reached—that image's thumbnail is then used as the highlight thumbnail for the album (and conceptually for ancestors when resolving recursively).

### Context
- Album children currently have `thumbnailUrlPath` (from the first direct photo in the album via `findFirstPhoto`) and `highlightImageUrl` (full-size URL from recursive first-image fallback; no `highlightImageId` in schema today).
- Goal: `highlightThumbnailUrlPath` on album children should be the thumbnail version of the same image used for highlight (either highlight-image or first-descendant image), so parent lists can show a consistent thumbnail.

### Requirements

#### Implementation Tasks
- In `backend/index.ts`, when building album child entries (`GalleryAlbumItem`) in `processedChildrenWithThumbnails`:
  - Resolve the "highlight image" for the album: if the database exposes a `highlightImageId` (or equivalent) for the album, load that photo and use it; otherwise resolve "first descendant image" by traversing: get children of the album, take the first child; if it is an album, recurse into it (first child again); repeat until the first child is a `GalleryPhotoItem`, then use that image.
  - From that resolved image, compute the thumbnail URL path with the same convention as current `thumbnailUrlPath` (same `uipath`/dir and `getThumbTarget(cleanedTitle, rawPath, thumbPrefix)`).
  - Add `highlightThumbnailUrlPath` to the album child object. If no highlight image can be resolved (empty album or no images in subtree), omit the field or set per existing convention.
- Add optional `highlightThumbnailUrlPath?: string | null` to `Child` in `backend/types.ts` for album children if not already present from the image-children todo, and document it.
- If `highlightImageId` is not yet in the schema: either add a DB/schema prerequisite to the todo or implement the first-descendant traversal first and add highlightImageId support when the column exists.

#### Behavior Summary
- **highlightImageId available:** use that photo's thumbnail for `highlightThumbnailUrlPath`.
- **No highlightImageId:** use first-descendant image (first child; if album, first child of that album; repeat until image); use that image's thumbnail for `highlightThumbnailUrlPath`.
- Path format: same as existing `thumbnailUrlPath` (directory + `getThumbTarget` filename).

### Deliverable
Album JSON children of type `GalleryAlbumItem` include `highlightThumbnailUrlPath` when a highlight image (or first-descendant image) can be resolved; backend types updated; behavior unchanged when no image is found.

### Testing Requirements
- Album with `highlightImageId` set: `highlightThumbnailUrlPath` matches the thumbnail URL of that photo.
- Album without `highlightImageId`, with direct photos: same as current behavior (first photo's thumbnail); optionally assert `highlightThumbnailUrlPath` equals current `thumbnailUrlPath` where applicable.
- Album without `highlightImageId` and no direct photos but subalbums: traverse to first descendant image; assert `highlightThumbnailUrlPath` is the thumbnail of that image.
- Album with no images in subtree: no `highlightThumbnailUrlPath` or null.
- Confirm existing `highlightImageUrl` and current `thumbnailUrlPath` semantics remain correct.

### Technical Notes
- Current code uses `findFirstPhoto(albumChildren)` for album thumbnail; first-descendant logic extends this by recursing into child albums when the first child is an album.
- Reuse existing path helpers: `getThumbTarget`, `cleanup_uipathcomponent`, and the same directory construction used for `thumbnailUrlPath`. The UI path for the thumbnail is the album's `uipath` (and the resolved photo's pathComponent for building the full path to the image).
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


# TODO

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

## Root Album List View with Rich Metadata

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 3-4 hours

### Description
Update the root album (home page) to use a **list view** instead of the current grid, with additional information per album matching the original Gallery 2 / lanbilder.se design. This applies **only when viewing the root album** (e.g. HomePage or `/`); nested albums keep the existing grid layout. Each root-level album entry should show: thumbnail, album title, description, optional external link (when present in summary/description), metadata (date, size, owner), and a "Subalbums:" section listing immediate child albums as clickable links. Reference: [lanbilder.se root view (Wayback Machine)](https://web.archive.org/web/20071220141404/http://www.lanbilder.se/main.php).

### Requirements

#### Research Tasks
- Review current HomePage and AlbumGrid usage for root album display
- Review Child/Album type: `title`, `description`, `summary`, `ownerName`, `timestamp`, `pathComponent`, `hasChildren`
- Review how to load immediate child albums for each root-level album (e.g. `loadAlbum(albumId)` for each, or batch)
- Analyze original design: two-column layout (album block left, subalbums list right), "Album: [Name]" label, metadata rows (Date, Size, Views)
- Check if "Size" (direct items + total items) or "Views" exist in current data or backend; implement or omit if not available
- Review routing: HomePage vs AlbumDetail for root (e.g. `/` vs `/album/7`), ensure list view only for root
- Review BBCode in `title`/`summary` (e.g. `[url=...]...[/url]`) for external links and styling
- Check useAlbumData, useAlbumMetadata, and dataLoader for loading root children and per-album child lists

#### Implementation Tasks
- Create a new **RootAlbumListView** (or equivalent) component used only when displaying the root album
- Implement list layout: vertical list of album blocks (thumbnail, title, description, metadata, subalbums)
- Per album block: thumbnail (link to album), "Album: [title]" (bold), description text below, optional external link parsed from summary/description
- Add metadata section: Date (from `timestamp`), Owner (`ownerName`), Size if available (direct + total items; may require backend or derivation)
- Add "Subalbums:" section per album: fetch or use children, filter to `GalleryAlbumItem`, render as vertical list of links to each child album
- Handle missing description, null summary, empty owner: omit or show placeholder appropriately
- Use list-style layout (e.g. flexbox or grid with rows) rather than card grid; ensure clear visual separation between albums
- Integrate with HomePage: when showing root album, render RootAlbumListView instead of AlbumGrid (or switch layout by `isRootAlbum`)
- Ensure subalbum links navigate to `/album/:id`; preserve existing navigation behavior
- Style to align with current theme (e.g. reuse existing typography, spacing, link styles)
- Omit "Views" if not in data; document that Size/Views may be future enhancements

#### Edge Cases
- Root album with no children: show empty subalbums list or hide "Subalbums:" section
- Albums with no description: hide description block
- Summary with `[url=...]...[/url]`: extract URL and display as "Website: ..." or similar
- Very long subalbum lists: consider truncation, "Show more", or scrolling if needed
- Responsive behavior: stack subalbums below album block on narrow viewports if two-column layout is used

### Deliverable
Root album displayed in a list view with thumbnail, title, description, metadata, and subalbums list per album; nested albums unchanged

### Testing Requirements
- Verify root album (home) uses new list view; nested album pages still use grid
- Verify each root-level album shows thumbnail, title, description (when present), metadata, and subalbums
- Test with albums that have no description or no children
- Verify subalbum links navigate correctly to child albums
- Test responsive layout and accessibility (keyboard, screen readers)
- Verify no regressions in loading, error, or empty states for root album

### Technical Notes
- HomePage uses `findRootAlbumId` then `AlbumGrid` with `albumId={rootAlbumId}`; root content is root's children
- Child type has `description`, `summary`, `ownerName`, `timestamp`; `hasChildren` indicates subalbums
- Subalbums require loading each album's children (e.g. `loadAlbum(id)`) or backend support for "direct children only"
- Original design: "Size: X items (Y items total)" — Y may need recursive count; consider omitting or simplifying initially
- Reference layout: [lanbilder.se main.php (Dec 2007)](https://web.archive.org/web/20071220141404/http://www.lanbilder.se/main.php)

---

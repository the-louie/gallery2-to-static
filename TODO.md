# TODO

---

## Redesign JSON Data Structure

**Status:** Pending
**Priority:** High
**Complexity:** High
**Estimated Time:** 6-8 hours

### Description
Redesign the JSON data structure for album files to include album metadata alongside children. Change from a simple array of children to an object structure with `metadata` and `children` properties. The metadata will contain album-specific information (albumId, albumTitle, albumDescription, albumTimestamp, ownerName) while children remains an array of child items.

### Requirements

#### Research Tasks
- Review current JSON structure in existing data files (e.g., `7.json`, `211.json`)
- Analyze backend `index.ts` implementation to understand current data generation
- Review `sqlUtils.ts` to identify available album metadata queries
- Research how to query album metadata by ID (not just root album)
- Review frontend `dataLoader.ts` and all consumers of `loadAlbum` function
- Identify all TypeScript types that need updating (Child, Album, etc.)
- Analyze impact on breadcrumb path building and parent album lookup
- Review search index generation and how it uses album data
- Check how album metadata is currently retrieved (useAlbumMetadata hook)

#### Implementation Tasks

**Backend Changes:**
- Add SQL query function to get album metadata by ID (title, description, timestamp, ownerName)
- Update `main` function in `index.ts` to query album metadata for each album
- Modify JSON file generation to use new structure: `{ metadata: {...}, children: [...] }`
- Update metadata structure to match required format (albumId, albumTitle, albumDescription, albumTimestamp, ownerName)
- Ensure backward compatibility considerations (migration strategy for existing data)
- Update search index generation if needed

**Frontend Changes:**
- Update `dataLoader.ts` to parse new JSON structure
- Modify `loadAlbum` function to return both metadata and children (or update return type)
- Update `validateChildArray` function or create new validation for new structure
- Update TypeScript types to reflect new structure
- Update `useAlbumMetadata` hook if it needs to use new metadata structure
- Update all components that consume album data (AlbumDetail, AlbumGrid, etc.)
- Update breadcrumb path building to use new metadata structure
- Update parent album lookup logic if needed
- Update cache structure to handle new format

**Type Definitions:**
- Create new interface for album JSON structure: `{ metadata: AlbumMetadata, children: Child[] }`
- Update `Child` type if needed
- Create `AlbumMetadata` interface with required fields
- Update all type imports and exports

**Testing:**
- Update all tests that mock or use album JSON data
- Update `dataLoader.test.ts` to test new structure parsing
- Update `breadcrumbPath.test.ts` if structure affects path building
- Update component tests that use album data
- Test backward compatibility if migration is needed

### Deliverable
Redesigned JSON structure with metadata and children properties, updated backend generation, and frontend parsing

### Testing Requirements
- Verify new JSON files are generated with correct structure
- Test that frontend correctly parses new structure
- Verify album metadata is correctly extracted and displayed
- Test that children array is correctly parsed and displayed
- Verify breadcrumb navigation still works correctly
- Test parent album lookup functionality
- Verify search index generation works with new structure
- Test backward compatibility if old structure files exist
- Verify no console errors or broken functionality

### Technical Notes
- Current structure: JSON files are arrays `Child[]` directly
- New structure: `{ metadata: { albumId, albumTitle, albumDescription, albumTimestamp, ownerName }, children: Child[] }`
- Backend `main` function currently writes `processedChildrenWithThumbnails` array directly
- Need to query album metadata for `root` parameter in `main` function
- `sqlUtils.ts` has `getRootAlbumInfo` but may need `getAlbumInfo(id)` for all albums
- Frontend `loadAlbum` currently returns `Promise<Child[]>` - may need to return `Promise<{ metadata: AlbumMetadata, children: Child[] }>`
- Consider creating wrapper function `loadAlbumChildren(id)` if full structure isn't always needed
- Cache structure in `dataLoader.ts` may need updating
- All consumers of `loadAlbum` will need updates (AlbumDetail, AlbumGrid, breadcrumbPath, etc.)
- Consider migration path for existing generated data files

---

## Customize Album Pages with Metadata

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 2-3 hours

### Description
Use the new metadata structure in JSON data files to customize album pages. Display `albumTitle` from metadata as the text for `div.album-detail-section-title` elements, and add smaller text below containing `albumDescription` if available. This will make each album page display its own title and description in the section headers.

### Requirements

#### Research Tasks
- Review AlbumDetail component implementation and current section title rendering
- Review how metadata is currently accessed from loaded album data
- Analyze current `.album-detail-section-title` usage (Albums and Images sections)
- Review CSS styling for section titles and descriptions
- Check if metadata is already available after JSON structure redesign
- Review how album metadata flows from dataLoader to AlbumDetail component
- Analyze whether both Albums and Images sections should use same metadata or different

#### Implementation Tasks
- Update AlbumDetail component to access metadata from loaded album data
- Modify Albums section header to use `albumTitle` from metadata for `.album-detail-section-title`
- Add description text below Albums section title using `albumDescription` from metadata (if available)
- Modify Images section header to use `albumTitle` from metadata for `.album-detail-section-title`
- Add description text below Images section header using `albumDescription` from metadata (if available)
- Style description text to be smaller than section title (add CSS class if needed)
- Handle cases where metadata is missing or incomplete (fallback to default "Albums"/"Images" text)
- Handle cases where `albumDescription` is null or empty (don't render description element)
- Update TypeScript types to ensure metadata is properly typed
- Ensure metadata is properly parsed from new JSON structure

### Deliverable
Album pages displaying custom album title and description in section headers using metadata from JSON files

### Testing Requirements
- Verify album title appears in section headers when metadata is available
- Verify album description appears below title when available
- Test with albums that have no description (should not show description element)
- Test with albums that have null/empty description
- Verify fallback behavior when metadata is missing
- Test that both Albums and Images sections display metadata correctly
- Verify styling is correct (title larger, description smaller)
- Test responsive behavior with custom titles and descriptions
- Verify no layout shifts or visual glitches

### Technical Notes
- Depends on "Redesign JSON Data Structure" task being completed first
- AlbumDetail component currently uses hardcoded "Albums" and "Images" text for section titles (lines ~354, ~379)
- Metadata should be available from `loadAlbum` return value after JSON structure redesign
- Current album metadata is loaded via `useAlbumMetadata` hook - may need to update to use new metadata structure
- CSS class `.album-detail-section-title` is already defined in AlbumDetail.css
- May need new CSS class for description text (e.g., `.album-detail-section-description`)
- Description should be optional and only rendered when `albumDescription` has a value
- Consider BBCode parsing for `albumTitle` if titles contain BBCode formatting
- Description should be plain text (no BBCode) based on current implementation patterns

---

## Fix Up Button Navigation Behavior

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 1-2 hours

### Description
Fix the up button navigation behavior to ensure it only moves the user one step up in the album hierarchy to the parent album, rather than navigating to the root or home page. The button should navigate to the immediate parent album when clicked, maintaining proper hierarchical navigation.

### Requirements

#### Research Tasks
- Review current up button implementation in AlbumDetail component
- Research album hierarchy structure and parent-child relationships
- Review getParentAlbumId utility function behavior
- Analyze edge cases: root album, orphaned albums, missing parent data
- Review navigation flow and routing behavior

#### Implementation Tasks
- Verify getParentAlbumId returns correct parent album ID
- Update up button click handler to navigate only to immediate parent
- Ensure proper handling when parent is root album (should navigate to parent, not home)
- Handle edge case when parent is not found (orphaned album) - decide on appropriate behavior
- Update error handling to maintain one-step-up behavior
- Verify navigation works correctly for nested album structures
- Test navigation from deeply nested albums to ensure single-step behavior
- Update tests to verify one-step-up navigation behavior

### Deliverable
Up button that navigates exactly one step up in the album hierarchy to the parent album

### Testing Requirements
- Verify up button navigates to immediate parent album (not root/home)
- Test navigation from nested albums (3+ levels deep)
- Verify behavior at root album level
- Test with orphaned albums (missing parent data)
- Verify error handling maintains correct navigation behavior
- Test breadcrumb integration with up button navigation

### Technical Notes
- Current implementation may navigate to home when parent is null - this should be reviewed
- Parent album lookup uses getParentAlbumId from breadcrumbPath utilities
- Navigation uses React Router's navigate function
- Consider whether root album should have an up button or if it should be hidden
- Ensure consistent behavior across AlbumDetail and AlbumDetailEmpty components

---

## Implement Album Blacklist Functionality

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 1-2 hours

### Description
Implement album blacklist functionality using the `ignoreAlbums` field in `backend/config.json`. Albums listed in the blacklist should be silently excluded from JSON export generation. Blacklisted albums should not appear in any generated JSON files, should not be included in the search index, and should not have their own JSON files created. The exclusion should happen silently without errors or warnings.

### Requirements

#### Research Tasks
- Review current `backend/config.json` structure and `ignoreAlbums` field definition
- Review `backend/types.ts` to understand Config interface and `ignoreAlbums` type definition
- Analyze `backend/index.ts` to understand album processing flow and where filtering should occur
- Review recursive `main` function to understand how albums are traversed and processed
- Identify all places where albums are processed: JSON file generation, search index, recursive traversal
- Analyze how album IDs are compared (string vs number matching)
- Review edge cases: blacklisted albums with children, blacklisted root album, invalid album IDs
- Check if `onlyAlbums` field needs similar implementation or conflicts with blacklist

#### Implementation Tasks

**Backend Changes:**
- Load `ignoreAlbums` array from config in main execution block
- Convert `ignoreAlbums` array to Set for efficient lookup (handle both string and number IDs)
- Create helper function to check if an album ID is blacklisted
- Filter blacklisted albums in `main` function before processing children
- Exclude blacklisted albums from recursive traversal (don't process their children)
- Exclude blacklisted albums from `processedChildren` array before thumbnail extraction
- Exclude blacklisted albums from search index generation
- Ensure blacklisted albums don't have JSON files generated
- Handle case where blacklisted album is in the middle of hierarchy (children should still be processed if parent allows)
- Validate that `ignoreAlbums` contains valid album IDs (optional, log warnings for invalid IDs)

**Type Safety:**
- Ensure Config type properly defines `ignoreAlbums` as `Array<string | number>` or handle type conversion
- Add type guards or validation for blacklist array contents
- Ensure type safety when comparing album IDs (string vs number)

**Error Handling:**
- Handle invalid album IDs in blacklist gracefully (log warning, continue processing)
- Ensure blacklist doesn't break processing if config field is missing or malformed
- Handle empty blacklist array (should not affect processing)
- Ensure blacklist doesn't cause infinite loops or recursion issues

### Deliverable
Album blacklist functionality that silently excludes specified albums from JSON export generation

### Testing Requirements
- Verify blacklisted albums don't appear in parent album's children array
- Verify blacklisted albums don't have their own JSON files generated
- Verify blacklisted albums don't appear in search index
- Test with blacklisted albums that have children (children should be excluded too)
- Test with multiple blacklisted albums
- Test with empty blacklist (should not affect processing)
- Test with invalid album IDs in blacklist (should log warning, continue processing)
- Test with string and number album IDs in blacklist
- Verify blacklisted albums are excluded silently (no errors or warnings in normal operation)
- Test edge case: blacklisting root album (should handle gracefully)
- Verify blacklist doesn't affect non-blacklisted albums

### Technical Notes
- `ignoreAlbums` field already exists in `backend/config.json` as empty array `[]`
- Config type in `backend/types.ts` defines `ignoreAlbums?: Array<string>` - may need to support numbers too
- Blacklist should be checked early in `main` function before any processing
- Album IDs from database are numbers, but config may have strings - need type conversion
- Blacklisted albums should be filtered before recursive calls to `main` function
- Blacklisted albums should be filtered from `children` array before `processedChildren` mapping
- Search index generation loop should skip blacklisted albums
- Consider performance: use Set for O(1) lookup instead of array.includes() for O(n)
- Blacklist should be applied consistently across all processing steps
- Silent exclusion means no console.log or errors for blacklisted albums (unless invalid IDs)

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

## Remove Grid/List View Mode Toggle

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 1-2 hours

### Description
Remove the grid/list view mode toggle (rocker) component as it is not useful. This includes removing the ViewModeToggle component and all related functionality, while maintaining the default grid view mode for displaying albums and images.

### Requirements

#### Research Tasks
- Review ViewModeToggle component implementation and usage locations
- Identify all files that import or use ViewModeToggle component
- Review ViewModeContext usage and determine if context should be removed or simplified
- Analyze impact on AlbumGrid, ImageGrid, AlbumCard, and ImageThumbnail components
- Review localStorage persistence of view mode preferences
- Check for any tests that depend on view mode toggle functionality

#### Implementation Tasks
- Remove ViewModeToggle component files (ViewModeToggle.tsx, ViewModeToggle.css, ViewModeToggle.test.tsx, index.ts)
- Remove ViewModeToggle imports and usage from AlbumDetail component
- Remove ViewModeToggle imports and usage from HomePage component
- Remove ViewModeToggle CSS variables from themes.css
- Simplify or remove ViewModeContext (decide if context is still needed for default grid mode)
- Update components to use default 'grid' view mode instead of context
- Remove view mode preference from localStorage (or keep for future use)
- Update test files to remove ViewModeToggle-related tests
- Remove ViewModeToggle from component exports if present
- Clean up any unused view mode related code

### Deliverable
Removed grid/list toggle component with all albums and images displaying in grid view by default

### Testing Requirements
- Verify albums display correctly in grid view after removal
- Verify images display correctly in grid view after removal
- Test that no console errors occur after removal
- Verify no broken imports or references remain
- Test that localStorage cleanup doesn't cause issues
- Verify responsive behavior still works correctly

### Technical Notes
- ViewModeToggle is used in AlbumDetail.tsx (lines ~356, ~381) and HomePage.tsx (line ~123)
- ViewModeContext provides albumViewMode and imageViewMode state
- Components like AlbumGrid, ImageGrid, AlbumCard, ImageThumbnail accept viewMode prop
- Default view mode should be 'grid' for all components
- Consider keeping ViewModeContext if it's used elsewhere, or remove entirely if only used for toggle
- CSS variables for view-mode-toggle in themes.css should be removed
- localStorage key 'gallery-view-mode-preference' can be removed or left for future use

---

## Show Full Path in Search Results

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 1-2 hours

### Description
When displaying search hits, add the full path from root album to the search hit within each `.search-results-item`. The path element must be placed above the `.search-results-link` and styled with the same CSS as `.search-results-item-description` (or an equivalent class that matches that style). This gives users context about where each result lives in the album hierarchy (e.g., "dreamhack / dreamhack 08 / crew / tuktuk").

### Requirements

#### Research Tasks
- Review SearchResultsPage structure: `.search-results-item`, `.search-results-link`, `.search-results-item-content`
- Review SearchIndexItem interface: `ancestors` and `pathComponent` fields
- Review SearchResultsPage.css for `.search-results-item-description` styling
- Confirm how full path is derived: `ancestors` (root omitted) + `pathComponent`; root-level items have no `ancestors`
- Check whether albums and images sections both need the path (currently only albums are indexed; images section typically empty)
- Review how SearchResultsPage receives `SearchIndexItem` data (via useSearch → SearchResult)

#### Implementation Tasks
- Build full path string: `ancestors ? ancestors + '/' + pathComponent : pathComponent` (or equivalent separator)
- Add a path element inside each `.search-results-item`, **above** the `<Link className="search-results-link">`
- Use the same CSS class as `.search-results-item-description` (or reuse that class) so styling matches
- Use a `<p>` or appropriate block element consistent with description markup
- Omit or hide the path element when full path is empty or not available (e.g., root-level item with only `pathComponent`)
- Apply to both Albums and Images result lists if both render results
- Ensure path does not break layout (flex/stack order, spacing) or accessibility
- Optionally format path for display (e.g., " / " between segments) while keeping semantics clear

### Deliverable
Search result items showing the full album path above the result link, styled like the description text

### Testing Requirements
- Verify path appears above the link within each search result item
- Verify styling matches `.search-results-item-description`
- Test with deeply nested albums (non-empty `ancestors`)
- Test with root-level albums (no `ancestors`, path is `pathComponent` only)
- Verify empty or missing path does not render a redundant element or break layout
- Test with Albums section (and Images if applicable)
- Verify responsive layout and accessibility (e.g., screen readers)

### Technical Notes
- SearchIndexItem has `ancestors?: string` (e.g. "dreamhack/dreamhack 08/crew") and `pathComponent: string`
- Full path from root: `ancestors ? ancestors + '/' + pathComponent : pathComponent`
- Search results live in `frontend/src/pages/SearchResultsPage.tsx`; structure is `<li class="search-results-item">` → `<Link class="search-results-link">` → `<div class="search-results-item-content">` (title, description, etc.)
- Path must be a sibling of the Link, placed before it, not inside `.search-results-item-content`
- Reuse `.search-results-item-description` class or ensure new class shares the same CSS rules (font size, color, margin, etc.)

---

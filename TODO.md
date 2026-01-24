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

## Add Album Highlight Image to Album Metadata

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 2-3 hours

### Description
Add album highlight image functionality to album metadata in the data JSON files. The highlight image should be extracted from the Gallery2 database's highlightId field (if present) which points to a specific image itemId. If no highlightId is set for an album, fall back to recursively finding the first image in the album (or in sub-albums). The highlight image URL should be added to the album metadata structure.

### Requirements

#### Research Tasks
- Analyze database schema files (`__docs/db-info/schema_dump.sql` and `__docs/db-info/schema.json`) to locate where highlightId is stored
- Research Gallery2 database structure: check `g2_Entity` and `g2_AlbumItem` tables for highlightId field
- If highlightId is not found in schema, research Gallery2 documentation or check for alternative storage locations (e.g., plugin parameters, item attributes)
- Review current album metadata structure in `backend/types.ts` (`AlbumMetadata` interface)
- Review current thumbnail extraction logic in `backend/index.ts` (lines 124-163) to understand image URL generation
- Review `getLinkTarget` and `getThumbTarget` functions in `backend/legacyPaths.ts` to understand URL path construction
- Research recursive image finding logic: understand how to traverse albums and sub-albums to find first image
- Review how image URLs are currently constructed for photos (pathComponent, urlPath generation)

#### Implementation Tasks
- Add SQL query to retrieve highlightId from database for albums (may need to join with Entity or AlbumItem tables)
- Create helper function to resolve highlight image from highlightId: query item details, construct path, generate URL
- Create recursive helper function to find first image in album or sub-albums if no highlightId exists
- Update `AlbumMetadata` interface in `backend/types.ts` to include `highlightImageUrl?: string | null`
- Modify `getAlbumInfo` query in `backend/sqlUtils.ts` to include highlightId field if available
- Update album metadata extraction in `backend/index.ts` (around line 184-191) to include highlight image resolution
- Integrate highlight image resolution logic: check highlightId first, then fall back to recursive first image search
- Ensure highlight image URL uses same path construction logic as existing photo URLs (urlPath format)
- Handle edge cases: albums with no images, invalid highlightId references, missing path components
- Update TypeScript types to reflect new optional highlightImageUrl field

### Deliverable
Album metadata JSON files that include `highlightImageUrl` field containing the URL to the album's highlight image (from highlightId if set, or first image recursively if not)

### Testing Requirements
- Verify albums with highlightId set in database have correct highlight image URL in metadata
- Check albums without highlightId fall back to first image in album
- Verify albums with no direct images but with sub-albums recursively find first image in sub-albums
- Test albums with no images at all (highlightImageUrl should be null or omitted)
- Verify highlight image URLs match expected path format (consistent with existing photo URLs)
- Check that invalid highlightId references are handled gracefully (fall back to first image)
- Test with albums at various nesting levels to ensure recursive search works correctly
- Verify highlight image resolution doesn't break existing thumbnail extraction logic

### Technical Notes
- Gallery2 stored highlightId in `g2_Entity` and `g2_AlbumItem` tables, pointing to itemId of chosen image
- Highlight image should use the same URL path format as regular photos (urlPath field)
- Recursive search should prioritize direct children (images in album) before searching sub-albums
- Highlight image resolution should happen during album processing in `main` function, similar to thumbnail extraction
- The highlightImageUrl should be optional in metadata (null if no image found, or omitted if not set)
- Consider performance: recursive search may need optimization for albums with many nested sub-albums
- Highlight image URL construction should use existing `getLinkTarget` function for consistency
- May need to query FileSystemEntity table to get pathComponent for highlight image itemId

---

## Remove Thumbnail from Root Album Display

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30 minutes - 1 hour

### Description
Remove the `div.root-album-list-block-thumbnail` element and all related thumbnail functionality from RootAlbumListBlock component. This includes removing the thumbnail image, placeholder, link wrapper, and all associated state management and CSS styles. The root album display will show only the album content (title, description, metadata) without the thumbnail image.

### Requirements

#### Research Tasks
- Review current thumbnail implementation in RootAlbumListBlock component (lines 91-111)
- Identify all thumbnail-related code: JSX elements, state management, event handlers, CSS classes
- Review thumbnail-related imports: `getAlbumThumbnailUrl` from imageUrl utils
- Identify thumbnail-related state: `imageError`, `thumbnailUrl`, `shouldShowThumbnail`
- Review thumbnail-related callbacks: `handleImageError`
- Review thumbnail-related effects: `useEffect` for resetting imageError
- Check if thumbnail removal affects layout structure (currently thumbnail and content are in flex row on desktop)
- Review responsive CSS that references thumbnail (lines 270-272 in RootAlbumListBlock.css)
- Verify if any tests depend on thumbnail rendering

#### Implementation Tasks
- Remove `div.root-album-list-block-thumbnail` wrapper and all its contents from JSX (lines 91-111)
- Remove thumbnail-related state: `imageError` useState hook
- Remove thumbnail-related variables: `thumbnailUrl`, `shouldShowThumbnail`
- Remove thumbnail-related callbacks: `handleImageError` useCallback
- Remove thumbnail-related effects: `useEffect` that resets imageError
- Remove thumbnail-related imports: `getAlbumThumbnailUrl` from '@/utils/imageUrl'
- Remove thumbnail-related CSS classes: `.root-album-list-block-thumbnail`, `.root-album-list-block-thumb-link`, `.root-album-list-block-thumb-img`, `.root-album-list-block-thumb-placeholder`
- Remove responsive CSS rules for thumbnail (lines 270-272)
- Update layout CSS: remove flex-direction row from `.root-album-list-block-main` on desktop (currently at min-width: 600px)
- Update component JSDoc comments to remove mention of thumbnail
- Update component description to reflect thumbnail removal
- Remove unused imports if any become unused after thumbnail removal
- Update tests to remove any thumbnail-related assertions

### Deliverable
RootAlbumListBlock component without thumbnail display, showing only album content (title, description, metadata, subalbums)

### Testing Requirements
- Verify thumbnail div is completely removed from rendered output
- Check that album title, description, and metadata still display correctly
- Verify subalbums section still displays correctly
- Test layout on desktop viewports (min-width: 768px)
- Test layout on tablet viewports (min-width: 600px)
- Verify responsive layout still works on mobile sizes
- Ensure no broken links or missing functionality
- Check that album content area displays correctly without thumbnail
- Verify no console errors or warnings related to removed code

### Technical Notes
- Thumbnail div is currently at lines 91-111 in RootAlbumListBlock.tsx
- Thumbnail uses `getAlbumThumbnailUrl` utility function
- Thumbnail has error handling with `imageError` state and `handleImageError` callback
- Thumbnail is wrapped in a Link component that navigates to the album
- Layout currently uses flex-direction: row on desktop (min-width: 600px) for thumbnail + content
- After removal, `.root-album-list-block-main` should only contain content div, so flex-direction: row may not be needed
- CSS classes to remove: `.root-album-list-block-thumbnail` (lines 68-76), `.root-album-list-block-thumb-link` (lines 78-89), `.root-album-list-block-thumb-img` (lines 91-97), `.root-album-list-block-thumb-placeholder` (lines 99-109)
- Responsive CSS for thumbnail at lines 270-272 should be removed

---

## Widen Sub-Album Display Box to Prevent Name Line-Breaking

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30 minutes - 1 hour

### Description
Increase the width of the sub-album display box in RootAlbumListBlock component so that sub-album names fit on a single line without wrapping. Currently, long sub-album names like "UsaRoadTrip2010-Hope&Defcon" and "Hacking At Random 2009" are line-breaking within their display boxes, making them harder to read.

### Requirements

#### Research Tasks
- Review current sub-album box width (currently 240px on desktop in `.root-album-list-block-subalbums`)
- Analyze sub-album name lengths to determine appropriate minimum width
- Review 2-column grid layout and calculate per-column width (currently ~100-110px per column)
- Research impact on overall layout when increasing sub-album box width
- Check responsive behavior and ensure mobile layout remains functional
- Verify that increased width doesn't cause layout issues on smaller desktop screens

#### Implementation Tasks
- Increase width of `.root-album-list-block-subalbums` container on desktop (min-width: 768px)
- Calculate appropriate width to accommodate longest expected sub-album names (estimate: 300-320px or more)
- Ensure 2-column grid layout still works correctly with new width
- Update responsive CSS if needed to maintain proper layout on tablet sizes
- Verify sub-album link text doesn't overflow or break layout
- Test with various sub-album name lengths to ensure no line-breaking
- Check that main album content area still displays correctly with wider sub-album box

### Deliverable
Wider sub-album display box that accommodates sub-album names on a single line without line-breaking

### Testing Requirements
- Verify sub-album names display on single line without wrapping
- Test with long sub-album names (e.g., "UsaRoadTrip2010-Hope&Defcon", "Hacking At Random 2009")
- Check layout on desktop viewports (min-width: 768px)
- Verify responsive layout still works on tablet and mobile sizes
- Ensure main album content area doesn't get squeezed or overflow
- Test with albums that have many sub-albums (6+ items)
- Verify 2-column grid layout remains properly aligned

### Technical Notes
- Current width: 240px on desktop (line 186 in RootAlbumListBlock.css)
- Sub-album links are in a 2-column grid, so each column gets roughly half the container width minus padding/gaps
- Consider increasing to 300-320px or more to accommodate longer names
- May need to adjust main content area flex properties if layout becomes too tight
- Ensure text overflow handling (text-overflow: ellipsis) is not needed if width is sufficient
- Check that increased width doesn't break the two-column layout (album left, subalbums right)

---



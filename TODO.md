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




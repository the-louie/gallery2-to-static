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

## Fix Album Card Content Height for Consistent Tile Heights

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30 minutes - 1 hour

### Description
Fix inconsistent album tile heights by ensuring `div.album-card-content` always has a fixed height sufficient for two rows of text. Album titles that exceed two lines should be truncated with ellipses. Currently, tiles with single-line titles are shorter than tiles with two-line titles, causing visual misalignment in the grid layout.

### Requirements

#### Research Tasks
- Review current `.album-card-content` CSS implementation in `frontend/src/components/AlbumGrid/AlbumCard.css` (line 76)
- Review current `.album-card-title` CSS implementation (lines 84-95) which already has `-webkit-line-clamp: 2`
- Analyze line-height and font-size values to calculate exact height needed for two lines
- Review responsive behavior: ensure fixed height works across different screen sizes
- Check if padding values (`var(--album-card-padding, 1rem)`) affect height calculations
- Verify current ellipsis implementation (`text-overflow: ellipsis` and `-webkit-line-clamp: 2`) works correctly
- Review AlbumCard component structure in `frontend/src/components/AlbumGrid/AlbumCard.tsx` (line 116)

#### Implementation Tasks
- Calculate exact height needed for two lines: `(line-height * 2) + padding-top + padding-bottom`
- Set fixed `min-height` or `height` on `.album-card-content` to accommodate exactly two lines of text
- Ensure `line-height: 1.4` (from `.album-card-title`) is accounted for in height calculation
- Verify `-webkit-line-clamp: 2` on `.album-card-title` properly truncates text beyond two lines
- Ensure `overflow: hidden` is set on `.album-card-title` (already present) for ellipsis to work
- Test that single-line titles still display correctly within the fixed-height container
- Verify grid alignment: all album tiles should have consistent heights
- Check responsive behavior: ensure fixed height doesn't break layout on mobile/tablet sizes
- Verify text truncation: long titles should show ellipsis after two lines

### Deliverable
Album cards with consistent heights where `.album-card-content` always accommodates exactly two lines of text, with longer titles truncated using ellipses

### Testing Requirements
- Verify all album tiles have the same height in grid layout
- Test with single-line titles (e.g., "The Gathering 2010") - should display correctly within fixed height
- Test with two-line titles (e.g., "Hacking At Random 2009") - should display both lines without overflow
- Test with titles longer than two lines (e.g., "UsaRoadTrip2010-Hope&Defcon") - should truncate with ellipsis after second line
- Check grid alignment: tiles should align properly in rows
- Verify responsive layout: fixed height should work on mobile (min-width: 768px) and desktop sizes
- Test with various title lengths to ensure consistent behavior
- Verify ellipsis appears correctly when text is truncated
- Check that BBCode formatting in titles doesn't affect height calculation

### Technical Notes
- Current `.album-card-title` has `line-height: 1.4` and `font-size: var(--album-card-title-size, 1rem)` (default 1rem = 16px)
- Height calculation: `(1.4 * 16px * 2 lines) = 44.8px` for text, plus padding `(1rem * 2) = 32px` = ~76.8px minimum
- `.album-card-content` currently uses `flex: 1` which allows variable height
- `.album-card-title` already has `-webkit-line-clamp: 2` and `overflow: hidden` for ellipsis
- Consider using `min-height` instead of `height` to allow growth if needed, but ensure it's sufficient for two lines
- May need to adjust if `--album-card-padding` CSS variable changes
- Ensure fixed height doesn't conflict with `flex: 1` behavior - may need to remove or adjust flex property

---

## Decode HTML Entities in Album Titles Safely

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30 minutes - 1 hour

### Description
Ensure HTML entities in album titles are properly decoded for display while preventing HTML injection attacks. Currently, some album titles display HTML entities literally (e.g., `&amp;` instead of `&`), particularly in cases where entities may be double-encoded or when decoding isn't applied consistently. The decoding must be done safely to prevent XSS attacks by ensuring React's default text escaping is used rather than dangerouslySetInnerHTML.

### Requirements

#### Research Tasks
- Review current HTML entity decoding implementation in `frontend/src/utils/decodeHtmlEntities.ts`
- Review how album titles are processed in `AlbumCard` component (`frontend/src/components/AlbumGrid/AlbumCard.tsx` line 87)
- Check `parseBBCodeDecoded` function in `frontend/src/utils/bbcode.ts` (line 549-558) to verify it calls `decodeHtmlEntities`
- Review all components that display album titles: AlbumCard, AlbumDetail, RootAlbumListBlock, SearchResultsPage
- Verify React rendering: ensure titles are rendered as text content, not HTML (no dangerouslySetInnerHTML)
- Test current decoding behavior with double-encoded entities (e.g., `&amp;amp;` should decode to `&`)
- Check if there are cases where titles bypass `parseBBCodeDecoded` or `decodeHtmlEntities`
- Review test cases in `frontend/src/utils/decodeHtmlEntities.test.ts` to understand expected behavior
- Identify any components that might be rendering album titles without proper decoding

#### Implementation Tasks
- Verify `parseBBCodeDecoded` is used consistently for all album title displays that support BBCode
- Ensure `decodeHtmlEntities` handles all common HTML entities including `&amp;`, `&lt;`, `&gt;`, `&quot;`, numeric entities (`&#39;`, `&#x41;`)
- Verify loop-until-stable decoding in `decodeHtmlEntities` handles double/triple-encoded entities correctly
- Check that React's default text escaping is used (no dangerouslySetInnerHTML) to prevent HTML injection
- Add explicit HTML entity decoding if any title displays bypass the BBCode parser
- Ensure aria-label and alt text attributes also decode HTML entities (already done in AlbumCard lines 79, 105)
- Test with edge cases: double-encoded (`&amp;amp;`), triple-encoded (`&amp;amp;amp;`), mixed entities
- Verify decoding works correctly with BBCode parsing (entities decoded before BBCode parsing)
- Add test cases for titles with HTML entities to ensure they decode correctly

### Deliverable
Album titles display with HTML entities properly decoded (e.g., `&amp;` → `&`) while maintaining security against HTML injection attacks

### Testing Requirements
- Verify album titles with `&amp;` display as `&` (e.g., "UsaRoadTrip2010-Hope&Defcon")
- Test with double-encoded entities: `&amp;amp;` should decode to `&`
- Test with triple-encoded entities: `&amp;amp;amp;` should decode to `&`
- Verify other HTML entities decode correctly: `&lt;` → `<`, `&gt;` → `>`, `&quot;` → `"`
- Test numeric entities: `&#39;` → `'`, `&#x41;` → `A`
- Check that decoded titles display correctly in AlbumCard grid view
- Verify decoded titles display correctly in AlbumDetail page
- Test that BBCode formatting still works after HTML entity decoding
- Verify no HTML injection: test with malicious entities like `<script>` tags (should be escaped by React)
- Check that aria-label and alt attributes also decode entities correctly
- Test with various album titles containing different HTML entity encodings

### Technical Notes
- Current implementation: `parseBBCodeDecoded` calls `decodeHtmlEntities` before parsing BBCode (bbcode.ts line 556)
- `decodeHtmlEntities` uses loop-until-stable approach to handle double-encoded entities (decodeHtmlEntities.ts lines 45-58)
- React's default text rendering automatically escapes HTML, preventing XSS attacks
- AlbumCard component uses `parseBBCodeDecoded(album.title)` for title display (AlbumCard.tsx line 87)
- Aria-label and alt text already use `decodeHtmlEntities` directly (AlbumCard.tsx lines 79, 105)
- The issue may be double-encoded entities in the database (e.g., `&amp;amp;` stored instead of `&amp;`)
- Verify that all title displays go through proper decoding pipeline
- Consider adding explicit decoding step if any titles bypass BBCode parser
- Ensure decoding happens before BBCode parsing to prevent double-encoding issues

---

## Move Gallery Order Dropdown Next to Theme Dropdown

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30 minutes - 1 hour

### Description
Move the "Gallery order" dropdown (SortDropdown component) from its current location in content sections to the header next to the ThemeDropdown. Currently, SortDropdown appears in multiple locations: AlbumDetail component (for sorting albums and images in section headers) and RootAlbumListView component (for sorting root albums). The SortDropdown should be relocated to the Layout header's `layout-header-actions` div, positioned immediately after or before the ThemeDropdown.

### Requirements

#### Research Tasks
- Review current SortDropdown locations: AlbumDetail component (lines 362, 384) and RootAlbumListView component (line 122)
- Review ThemeDropdown location in Layout component (line 73 in `layout-header-actions` div)
- Review Layout component structure: understand `layout-header-actions` flex layout and spacing
- Review SortDropdown component props: understand how it receives `currentOption` and `onOptionChange` from useSort hook
- Analyze which SortDropdown instances should be moved: determine if all instances should move to header or only specific ones
- Review useSort hook usage: understand how sort state is managed per context (albums vs images vs root albums)
- Check if moving SortDropdown to header requires context-aware sorting (different sort options for albums vs images)
- Review responsive behavior: ensure SortDropdown in header works on mobile/tablet sizes
- Analyze CSS spacing: review gap values in `layout-header-actions` (currently `gap: 1rem`)

#### Implementation Tasks
- Add SortDropdown to Layout component header in `layout-header-actions` div
- Position SortDropdown next to ThemeDropdown (before or after, based on design preference)
- Determine sort context: decide if header SortDropdown should control album sorting, image sorting, or both
- Update SortDropdown props: pass appropriate `currentOption` and `onOptionChange` from useSort hook
- Remove SortDropdown from AlbumDetail component section headers (lines 362, 384) if moving to header
- Remove SortDropdown from RootAlbumListView header (line 122) if moving to header
- Update CSS: ensure proper spacing between ThemeDropdown and SortDropdown in header
- Update responsive CSS: ensure SortDropdown displays correctly in header on mobile/tablet sizes
- Handle multiple sort contexts: if albums and images need separate sorting, consider showing both dropdowns or context-aware single dropdown
- Update tests: modify Layout tests to include SortDropdown, update AlbumDetail and RootAlbumListView tests to remove SortDropdown assertions

### Deliverable
SortDropdown component moved to Layout header next to ThemeDropdown, with SortDropdown removed from content section headers

### Testing Requirements
- Verify SortDropdown appears in header next to ThemeDropdown
- Check SortDropdown functionality: selecting sort options works correctly
- Verify sort state persists correctly when navigating between pages
- Test responsive layout: SortDropdown displays correctly on mobile (max-width: 767px)
- Test responsive layout: SortDropdown displays correctly on tablet (min-width: 768px)
- Test responsive layout: SortDropdown displays correctly on desktop (min-width: 1024px)
- Verify SortDropdown is removed from AlbumDetail section headers (if applicable)
- Verify SortDropdown is removed from RootAlbumListView header (if applicable)
- Check header layout: ThemeDropdown and SortDropdown are properly spaced and aligned
- Test header actions wrapping: ensure dropdowns wrap correctly on smaller screens
- Verify accessibility: SortDropdown remains keyboard accessible in header location
- Check visual consistency: SortDropdown styling matches ThemeDropdown in header context

### Technical Notes
- SortDropdown currently appears in AlbumDetail at lines 362 (albums section) and 384 (images section)
- SortDropdown appears in RootAlbumListView at line 122
- ThemeDropdown is in Layout component at line 73, within `layout-header-actions` div
- `layout-header-actions` uses flexbox with `gap: 1rem` for spacing
- SortDropdown uses useSort hook which manages sort state per context
- May need to determine if header SortDropdown should control album sorting globally or be context-aware
- Consider responsive behavior: header actions wrap on mobile (flex-wrap: wrap)
- SortDropdown is a native `<select>` element, so it should work well in header
- May need to adjust CSS for SortDropdown in header context (size, spacing, alignment)

---

## Make Root Album Title Link to Album

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 15-30 minutes

### Description
Make the root album title in RootAlbumListBlock component clickable by wrapping it in a Link component that navigates to the album page. The title should link to `/album/${album.id}` but maintain its current visual appearance (no link styling changes - no underline, no color change, no hover effects). The title should look exactly the same as before, but be clickable.

### Requirements

#### Research Tasks
- Review current root album title implementation in `RootAlbumListBlock.tsx` (lines 113-115)
- Review current title CSS styling in `RootAlbumListBlock.css` (lines 118-124)
- Check how other album titles are linked in the codebase (e.g., AlbumCard component)
- Review Link component usage from react-router-dom in RootAlbumListBlock (already imported at line 17)
- Verify album link path format: should be `/album/${album.id}` (already defined at line 82 as `linkTo`)
- Review accessibility: ensure link has proper aria-label or maintains existing aria-labelledby relationship
- Check if title link should have focus styles (for keyboard navigation accessibility)

#### Implementation Tasks
- Wrap root album title text in Link component in `RootAlbumListBlock.tsx` (around line 113-115)
- Set Link `to` prop to `/album/${album.id}` (use existing `linkTo` variable from line 82)
- Ensure Link component has no className that would apply default link styles
- Add CSS to prevent link styling: remove text-decoration, preserve color, remove hover/active/focus color changes
- Ensure title maintains existing CSS classes: `root-album-list-block-title` should still apply
- Preserve existing h2 element structure and id attribute for aria-labelledby relationship
- Add appropriate aria-label to Link if needed for accessibility
- Ensure keyboard navigation works: Link should be focusable and have visible focus indicator
- Test that clicking title navigates to album page correctly

### Deliverable
Root album title is clickable and links to the album page, but maintains exact same visual appearance (no link styling visible)

### Testing Requirements
- Verify clicking root album title navigates to `/album/${album.id}` page
- Check title appearance: no underline, no color change, looks identical to before
- Test hover state: title should not show link hover effects (no underline, no color change)
- Test focus state: title should have visible focus indicator for keyboard navigation (meets accessibility requirements)
- Verify active state: title should not show link active color
- Check visited state: title should not show visited link color
- Test keyboard navigation: Tab key should focus title link, Enter should navigate
- Verify aria-labelledby relationship still works correctly
- Test with screen reader: ensure link is announced correctly
- Verify title styling matches existing appearance exactly (font-size, font-weight, line-height, color, margin)

### Technical Notes
- Current title is at lines 113-115: `<h2 id={...} className="root-album-list-block-title">{parsedTitle}</h2>`
- Title CSS is at lines 118-124 in RootAlbumListBlock.css: margin, font-size, font-weight, line-height, color
- Link component is already imported from react-router-dom (line 17)
- Album link path is already defined: `const linkTo = `/album/${album.id}`;` (line 82)
- Title uses `parsedTitle` which is parsed BBCode (line 61-64)
- Title has id attribute for aria-labelledby: `id={`root-album-title-${album.id}`}`
- CSS should use `text-decoration: none` and `color: inherit` on Link to prevent default link styling
- May need to add `:focus-visible` styles for keyboard navigation accessibility
- Consider wrapping h2 content in Link, or wrapping entire h2 in Link (prefer wrapping content to preserve semantic structure)
- Ensure Link doesn't interfere with existing CSS specificity or cascade


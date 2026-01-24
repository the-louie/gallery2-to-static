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

## Fix Root Album Block Height to Accommodate All Subalbums

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 1-2 hours

### Description
Fix the height of album divs (`.root-album-list-block`) in the root album view to use a fixed height that is high enough to fit all 5 subalbums without requiring scrolling. Currently, the subalbums list section has a `max-height` constraint with `overflow-y: auto`, which can cause scrolling when all 5 subalbums are displayed. The entire album block should have a consistent fixed height that accommodates the maximum number of subalbums shown (5 items).

### Requirements

#### Research Tasks
- Research current CSS layout structure of `.root-album-list-block` and `.root-album-list-block-subalbums`
- Research height calculation for subalbums list (5 items × item height + spacing + header)
- Research responsive behavior considerations (mobile vs desktop layouts)
- Research CSS fixed height patterns that maintain responsive design
- Research impact on albums with fewer than 5 subalbums (should still use same height for consistency)

#### Implementation Tasks
- Calculate required height for subalbums section: 5 items × item height + list padding + title height + spacing
- Remove or adjust `max-height` and `overflow-y: auto` from `.root-album-list-block-subalbums-list`
- Set fixed height on `.root-album-list-block` or `.root-album-list-block-inner` to accommodate all content
- Ensure fixed height works correctly in both mobile (stacked) and desktop (two-column) layouts
- Verify height accommodates all 5 subalbums plus "And much more" text when applicable
- Test with albums that have 0, 1-4, exactly 5, and more than 5 subalbums
- Ensure consistent height across all album blocks in the root album list
- Verify no content is cut off or hidden due to fixed height constraint
- Test responsive breakpoints to ensure fixed height works at all screen sizes

### Deliverable
Fixed height album blocks in root album view that accommodate all 5 displayed subalbums without scrolling

### Testing Requirements
- Verify album blocks with 5 subalbums display all items without scrolling
- Check album blocks with fewer than 5 subalbums maintain consistent height
- Ensure album blocks with more than 5 subalbums show 5 items plus "And much more" text
- Verify fixed height works correctly on mobile (stacked layout)
- Verify fixed height works correctly on desktop (two-column layout)
- Test with albums that have no subalbums (should not break layout)
- Check that all content (thumbnail, title, description, metadata, subalbums) is visible
- Verify consistent height across all album blocks in the list

### Technical Notes
- Fixed height should be calculated based on maximum content (5 subalbums + header + spacing)
- Consider using CSS custom properties (variables) for maintainability
- Fixed height should not break responsive design - may need different heights for mobile vs desktop
- Ensure height calculation accounts for all spacing, padding, and margins
- Remove scrolling behavior from subalbums list when fixed height is implemented
- All album blocks should have the same height for visual consistency in the list

---

## Remove Duplicate Title and Description from Album Section Headers

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30 minutes - 1 hour

### Description
Remove duplicate title and description from `div.album-detail-section-header` elements in the album detail view. The title and description are already displayed in `div.album-detail-header` at the top of the album view, so showing them again in the section headers (for child albums and images sections) is redundant. The section headers should only display the section controls (sort dropdown) without the duplicate title and description.

### Requirements

#### Research Tasks
- Review current structure of `album-detail-header` and `album-detail-section-header` components
- Identify where `sectionTitleAlbums`, `sectionTitleImages`, and `sectionDescription` are used
- Verify that title and description in `album-detail-header` match those in `album-detail-section-header`
- Research impact on layout when removing title/description from section headers
- Check if section headers need any structural changes after removing title/description

#### Implementation Tasks
- Remove `album-detail-section-title-block` div and its contents from both child albums and images sections
- Remove rendering of `sectionTitleAlbums` and `sectionTitleImages` h2 elements
- Remove rendering of `sectionDescription` paragraph elements
- Keep `album-detail-section-controls` div with sort dropdown functionality
- Update CSS if needed to maintain proper layout with only controls in section header
- Remove unused `sectionTitleAlbums`, `sectionTitleImages`, and `sectionDescription` useMemo hooks if no longer needed
- Verify section headers still have proper spacing and alignment with only controls
- Ensure aria-label attributes on sections remain appropriate after removing visible headers

### Deliverable
Section headers in album detail view that only show controls (sort dropdown) without duplicate title and description

### Testing Requirements
- Verify title and description are still visible in `album-detail-header` at top of page
- Check that section headers no longer display duplicate title and description
- Verify sort dropdown controls are still visible and functional in section headers
- Test layout with albums that have child albums section
- Test layout with albums that have images section
- Test layout with albums that have both child albums and images sections
- Verify responsive layout still works correctly after changes
- Check that section headers maintain proper spacing and alignment
- Verify no visual regressions in album detail view

### Technical Notes
- Title and description come from `metadata?.albumTitle` and `metadata?.albumDescription` which are already displayed in `album-detail-header`
- Section headers should maintain their flex layout structure but only contain controls
- May need to adjust CSS for `.album-detail-section-header` to center or align controls properly
- Consider if `album-detail-section-title-block` CSS class can be removed entirely
- Ensure accessibility is maintained (sections still have aria-label attributes)

---

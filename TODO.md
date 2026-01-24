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


## Add Margin Between Root Album List Items

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 15-30 minutes

### Description
Add top and bottom margin spacing between each list item (`li`) in the root album list view (`.root-album-list-view-list`). Currently, the list items have no margin, which may cause the album blocks to appear too close together. Adding appropriate vertical margin will improve visual separation and readability between album blocks in the root album list.

### Requirements

#### Research Tasks
- Review current CSS structure of `.root-album-list-view-list` and its `li` children
- Check if `RootAlbumListBlock` component already has margin that might conflict
- Research appropriate margin values for list item spacing (consider existing spacing patterns in the codebase)
- Review responsive behavior: should margin be consistent across all screen sizes or adjusted for mobile?
- Check if margin should be applied to all items or use `:not(:first-child)` / `:not(:last-child)` patterns

#### Implementation Tasks
- Add CSS rule for `.root-album-list-view-list > li` selector
- Apply `margin-top` and/or `margin-bottom` properties with appropriate values
- Consider using `margin-top` on all items except first, or `margin-bottom` on all items except last
- Alternatively, use `margin-top` and `margin-bottom` with `:not(:first-child)` and `:not(:last-child)` selectors
- Ensure margin values are consistent with existing spacing patterns (e.g., `1rem`, `1.5rem`, `2rem`)
- Verify margin doesn't conflict with existing spacing in `RootAlbumListBlock` component
- Test that margin works correctly with first and last items in the list
- Check responsive behavior: verify margin looks good on mobile and desktop viewports
- Ensure margin doesn't create excessive spacing at the top or bottom of the list

### Deliverable
List items in root album list view with appropriate top/bottom margin spacing between album blocks

### Testing Requirements
- Verify margin appears between all list items in the root album list
- Check that first item doesn't have unwanted top margin
- Check that last item doesn't have unwanted bottom margin
- Verify margin spacing looks visually appropriate and consistent
- Test with lists containing 1, 2, 3, and many album items
- Verify margin works correctly on mobile viewports
- Verify margin works correctly on desktop/tablet viewports
- Check that margin doesn't interfere with existing `RootAlbumListBlock` styling
- Ensure no visual regressions in the root album list view

### Technical Notes
- Current `.root-album-list-view-list` has `margin: 0` and `padding: 0` with `list-style: none`
- `RootAlbumListBlock` component already has `margin-bottom: 1.5rem` on `.root-album-list-block` class
- May need to remove or adjust `margin-bottom` from `RootAlbumListBlock` if adding margin to `li` elements
- Consider using CSS custom properties for margin value to maintain consistency
- Common patterns: `margin-top: 1rem` with `:not(:first-child)` or `margin-bottom: 1.5rem` with `:not(:last-child)`
- Should coordinate with existing `RootAlbumListBlock` margin to avoid double spacing


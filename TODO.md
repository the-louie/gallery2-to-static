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

## Remove "Has Children" Text from Albums

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 15-30 minutes

### Description
Remove the "Has children" / "No children" text that is currently displayed on album cards. This text is redundant visual information that clutters the UI, as users can determine if an album has children by clicking on it. The `hasChildren` property should remain in the data model for internal logic, but should not be displayed to users.

### Requirements

#### Research Tasks
- Review AlbumCard component implementation
- Check where "Has children" text is displayed
- Review accessibility implications (aria-label, aria-describedby)
- Check if the text is used in tests that need updating

#### Implementation Tasks
- Remove the `childCountText` variable and its display in AlbumCard.tsx
- Remove the `<div className="album-card-count">` element that displays the text
- Update or remove `aria-describedby` attribute that references the count element
- Update `aria-label` if it references the child count text
- Remove any CSS styles related to `.album-card-count` that are no longer needed
- Update AlbumCard tests that check for "Has children" text
- Verify accessibility is maintained without the text

### Deliverable
AlbumCard component without "Has children" / "No children" text display

### Testing Requirements
- Verify "Has children" text is no longer displayed on album cards
- Verify "No children" text is no longer displayed on album cards
- Check that album cards still render correctly without the count element
- Verify no layout regressions or visual issues
- Test accessibility (screen readers, keyboard navigation)
- Update tests that assert on "Has children" text presence
- Verify `hasChildren` property still exists in data model (for internal use)

### Technical Notes
- Current implementation in AlbumCard.tsx lines 80-82 and 114-120
- The `hasChildren` property should remain in the Album type and data model
- May be used internally for logic (e.g., showing different icons, navigation behavior)
- Remove only the visual display, not the underlying data property
- Consider if any other components or utilities depend on displaying this text
- CSS class `.album-card-count` can be removed from AlbumCard.css if unused elsewhere

---

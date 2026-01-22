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

## Use Order Value for Default Album/Photo Sorting

**Status:** Pending
**Priority:** Medium
**Complexity:** Low-Medium
**Estimated Time:** 2-3 hours

### Description
Implement frontend functionality to use the `order` field from JSON data as the default sorting method when rendering albums and photos. When no user-selected sort option is active, items should be displayed in their Gallery 2 order (using the `order` field). User-selected sorting options should still take precedence over the default order.

### Requirements

#### Research Tasks
- Research how order field will be structured in JSON (number, nullable, default values)
- Research integration with existing sorting system (`sortItems` function, `SortOption` type)
- Research default sort behavior: when to apply order-based sorting vs user-selected sorting
- Research handling of items without order values (null/undefined) in sorting logic
- Research whether order sorting should apply to both albums and photos or separately
- Research how order sorting interacts with filtering (should order be applied before or after filtering)
- Research user experience: should order be visible as a sort option or only used as default

#### Implementation Tasks
- Add `order` field to `Child` interface in `frontend/src/types/index.ts` as optional number field
- Create `sortByOrder` function in `frontend/src/utils/sorting.ts` to sort by order field
- Handle null/undefined order values in sorting (items without order should be sorted last or maintain relative position)
- Add 'order' as a sort option type or use it as default when no sort is selected
- Update `sortItems` function to support 'order' sort option or create separate default ordering logic
- Integrate order-based sorting in `AlbumGrid.tsx` component (apply when no user sort is selected)
- Integrate order-based sorting in `ImageGrid.tsx` component (apply when no user sort is selected)
- Update `AlbumDetail.tsx` to use order-based sorting for child items when appropriate
- Ensure order sorting works correctly with filtering (order should be preserved through filter operations)
- Handle backward compatibility: items without order field should still display (sorted last or by existing fallback)
- Test with sample data that includes order values
- Test with sample data that has missing order values (null/undefined)
- Verify order sorting doesn't break existing user-selected sorting functionality

### Deliverable
Frontend functionality that uses the `order` field from JSON data as default sorting for albums and photos, preserving Gallery 2's original item ordering when no user sort is selected.

### Testing Requirements
- Verify items with order values are sorted correctly by order (ascending)
- Check items without order values are handled appropriately (sorted last or maintain position)
- Ensure user-selected sorting options still work and take precedence over order sorting
- Verify order sorting works correctly with filtering applied
- Test order sorting in AlbumGrid component
- Test order sorting in ImageGrid component
- Test order sorting in AlbumDetail component for child items
- Verify backward compatibility: existing data without order field still displays correctly
- Check that order sorting is stable (items with same order value maintain relative position)
- Verify order sorting doesn't interfere with existing sort dropdown functionality

### Technical Notes
- Order field should be optional (nullable) in TypeScript types to maintain backward compatibility
- Sorting by order should be ascending (lower order values first, matching Gallery 2 behavior)
- Items without order values should be sorted last (after items with order values)
- Order sorting should only apply when no user-selected sort option is active
- Consider making order sorting the default when sortOption is undefined or null
- Order sorting should integrate seamlessly with existing `sortItems` utility function
- May need to add 'order' to `SortOption` type or handle it as a special case
- Order sorting should work for both albums and photos (same logic, different components)
- Consider whether order should be visible to users as a sort option or only used internally as default

---

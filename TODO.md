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


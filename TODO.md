# TODO

---

## Expand Theme System to Support Multiple Themes

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 3-4 hours

### Description
Expand the current dark/light theme toggle system to support multiple themes. Replace the toggle button with a dropdown menu that allows users to select from available themes. The system should default to light mode, include dark mode as an option, and be designed to easily accommodate additional themes in the future.

### Requirements

#### Research Tasks
- Research dropdown component patterns for theme selection (accessibility, styling, UX)
- Research theme storage and persistence patterns (localStorage, sessionStorage, cookies)
- Research theme system architecture patterns (theme registry, theme definitions, theme switching)
- Research CSS variable management for multiple themes (naming conventions, organization)
- Research dropdown accessibility requirements (keyboard navigation, ARIA attributes, focus management)

#### Implementation Tasks
- Create theme registry/configuration system to define available themes
- Refactor ThemeContext to support multiple themes instead of just dark/light toggle
- Create ThemeDropdown component to replace ThemeSwitcher toggle button
- Implement dropdown UI with proper styling and theming
- Add theme selection state management (default to light mode)
- Implement theme persistence in localStorage
- Update themes.css to support theme registry pattern
- Ensure dark mode remains available as an option
- Add keyboard navigation support for dropdown (arrow keys, Enter, Escape)
- Add ARIA attributes for accessibility (aria-label, aria-expanded, aria-haspopup)
- Update theme switching logic to work with theme names instead of boolean
- Test theme switching across all components
- Ensure dropdown works correctly in both light and dark themes
- Add smooth transitions when switching themes

### Deliverable
Theme dropdown component replacing toggle button, with support for multiple themes (light and dark initially, extensible for future themes)

### Testing Requirements
- Verify dropdown defaults to light mode on first visit
- Check dark mode is available and works correctly
- Ensure theme selection persists across page reloads
- Verify dropdown is accessible via keyboard navigation
- Check dropdown works correctly in all current themes
- Verify theme switching applies correctly to all components
- Test dropdown positioning and visibility (doesn't overflow viewport)
- Ensure ARIA attributes are correct for screen readers
- Verify theme persistence works when localStorage is disabled (graceful fallback)

### Technical Notes
- Dropdown should be styled to match current design system
- Theme registry should be easily extensible (adding new themes should be straightforward)
- Theme names should be descriptive and user-friendly
- Consider theme preview/icon in dropdown for better UX
- localStorage key should be consistent with existing patterns
- Theme switching should not cause layout shifts or flicker
- Dropdown should close when clicking outside or selecting an option
- Consider adding theme transition animations for better UX

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

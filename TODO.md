# TODO

---

## Fix Up Button Navigation to Direct Parent

**Status:** Pending
**Priority:** High
**Complexity:** Medium
**Estimated Time:** 2-3 hours

### Description
The Up button in AlbumDetail (and AlbumDetailEmpty's "Go Up") currently navigates to the root album or home ("/") instead of the direct parent album. When viewing a nested album (e.g. Root → Album A → Album B), clicking Up should navigate to Album A (the immediate parent), not to the root album or home.

### Requirements

#### Research Tasks
- Review `handleBackClick` in [AlbumDetail.tsx](frontend/src/components/AlbumDetail/AlbumDetail.tsx) and how it uses `getParentAlbumId`
- Review [getParentAlbumId](frontend/src/utils/breadcrumbPath.ts) and `findParentAlbumId` implementation
- Understand candidate order (childId - 1, childId - 2, …) and when root is found before direct parent
- Review [buildBreadcrumbPath](frontend/src/utils/breadcrumbPath.ts): it traverses upward correctly; consider using it to obtain direct parent
- Check when `getParentAlbumId` returns null (root, orphan, error) and thus triggers `navigate('/')`
- Review AlbumDetailEmpty "Go Up" flow; it uses the same `onBackClick` / `handleBackClick`

#### Implementation Tasks
- Ensure Up navigates to the **direct parent** album (immediate parent in hierarchy), not to root or home when a parent exists
- Fix or replace `getParentAlbumId` / `findParentAlbumId` logic so it returns the direct parent only (e.g. first ancestor when traversing up from current, or use `buildBreadcrumbPath` and take parent from path)
- Handle edge cases: root album (no parent, hide Up or no-op), orphaned album (no parent found, navigate to "/" is acceptable), load errors (existing fallback to "/")
- Keep `parentCache` semantics correct if still used; clear cache appropriately when logic changes
- Update [breadcrumbPath.test](frontend/src/utils/breadcrumbPath.test.ts) for `getParentAlbumId` / `findParentAlbumId` (e.g. multi-level hierarchy: root → A → B, Up from B goes to A)
- Update [AlbumDetail.test](frontend/src/components/AlbumDetail/AlbumDetail.test.tsx) if navigation expectations change

### Deliverable
Up button navigates to the direct parent album when one exists; root and orphan behavior unchanged.

### Testing Requirements
- Verify Up from a deeply nested album (e.g. 3 levels) goes to immediate parent, not root
- Verify Up from direct child of root goes to root (or home as designed)
- Verify Up at root album still hides button / no-op
- Verify orphaned album still navigates to "/" when no parent found
- Verify AlbumDetailEmpty "Go Up" exhibits same behavior

### Technical Notes
- [breadcrumbPath.ts](frontend/src/utils/breadcrumbPath.ts): `findParentAlbumId` returns first candidate whose `children` contain the current album; candidate order may yield root before direct parent in some cases
- [AlbumDetail](frontend/src/components/AlbumDetail/AlbumDetail.tsx) lines ~183–212: `handleBackClick` calls `getParentAlbumId(albumId)`, then `navigate(\`/album/${parentId}\`)` or `navigate('/')`
- Consider deriving direct parent from `buildBreadcrumbPath` (path order: root → … → parent → current) and using that for Up navigation

---

## Style the List of Subalbums (Snazzy)

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 1-2 hours

### Description
The subalbums list in [RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx) (the "Subalbums:" section with links to child albums) currently uses minimal styling: a plain `<ul>` with disc markers, underlined primary-colored links, and basic hover/focus. Improve its visual design so it looks snazzy—more polished, distinctive, and appealing—while staying accessible and consistent with the rest of the UI.

### Requirements

#### Research Tasks
- Review current [RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx) markup: `root-album-list-block-subalbums`, `root-album-list-block-subalbums-title`, `root-album-list-block-subalbums-list`, `root-album-list-block-subalbum-link`
- Review [RootAlbumListBlock.css](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.css) (lines ~157–194): list layout, max-height/overflow, link styles, responsive behavior
- Check theme variables used elsewhere (AlbumDetail, AlbumCard, themes.css) for consistency
- Review RootAlbumListBlock two-column layout (album left, subalbums right) and stacking on narrow viewports; ensure styling changes do not break layout

#### Implementation Tasks
- Redesign subalbums section styling: typography, spacing, list appearance (e.g. remove or replace default list-style, use custom bullets or inline-block pills/tags if appropriate)
- Improve link styling: hover/active/focus states, optional subtle background or border on hover, transition effects
- Optionally add light visual structure (e.g. soft background, border, border-radius) to the subalbums block so it reads as a distinct "snazzy" component
- Ensure responsive behavior remains correct; avoid overflow or layout shift on small screens
- Use CSS custom properties (theme variables) where applicable so themes respect the new look
- Keep accessibility: focus visible, sufficient contrast, logical reading order

#### Code-Review Tasks
- Verify no regressions in [RootAlbumListBlock.test](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.test.tsx) (e.g. "shows Subalbums section with links when subalbums present")
- Verify [RootAlbumList.integration](frontend/src/pages/RootAlbumList.integration.test.tsx) subalbum navigation still works

### Deliverable
A visually improved, snazzier subalbums list in RootAlbumListBlock that feels cohesive with the app and works across viewports and themes.

### Testing Requirements
- Subalbums section still renders when `subalbums.length > 0`; hidden when empty
- Links still navigate to `/album/:id`; keyboard and screen-reader behavior unchanged
- Layout and responsiveness preserved; no overflow or clipping issues
- Visual check across themes (if applicable) and viewport sizes

### Technical Notes
- Subalbums are rendered in [RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx) lines ~138–157; data comes from `useSubalbumsMap` via [RootAlbumListView](frontend/src/components/RootAlbumListView/RootAlbumListView.tsx)
- Current list uses `list-style: disc`, `padding-left`, `max-height: 12rem`, `overflow-y: auto`; links use `--color-primary` and underline
- Changes should be scoped to RootAlbumListBlock CSS (and minor markup only if needed); avoid modifying AlbumGrid/AlbumCard unless explicitly extending "subalbums" styling there

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

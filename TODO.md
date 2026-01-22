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

## Extract Owner Name and Summary into JSON Data

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 2-3 hours

### Description
Extract owner name (resolved via `ownerId` → User) and `summary` from the Gallery 2 database and add them to the per-album JSON files (`data/{id}.json`). Each child item in the JSON will include `ownerName` (string | null) and `summary` (string | null). Owner name is resolved by joining Item.ownerId to User.id and using User.fullName, falling back to User.userName when fullName is null. Items with missing or invalid ownerId (e.g. deleted user) will have null ownerName.

### Requirements

#### Research Tasks
- Confirm Item.ownerId references User.id in Gallery 2 schema (g2_Item.g_ownerId → g2_User.g_id)
- Confirm User table columns: userName (required), fullName (nullable) for name resolution
- Confirm Item.summary column exists and is nullable (varchar)
- Research handling of orphaned ownerId: use LEFT JOIN User so ownerName is null when user missing
- Review existing SQL_GET_CHILDREN joins and column mapping to avoid regressions
- Check whether summary vs description semantics differ (both exist on Item) for frontend use

#### Implementation Tasks
- Add `i.${columnPrefix}ownerId` and `i.${columnPrefix}summary` to SQL_GET_CHILDREN SELECT
- Add `LEFT JOIN ${tablePrefix}User u ON u.${columnPrefix}id = i.${columnPrefix}ownerId` to SQL_GET_CHILDREN
- Select owner name as `COALESCE(u.${columnPrefix}fullName, u.${columnPrefix}userName) as ownerName`
- Add `ownerName` and `summary` to Child interface in `backend/types.ts` (optional, string | null)
- Update sqlUtils row mapping to pass through ownerName and summary into Child objects
- Ensure backend writes ownerName and summary into `data/{id}.json` (no extra filtering)
- Update `validateChildArray` in `frontend/src/utils/dataLoader.ts` if strict validation requires new fields (keep optional to avoid breaking existing JSON)
- Optionally extend search index to include summary and/or ownerName for search; document as follow-up if deferred
- Optionally display ownerName and summary in UI (AlbumDetail, SearchResults, etc.); document as follow-up if deferred

### Deliverable
Backend extraction of owner name (via ownerId → User) and summary, added to Child type and emitted in all `data/{id}.json` files. Existing JSON without these fields remains loadable (optional fields).

### Testing Requirements
- Verify SQL returns ownerName and summary for items with valid ownerId and non-null summary
- Verify ownerName is null when User missing (LEFT JOIN) or ownerId invalid
- Verify summary is null when Item.summary is null
- Verify fullName used when present; userName used as fallback when fullName null
- Run backend export and inspect generated JSON for new fields
- Confirm frontend dataLoader still validates and loads both legacy JSON (no ownerName/summary) and new JSON
- No regression in existing fields (title, description, order, thumbnails, etc.)

### Technical Notes
- Use config.gallerySettings.tablePrefix and columnPrefix for User table and columns
- Owner name: prefer fullName, fallback to userName. Both from g2_User.
- summary is distinct from description; both are Item fields. Include both in JSON.
- Keep ownerName and summary optional in Child type for backward compatibility with pre-existing JSON
- Consider adding ownerName/summary to search index and UI in separate tasks if not in scope

---

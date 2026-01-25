# TODO

---

## Album titles and descriptions: BBCode (Backend + Frontend) (Partial)

**Status:** Partial
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 1–2 hours

### Description
Two parts: (1) **Backend:** Strip BBCode from album titles in emitted JSON so `title` / `albumTitle` are plain text. (2) **Frontend:** Render BBCode in album descriptions in RootAlbumListBlock and AlbumDetail (parse and display formatting/links).

### Requirements (in progress)

#### Scope
- **Backend only (titles).** Extraction logic in `backend/` that builds album metadata and child items (e.g. `backend/index.ts`, and any helper that sets `title` or `albumTitle`). Add a strip-BBCode step (or helper) and apply it wherever album titles are assigned to the output (metadata for each album file, and each child item's title).
- **Titles only.** Strip BBCode from album title fields only. Do not strip from description or summary unless a separate product decision says so; this task is only for titles so that all consumers of `title` / `albumTitle` get plain text.
- **Stripping.** "Strip" means remove all BBCode tags (e.g. `[b]`, `[/b]`, `[i]`, `[color=red]`, `[tag=value]`, etc.) and output only the concatenated inner text. Optionally decode HTML entities first (e.g. `&auml;` → `ä`) then strip tags, so the stored title is readable plain text. Handle nested tags and malformed/unclosed tags (leave remaining text).
- **Frontend (descriptions).** **Album descriptions** must support **BBCode rendering** in two places: (1) in the **root album list** (each album block's description in `RootAlbumListBlock`), and (2) in the **actual album view** (the album description in `AlbumDetail`). Today both locations render the description as plain text (HTML entities decoded only). Required: parse and render BBCode (e.g. `[b]`, `[i]`, `[color=…]`, `[url=…]`) using the same parsing pipeline (e.g. `parseBBCodeDecoded`).

#### Implementation Tasks
- Add a backend helper that strips BBCode to plain text, e.g. `stripBBCode(title: string): string` (in a shared place). It should remove `[tag]`, `[/tag]`, and `[tag=value]` and return the inner text only. Align with the same tag set the frontend parser knows (b, i, u, s, color, size, url, etc.). Optionally decode HTML entities before or after stripping.
- Apply the helper wherever album titles are set during extraction: (1) when building `metadata.albumTitle` for each album file; (2) when building each child object's `title` (for GalleryAlbumItem and any other type that has a title). Ensure root album and all child albums and nested extraction paths use the stripped title.
- In `RootAlbumListBlock.tsx`, replace the description output from `decodeHtmlEntities(album.description!)` to `parseBBCodeDecoded(album.description!)` (with null/empty guard: only render the paragraph when description is non-empty; pass trimmed string to the parser). Ensure `extractUrlFromBBCode` for the "website" link still receives raw summary/description if that behavior is separate.
- In `AlbumDetail.tsx`, replace the description output from `decodeHtmlEntities(album.description)` to `parseBBCodeDecoded(album.description)` (with existing guard for `album.description`). If summary is rendered with `decodeHtmlEntities(album.summary)`, change to `parseBBCodeDecoded(album.summary)` for consistency if product wants summary to support BBCode too.
- Update tests: In `RootAlbumListBlock.test.tsx`, add or adjust a test that expects description with BBCode to render as formatted. In `AlbumDetail.test.tsx`, update the test "does not parse BBCode in description or summary" to instead expect BBCode to be parsed. Adjust any snapshot or text assertions that assume plain-text description.

---

## Limit root album child-album descriptions to 20 words (Backend Extraction)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30–45 minutes

### Description
During backend extraction, when building the **root album** JSON file, limit the `description` field for each **child album** (GalleryAlbumItem) in the root's `children` array to at most 20 words. If a child album's description has more than 20 words, truncate it to the first 20 words and append an ellipsis (e.g. `"..."`). Descriptions of 20 words or fewer remain unchanged. This applies only to the root album's emitted `children`; other albums' children and metadata descriptions are not modified.

### Requirements

#### Scope
- **Root album only.** Apply truncation only when emitting the album JSON for the configured root album (the top-level album, e.g. `rootId`).
- **Child albums only.** Only truncate `description` on items where `type === 'GalleryAlbumItem'`. Do not change descriptions on photos (GalleryPhotoItem) or on album metadata.
- **Word count.** Use a simple word boundary (e.g. split on whitespace). Exactly 20 words; if there are more, take the first 20 and append `"..."`.
- **Null/empty.** If `description` is null, undefined, or empty, leave it unchanged (no ellipsis).

#### Implementation Tasks
- Add a helper (e.g. `truncateDescriptionToWords(text: string, maxWords: number): string`) that returns the first `maxWords` words and appends `"..."` only when the input has more than `maxWords` words.
- In `backend/index.ts`, when building the root album's output (e.g. `processedChildrenWithThumbnails` or immediately before writing the root album JSON), detect that the current album is the root (e.g. by passing `rootAlbumId` into `main` and comparing `root === rootAlbumId`).
- For the root album only, map over the final children array and for each child with `type === 'GalleryAlbumItem'` and a non-empty `description`, replace `description` with `truncateDescriptionToWords(description, 20)`.

### Deliverable
The root album JSON file's `children` array has no child album with a `description` longer than 20 words plus ellipsis. All other albums and fields are unchanged.

### Testing Requirements
- Run extraction and confirm the root album JSON has truncated descriptions (≤ 20 words + `"..."`) for child albums that originally had longer descriptions.
- Confirm non-root album JSON files and photo children are unchanged.
- Confirm descriptions that are already ≤ 20 words are not modified (no extra ellipsis).

### Technical Notes
- Use a constant for the word limit (e.g. `ROOT_ALBUM_CHILD_DESCRIPTION_MAX_WORDS = 20`) for maintainability.
- Ellipsis character: use `"..."` (three full stops) unless the project prefers a single Unicode ellipsis character (`\u2026`).

---

 The "" The header should not appear as a distinct "bar" on top of the page. Prefer: (1) **Background:** Use the same background as the page (e.g. transparent so the layout's gradient or `--color-background-primary` shows through), or extend the layout gradient into the header area so there is no color step. (2) **Border:** Remove the header's `border-bottom` or replace it with a very subtle separator (e.g. same color as background with a slight tone difference, or a soft shadow) so the transition to main content is gradual rather than a hard line.
 Remove or soften `.layout-header`'s `border-bottom` (remove it, or use a very light border/shadow that doesn't read as a strong line).
---

"Martin Öjes" and "Nässlan" rather than "Martin &ouml;jes" or "N&auml;sslan".



""
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


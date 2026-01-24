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

## Remove "Album: " Prefix from Root Album List

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30 minutes

### Description
The root album list ([RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx)) currently displays each album title with an "Album: " prefix (e.g. "Album: My Vacation"). Remove this prefix so that only the album title is shown (e.g. "My Vacation"). The root list is the only place that uses this prefix; nested album views (AlbumDetail, AlbumGrid) do not.

### Requirements

#### Research Tasks
- Confirm "Album: " is rendered only in [RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx) (line ~104: `Album: {parsedTitle}`)
- Review [RootAlbumListBlock.test](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.test.tsx): assertion `screen.getByText(/Album:/)` and any other references to "Album:"
- Check JSDoc and module comments in RootAlbumListBlock that mention "Album: [title]" and update accordingly
- Ensure `parsedTitle` (BBCode-parsed) and "Untitled Album" fallback remain unchanged; only the prefix is removed

#### Implementation Tasks
- In [RootAlbumListBlock.tsx](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx), change the title render from `Album: {parsedTitle}` to `{parsedTitle}` (or equivalent) so the prefix is removed
- Update [RootAlbumListBlock.test](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.test.tsx): remove or replace assertions that match "Album:" (e.g. assert on album title text instead)
- Update RootAlbumListBlock JSDoc/module comment that describes "Album: [title]" to describe title-only display

#### Code-Review Tasks
- Verify no other components or tests rely on the "Album: " prefix
- Confirm [RootAlbumList.integration](frontend/src/pages/RootAlbumList.integration.test.tsx) and related integration tests do not break

### Deliverable
Root album list shows album names without the "Album: " prefix; all tests updated and passing.

### Testing Requirements
- RootAlbumListBlock renders album title only (no prefix)
- Existing RootAlbumListBlock tests updated and passing
- RootAlbumList integration tests still pass

### Technical Notes
- [RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx) line ~104: `<h2 ...>Album: {parsedTitle}</h2>`
- `parsedTitle` is `parseBBCode(album.title)` or "Untitled Album" when missing; keep that logic
- `aria-labelledby` and `id` on the title remain valid; no need to change based on prefix removal

---

## Remove "Website: " Prefix from Root Album Website Links

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30 minutes

### Description
The root album list ([RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx)) displays an extracted URL from album summary/description (via `extractUrlFromBBCode`) with a "Website: " prefix before the link (e.g. "Website: Example"). Remove this prefix so that only the link is shown (e.g. "Example" or the URL when no label). The link remains in a `<p>` with class `root-album-list-block-website`; only the prefix text is removed.

### Requirements

#### Research Tasks
- Confirm "Website: " is rendered only in [RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx) (lines ~109–120: `Website:{' '}` then `<a>` with `extUrl.label ?? extUrl.url`)
- Review [RootAlbumListBlock.test](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.test.tsx): "shows Website link when summary has [url=...]...[/url]" asserts `screen.getByText(/Website:/i)` and `getByRole('link', { name: 'Example' })`; update assertions once prefix is removed
- Check JSDoc and module comments that mention "Website: …" (e.g. RootAlbumListBlock, [bbcode.ts](frontend/src/utils/bbcode.ts) `extractUrlFromBBCode`) and update to describe link-only display

#### Implementation Tasks
- In [RootAlbumListBlock.tsx](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx), remove the `Website:{' '}` segment from the website block; render only the `<a>` (or keep a wrapping `<p>` with just the link as child)
- Update [RootAlbumListBlock.test](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.test.tsx): remove or replace the `getByText(/Website:/i)` assertion; ensure the link is still found (e.g. by `getByRole('link', { name: 'Example' })`) and `href` is correct
- Update RootAlbumListBlock and any relevant bbcode JSDoc that describe "Website: …" output

#### Code-Review Tasks
- Verify no other components or tests depend on the "Website: " prefix
- Confirm [RootAlbumList.integration](frontend/src/pages/RootAlbumList.integration.test.tsx) and related tests do not break

### Deliverable
Root album list website links display without the "Website: " prefix; link text and `href` unchanged; tests updated and passing.

### Testing Requirements
- Website link still renders when summary/description contains `[url=...]...[/url]`; link navigates correctly and has correct `href`
- RootAlbumListBlock tests updated and passing; no assertions on "Website:" text

### Technical Notes
- [RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx) lines ~109–120: `<p className="root-album-list-block-website">Website:{' '}<a ...>{extUrl.label ?? extUrl.url}</a></p>`
- `extUrl` from `extractUrlFromBBCode(album.summary ?? album.description ?? '')`; structure unchanged
- CSS class `root-album-list-block-website` and `root-album-list-block-website-link` can remain as-is

---

## Fix HTML Entity Encoding for Album Names, Breadcrumbs, and Subalbum Lists

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 1.5–2 hours

### Description
Album names, breadcrumb titles, subalbum link labels, and other displayed titles sometimes show HTML entities literally (e.g. "N&amp;auml;sslan" instead of "Nässlan"). This happens when source data contains entities like `&auml;` and we later escape `&` to `&amp;` (e.g. in [parseBBCode](frontend/src/utils/bbcode.ts) via `escapeHtml`), or when already double-encoded data is rendered as plain text. Decode HTML entities before display (and before BBCode parsing, where applicable) so that characters such as ä, ö, ü render correctly everywhere we show album names, breadcrumbs, subalbum lists, and related titles.

### Requirements

#### Research Tasks
- Identify all surfaces that display album/photo titles: [AlbumDetail](frontend/src/components/AlbumDetail/AlbumDetail.tsx) (header, section titles), [AlbumCard](frontend/src/components/AlbumGrid/AlbumCard.tsx), [RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx) (main title, subalbum links), [Breadcrumbs](frontend/src/components/Breadcrumbs/Breadcrumbs.tsx), [Lightbox](frontend/src/components/Lightbox/Lightbox.tsx) image titles, metadata in album JSON used by [buildBreadcrumbPath](frontend/src/utils/breadcrumbPath.ts)
- Review [bbcode.ts](frontend/src/utils/bbcode.ts) `escapeHtml` usage: plain text passed to `parseBBCode` is escaped (including `&` → `&amp;`); decoding must happen **before** BBCode parsing to avoid double-encoding
- Check backend: titles come from DB via [sqlUtils](backend/sqlUtils.ts); [cleanupUipath](backend/cleanupUipath.ts) `unescapeHtml` applies only to path cleanup, not display titles; JSON likely contains raw or pre-encoded titles
- Decide where to decode: shared utility (e.g. `decodeHtmlEntities`) used at display time vs. at data load; ensure we don't break URL or non-display uses of titles

#### Implementation Tasks
- Add a `decodeHtmlEntities` (or similar) utility that decodes common entities (`&amp;`, `&auml;`, `&ouml;`, `&uuml;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&#N;`, `&#xN;`). Use a loop or ordered replacements so that `&amp;` is decoded last and double-encoding is handled; align with [cleanupUipath](backend/cleanupUipath.ts) `unescapeHtml` pattern if useful
- Apply decoding to all title display paths: (1) before `parseBBCode` where we parse titles (AlbumDetail, AlbumCard, RootAlbumListBlock, Lightbox, Breadcrumbs once BBCode is added), (2) where we render raw titles (subalbum links, breadcrumb items, etc.). Use a single place or small set of helpers to avoid inconsistency
- Ensure decoding runs **before** BBCode parsing so that `escapeHtml` in bbcode never double-encodes existing entities
- Add unit tests for `decodeHtmlEntities` (e.g. `&amp;auml;` → `ä`, `&auml;` → `ä`, multiple entities, empty input, no entities)

#### Code-Review Tasks
- Verify no title display surface is missed; confirm breadcrumbs, subalbum list, album grid, album detail, lightbox all use decoded titles
- Ensure we don't decode in contexts where raw entities are required (e.g. URL components, attributes) if any; limit to display strings

### Deliverable
Album names, breadcrumb titles, subalbum list labels, and other displayed titles render with correct characters (e.g. ä, ö, ü) instead of literal `&amp;auml;` or `&auml;`; decoding is consistent and applied before BBCode parsing.

### Testing Requirements
- Unit tests for `decodeHtmlEntities`: common entities, double-encoding, edge cases
- Manual or automated checks: subalbum list, breadcrumbs, album cards, album detail header, lightbox show correct characters for titles with entities
- No regressions in BBCode rendering or in components that display titles

### Technical Notes
- [bbcode.ts](frontend/src/utils/bbcode.ts): `escapeHtml` escapes `&<>"'`; `parseBBCodeInternal` uses it for plain text. Decoding before parse avoids turning `&auml;` into `&amp;auml;`
- [cleanupUipath](backend/cleanupUipath.ts) `unescapeHtml` loop handles `&amp;` first and repeats until stable; consider similar ordering for frontend decoder
- Apply decode only to strings used for **display**; do not change backend JSON shape or persist decoded values in place of originals

---

## Add BBCode Support to Breadcrumbs and Subalbum Titles

**Status:** Pending
**Priority:** Medium
**Complexity:** Low
**Estimated Time:** 1–1.5 hours

### Description
Breadcrumb segments and subalbum link labels currently render album titles as plain text. When titles contain BBCode (e.g. `[b]Internationella[/b]`, `[b]AskersundsLAN #9[/b]`), the tags appear literally instead of being formatted. Add BBCode parsing so that breadcrumb titles and subalbum titles display formatted text (bold, italic, etc.) consistent with AlbumDetail, AlbumCard, and Lightbox.

### Requirements

#### Research Tasks
- Review [Breadcrumbs](frontend/src/components/Breadcrumbs/Breadcrumbs.tsx): `item.title` is rendered as plain text (lines ~90, 104) for both the current-page `<span>` and parent `<Link>`s; "Home" is hardcoded and should remain plain
- Review [buildBreadcrumbPath](frontend/src/utils/breadcrumbPath.ts): `BreadcrumbItem.title` is set from `albumMetadata.title` (raw from JSON); no parsing at source
- Review [RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx): subalbum links use `{sub.title ?? 'Untitled'}` (line ~151); main album title uses `parseBBCode`; subalbum titles are not parsed
- Confirm [parseBBCode](frontend/src/utils/bbcode.ts) is used elsewhere for titles (AlbumDetail, AlbumCard, Lightbox) and returns `React.ReactNode`; handle null/empty input per existing patterns

#### Implementation Tasks
- **Breadcrumbs:** When rendering each breadcrumb item, use `parseBBCode(item.title)` for non-home items. Keep "Home" as literal text for the root item. Ensure both link labels and the current-page span receive parsed output; preserve `aria-label` / `aria-current` semantics (use plain string for ARIA where appropriate, e.g. strip tags or use original title for screen readers if needed)
- **Subalbum titles:** In [RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx), replace `{sub.title ?? 'Untitled'}` with parsed output: use `parseBBCode(sub.title)` when `sub.title` is non-empty, otherwise `'Untitled'`; mirror the main album `parsedTitle` pattern (trim, fallback)
- Add `parseBBCode` import where missing (Breadcrumbs, RootAlbumListBlock already has it for main title)
- Handle edge cases: null/empty titles, existing "Untitled" / "Album N" fallbacks from `buildBreadcrumbPath`; ensure no duplicate parsing (e.g. avoid parsing "Home" or fallback strings that contain no BBCode)

#### Code-Review Tasks
- Verify [Breadcrumbs.test](frontend/src/components/Breadcrumbs/Breadcrumbs.test.tsx) still passes; add or update tests for breadcrumb items with BBCode in `title` (e.g. `[b]Bold[/b]`) and assert formatted output
- Verify [RootAlbumListBlock.test](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.test.tsx) and [RootAlbumList.integration](frontend/src/pages/RootAlbumList.integration.test.tsx): subalbum links still navigate correctly; consider adding a test with BBCode in subalbum title

### Deliverable
Breadcrumb segments and subalbum link labels render BBCode-formatted titles (e.g. bold) instead of raw tags; "Home" and fallbacks unchanged; tests updated and passing.

### Testing Requirements
- Breadcrumbs: items with `[b]...[/b]` (and other supported tags) render formatted; "Home" remains plain; links and current page both display correctly
- Subalbums: links with BBCode in title render formatted; "Untitled" fallback when title null/empty; navigation to `/album/:id` unchanged
- No regressions in AlbumDetailPage breadcrumb integration or RootAlbumListBlock behaviour

### Technical Notes
- [Breadcrumbs](frontend/src/components/Breadcrumbs/Breadcrumbs.tsx): `item.title` is `string`; `parseBBCode` returns `React.ReactNode`; use for display only, keep ARIA attributes using plain text where appropriate
- [RootAlbumListBlock](frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx) line ~151: subalbum `Link` children currently `{sub.title ?? 'Untitled'}`; match `parsedTitle` pattern (e.g. `useMemo` per sub or inline `trim` + `parseBBCode` + fallback)
- [buildBreadcrumbPath](frontend/src/utils/breadcrumbPath.ts) stores raw `albumMetadata.title`; parsing happens at render time in Breadcrumbs, not in breadcrumbPath

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

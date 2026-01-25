# TODO

---

## Replace "Gallery Administrator" with "The Louie" in ownerName (Backend Extraction)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30–45 minutes

### Description
During backend extraction, any `ownerName` value that equals the literal string `"Gallery Administrator"` (from the Gallery 2 database) must be replaced with `"The Louie"` before being written to the emitted JSON. This applies to both album metadata (`metadata.ownerName`) and child items (`children[].ownerName`).

### Requirements

#### Scope
- **Backend only.** All places that set or pass through `ownerName` during export must apply the replacement.
- **Exact match.** Replace only when `ownerName === "Gallery Administrator"`. Do not change other owner names or null/undefined.
- **Output.** Emitted album JSON files and any other output that includes `ownerName` must show "The Louie" instead of "Gallery Administrator" where that value came from the database.

#### Implementation Options
- **Option A:** Normalize in `backend/sqlUtils.ts` where `ownerName` is read from the database (e.g. in `getAlbumInfo` and in the `getChildren` mapping). Use a small helper (e.g. `normalizeOwnerDisplayName(name)` or inline check) so all consumers receive the normalized value.
- **Option B:** Normalize in `backend/index.ts` when assigning `metadata.ownerName` and when building or writing child data that includes `ownerName`. Ensures all write paths apply the replacement.
- Prefer a single place (e.g. one helper used in sqlUtils) to avoid duplication and keep behavior consistent.

#### Implementation Tasks
- Add a normalization step or helper that maps `"Gallery Administrator"` → `"The Louie"` and leaves other values unchanged.
- Apply it wherever `ownerName` is set on album metadata or on child objects during extraction.
- Ensure null/undefined ownerName is not replaced (only the string `"Gallery Administrator"`).

### Deliverable
Backend extraction no longer emits `ownerName: "Gallery Administrator"`; those entries show `ownerName: "The Louie"` in the generated JSON. All other owner names and null/undefined remain unchanged.

### Testing Requirements
- Run extraction (or unit tests if added) and confirm generated album JSON has "The Louie" for items that previously had "Gallery Administrator".
- Confirm other owner names and missing ownerName are unchanged.

### Technical Notes
- No frontend or type changes required if the replacement is done before JSON is written.
- Use a constant for the literal `"Gallery Administrator"` (and optionally for `"The Louie"`) to keep the code maintainable.

---

## Fix URL path: Nordic characters (å ä ö) to ASCII in backend (Bug)

**Status:** Pending
**Priority:** High
**Complexity:** Low–Medium
**Estimated Time:** 45–60 minutes

### Description
**Bug:** Emitted album JSON contains URL paths with malformed or non-standard segments. Examples:
- `dreamhack/dreamhack_97/martin_ouml;jes/p000335.jpg` (e.g. album 4968) → should be `dreamhack/dreamhack_97/martin_ojes/p000335.jpg` (segment `martin_ojes`, no semicolon, no entity name).
- `nasslan/n_auml;sslan_3/louie/0001f.jpg` (e.g. album 29666, `data/29666.json`) → should be `nasslan/nasslan_3/louie/0001f.jpg` (segment `nasslan_3`, not `n_auml;sslan_3`).

This is caused by ISO-8859-1 / HTML-entity handling when building URL paths in the backend: characters like å, ä, ö (or their entity forms `&aring;`, `&auml;`, `&ouml;`) must **not** be decoded to the Unicode characters for use in URL paths; they must be **reduced to simplified ASCII** so paths are URL-safe and standard.

**Required mapping (for URL-path construction only):**

| Character | Replace with |
|-----------|--------------|
| å         | a            |
| ä         | a            |
| ö         | o            |

Apply this in the **backend** wherever URL path segments are derived from titles or path components (e.g. `urlPath`, `thumbnailUrlPath`, `highlightImageUrl`, breadcrumb paths built from cleaned titles). Result: paths like `…/martin_ojes/…` instead of `…/martin_ouml;jes/…` or `…/martin_öjes/…`.

### Requirements

#### Scope
- **Backend only.** Change path/URL construction so any segment that can contain å, ä, ö (or `&aring;`, `&auml;`, `&ouml;` / `&Aring;`, `&Auml;`, `&Ouml;`) uses the simplified form (a, a, o) in the emitted path string.
- **Where paths are built.** Likely in `backend/cleanupUipath.ts` (`cleanup_uipathcomponent` and/or `decode` / HTML unescape). All call sites that produce `urlPath`, `thumbnailUrlPath`, `highlightImageUrl`, or other path strings used in URLs must use this logic. Do not change display-only fields (e.g. album title in metadata can still show “Martin Öjes” or stored HTML entities for the frontend to render).
- **Do not decode to Unicode for path.** For the path string, do not turn `&ouml;` into `ö` and then use `ö` in the URL; either replace named entities directly with a/a/o, or after decoding replace å, ä, ö with a, a, o before building the path.

#### Implementation Tasks
- In `backend/cleanupUipath.ts` (or a single shared helper used for URL-path cleanup): ensure that after any HTML unescape or decode step that could produce å, ä, ö, these are replaced by a, a, o. Option A: add named-entity replacements for `&ouml;`, `&aring;`, `&auml;` (and uppercase variants like `&Ouml;`) → o, a, a **before** or instead of decoding them to Unicode in the path pipeline. Option B: after decoding to Unicode, replace the characters å, ä, ö (and uppercase Å, Ä, Ö) with a, a, o. Use one consistent approach so all path output is correct.
- Ensure `cleanup_uipathcomponent` (and any other function used to build URL path segments) applies this mapping so that output never contains `ouml;`, `ö`, etc. in the path.
- Re-run extraction and verify generated JSON: e.g. `data/4968.json` has paths like `…/martin_ojes/…` (not `…/martin_ouml;jes/…`); `data/29666.json` has paths like `nasslan/nasslan_3/louie/…` (not `nasslan/n_auml;sslan_3/louie/…`).

### Deliverable
Backend-emitted URL paths (e.g. in album JSON `urlPath`, `thumbnailUrlPath`, `highlightImageUrl`, and path segments derived from titles) use ASCII a/a/o for Nordic characters (å→a, ä→a, ö→o). No semicolons or entity names in path segments; no Unicode å, ä, ö in URL paths.

### Testing Requirements
- Run extraction and open albums that previously had the bug: e.g. album 4968 “Martin Öjes” → `urlPath`/`highlightImageUrl` use `martin_ojes` not `martin_ouml;jes`; album 29666 → `urlPath` uses `nasslan/nasslan_3/louie/…` not `nasslan/n_auml;sslan_3/louie/…`.
- Optionally add unit tests in `cleanupUipath.test.ts` for inputs containing `&ouml;`, `ö`, `&auml;`, `ä`, `&aring;`, `å` and assert output contains only a/a/o in the path segment.

### Technical Notes
- The table å→a, ä→a, ö→o is fixed; no other characters need to be changed for this task unless the product requests more mappings.
- Display titles (e.g. for breadcrumbs or album title in UI) can remain as-is or be decoded by the frontend; this task is only about **URL path** strings emitted by the backend.
- Reference: `backend/cleanupUipath.ts`, `backend/legacyPaths.ts`, `backend/index.ts` (where `cleanup_uipathcomponent` is used to build dir/urlPath).

---

## Limit root album child-album descriptions to 20 words (Backend Extraction)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30–45 minutes

### Description
During backend extraction, when building the **root album** JSON file, limit the `description` field for each **child album** (GalleryAlbumItem) in the root’s `children` array to at most 20 words. If a child album’s description has more than 20 words, truncate it to the first 20 words and append an ellipsis (e.g. `"..."`). Descriptions of 20 words or fewer remain unchanged. This applies only to the root album’s emitted `children`; other albums’ children and metadata descriptions are not modified.

### Requirements

#### Scope
- **Root album only.** Apply truncation only when emitting the album JSON for the configured root album (the top-level album, e.g. `rootId`).
- **Child albums only.** Only truncate `description` on items where `type === 'GalleryAlbumItem'`. Do not change descriptions on photos (GalleryPhotoItem) or on album metadata.
- **Word count.** Use a simple word boundary (e.g. split on whitespace). Exactly 20 words; if there are more, take the first 20 and append `"..."`.
- **Null/empty.** If `description` is null, undefined, or empty, leave it unchanged (no ellipsis).

#### Implementation Tasks
- Add a helper (e.g. `truncateDescriptionToWords(text: string, maxWords: number): string`) that returns the first `maxWords` words and appends `"..."` only when the input has more than `maxWords` words.
- In `backend/index.ts`, when building the root album’s output (e.g. `processedChildrenWithThumbnails` or immediately before writing the root album JSON), detect that the current album is the root (e.g. by passing `rootAlbumId` into `main` and comparing `root === rootAlbumId`).
- For the root album only, map over the final children array and for each child with `type === 'GalleryAlbumItem'` and a non-empty `description`, replace `description` with `truncateDescriptionToWords(description, 20)`.

### Deliverable
The root album JSON file’s `children` array has no child album with a `description` longer than 20 words plus ellipsis. All other albums and fields are unchanged.

### Testing Requirements
- Run extraction and confirm the root album JSON has truncated descriptions (≤ 20 words + `"..."`) for child albums that originally had longer descriptions.
- Confirm non-root album JSON files and photo children are unchanged.
- Confirm descriptions that are already ≤ 20 words are not modified (no extra ellipsis).

### Technical Notes
- Use a constant for the word limit (e.g. `ROOT_ALBUM_CHILD_DESCRIPTION_MAX_WORDS = 20`) for maintainability.
- Ellipsis character: use `"..."` (three full stops) unless the project prefers a single Unicode ellipsis character (`\u2026`).

---

## Exclude albums with no image descendant from backend extraction

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 1–1.5 hours

### Description
During **backend extraction**, any album (GalleryAlbumItem) that has **no image descendant** (no GalleryPhotoItem in the album itself or in any sub-album, recursively) must be **automatically excluded** from the export. Excluded albums must not receive a written JSON file (`{albumId}.json`) and must not appear in any parent album’s `children` array. This keeps the static gallery from listing empty or structure-only albums that contain no photos.

**Definition:** An album has an “image descendant” if and only if, by recursively traversing its children (respecting the same rules as current extraction, e.g. existing ignoreSet), at least one item of type `GalleryPhotoItem` is found. If the album has only sub-albums and none of them (recursively) contain any photo, the album has no image descendant and must be excluded.

### Requirements

#### Scope
- **Backend only.** Logic in `backend/index.ts` (and optional helpers or sqlUtils) that decides which albums to process and emit. No frontend changes.
- **Consistency with existing exclusion.** Exclusion of “no image descendant” albums should work together with the existing `ignoreAlbums` / `ignoreSet` (config): an album can be excluded because it is in the ignore list or because it has no image descendant. Do not recurse into or write JSON for excluded albums; do not list them in a parent’s `children`.
- **Root album.** The root album itself is never excluded for this rule (it is the entry point). Only non-root albums are candidates for “no image descendant” exclusion.

#### Implementation Tasks
- Add a way to determine whether an album has at least one image descendant (e.g. recursive check using `getChildren`, stopping at first photo; or pre-pass that marks album IDs that have image descendants). Reuse or align with existing traversal (e.g. respect ignoreSet when recursing).
- Before writing an album’s JSON or adding it to a parent’s children: if the album is not the root and it has no image descendant, treat it as excluded (do not write `{id}.json`, do not add it to the parent’s `children` list).
- Ensure the traversal that builds the tree skips excluded albums: when building `filtered` (or equivalent) in `main`, exclude not only blacklisted albums but also albums that have no image descendant. Care: determining “has image descendant” may require recursion, so either compute a set of “albums with image descendants” in a prior pass, or integrate the check without duplicating too much recursion.
- Search index: albums excluded for “no image descendant” should not appear in the search index (consistent with not being emitted at all).

#### Implementation Options
- **Option A (pre-pass):** Traverse the tree (or relevant subtree) once to compute a `Set<number>` of album IDs that have at least one image descendant. During the main extraction pass, exclude any album not in this set (except the root).
- **Option B (on-the-fly):** When processing a child album, before recursing into it or adding it to the current album’s children, check recursively whether it has any photo descendant; if not, skip it (no JSON, not in children). This may duplicate work unless cached.

### Deliverable
Albums that have no image descendant (and are not the root) are excluded from extraction: no JSON file is written for them, they do not appear in any parent’s `children` array, and they do not appear in the search index. Root album and albums that contain at least one photo (directly or in a sub-album) are unchanged in behavior.

### Testing Requirements
- Run extraction on a dataset that includes at least one album with no photos and no sub-albums with photos. Confirm that album has no `{id}.json` and does not appear in its parent’s `children`.
- Confirm albums that do have at least one image descendant (direct or nested) are still emitted and listed as before.
- Confirm root album is always emitted regardless of whether it has image descendants.

### Technical Notes
- “Image” means `GalleryPhotoItem` (type). Other item types do not count as image descendants.
- Align with existing `findFirstPhotoRecursive` or similar logic for “has any photo in subtree” to avoid divergent behavior.
- Reference: `backend/index.ts` (main, getChildren, filtered children, recursivePromises, search index).

---

## Subalbum wrapper: 50% width and max-width 800px below 1200px (Frontend CSS)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 20–30 minutes

### Description
On viewports **below 1200px**, the subalbum wrapper div (the element that wraps the subalbums section, e.g. the right column in the root album list block layout) should take up **50% of the parent width** and have **max-width: 800px**. This applies to the frontend layout where album blocks and their subalbums are shown (e.g. `RootAlbumListBlock` and its CSS). Above 1200px, existing layout rules remain unchanged unless otherwise specified.

### Requirements

#### Scope
- **Frontend only.** CSS (and optional layout adjustments) in the relevant component(s), e.g. `frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.css`.
- **Breakpoint.** Use `1200px` as the breakpoint: below 1200px apply the new rules; at 1200px and above do not apply them (or remove them via a media query `min-width: 1200px` if they were applied in a max-width query).
- **Target element.** The “subalbum wrapper” is the div (or element) that wraps the subalbums list/section (e.g. the container with class such as `root-album-list-block-subalbums` or the column that contains it). Ensure the correct element receives `width: 50%` and `max-width: 800px` within the media query.

#### Implementation Tasks
- Add a media query for viewports below 1200px (e.g. `@media (max-width: 1199px)` or `(max-width: 1200px)` per project convention).
- In that media query, target the subalbum wrapper div and set `width: 50%` (of parent) and `max-width: 800px`.
- Verify the parent layout allows the 50% width to take effect (e.g. flex/grid on parent). Adjust parent or wrapper if needed so the subalbum section does not overflow or break the layout.
- Check behavior at 1200px and just above/below to avoid gaps or double application.

### Deliverable
On viewports &lt; 1200px, the subalbum wrapper has width 50% of its parent and max-width 800px. Layout remains correct and readable.

### Testing Requirements
- Manually test at several widths below 1200px (e.g. 1100px, 800px, 600px) and confirm the subalbum section width and max-width behavior.
- Confirm at 1200px and above the layout is unchanged.

### Technical Notes
- Use CSS custom properties for 1200px and 800px if the project uses them for breakpoints/sizing; otherwise use literal values.
- Ensure no conflicting width rules in the same breakpoint override the intended behavior.

---

## Remove "Subalbums:" title from sub-album wrapper in root album (Frontend)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 10–15 minutes

### Description
In the **root album list** (and wherever `RootAlbumListBlock` is used), the **sub-album wrapper** section currently shows a heading **"Subalbums:"** above the list of sub-album links. This heading (the element with class **`root-album-list-block-subalbums-title`**) and its text must be **removed**. The sub-album list (the links and optional "... And much more") remains; only the title element is removed so the section has no visible "Subalbums:" label.

### Requirements

#### Scope
- **Frontend only.** Component `RootAlbumListBlock` (`frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx`) and its styles (`RootAlbumListBlock.css`). Tests in `RootAlbumListBlock.test.tsx` that assert on "Subalbums:" must be updated.
- **Element to remove.** The `<h3 className="root-album-list-block-subalbums-title">Subalbums:</h3>` (or equivalent) inside the subalbums section. Remove the element entirely from the JSX.
- **CSS.** Remove or leave unused the `.root-album-list-block-subalbums-title` rule(s) in `RootAlbumListBlock.css`. Removing the rule avoids dead code; leaving it has no visual effect once the element is gone. Prefer removing the rule and any CSS variables that only served this heading (e.g. `--root-album-subalbums-title-margin-bottom` if only used for the title).
- **Accessibility.** The subalbums section already has `aria-label="Subalbums"` on the section; screen-reader users still get context. No replacement visible heading is required.

#### Implementation Tasks
- In `RootAlbumListBlock.tsx`, delete the line that renders the heading, e.g. `<h3 className="root-album-list-block-subalbums-title">Subalbums:</h3>`.
- In `RootAlbumListBlock.css`, remove the `.root-album-list-block-subalbums-title` rule block. If `:root` or other rules reference variables used only for the title (e.g. title margin affecting section height calculations), update or remove those so layout/height calculations stay correct. The component uses CSS variables for subalbums list height; verify min-height / layout still look correct without the title.
- In `RootAlbumListBlock.test.tsx`, remove or update tests that expect "Subalbums:" text (e.g. `expect(screen.getByText(/Subalbums:/i)).toBeInTheDocument()`). Replace with assertions that the subalbums section and links are present without asserting on the heading text.

### Deliverable
The sub-album wrapper in the root album (and any child-album list using the same component) no longer displays a "Subalbums:" title. The list of sub-album links and "... And much more" (when applicable) remain. Section remains accessible via `aria-label`.

### Testing Requirements
- Manual: Open root album list and an album page that shows child albums; confirm no "Subalbums:" heading appears and the link list is still present and usable.
- Unit: RootAlbumListBlock tests no longer expect "Subalbums:" in the document; tests still confirm subalbums section and links render when subalbums are provided.

### Technical Notes
- Reference: `RootAlbumListBlock.tsx` (subalbums section around lines 137–147, heading at 142); `RootAlbumListBlock.css` (`.root-album-list-block-subalbums-title` around 202, and `:root` variables such as `--root-album-subalbums-title-height` if used); `RootAlbumListBlock.test.tsx` (multiple expectations for /Subalbums:/i).

---

## Remove root-album-list-view-header from the root album (Frontend)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 10–15 minutes

### Description
On the **root album** view (home page that lists root-level albums), the **`root-album-list-view-header`** block is currently rendered above the list of album blocks. It wraps an **"Albums"** heading (`<h2 className="root-album-list-view-title">Albums</h2>`). This header div and its contents must be **removed** so the root album list shows only the list of album blocks (the `<ul className="root-album-list-view-list">` and its items) with no visible "Albums" title or header wrapper above it.

### Requirements

#### Scope
- **Frontend only.** Component `RootAlbumListView` (`frontend/src/components/RootAlbumListView/RootAlbumListView.tsx`) and its styles (`RootAlbumListView.css`). Any tests that assert on the header or "Albums" heading in the root album view must be updated.
- **Element to remove.** The `<div className="root-album-list-view-header">` and everything inside it (the `<h2 className="root-album-list-view-title">Albums</h2>`). Delete this block from the JSX so the view goes directly from the outer `root-album-list-view` div to the `<ul className="root-album-list-view-list">`.
- **CSS.** Remove the `.root-album-list-view-header` and `.root-album-list-view-title` rule blocks from `RootAlbumListView.css` to avoid dead code. Adjust `.root-album-list-view` gap/layout if it relied on the header; the list should still have appropriate spacing.
- **Accessibility.** The region already has `aria-label="Root albums"` on the parent `root-album-list-view` div; no replacement heading is required for screen readers.

#### Implementation Tasks
- In `RootAlbumListView.tsx`, remove the entire `<div className="root-album-list-view-header">…</div>` block (the header and the `<h2 className="root-album-list-view-title">Albums</h2>` inside it).
- In `RootAlbumListView.css`, remove the `.root-album-list-view-header` and `.root-album-list-view-title` rule blocks.
- Update or remove tests that expect "Albums" heading or the header element in the root album list view (e.g. in `RootAlbumListView.test.tsx` or wherever the root album view is tested).

### Deliverable
The root album view no longer displays the header section or "Albums" title. The list of album blocks (RootAlbumListBlock items) starts directly under the root-album-list-view container. Region remains labeled for accessibility.

### Testing Requirements
- Manual: Load the home / root album page; confirm no "Albums" heading or header block appears and the album list is still visible and correctly spaced.
- Unit: Tests no longer assert on the header or "Albums" text; they still confirm the list of albums renders.

### Technical Notes
- Reference: `frontend/src/components/RootAlbumListView/RootAlbumListView.tsx` (header block around lines 119–121); `frontend/src/components/RootAlbumListView/RootAlbumListView.css` (`.root-album-list-view-header` and `.root-album-list-view-title`).

---

## Add root album description below album title on root album view (Frontend)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 20–30 minutes

### Description
On the **root album** view (home page), the root album’s **description** must be shown **below the root album title**. Today the root album list view (`RootAlbumListView`) may show only the list of child album blocks; there is no dedicated block for the root album’s own title and description. Required behavior: at the top of the root album view, display the **root album title** and, when present, the **root album description** (e.g. `metadata.albumDescription`) below it. Then show the existing list of album blocks. This gives the home page an intro section (title + description) for the root album before the list of its children.

### Requirements

#### Scope
- **Frontend only.** Component `RootAlbumListView` (`frontend/src/components/RootAlbumListView/RootAlbumListView.tsx`). The hook `useAlbumData(albumId)` already returns `metadata: AlbumMetadata | null`; `AlbumMetadata` has `albumTitle` and `albumDescription`. Use this metadata to render the title and description. Add CSS in `RootAlbumListView.css` for the new intro/header block (e.g. `.root-album-list-view-intro` or similar).
- **Placement.** The root album title and description appear at the top of the root album view, above the `<ul className="root-album-list-view-list">`. If the “root-album-list-view-header” (with “Albums” heading) is removed per the separate TODO, this title + description can take the place of a leading block; if the header remains temporarily, place title + description above it or integrate appropriately.
- **Content.** Title: use `metadata?.albumTitle` (or fallback like “Albums” or empty when missing). Description: render only when `metadata?.albumDescription` is non-empty; use `parseBBCodeDecoded(metadata.albumDescription)` (same as other album descriptions). “”). Ensure safe handling of null/undefined.
- **Accessibility.** Use a logical heading level for the title (e.g. `<h1>` or `<h2>`) so the page has a clear top-level heading; describe the region if needed (e.g. `aria-label` on a wrapper).

#### Implementation Tasks
- In `RootAlbumListView`, destructure or use `metadata` from `useAlbumData(albumId)` (the hook already returns it). When `metadata` is present, render a block at the top with the root album title (e.g. `<h1>` or `<h2>`) and, when `metadata.albumDescription` is non-empty, a paragraph or div with the description below the title.
- Style the block in `RootAlbumListView.css` (e.g. spacing below title and description, margin below the block before the list). Reuse or align with existing typography variables (e.g. `--album-detail-title-color`, `--album-detail-text-muted`) for consistency.
- Use `parseBBCodeDecoded(metadata.albumDescription)` for description (same as RootAlbumListBlock and AlbumDetail). Handle empty/metadata null so the block does not render an empty title when metadata is missing (optional: hide the whole intro when no metadata, or show only when title or description exists).
- Add or update tests so that when the root album has metadata with title and description, the view shows the title and description above the list; when description is empty, only the title is shown (or the intro is omitted if both are empty, per product choice).

### Deliverable
The root album view shows the root album’s title at the top and, when present, the root album’s description below the title, followed by the list of child album blocks. Description is decoded (and optionally BBCode-rendered). Layout and accessibility are preserved.

### Testing Requirements
- Manual: Load the home page with a root album that has both title and description in its JSON; confirm title and description appear at the top. Test with root album that has no description; confirm only title (or no intro) as designed.
- Unit: RootAlbumListView (or HomePage) test asserts that when metadata contains albumTitle and albumDescription, both are rendered in the document above the list.

### Technical Notes
- `useAlbumData` returns `{ data, metadata, ... }`; `metadata` is `AlbumMetadata` with `albumTitle`, `albumDescription`. See `backend/types.ts` and `frontend/src/hooks/useAlbumData.ts`. Reference: `frontend/src/components/RootAlbumListView/RootAlbumListView.tsx` (add intro block after the opening div, before the list).

---

## .layout-main and .home-page max-width 2400px (Frontend CSS)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 15–20 minutes

### Description
Add **max-width: 2400px** to the CSS classes **`.layout-main`** and **`.home-page`** so that on very wide viewports the main content and home page do not stretch beyond 2400px. This keeps the layout readable on ultrawide or large monitors. Both selectors should have the same max-width applied (e.g. in `frontend/src/components/Layout/Layout.css` for `.layout-main` and `frontend/src/pages/HomePage.css` for `.home-page`, or in a shared place if the project groups such rules).

### Requirements

#### Scope
- **Frontend only.** CSS changes only; no TypeScript or component structure changes unless needed to apply the class.
- **Selectors.** Precisely: `.layout-main` (Layout component main content wrapper) and `.home-page` (HomePage root wrapper). Each must have `max-width: 2400px`.
- **Centering (optional).** If the content should be centered when the viewport is wider than 2400px, add `margin-left: auto; margin-right: auto;` to the same rule(s), or follow existing project pattern for centering constrained-width containers.

#### Implementation Tasks
- In the stylesheet(s) where `.layout-main` is defined (e.g. `Layout.css`), add `max-width: 2400px`. Add horizontal auto margins if centering is desired.
- In the stylesheet(s) where `.home-page` is defined (e.g. `HomePage.css`), add `max-width: 2400px`. Add horizontal auto margins if centering is desired.
- Ensure no other rules (e.g. min-width or width: 100%) contradict the max-width. Confirm both elements still fill available width up to 2400px on smaller viewports.

### Deliverable
`.layout-main` and `.home-page` each have `max-width: 2400px` in CSS. On viewports wider than 2400px, content does not exceed 2400px (and is centered if that was implemented).

### Testing Requirements
- Visually check at viewport widths above 2400px (e.g. 2560px, 3840px) that main and home content are capped at 2400px.
- Confirm layout is unchanged below 2400px (full width up to the limit).

### Technical Notes
- Use a CSS custom property (e.g. `--layout-max-width: 2400px`) if the project standardizes layout widths; otherwise use the literal `2400px`.

---

## Light-mode gradients more pronounced (Frontend CSS)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 20–30 minutes

### Description
In **light mode** only, make gradients more **pronounced** (visibly stronger) so the gradient effect is easier to see. Currently light theme uses `--gradient-bg-start`/`--gradient-bg-end`, `--gradient-card-start`/`--gradient-card-end`, and `--gradient-cta-start`/`--gradient-cta-end` in `frontend/src/styles/themes.css` (under `:root` and `[data-theme="light"]`). Adjust the light-theme gradient color stops so the difference between start and end is greater (e.g. more contrast or a clearer shift in hue/lightness), without making the result harsh or hurting readability. Dark theme and other theme variables are unchanged.

### Requirements

#### Scope
- **Frontend only.** CSS variable values in `themes.css` (or wherever light theme gradients are defined).
- **Light mode only.** Change only the gradient variables that apply when `[data-theme="light"]` (or the default/root light values). Do not alter `[data-theme="dark"]` or other themes.
- **Gradients in scope.** At least: background gradient (`--gradient-bg-start`, `--gradient-bg-end`), card gradient (`--gradient-card-start`, `--gradient-card-end`). Optionally CTA gradient (`--gradient-cta-start`, `--gradient-cta-end`) if it should also be more pronounced in light mode.

#### Implementation Tasks
- In `frontend/src/styles/themes.css`, locate the light-theme gradient variables (in `:root` and/or `[data-theme="light"]`).
- Increase the visual difference between each gradient’s start and end (e.g. adjust one or both stop colors so the transition is more visible). Keep colors on-brand and accessible (contrast, readability).
- Compare before/after in the app (background, cards) to confirm gradients are more pronounced and still look good.
- Leave dark-theme gradient definitions unchanged.

### Deliverable
Light mode backgrounds and cards (and optionally CTAs) show a clearly more pronounced gradient. Dark mode and other themes are unchanged.

### Testing Requirements
- Visually verify light mode: page background and card gradients are more visible than before.
- Confirm dark mode and default/fallback behavior are unchanged.
- Check text and UI remain readable and accessible on the new gradients.

### Technical Notes
- Gradient variables are used in multiple components; changing them in themes.css is sufficient.
- Pronounced can mean stronger contrast between stops, a slightly wider range in lightness, or a subtle shift in hue—choose what fits the existing palette.

---

## Highlight image as faded/blurred background on article.root-album-list-block (Frontend)

**Status:** Pending
**Priority:** Low
**Complexity:** Low–Medium
**Estimated Time:** 30–45 minutes

### Description
In the **root album list** and the **child-album list**, each album block is rendered as an **article** with class **`.root-album-list-block`** (see `RootAlbumListBlock`). The **highlighted image** for that album (from `metadata.highlightImageUrl` or from the child’s `highlightImageUrl` when shown in a parent’s list) should be used as the **background** of that article. The image must be **faded** (e.g. reduced opacity or overlay) and **slightly blurred** so that the text and links on top remain clearly visible and readable. When no highlight image is available, the block keeps its current appearance (no background image).

**Scope:** Applies wherever `RootAlbumListBlock` is used: root album list (home) and any child-album list that uses the same component. The album prop already has (or can have) `highlightImageUrl`; use it to set a CSS background (or a pseudo-element / wrapper) with blur and fade.

### Requirements

#### Scope
- **Frontend only.** Component `RootAlbumListBlock` and its CSS (`RootAlbumListBlock.css`); optionally `imageUrl`/`getImageBaseUrl` to build the full image URL for the background.
- **Target element.** The **article** with class `root-album-list-block` (or an inner wrapper that covers the block) gets the background image when `album.highlightImageUrl`` or `album.metadata?.highlightImageUrl` is present. Use the same image base URL as for other images (e.g. `getImageBaseUrl()` + highlightImageUrl).
- **Faded and blurred.** Apply CSS so the background image is visually softened: e.g. `filter: blur(...)` and/or a semi-transparent overlay (or `background` with a gradient overlay, or lowered opacity on a background layer) so text and UI on top stay readable and accessible. Do not let the background overwhelm the content.

#### Implementation Tasks
- In `RootAlbumListBlock`, when the album has a `highlightImageUrl` (or equivalent), pass it to the article as an inline style (e.g. `backgroundImage: url(...)`) or via a CSS custom property (e.g. `--block-bg-image: url(...)`) so the stylesheet can use it. Build the full URL with the same base as other gallery images.
- In `RootAlbumListBlock.css`, add rules for `.root-album-list-block` when it has a background image: e.g. `background-size: cover`, `background-position: center`, and apply blur (e.g. `filter: blur(6px)` on a pseudo-element or a dedicated background layer so only the background is blurred, not the text) and fading (e.g. overlay with `linear-gradient` or `rgba` overlay, or opacity on the image layer). Ensure text contrast and focus styles remain usable.
- If the blur is applied via a separate layer (e.g. `::before` with background image + blur), keep the main content above it (z-index) and ensure the overlay does not block pointer events on links/buttons.
- When `highlightImageUrl` is missing, do not set a background image; existing styles remain.

### Deliverable
Each album block (article.root-album-list-block) in the root album list and in child-album lists shows the album’s highlight image as a faded, blurred background when available. Text and links on top remain clearly visible. Blocks without a highlight image look unchanged.

### Testing Requirements
- Visually verify on the root album list and on an album page that shows child albums: blocks with a highlight image show it as a soft background; text is readable.
- Confirm blocks without highlightImageUrl are unchanged.
- Check accessibility (focus, contrast) and that links/buttons are still clickable.

### Technical Notes
- Blur on a pseudo-element or a dedicated div (with the background image) keeps the main content sharp; applying `filter: blur()` on the whole article would blur the text, so avoid that.
- Overlay can be e.g. `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.4))` or theme-aware overlay so it works in light and dark mode.

---

## Strip BBCode from album titles in backend extraction (Backend)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 30–45 minutes

### Description
During **backend extraction**, all **album titles** written to the emitted JSON must have **BBCode stripped** to plain text. The Gallery 2 source may store titles with BBCode (e.g. `[b]Bold[/b]`, `[i]italic[/i]`, `[color=red]…[/color]`). Emitted album JSON (metadata and children) must contain title strings with those tags removed—only the inner text—so that the frontend receives plain-text titles everywhere (sub-album links, block titles, breadcrumbs, album detail header, album cards). No frontend change is required for stripping; the frontend may continue to decode HTML entities if needed, but will no longer need to parse or strip BBCode from titles because the backend will have done it.

**Current behavior:** Titles are emitted as-is from the database (may contain BBCode); the frontend parses BBCode for display in some places and would need to strip it in others (e.g. sub-album links).  
**Required behavior:** During extraction, before writing any album metadata or child item that has a `title` field, strip all BBCode tags from that title and write the resulting plain text. All emitted `title` and `metadata.albumTitle` (and equivalent in children) values are plain text.

### Requirements

#### Scope
- **Backend only.** Extraction logic in `backend/` that builds album metadata and child items (e.g. `backend/index.ts`, and any helper that sets `title` or `albumTitle`). Add a strip-BBCode step (or helper) and apply it wherever album titles are assigned to the output (metadata for each album file, and each child item’s title in `children`).
- **Titles only.** Strip BBCode from album title fields only. Do not strip from description or summary unless a separate product decision says so; this task is only for titles so that all consumers of `title` / `albumTitle` get plain text.
- **Stripping.** "Strip" means remove all BBCode tags (e.g. `[b]`, `[/b]`, `[i]`, `[color=red]`, `[tag=value]`, etc.) and output only the concatenated inner text. Optionally decode HTML entities first (e.g. `&auml;` → `ä`) then strip tags, so the stored title is readable plain text. Handle nested tags and malformed/unclosed tags (leave remaining text).

#### Implementation Tasks
- Add a backend helper that strips BBCode to plain text, e.g. `stripBBCode(title: string): string` (in a shared place such as `backend/bbcode.ts` or alongside existing HTML/entity handling). It should remove `[tag]`, `[/tag]`, and `[tag=value]` and return the inner text only. Align with the same tag set the frontend parser knows (b, i, u, s, color, size, url, etc.). Optionally decode HTML entities before or after stripping.
- Apply the helper wherever album titles are set during extraction: (1) when building `metadata.albumTitle` for each album file; (2) when building each child object’s `title` (for GalleryAlbumItem and any other type that has a title). Ensure root album and all child albums and nested extraction paths use the stripped title.
- Re-run extraction and verify emitted JSON: any title that previously contained `[b]`, `[i]`, etc. now contains only the inner text (e.g. "Bold" not "[b]Bold[/b]").
- **Frontend follow-up (optional for this task):** Once backend emits plain-text titles, the frontend can stop calling `parseBBCodeDecoded()` on album titles and display them as plain text (or keep decodeHtmlEntities only). Sub-album links, block titles, breadcrumbs, and album detail will then show plain text without further strip logic. Document or add a brief note that frontend may simplify title rendering after this backend change.

### Deliverable
All album titles in the emitted album JSON (metadata and children) are plain text with BBCode tags removed. No raw `[b]`, `[i]`, `[color=…]`, etc. in any `title` or `albumTitle` field. Frontend can treat titles as plain text (with optional HTML entity decoding).

### Testing Requirements
- Run extraction on a dataset that includes album titles with BBCode; confirm generated JSON has plain-text titles only.
- Optionally add a unit test for the strip helper (inputs like `[b]Bold[/b]` → `"Bold"`, `[i]nested [b]text[/b][/i]` → `"nested text"`).

### Technical Notes
- Backend may not have an existing BBCode parser; implement a minimal stripper (regex or state machine) that removes `[…]` segments and keeps the rest. Ensure `[url=...]...[/url]` and `[url]...[/url]` strip to inner text only.
- Reference: `backend/index.ts` (where metadata and children are built); any module that supplies title from the database (e.g. sqlUtils, getAlbumInfo, getChildren).

---


**Album descriptions** must support **BBCode rendering** in two places: (1) in the **root album list** (each album block’s description in `RootAlbumListBlock`), and (2) in the **actual album view** (the album description in `AlbumDetail`). Today both locations render the description as plain text (HTML entities decoded only, e.g. `decodeHtmlEntities(album.description)`). Required behavior: parse and render BBCode in the description text (e.g. `[b]`, `[i]`, `[color=…]`, `[url=…]`) so that formatting and links are displayed, using the same parsing pipeline as album titles (e.g. `parseBBCodeDecoded`).

### Requirements

#### Scope

#### Implementation Tasks
- In `RootAlbumListBlock.tsx`, replace the description output from `decodeHtmlEntities(album.description!)` to `parseBBCodeDecoded(album.description!)` (with null/empty guard: only render the paragraph when description is non-empty; pass trimmed string to the parser). Ensure `extractUrlFromBBCode` for the “website” link still receives raw summary/description if that behavior is separate.
- In `AlbumDetail.tsx`, replace the description output from `decodeHtmlEntities(album.description)` to `parseBBCodeDecoded(album.description)` (with existing guard for `album.description`). If summary is rendered as a separate paragraph with `decodeHtmlEntities(album.summary)`, change it to `parseBBCodeDecoded(album.summary)` for consistency if product wants summary to support BBCode too.
- Update tests: In `RootAlbumListBlock.test.tsx`, add or adjust a test that expects description with BBCode (e.g. `[b]bold[/b]`) to render as formatted (e.g. `<strong>bold</strong>`). In `AlbumDetail.test.tsx`, update the test “does not parse BBCode in description or summary” to instead expect BBCode to be parsed (description and optionally summary show formatted content, not raw `[b]...[/b]`). Adjust any snapshot or text assertions that assume plain-text description.


- Reference: (“does not parse BBCode in description or summary”).

---

## Prioritize search results by current album context (Frontend)

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 45–90 minutes

### Description
When the user performs a search, results should be **ordered by relevance to the current album context**: (1) **children of the current album** first, (2) then **descendants of the current album** (other items in the subtree), (3) **last**, results from the **whole site** (outside the current album). Today search returns a flat list sorted only by relevance score (and title). Required behavior: if a “context album” is known (e.g. the album page the user was on when they opened search, or an optional URL param), sort the result list so that direct children of that album appear first, then remaining descendants, then all other hits. Within each tier, keep existing relevance (and title) ordering. If no context album is provided (e.g. search from home), keep current behavior (single tier, score + title sort).

### Requirements

#### Scope
- **Frontend only.** Search flow: `SearchBar` (may pass context when navigating to search), `useSearch` hook, `SearchIndex.search()` (or a post-sort step), and `SearchResultsPage`. The search index (`SearchIndexItem`) already has `parentId` and optionally `ancestors`; use these to classify each result as “child of context”, “descendant of context”, or “other”.
- **Context album.** Define how “current album” is set: e.g. when the user is on `/album/123` and submits search (or opens search from that page), pass album ID 123 as context. Options: (A) Add optional query param e.g. `/search?q=term&album=123` when navigating from an album page; SearchBar or Layout passes the current route’s album ID when present. (B) Store “last viewed album” in session or state and use it as context when on `/search`. Prefer (A) so the URL is shareable and back/forward is consistent.
- **Tiers.** Tier 1: `item.parentId === contextAlbumId`. Tier 2: item is in the subtree of context album (ancestor chain via `parentId` contains contextAlbumId) but not a direct child. Tier 3: all other results. Sort by tier first, then by existing score and title within each tier.

#### Implementation Tasks
- **Pass context to search.** When navigating to the search page from an album page (e.g. user on `/album/123` and types in SearchBar then submits, or a “Search from this album” action), navigate to `/search?q=...&album=123`. SearchBar or the component that performs navigation needs access to the current album ID when on `/album/:id` (e.g. from route params or layout context). If search is initiated from home or a page without an album, do not add `album` param.
- **Use context in results.** In `SearchResultsPage` or `useSearch`, read the `album` query param (context album ID). When present, after obtaining raw results from `SearchIndex.search(query)`, partition (or sort) results into the three tiers. For “descendant” check: walk each result’s `parentId` chain using `index.getItem(parentId)` until either contextAlbumId is found (then tier 2, or tier 1 if direct child) or no parent (then tier 3). Apply stable sort: tier 1 first, then tier 2, then tier 3; within each tier keep the existing relevance/title order.
- **Search index.** No backend change required if `SearchIndexItem.parentId` is already populated in the pre-built index. If not, add `parentId` (and optionally ancestor IDs) in the backend when building the search index so the frontend can compute “child of” and “descendant of”.
- **Cache.** If useSearch caches results by query only, cache key may need to include context album ID (e.g. `query + (albumId ?? '')`) so that the same query from home vs from an album can show different order. Invalidate or key cache accordingly.
- **Tests.** Add tests: (1) with no context album, order unchanged; (2) with context album, a direct child of that album appears before a sibling’s descendant, which appears before an item outside the subtree.

### Deliverable
Search results are ordered so that children of the current album (when applicable) are shown first, then other descendants of the current album, then the rest of the site. Context album is derived from URL (e.g. `?album=123`) when the user searched from an album page. When no context is provided, behavior is unchanged.

### Testing Requirements
- Manual: From an album page, run a search that returns at least one direct child and one item outside the album; confirm children appear first. From home, run the same search; confirm order is by relevance only (or by context if home is treated as “root” context, per product decision).
- Unit: Test sort logic with mock results and a context album ID: tier order is correct; within tier, score/title order preserved.

### Technical Notes
- `SearchIndexItem` has `parentId` (see `frontend/src/utils/searchIndex.ts`). Use `SearchIndex.getItem(id)` to walk the parent chain and classify each result. Root items have no parentId or parentId not in index; treat as “other”.
- Reference: `frontend/src/utils/searchIndex.ts` (search(), SearchIndexItem.parentId); `frontend/src/hooks/useSearch.ts` (search callback, cache); `frontend/src/pages/SearchResultsPage.tsx` (URL params, display order); `frontend/src/components/SearchBar/SearchBar.tsx` (navigate to `/search?q=...`).

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




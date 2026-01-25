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
- **Backend only (titles).** Extraction logic in `backend/` that builds album metadata and child items (e.g. `backend/index.ts`, and any helper that sets `title` or `albumTitle`). Add a strip-BBCode step (or helper) and apply it wherever album titles are assigned to the output (metadata for each album file, and each child item’s title).
- **Titles only.** Strip BBCode from album title fields only. Do not strip from description or summary unless a separate product decision says so; this task is only for titles so that all consumers of `title` / `albumTitle` get plain text.
- **Stripping.** "Strip" means remove all BBCode tags (e.g. `[b]`, `[/b]`, `[i]`, `[color=red]`, `[tag=value]`, etc.) and output only the concatenated inner text. Optionally decode HTML entities first (e.g. `&auml;` → `ä`) then strip tags, so the stored title is readable plain text. Handle nested tags and malformed/unclosed tags (leave remaining text).
- **Frontend (descriptions).** **Album descriptions** must support **BBCode rendering** in two places: (1) in the **root album list** (each album block’s description in `RootAlbumListBlock`), and (2) in the **actual album view** (the album description in `AlbumDetail`). Today both locations render the description as plain text (HTML entities decoded only). Required: parse and render BBCode (e.g. `[b]`, `[i]`, `[color=…]`, `[url=…]`) using the same parsing pipeline (e.g. `parseBBCodeDecoded`).

#### Implementation Tasks
- Add a backend helper that strips BBCode to plain text, e.g. `stripBBCode(title: string): string` (in a shared place). It should remove `[tag]`, `[/tag]`, and `[tag=value]` and return the inner text only. Align with the same tag set the frontend parser knows (b, i, u, s, color, size, url, etc.). Optionally decode HTML entities before or after stripping.
- Apply the helper wherever album titles are set during extraction: (1) when building `metadata.albumTitle` for each album file; (2) when building each child object’s `title` (for GalleryAlbumItem and any other type that has a title). Ensure root album and all child albums and nested extraction paths use the stripped title.
- In `RootAlbumListBlock.tsx`, replace the description output from `decodeHtmlEntities(album.description!)` to `parseBBCodeDecoded(album.description!)` (with null/empty guard: only render the paragraph when description is non-empty; pass trimmed string to the parser). Ensure `extractUrlFromBBCode` for the "website" link still receives raw summary/description if that behavior is separate.
- In `AlbumDetail.tsx`, replace the description output from `decodeHtmlEntities(album.description)` to `parseBBCodeDecoded(album.description)` (with existing guard for `album.description`). If summary is rendered with `decodeHtmlEntities(album.summary)`, change to `parseBBCodeDecoded(album.summary)` for consistency if product wants summary to support BBCode too.
- Update tests: In `RootAlbumListBlock.test.tsx`, add or adjust a test that expects description with BBCode to render as formatted. In `AlbumDetail.test.tsx`, update the test "does not parse BBCode in description or summary" to instead expect BBCode to be parsed. Adjust any snapshot or text assertions that assume plain-text description.

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

## Root album subalbums: limit 10, "...and more!" at bottom right (Frontend)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 20–30 minutes

### Description
In the **root album list** (component `RootAlbumListBlock`), the **Subalbums** section currently shows at most **6** subalbum links (by date-desc), and when more exist displays **"... And much more"** below the list. This task: (1) **raise the limit** from 6 to **10** subalbums; (2) **move** the overflow indicator text to the **bottom right** of the subalbums block (instead of directly under the list); (3) **reword** the text from "... And much more" to **"...and more!"** (lowercase "and", exclamation).

### Requirements

#### Scope
- **Frontend only.** `frontend/src/components/RootAlbumListBlock/RootAlbumListBlock.tsx` (limit constant, slice count, hasMore condition, visible text), `RootAlbumListBlock.css` (positioning of `.root-album-list-block-subalbums-more` so it sits at bottom right of `.root-album-list-block-subalbums`). Tests in `RootAlbumListBlock.test.tsx` that assert on the limit (6 vs 10) or on the exact string "... And much more" must be updated.
- **Limit 10.** Display at most 10 subalbums (same ordering: date-desc, nulls last). Use a named constant (e.g. `ROOT_ALBUM_SUBALBUMS_DISPLAY_LIMIT = 10`) so the limit is configurable in one place. `hasMoreSubalbums` should be true when `subalbums.length > 10`.
- **Bottom right.** The "...and more!" element (`.root-album-list-block-subalbums-more`) must appear at the **bottom right** of the subalbums block. Implement by making the subalbums container a flex column with the list growing and the "more" row at the end aligned to the right (e.g. `margin-top: auto`, `align-self: flex-end`, or equivalent). Ensure the block does not rely on a fixed height for the "more" row if that would break layout; adjust CSS variables (e.g. `--root-album-subalbums-list-height` from 3 to 10 rows if still used) if they assume 6 items.
- **Text.** Replace the visible string from "... And much more" to "...and more!" (exactly: three dots, lowercase "and", space, "more", exclamation).

#### Implementation Tasks
- In `RootAlbumListBlock.tsx`: introduce `ROOT_ALBUM_SUBALBUMS_DISPLAY_LIMIT = 10` (or similar); change `slice(0, 6)` to `slice(0, ROOT_ALBUM_SUBALBUMS_DISPLAY_LIMIT)`; change `hasMoreSubalbums = subalbums.length > 6` to `> ROOT_ALBUM_SUBALBUMS_DISPLAY_LIMIT`; change the rendered text from "... And much more" to "...and more!". Update the file-top comment that says "at most the latest 6 subalbums" and "... And much more" to reflect 10 and "...and more!".
- In `RootAlbumListBlock.css`: give `.root-album-list-block-subalbums` a flex layout (e.g. `display: flex; flex-direction: column;`) so the list takes space and the "more" row can sit at the bottom; style `.root-album-list-block-subalbums-more` so it appears at bottom right (e.g. `margin-top: auto; align-self: flex-end;` or `text-align: right` on a wrapper). Adjust `--root-album-subalbums-list-height` and related variables if they assume 3 visible rows (6 items in 2 columns); update to 10 items (5 rows) if min-height is still used, or remove fixed min-height if layout works without it.
- In `RootAlbumListBlock.test.tsx`: update tests that assume 6 subalbums (e.g. "shows only 6 subalbum links and '... And much more' when >6 subalbums") to use 10 and the new text "...and more!"; update assertions that check for absence of "... And much more" when ≤6 to use threshold 10 and string "...and more!".

### Deliverable
Root album subalbums section shows up to 10 subalbum links; when more than 10 exist, "...and more!" appears at the bottom right of the subalbums block. Tests updated for limit 10 and new copy.

### Testing Requirements
- Manual: Root album with more than 10 subalbums shows 10 links and "...and more!" at bottom right of the subalbums box; with ≤10 subalbums no "...and more!".
- Unit: RootAlbumListBlock tests assert 10 displayed links when >10 subalbums, new text "...and more!", and no overflow text when ≤10 subalbums.

### Technical Notes
- Reference: `RootAlbumListBlock.tsx` (lines 66–70 for limit/hasMore, line 159 for text); `RootAlbumListBlock.css` (`.root-album-list-block-subalbums`, `.root-album-list-block-subalbums-more`, `:root` variables for list height); `RootAlbumListBlock.test.tsx` (tests "shows all 6...", "shows only 6...", "... And much more").

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

---’s x when shown in a parent’s **Backend only.** Extraction logic in `backend/` that builds album metadata and child items (e.g. `backend/index.ts`, and any helper that sets `title` or `albumTitle`). Add a strip-BBCode step (or helper) and apply it wherever album titles are assigned to the output (metadata for each album file, and each child item’s title 
- **Titles only.** Strip BBCode from album title fields only. Do not strip from description or summary unless a separate product decision says so; this task is only for titles so that all consumers of `title` / `albumTitle` get plain text.
- **Stripping.** "Strip" means remove all BBCode tags (e.g. `[b]`, `[/b]`, `[i]`, `[color=red]`, `[tag=value]`, etc.) and output only the concatenated inner text. Optionally decode HTML entities first (e.g. `&auml;` → `ä`) then strip tags, so the stored title is readable plain text. Handle nested tags and malformed/unclosed tags (leave remaining text).

#### Implementation Tasks
- Add a backend helper that strips BBCode to plain text, e.g. `stripBBCode(title: string): string` (in a shared place). It should remove `[tag]`, `[/tag]`, and `[tag=value]` and return the inner text only. Align with the same tag set the frontend parser knows (b, i, u, s, color, size, url, etc.). Optionally decode HTML entities before or after stripping.
- Apply the helper wherever album titles are set during extraction: (1) when building `metadata.albumTitle` for each album file; (2) when building each child object’s `title` (for GalleryAlbumItem and any other type that has a title). Ensure root album and all child albums and nested extraction paths use the stripped title.
**Album descriptions** must support **BBCode rendering** in two places: (1) in the **root album list** (each album block’s description in `RootAlbumListBlock`), and (2) in the **actual album view** (the album description in `AlbumDetail`). Today both locations render the description as plain text (HTML entities decoded only, e.g. `decodeHtmlEntities(album.description)`). Required behavior: parse and render BBCode in the description text (e.g. `[b]`, `[i]`, `[color=…]`, `[url=…]`) so that formatting and links are displayed, using the same parsing pipeline as album titles (e.g. `parseBBCodeDecoded`).

### Requirements

#### Scope

#### Implementation Tasks
- In `RootAlbumListBlock.tsx`, replace the description output from `decodeHtmlEntities(album.description!)` to `parseBBCodeDecoded(album.description!)` (with null/empty guard: only render the paragraph when description is non-empty; pass trimmed string to the parser). Ensure `extractUrlFromBBCode` for the “website” link still receives raw summary/description if that behavior is separate.
- In `AlbumDetail.tsx`, replace the description output from `decodeHtmlEntities(album.description)` to `parseBBCodeDecoded(album.description)` (with existing guard for `album.description`). If summary is rendered as a separate paragraph with `decodeHtmlEntities(album.summary)`, change it to `parseBBCodeDecoded(album.summary)` for consistency if product wants summary to support BBCode too.
- Update tests: In `RootAlbumListBlock.test.tsx`, add or adjust a test that expects description with BBCode (e.g. `[b]bold[/b]`) to render as formatted (e.g. `<strong>bold</strong>`). In `AlbumDetail.test.tsx`, update the test “does not parse BBCode in description or summary” to instead expect BBCode to be parsed (description and optionally summary show formatted content, not raw `[b]...[/b]`). Adjust any snapshot or text assertions that assume plain-text description.

--- (“does not parse BBCode in description or summary”## Prioritize search by album context (Frontend)

**Status:** Pending
**Priority:** Medium
**Complexity:** Medium
**Estimated Time:** 1–2 hours

### Description
When a "context album" is known (e.g. the album page the user was on when they opened search, or an optional URL param), sort search results so that direct children of that album appear first, then remaining descendants of the current album, then results from the whole site. Within each tier, keep existing relevance (and title) ordering. If no context album is provided (e.g. search from home), keep current behavior (single tier, score + title sort).

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
---

## Remove nav (Main navigation) and make root album intro title the only h1 (Frontend)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 15–20 minutes

### Description
**Semantics:** The page must have exactly one `<h1>`. That single `<h1>` must be the **root album intro title** (`.root-album-list-view-intro-title`), i.e. the album name when the root album view shows intro metadata. **Layout:** Remove the **Main navigation** (`<nav aria-label="Main navigation">`) from the layout header. The site name (e.g. "Gallery 2 to Static") remains visible and linkable to home, but is no longer inside a `<nav>` and must **not** be an `<h1>` (use a different element or heading level so the only h1 on the page is the root album intro title when present).

### Requirements

#### Scope
- **Frontend only.** `frontend/src/components/Layout/Layout.tsx` (and `Layout.css`), `frontend/src/components/RootAlbumListView/RootAlbumListView.tsx` (intro title). Layout tests (e.g. `Layout.test.tsx`) that assert on the nav or on the site name being in an `<h1>` must be updated.
- **Remove nav.** Delete the `<nav aria-label="Main navigation">` wrapper from the layout header. Keep the site name and its link to `/` in the header (e.g. `<Link to="/">` with the site name inside), but do not wrap them in `<nav>`. Remove or repurpose any CSS that targeted the nav if it becomes dead.
- **Single h1.** The layout header must **not** use `<h1>` for the site name. Use e.g. `<span>`, `<p>`, or a lower heading level (e.g. `<h2>` or no heading) so that the document has at most one `<h1>`. The **only** `<h1>` on the page must be the root album intro title (`.root-album-list-view-intro-title`) in `RootAlbumListView` when the intro is rendered (`hasIntro` true, i.e. when metadata has `albumTitle` or `albumDescription`). When the root album view has no intro (no album title/description), the page may have no `<h1>` or a single fallback per product choice; document the choice.

#### Implementation Tasks
- In `Layout.tsx`, remove the `<nav aria-label="Main navigation">` element; keep the site name and its `Link` to `/` in the header, and change the site name from `<h1 className="layout-title">` to a non-h1 element (e.g. `<span className="layout-title">`). In `RootAlbumListView`, ensure the intro title is the single `<h1>` when `hasIntro` is true (it already uses `<h1 className="root-album-list-view-intro-title">`).
- In `Layout.css`, remove or adjust styles that targeted the nav; keep styles for the site name/link so the header looks unchanged aside from semantics.
- Update `Layout.test.tsx`: remove or change assertions that expect `<nav aria-label="Main navigation">` or the site name in an `<h1>`.

### Deliverable
Layout header has no `<nav>`, and the site name is not an `<h1>`. The only `<h1>` on the page is the root album intro title when the root album view displays intro content; otherwise the page has no `<h1>` (or one agreed fallback). Layout tests updated.

### Testing Requirements
- Manual: Load root album view with intro; confirm one `<h1>` (the album name). Load layout-only or non-root pages; confirm no duplicate `<h1>` from the layout.
- Unit: Layout tests no longer expect Main navigation or site name in `<h1>`; RootAlbumListView tests continue to expect the intro title in `<h1>` when intro is present.

### Technical Notes
- Reference: `Layout.tsx` (nav and `<h1 className="layout-title">` around lines 69–73); `RootAlbumListView.tsx` (`<h1 className="root-album-list-view-intro-title">` in intro block, around 129–136); `Layout.css`; `RootAlbumListView.css` (`.root-album-list-view-intro-title`).

---

## Move gallery-order dropdown to the right of theme dropdown and style similarly (Frontend)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 15–20 minutes

### Description
In the layout header (`.layout-header-actions`), the **gallery-order** dropdown (SortDropdown, used for album/sort order) should be placed **immediately to the right** of the **theme** dropdown (ThemeDropdown). Both dropdowns should be **styled similarly** so they share the same visual appearance (border, border-radius, padding, font size/weight, focus outline, hover behavior) and read as a single control group.

### Requirements

#### Scope
- **Frontend only.** `frontend/src/components/Layout/Layout.tsx` (order of components in the header), and the CSS for `ThemeDropdown` and `SortDropdown` (or shared header-control styles in `Layout.css`).
- **Order.** In the header actions container, ensure the DOM order is: SearchBar (or other elements as present), then ThemeDropdown, then SortDropdown (gallery-order), so the sort dropdown is to the right of the theme dropdown. If they are already in this order, confirm and leave as-is; otherwise reorder.
- **Styling.** Make both dropdowns look consistent: same border (e.g. 1px solid, same color variable), same border-radius (e.g. `var(--radius-md, 8px)`), similar padding (e.g. 0.5rem 0.75rem), same font-size (e.g. 0.875rem) and font-weight (e.g. 500), same min-height (e.g. 44px for touch targets), and matching focus outline and hover states. Prefer reusing the same CSS custom properties (e.g. a shared set like `--header-dropdown-border`, `--header-dropdown-bg`) for both, or align ThemeDropdown and SortDropdown to use identical values.

#### Implementation Tasks
- In `Layout.tsx`, verify or set the order of `ThemeDropdown` and `SortDropdown` within `.layout-header-actions` so that SortDropdown appears to the right of ThemeDropdown.
- In `ThemeDropdown.css` and `SortDropdown.css` (or in a shared block in `Layout.css`), align styles: use the same border, border-radius, padding, font-size, font-weight, min-height, and matching :hover / :focus rules. If ThemeDropdown uses `--theme-switcher-*` and SortDropdown uses `--sort-dropdown-*`, either map both to the same underlying values or introduce a small set of shared variables (e.g. in `themes.css`) and use them for both components.
- Optionally wrap both in a container (e.g. a div with class `layout-header-dropdowns`) and apply a small gap between them (e.g. 0.5rem) so they appear as a paired group.
- Check responsive behavior: on narrow viewports, ensure both dropdowns remain usable and do not overflow (flex-wrap or order as needed).

### Deliverable
The gallery-order (Sort) dropdown is positioned to the right of the theme dropdown in the layout header, and both dropdowns share the same visual styling (border, radius, padding, font, focus, hover) so they look like a consistent control group.

### Testing Requirements
- Manual: Load the app and confirm in the header that the theme dropdown and the sort (gallery-order) dropdown appear next to each other with the sort to the right of the theme, and that both have matching appearance.
- Unit/integration: If Layout or header tests assert on order or presence of dropdowns, update as needed.

### Technical Notes
- Reference: `frontend/src/components/Layout/Layout.tsx` (`.layout-header-actions`; `ThemeDropdown`, `SortDropdown`), `ThemeDropdown.css`, `SortDropdown.css`, `Layout.css`, `themes.css` (for shared variables).

---

## Make the header seamlessly integrate into the rest of the page (Frontend)

**Status:** Pending
**Priority:** Low
**Complexity:** Low
**Estimated Time:** 20–30 minutes

### Description
The **layout header** (`.layout-header`) currently reads as a separate bar: it has its own background (`--header-bg`) and a bottom border (`--header-border`) that visually separate it from the main content. This task is to make the header **seamlessly integrate** with the rest of the page so it feels like one continuous surface: same (or continuous) background as the page body, no hard separation line, and consistent horizontal alignment and spacing with the main content area.

### Requirements

#### Scope
- **Frontend only.** `frontend/src/components/Layout/Layout.css` (header and, if needed, layout container) and optionally `frontend/src/styles/themes.css` if header-specific variables are changed or removed. No change to Layout.tsx structure unless necessary for styling (e.g. no new wrappers required if CSS-only).
- **Visual continuity.** The header should not appear as a distinct "bar" on top of the page. Prefer: (1) **Background:** Use the same background as the page (e.g. transparent so the layout’s gradient or `--color-background-primary` shows through), or extend the layout gradient into the header area so there is no color step. (2) **Border:** Remove the header’s `border-bottom` or replace it with a very subtle separator (e.g. same color as background with a slight tone difference, or a soft shadow) so the transition to main content is gradual rather than a hard line.
- **Alignment and padding.** Keep header content alignment consistent with the main content: same max-width (1200px) and horizontal padding as `.layout-main` so the header and main content visually line up. Ensure responsive padding (1rem / 1.5rem / 2rem) remains consistent between header and main at each breakpoint so the seamless look holds on mobile, tablet, and desktop.
- **Accessibility and contrast.** After changes, ensure header text and interactive elements (site name, SearchBar, ThemeDropdown, SortDropdown) still meet contrast requirements and remain readable on the shared background.

#### Implementation Tasks
- In `Layout.css`, for `.layout-header`: set background to transparent or to the same gradient/color as `.layout` (e.g. `background: transparent` so the parent gradient shows, or reuse `var(--gradient-bg-start)` / `var(--color-background-primary)`). Remove or soften `.layout-header`’s `border-bottom` (remove it, or use a very light border/shadow that doesn’t read as a strong line).
- If themes currently set `--header-bg` and `--header-border` specifically for the header, either stop using them for the header (so header inherits page look) or redefine them in `themes.css` so they match the page background and a minimal or no separator. Ensure light and dark themes both look coherent.
- Verify horizontal padding and max-width of `.layout-header-content` match or align with `.layout-main` (both use max-width 1200px and similar padding); adjust if needed so the header and main content edges line up and the integration feels intentional.
- Manually test in light and dark themes and at 768px / 1024px breakpoints; confirm header no longer reads as a separate bar and contrast remains sufficient.

### Deliverable
The layout header visually flows into the main content: no distinct background bar or hard border between header and page. Header and main share the same background (or continuous gradient), optional subtle separator only, and consistent horizontal alignment. Works in all themes and breakpoints.

### Testing Requirements
- Manual: Check root album, album detail, and search pages in light and dark themes; confirm the header blends into the page and text/controls remain readable. Check at mobile and desktop widths.
- No new unit tests required unless the project already has layout visual regression tests; in that case update expectations for header background/border.

### Technical Notes
- Reference: `Layout.css` (`.layout-header` lines 64–68: `background`, `border-bottom`, `padding`; `.layout-header-content` max-width 1200px; `.layout` gradient 37–42); `themes.css` (`--header-bg`, `--header-border` per theme). The main content area uses `.layout-main` with padding and the same max-width 2400px (content can be narrower); alignment is typically governed by inner content max-width (e.g. 1200px) shared with header.

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




# Latest 5 Subalbums Root List

## Summary

Root album list Subalbums section now shows at most the latest 5 subalbums (by timestamp descending, nulls last). When more than 5 exist, “… And much more” is displayed below the list. All changes are presentation-only in RootAlbumListBlock; no data-fetching or backend changes.

## Changes

- **RootAlbumListBlock.tsx:** Import `sortItems` from `@/utils/sorting`. Added `useMemo` for `displaySubalbums` (sort by `date-desc`, then `slice(0, 5)`). Added `hasMoreSubalbums` when `subalbums.length > 5`. Render `<ul>` from `displaySubalbums`; when `hasMoreSubalbums`, render a non-clickable `<span class="root-album-list-block-subalbums-more">… And much more</span>` after the list. Kept `showSubalbums = subalbums.length > 0`. Updated module JSDoc to describe latest-5 and “… And much more” behavior.

- **RootAlbumListBlock.css:** New `.root-album-list-block-subalbums-more` rules (muted color, smaller font, `margin-top`), using theme variables.

- **RootAlbumListBlock.test.tsx:** New test “shows all subalbum links and no “… And much more” when ≤5 subalbums” (2–3 subalbums, all links, no more text). New test “shows only 5 subalbum links and “… And much more” when >5 subalbums” (6 subalbums, exactly 5 links, 6th not linked, “… And much more” present). Existing tests unchanged.

- **TODO.md / TODO-summarized.md:** Removed the “Show Only Latest 5 Subalbums in Root Album List, Add “… And much more”” task. Updated total and pending counts in TODO-summarized.

## Verification

- `sortItems` uses `'date-desc'`; nulls-last behavior matches `sorting.ts`. No mutation of `subalbums`; copy before sort. Section still hidden when `subalbums.length === 0`.
- “… And much more” is a `<span>`, not a link, not focusable; only rendered when `subalbums.length > 5`. List layout and overflow unchanged.
- Unit tests cover ≤5 and >5 cases. Integration test (mockAlbums, “Parent Album”) remains valid; no changes to RootAlbumList.integration.test or to useSubalbumsMap / RootAlbumListView.

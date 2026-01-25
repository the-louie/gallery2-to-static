# Exclude Albums With No Image Descendant From Extraction — Summary

## Objective

During backend extraction, exclude any non-root album that has no image descendant (no `GalleryPhotoItem` in the album or any sub-album, recursively). Excluded albums do not get a JSON file, do not appear in any parent’s `children` array, and do not appear in the search index. The root album is always emitted.

## Changes

- **backend/index.ts**
  - Added `computeAlbumsWithImageDescendants(albumId, sql, ignoreSet)` that traverses from the given album using the same child filter as `findFirstPhotoRecursive`, adds the album to the result set if it has a direct photo or if any non-blacklisted child album has image descendants, and returns a `Set<number>` of album IDs with at least one image descendant.
  - In the IIFE, after building `ignoreSet` and before calling `main`, the pre-pass `albumsWithImageDescendants = await computeAlbumsWithImageDescendants(rootId, sql, ignoreSet)` is run and the set is passed into `main`.
  - `main` now takes an additional parameter `albumsWithImageDescendants: Set<number>` and passes it through on recursive calls. The `filtered` children list is built by excluding a child when it is a `GalleryAlbumItem` and either blacklisted or not in `albumsWithImageDescendants`. A one-line comment documents that we exclude child albums that are blacklisted or have no image descendant.

- **TODO.md**
  - Removed the full section titled "Exclude albums with no image descendant from backend extraction".

- **TODO-summarized.md**
  - Removed the bullet for that task and updated Summary counts (Total Tasks 4→3, Pending 3→2, Estimated Total Time adjusted).

## Verification

- Single exclusion point remains the construction of `filtered` in `main`; excluding an album there prevents recursion, omission from parent `children`, no JSON write, and exclusion from the search index (which is built from `processedChildrenWithThumbnails`).
- Root is never filtered as a child; only the top-level `main(rootId, ...)` call processes the root.
- Pre-pass and `main` both use the same `ignoreSet` and the same notion of filtered children (non-blacklisted albums + all photos). No separate search-index logic was needed.

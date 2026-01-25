# Limit Root Album Child-Album Descriptions to 20 Words — Summary

## Objective

Backend-only: during extraction, limit the root album JSON’s `children` array so each child album (GalleryAlbumItem) has its `description` truncated to at most 20 words, with "..." when longer. Search index and non-root albums unchanged.

## Changes

- **backend/index.ts**
  - Added constant `ROOT_ALBUM_CHILD_DESCRIPTION_MAX_WORDS = 20`.
  - Added helper `truncateDescriptionToWords(text: string, maxWords: number): string`: splits on whitespace; if word count ≤ maxWords returns original text, else first maxWords words joined by space plus "...". Caller does not pass null/undefined/empty.
  - Added parameter `rootAlbumId: number` to `main`; IIFE passes `rootId`, recursive calls pass `rootAlbumId` through.
  - After the loop that fills the search index from `processedChildrenWithThumbnails`, compute `childrenForFile`: when `root === rootAlbumId`, map over `processedChildrenWithThumbnails` and for each `GalleryAlbumItem` with non-empty `description` replace it with `truncateDescriptionToWords(description, ROOT_ALBUM_CHILD_DESCRIPTION_MAX_WORDS)`; otherwise `childrenForFile = processedChildrenWithThumbnails`. Album file uses `children: childrenForFile`; search index continues to use `processedChildrenWithThumbnails` (full descriptions).

- **TODO.md**
  - Removed the full section "Limit root album child-album descriptions to 20 words (Backend Extraction)".

- **TODO-summarized.md**
  - Removed the bullet for that task; updated Summary (Total Tasks 3→2, Pending 2→1, Estimated Total Time adjusted).

## Verification

- Truncation applies only when `root === rootAlbumId` and only to `GalleryAlbumItem` with non-empty description (null/undefined/empty left unchanged).
- Search index still receives full descriptions from `processedChildrenWithThumbnails`; no in-place mutation.
- Non-root albums use `childrenForFile = processedChildrenWithThumbnails` unchanged.

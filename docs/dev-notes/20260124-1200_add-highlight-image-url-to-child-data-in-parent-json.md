# Add highlightImageUrl to child data in parent album JSON

## Summary

Parent album JSON already contained album metadata with `highlightImageUrl`. Child entries in the parent's `children` array (for sub-albums) did not. We added `highlightImageUrl` to each album child in that array so the parent can show the highlight image when rendering the list of child albums.

## Changes

- **backend/types.ts**  
  Extended `Child` with optional `highlightImageUrl?: string | null` and JSDoc: same meaning as `metadata.highlightImageUrl` for that album, only set for `GalleryAlbumItem` when a highlight can be resolved.

- **backend/index.ts**  
  When building `processedChildrenWithThumbnails`, for every `GalleryAlbumItem` we now call `resolveHighlightImageUrl(child.id, …)` with that child’s uipath and pathComponent. The result is set on the child as `highlightImageUrl` when non-null. This runs for all album children (with or without a direct first photo/thumbnail). Metadata `highlightImageUrl` for the current album is unchanged and still set as before.

## Result

Each album in a parent’s `children` array may now include `highlightImageUrl`. The frontend can use it when displaying child-album lists without loading each child’s album JSON.

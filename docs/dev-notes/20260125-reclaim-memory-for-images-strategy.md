# Reclaim memory for images not currently shown — strategy

Summary of how the frontend reduces RAM usage when browsing.

- **Virtualization:** VirtualGrid uses react-virtuoso VirtuosoGrid with `useWindowScroll`. Only visible and overscan items are mounted; off-screen ImageThumbnail/AlbumCard components are unmounted so decoded image bitmaps can be GC’d.
- **Image cache clear on navigation:** When the user leaves the current view (route or album change), Layout runs an effect that calls `getImageCache().clear()`. The cache is not cleared on initial mount. Returning to an album may re-fetch images.
- **Album data cache:** Unbounded in-memory cache in dataLoader; optional LRU eviction can be added later.
- **Lightbox:** useImagePreload is bounded (prev/next only).

To measure memory: use DevTools → Performance/Memory (heap snapshot before and after navigating away from an album with many images; after scroll in a large grid).

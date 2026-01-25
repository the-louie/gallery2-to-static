# TODO Summarized

## Partial Tasks

## Pending Tasks
- Reclaim memory for images not currently shown - Medium–High - 4–6 hours - Reduce RAM use (~3GB when browsing) by unmounting/releasing images for albums or items not on screen
- Cancel all in-flight image GETs when navigating - Medium - 2–4 hours - Abort every image fetch (thumbnails, full-size, preloads) on route/album change via AbortController so previous view’s requests do not complete
- Show total descendant image count for non-root albums (backend) - Medium - 2–4 hours - Backend computes and emits total descendant image count per album at export; frontend displays it for non-root albums
- Fix image URL path: album 534881 and ___ prefix (wrong path) - Medium - 2–4 hours - Make urlPath/highlightImageUrl match actual asset paths; remove or align ___ filename prefix so e.g. 534881 images load (true path 20090418-img_1720.jpg not ___20090418-img_1720.jpg)
- Verify frontend loads images AVIF-first everywhere - Low - 1–2 hours - Confirm all image loads use getBestFormat/getImageUrlWithFormat so AVIF is tried first, fix any paths that use original only
- Implement Per-Album Theme Configuration - Medium - 4-5 hours - Implement per-album theme configuration system with JSON file for human editing

---

## Summary

**Total Tasks:** 6
**Pending:** 6
**Partial:** 0
**In Progress:** 0
**Completed:** 0

**Estimated Total Time:** ~15–25 hours

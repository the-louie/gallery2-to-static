# TODO Summarized

## Partial Tasks

## Pending Tasks
- Reclaim memory for images not currently shown - Medium–High - 4–6 hours - Reduce RAM use (~3GB when browsing) by unmounting/releasing images for albums or items not on screen
- Cancel all in-flight image GETs when navigating - Medium - 2–4 hours - Abort every image fetch (thumbnails, full-size, preloads) on route/album change via AbortController so previous view’s requests do not complete
- Verify frontend loads images AVIF-first everywhere - Low - 1–2 hours - Confirm all image loads use getBestFormat/getImageUrlWithFormat so AVIF is tried first, fix any paths that use original only
- Implement Per-Album Theme Configuration - Medium - 4-5 hours - Implement per-album theme configuration system with JSON file for human editing

---

## Summary

**Total Tasks:** 4
**Pending:** 4
**Partial:** 0
**In Progress:** 0
**Completed:** 0

**Estimated Total Time:** ~11–17 hours

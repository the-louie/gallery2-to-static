# TODO Summarized

## Partial Tasks
(none)

## Pending Tasks
- Incorporate local copy of images and verify – Medium – ~2–4h – Serve gallery images from a local path (e.g. /images), set baseUrl accordingly, and verify root thumbnails, album grid, and lightbox work without CORS/blocking
- Generate thumbnails from fullsize; separate thumb root, same directory structure – Medium – ~4–6h – Add thumbnail generation from fullsize images and configurable thumbnailBaseUrl; thumb root mirrors fullsize path structure; update imageUrl and config
- Undo Gallery Administrator → "The Louie"; use "Unknown" instead – Low – ~0.5–1h – Backend: replace "Gallery Administrator" with "Unknown" in ownerDisplayName (not "The Louie"); update ownerDisplayName.ts, tests, and dev note
- Bug: single row of images below fold never loads on scroll – Medium – ~1–2h – Fix lazy-load so images in a single row below the fold load when user scrolls; use scroll container as IntersectionObserver root or add fallback (e.g. album 2946)

---

## Summary

**Total Tasks:** 4
**Pending:** 4
**Partial:** 0
**In Progress:** 0
**Completed:** 0

**Estimated Total Time:** ~8.5–15h

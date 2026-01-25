# TODO Summarized

## Partial Tasks
- Album titles and descriptions: BBCode (Backend + Frontend) - Medium - 1–2 hours - Backend: strip BBCode from titles; Frontend: render BBCode in descriptions (RootAlbumListBlock, AlbumDetail)

## Pending Tasks
- Limit root album child-album descriptions to 20 words - Low - 30–45 min - In root album JSON only, truncate child album description to 20 words and append ellipsis if longer
- Exclude albums with no image descendant from extraction - Medium - 1–1.5 hours - Backend: do not emit JSON or list in children for albums that have no photo in subtree (recursive)
- Subalbum wrapper 50% width, max-width 800px below 1200px - Low - 20–30 min - Frontend: subalbum wrapper div 50% parent width and max-width 800px on viewports below 1200px
- Remove "Subalbums:" title from sub-album wrapper in root album - Low - 10–15 min - Frontend: remove root-album-list-block-subalbums-title element and text; keep list and aria-label
- Root album subalbums: limit 10, "...and more!" at bottom right (Frontend) - Low - 20–30 min - Raise subalbums display limit from 6 to 10; move overflow text to bottom right of block; reword to "...and more!"
- Remove nav (Main navigation) and make root album intro title the only h1 (Frontend) - Low - 15–20 min - Remove Layout nav; demote layout site name from h1; ensure only h1 is root-album-list-view-intro-title when shown
- Move gallery-order dropdown right of theme dropdown and style similarly (Frontend) - Low - 15–20 min - Layout header: place SortDropdown to the right of ThemeDropdown; style both dropdowns identically (border, radius, padding, focus)
- Make header seamlessly integrate into the rest of the page (Frontend) - Low - 20–30 min - Header same/continuous background as page, remove or soften border; align padding/max-width with main
- Implement Per-Album Theme Configuration - Medium - 4-5 hours - Implement per-album theme configuration system with JSON file for human editing

---

## Summary

**Total Tasks:** 10
**Pending:** 9
**Partial:** 1
**In Progress:** 0
**Completed:** 0

**Estimated Total Time:** ~10.5–12.5 hours

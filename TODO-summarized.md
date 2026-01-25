# TODO Summarized

## Pending Tasks
- Fix URL path: Nordic chars (å ä ö) → a, a, o in backend (Bug) - Medium - 45–60 min - Backend URL paths: do not decode entities to Unicode; map å→a, ä→a, ö→o so paths are e.g. martin_ojes not martin_ouml;jes
- Replace "Gallery Administrator" with "The Louie" in ownerName (Backend) - Low - 30–45 min - During backend extraction, replace ownerName "Gallery Administrator" with "The Louie" in metadata and children
- Limit root album child-album descriptions to 20 words - Low - 30–45 min - In root album JSON only, truncate child album description to 20 words and append ellipsis if longer
- Exclude albums with no image descendant from extraction - Medium - 1–1.5 hours - Backend: do not emit JSON or list in children for albums that have no photo in subtree (recursive)
- Subalbum wrapper 50% width, max-width 800px below 1200px - Low - 20–30 min - Frontend: subalbum wrapper div 50% parent width and max-width 800px on viewports below 1200px
- Remove "Subalbums:" title from sub-album wrapper in root album - Low - 10–15 min - Frontend: remove root-album-list-block-subalbums-title element and text; keep list and aria-label
- Remove root-album-list-view-header from the root album (Frontend) - Low - 10–15 min - Frontend: remove root-album-list-view-header block and "Albums" heading from RootAlbumListView
- Add root album description below album title on root album view - Low - 20–30 min - Frontend: show root album title + description (from metadata) at top of RootAlbumListView above the list
- .layout-main and .home-page max-width 2400px - Low - 15–20 min - Frontend: add max-width 2400px to .layout-main and .home-page for wide screens
- Light-mode gradients more pronounced - Low - 20–30 min - Frontend: increase contrast/visibility of gradient variables in light theme (themes.css)
- Highlight image as faded/blurred background on article.root-album-list-block (Frontend) - Low - 30–45 min - Frontend: use highlightImageUrl as faded/blurred background on RootAlbumListBlock
- Strip BBCode from album titles in backend extraction - Low - 30–45 min - Backend: strip BBCode from all album titles (metadata + children) during extraction so emitted JSON has plain-text titles
- Prioritize search results by current album context - Medium - 45–90 min - Frontend: order results as (1) children of context album, (2) descendants of context album, (3) rest of site; pass context via e.g. ?album= when searching from album page
- Implement Per-Album Theme Configuration - Medium - 4-5 hours - Implement per-album theme configuration system with JSON file for human editing

---

## Summary

**Total Tasks:** 14
**Pending:** 14
**Partial:** 0
**In Progress:** 0
**Completed:** 0

**Estimated Total Time:** ~11.5–13.5 hours

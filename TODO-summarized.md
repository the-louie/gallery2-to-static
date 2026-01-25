# TODO Summarized

## Pending Tasks
- Prioritize search by album context (Frontend) - Medium - 1–2 hours - Sort search results so direct children of context album first, then descendants, then rest of site; context from URL param
- Fix URL path: Nordic chars (å ä ö) → a, a, o in backend (Bug) - Medium - 45–60 min - Backend URL paths: do not decode entities to Unicode; map å→a, ä→a, ö→o so paths are e.g. martin_ojes not martin_ouml;jes
- Replace "Gallery Administrator" with "The Louie" in ownerName (Backend) - Low - 30–45 min - During backend extraction, replace ownerName "Gallery Administrator" with "The Louie" in metadata and children
- Limit root album child-album descriptions to 20 words - Low - 30–45 min - In root album JSON only, truncate child album description to 20 words and append ellipsis if longer
- Exclude albums with no image descendant from extraction - Medium - 1–1.5 hours - Backend: do not emit JSON or list in children for albums that have no photo in subtree (recursive)
- Subalbum wrapper 50% width, max-width 800px below 1200px - Low - 20–30 min - Frontend: subalbum wrapper div 50% parent width and max-width 800px on viewports below 1200px
- Remove "Subalbums:" title from sub-album wrapper in root album - Low - 10–15 min - Frontend: remove root-album-list-block-subalbums-title element and text; keep list and aria-label
- Remove root-album-list-view-header from the root album (Frontend) - Low - 10–15 min - Frontend: remove root-album-list-view-header block and "Albums" heading from RootAlbumListView
- Add root album description below album title on root album view - Low - 20–30 min - Frontend: show root album title + description (from metadata) at top of RootAlbumListView above the list
- Highlight image as faded/blurred background on article.root-album-list-block (Frontend) - Low - 30–45 min - Frontend: use highlightImageUrl as faded/blurred background on RootAlbumListBlock
- Implement Per-Album Theme Configuration - Medium - 4-5 hours - Implement per-album theme configuration system with JSON file for human editing

---

## Summary

**Total Tasks:** 11
**Pending:** 11
**Partial:** 0
**In Progress:** 0
**Completed:** 0

**Estimated Total Time:** ~12–14.5 hours

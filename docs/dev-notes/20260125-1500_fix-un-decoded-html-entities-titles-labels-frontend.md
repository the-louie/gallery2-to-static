# Fix un-decoded HTML entities in titles and labels (frontend)

**Date:** 2026-01-25

## Summary

- **Goal:** User-visible titles and labels show decoded characters (e.g. ö, ä, å) instead of raw HTML entities (e.g. `&ouml;`, `&auml;`, `&aring;`). Frontend only.
- **Cause:** `decodeHtmlEntities` was missing named entities for å/Å (`&aring;`, `&Aring;`). Display paths already used `parseBBCodeDecoded` or `decodeHtmlEntities`; no component changes were required.
- **Changes:** In `frontend/src/utils/decodeHtmlEntities.ts`, added `['&aring;', 'å']` and `['&Aring;', 'Å']` to `NAMED_ENTITIES` and updated the module JSDoc to mention å/Å. In `decodeHtmlEntities.test.ts`, added a test that asserts `&aring;` → å, `&Aring;` → Å, and a combined example (e.g. `G&aring;rd` → Gård). Removed the task from `TODO-summarized.md` and updated total/pending counts and estimated time. The full task block was removed from `TODO.md` except for a small orphan block (one stray line and the previous task’s Scope/Implementation/Deliverable/Testing bullets) that could not be removed by search/replace because of curly-quote characters in that line; it can be deleted manually (the block immediately above “## Implement Per-Album Theme Configuration”).
- **Verification:** Grep confirmed all title/label display paths (RootAlbumListView, RootAlbumListBlock, AlbumDetail, Breadcrumbs, AlbumCard, SearchResultsPage, Lightbox) use `parseBBCodeDecoded` or `decodeHtmlEntities`. No backend changes. No new bugs or side effects identified.

# Fix URL path Nordic chars backend – summary

**Date:** 2026-01-25

## Objective
Ensure backend-emitted URL paths use ASCII (a, a, o) for Nordic characters (å, ä, ö) instead of HTML entity remnants or Unicode. Scope: backend only; display titles unchanged.

## Changes

### backend/cleanupUipath.ts
- Added constants `NORDIC_ENTITY_TO_ASCII` (regex replacements for `&ouml;`, `&auml;`, `&aring;` and uppercase) and `NORDIC_UNICODE_TO_ASCII` (Unicode å, ä, ö, Å, Ä, Ö → a, a, o).
- Added helper `normalizeNordicForPath(s)` that applies both entity and Unicode replacements so path output never contains entity names (e.g. ouml;) or Unicode Nordic.
- Integrated normalization into `cleanup_uipathcomponent`: call `normalizeNordicForPath` after `unescapeHtml` (so entities are normalized before `&` becomes `_`) and again after the final `decode(x).toLowerCase()` (so any remaining Unicode Nordic is normalized).
- Updated file and function comments to state that URL path segments must go through `cleanup_uipathcomponent` and that Nordic is normalized for URL paths.

### backend/cleanupUipath.test.ts
- Added tests for entity form: `Martin &ouml;jes` → `martin_ojes`, `n&auml;sslan_3` → `nasslan_3`, `&aring;ngstrom` → `angstrom`; assertions that output contains no `ouml`, `auml`, or semicolon.
- Added tests for uppercase entities: `&Ouml;jes`, `&Auml;sslan`, `&Aring;ngstrom` → `ojes`, `asslan`, `angstrom`.
- Added tests for Unicode form: `Martin Öjes`, `Nässlan`, `Ångström` → segments use only a/a/o.

### Task tracking
- Removed the TODO section "Fix URL path: Nordic characters (å ä ö) to ASCII in backend (Bug)" from TODO.md.
- Removed the corresponding line from TODO-summarized.md and updated totals (14 tasks, 13 pending).

## Verification
- All path construction in backend flows through `cleanup_uipathcomponent`: `index.ts` builds `uipath`, `dir`, `linkFilename`, `thumbnailUrlPath`, `urlPath`, `highlightImageUrl` from cleaned titles/pathComponent; `legacyPaths.ts` receives already-cleaned `uipathcomponent`. No path is built from raw title/pathComponent without normalization.
- Display-only fields (album title, breadcrumb labels) are unchanged; normalization is applied only inside the path cleanup pipeline.

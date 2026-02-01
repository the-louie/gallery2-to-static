# Backend Pathcomponent Normalization Fix

**Date:** 2026-02-01
**Source:** Root cause report (backend vs extract.py path mismatch)

## Summary

Normalize pathcomponent before passing to `getThumbTarget` and `getLinkTarget` so backend output matches on-disk filenames produced by extract.py. Failing URLs showed spaces and other illegal chars in the pathcomponent suffix (e.g. `___del av switchrack.jpg`); on-disk files use normalized form (e.g. `___del_av_switchrack.jpg`).

## Changes

- **cleanupUipath.ts:** Added `normalizePathcomponentForFilename(pathcomponent)` – takes last path segment, applies `cleanup_uipathcomponent`.
- **index.ts:** All six call sites of `getThumbTarget`/`getLinkTarget` now pass `normalizePathcomponentForFilename(rawPath)` instead of raw pathcomponent.
- **index.ts:** Startup warning when `thumbPrefix === '__t_'` (does not match extract.py convention).
- **photoThumbnailPath.test.ts:** Test helpers updated to use `normalizePathcomponentForFilename` so contract matches production.
- **Tests:** `cleanupUipath.test.ts` and `legacyPaths.test.ts` extended with normalizePathcomponentForFilename and space-normalization cases.

## Regeneration

After this fix, regenerate all album JSON so thumb and link URLs match on-disk filenames.

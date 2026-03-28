# TODO

---

## Logic & Edge Case Fixes

### LOGIC-02: Object URL memory leaks in useProgressiveImage
- **Severity:** Medium
- **Files:** `frontend/src/hooks/useProgressiveImage.ts:127,156,303-306`
- **Description:** Cleanup useEffect doesn't revoke object URLs; only per-load effect cleanups do. If hook unmounts while loading, URLs leak. Also, if abort happens between `blob()` and `createObjectURL()`, blob is created but URL is not tracked.
- **Fix:** Add to final cleanup: revoke both `thumbnailObjectUrlRef.current` and `fullObjectUrlRef.current`. Wrap fetch flow in try/finally.

---

## Architecture & DRY Improvements

### ARCH-04: Inconsistent component barrel export patterns
- **Impact:** Low
- **Files:** `frontend/src/components/AlbumGrid/index.ts`, `frontend/src/components/AlbumDetail/index.ts`
- **Description:** Some components export both default and named exports of the same component, others use only named exports. Creates ambiguity in import style.
- **Fix:** Standardize on named exports only (more explicit, better tree-shaking). Document in contributing guide.

---

## Pending

### VERIFY-01: go through each function that handles characters for URLs, forbidden or convertions from nordic characters and make sure that it doesn't break any album or image url. The full set of albums are available in @/data/ as json-files.

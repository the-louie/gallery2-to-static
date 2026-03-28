# TODO

---

## Logic & Edge Case Fixes

### LOGIC-02: Object URL memory leaks in useProgressiveImage
- **Severity:** Medium
- **Files:** `frontend/src/hooks/useProgressiveImage.ts:127,156,303-306`
- **Description:** Cleanup useEffect doesn't revoke object URLs; only per-load effect cleanups do. If hook unmounts while loading, URLs leak. Also, if abort happens between `blob()` and `createObjectURL()`, blob is created but URL is not tracked.
- **Fix:** Add to final cleanup: revoke both `thumbnailObjectUrlRef.current` and `fullObjectUrlRef.current`. Wrap fetch flow in try/finally.

### LOGIC-03: Unbounded cache growth in dataLoader and useSearch
- **Severity:** Medium
- **Files:** `frontend/src/utils/dataLoader.ts:102`, `frontend/src/hooks/useSearch.ts:179`
- **Description:** Album data cache and search results cache grow without bound. Visiting thousands of albums or searching many unique queries causes unbounded memory growth.
- **Fix:** Implement LRU eviction: limit album cache to ~100 entries, search cache to ~100 results.

---

## Architecture & DRY Improvements

### ARCH-03: Path alias duplication between vite and vitest configs
- **Impact:** Medium
- **Files:** `frontend/vite.config.ts:68-78`, `frontend/vitest.config.ts:30-39`
- **Description:** Identical path alias definitions (`@/components`, `@/utils`, etc.) in both config files. Adding new aliases requires updating both.
- **Fix:** Extract aliases to shared config file (e.g., `aliases.config.js`) and import in both configs.

### ARCH-04: Inconsistent component barrel export patterns
- **Impact:** Low
- **Files:** `frontend/src/components/AlbumGrid/index.ts`, `frontend/src/components/AlbumDetail/index.ts`
- **Description:** Some components export both default and named exports of the same component, others use only named exports. Creates ambiguity in import style.
- **Fix:** Standardize on named exports only (more explicit, better tree-shaking). Document in contributing guide.

---

## Pending

### VERIFY-01: go through each function that handles characters for URLs, forbidden or convertions from nordic characters and make sure that it doesn't break any album or image url. The full set of albums are available in @/data/ as json-files.

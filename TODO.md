# TODO

---

## Logic & Edge Case Fixes

### LOGIC-01: Race condition in useAlbumData hook
- **Severity:** Medium
- **Files:** `frontend/src/hooks/useAlbumData.ts:119,151-157,177-185`
- **Description:** `isMountedRef.current` check is non-atomic; component can unmount between check and `setData()`. Auto-retry can trigger double-retry when `!isLoading && !isRetryingRetry` are both false simultaneously.
- **Fix:** Use AbortController instead of isMountedRef. Guard concurrent retries with state machine.

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

### LOGIC-05: Insufficient database result validation in sqlUtils.ts
- **Severity:** Medium
- **Files:** `backend/sqlUtils.ts:95-169`
- **Description:** Query results cast to `Record<string, unknown>` without field-level validation. `String(child.title)` on complex objects produces `[object Object]`. No length validation on strings.
- **Fix:** Add explicit type checks per field. Add maximum length validation. Consider schema validation library (Zod).

---

## Architecture & DRY Improvements

### ARCH-02: Implicit coupling in Nordic path normalization
- **Impact:** Medium-High
- **Files:** `backend/cleanupUipath.ts`, `frontend/src/utils/albumPath.ts`
- **Description:** Frontend `titleToSegment()` must match backend `cleanup_uipathcomponent()` output, but this coupling is implicit. If backend changes path normalization, frontend breaks silently.
- **Fix:** Add integration tests validating frontend paths match backend-generated paths. Document coupling explicitly in both files. Consider extracting shared normalization logic.

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

### ARCH-06: albumPath.ts illegal character regex has unescaped hyphen
- **Impact:** Low
- **Files:** `frontend/src/utils/albumPath.ts:8`
- **Description:** `RE_ILLEGAL = /[\[\]\\\/\?%:\|"\'><#\s&]/gi` - hyphen between `'` and `>` in character class may create unintended range (chars 39-62). Not currently causing issues but fragile.
- **Fix:** Escape hyphen or place at start/end of character class: `/[-\[\]\\\/\?%:\|"\'><#\s&]/gi`

---

## Pending

(none)

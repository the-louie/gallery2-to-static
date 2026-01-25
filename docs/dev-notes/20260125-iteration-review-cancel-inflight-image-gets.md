# Iteration review: cancel in-flight image GETs on navigation

## Summary of changes

**ViewAbortContext**
- Provider creates a new AbortController when view identity (pathname + key) changes and aborts the previous controller on cleanup so in-flight requests for the previous view are canceled.
- `useViewAbortSignal()` returns the current view’s signal; it is stable for the lifetime of the view.

**fetchImageAsObjectUrl**
- Fetches with the given AbortSignal. After `response.blob()`, checks `signal.aborted` before creating the object URL and throws AbortError if aborted. Caller is responsible for revoking the returned URL.

**imagePreload**
- When an AbortSignal is provided, preload uses fetch + object URL so the request can be canceled. If the signal is aborted before the inner Image resolves (e.g. in onload), the promise rejects with AbortError so the promise always settles. The `.then` rejection handler was simplified to rethrow. In the onload path when aborted, the code now sets `img.src = ''` before revoking the object URL so the Image does not keep a reference to a revoked URL, consistent with useProgressiveImage.

**useImagePreload**
- Uses `useViewAbortSignal()` and passes it to `preloadImage`. Catches AbortError and ignores it; other errors are ignored when the effect is still current (preloadAbortRef). Cleanup sets the ref so late rejections do not affect state.

**useProgressiveImage**
- Uses `useViewAbortSignal()` for thumbnail and full-image fetches. When abort is detected inside thumbnail, full, or fallback Image onload handlers, the object URL is revoked and `img.src` is set to `''`. In all effect cleanups (reset, thumbnail load, full load), the code sets the image refs’ `src` to `''` before revoking object URLs and nulling refs to avoid leaking or using revoked URLs.

**imageCache**
- `delete()` and `clear()` revoke any cached entry whose `image.src` is a blob URL before removing the entry.

No logic errors, unintended side effects, or API incompatibilities were found in the reviewed code. One consistency fix was applied: clearing `img.src` in `preloadImage`’s onload-abort path before revoking the object URL.

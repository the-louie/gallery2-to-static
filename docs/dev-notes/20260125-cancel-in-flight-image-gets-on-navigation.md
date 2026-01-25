# Cancel in-flight image GETs on navigation

Image GETs (thumbnails, full-size, lightbox preloads) are canceled when the user navigates away. This avoids retaining bandwidth and memory for the previous view and prevents state updates after unmount.

## Approach

- **View-scoped AbortController:** `ViewAbortProvider` (in App, inside Router) creates an `AbortController` per view. View identity is `location.pathname` + `location.key`. When either changes, the provider aborts the previous controller and creates a new one. The current `AbortSignal` is exposed via `useViewAbortSignal()`.

- **Fetch + object URL:** Native `img.src` cannot be canceled reliably. Image loading uses `fetch(url, { signal })`, then `response.blob()`, then `URL.createObjectURL(blob)` and assigns that to `img.src`. Callers revoke the object URL on abort, error, or eviction.

- **Where it’s used:**
  - `useProgressiveImage`: thumbnail and full image (and fallback original) are loaded via `fetchImageAsObjectUrl(url, signal)`. Object URLs are revoked in cleanup and when the signal aborts; setState is guarded with `!signal.aborted` and mounted checks.
  - `useImagePreload`: passes `useViewAbortSignal()` to `preloadImage(url, { signal })`. Preload uses fetch+objectURL when signal is provided; on abort the promise rejects with AbortError (handled silently).
  - `preloadImage` (and `preloadImages`): when `options.signal` is provided, uses `fetchImageAsObjectUrl`; otherwise keeps the previous Image+src behavior for tests/backward compatibility.

- **Cache:** The shared image cache can hold elements whose `src` is an object URL. On eviction and on `clear()`, the cache revokes any `blob:` URLs so object URLs are not leaked.

- **React Strict Mode:** The AbortController is tied to the view (location), not to component mount, so double-mount does not create a new controller or abort the current view’s requests prematurely.

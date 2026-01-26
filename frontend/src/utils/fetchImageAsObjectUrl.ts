/**
 * Fetch image as object URL with AbortSignal support
 *
 * Fetches an image URL and returns a blob object URL so that the request can be
 * canceled via AbortSignal. Opaque responses are rejected; callers should use
 * the original server URL when the function throws. The caller must revoke the
 * returned URL when done (on abort, error, or when no longer needed) to avoid leaks.
 *
 * @module frontend/src/utils/fetchImageAsObjectUrl
 */

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/**
 * Fetches an image and returns an object URL for the blob.
 * Rejects with AbortError when signal is aborted.
 * Opaque responses (e.g. cross-origin without CORS) are rejected; callers should
 * use the original server URL when this function throws.
 * Caller must call URL.revokeObjectURL(url) when the URL is no longer needed.
 *
 * @param url - Image URL to fetch
 * @param signal - AbortSignal to cancel the request (e.g. view navigation)
 * @returns Promise resolving to the object URL string
 * @throws DOMException with name 'AbortError' when signal is aborted
 * @throws Error when response is not ok or is opaque (use server URL as fallback)
 */
export async function fetchImageAsObjectUrl(
  url: string,
  signal: AbortSignal,
): Promise<string> {
  if (isDev) {
    console.log('[fetchImageAsObjectUrl] GET', url.slice(-60));
  }
  const response = await fetch(url, { signal });

  if (!response.ok) {
    if (isDev) {
      console.warn('[fetchImageAsObjectUrl] fail', response.status, response.statusText, url.slice(-60));
    }
    throw new Error(`Image fetch failed: ${response.status} ${response.statusText}`);
  }

  if (response.type === 'opaque') {
    if (isDev) {
      console.warn('[fetchImageAsObjectUrl] opaque response rejected', url.slice(-60));
    }
    throw new Error('Opaque response; cannot use as image');
  }

  const blob = await response.blob();
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  const objectUrl = URL.createObjectURL(blob);
  if (isDev) {
    console.log('[fetchImageAsObjectUrl] ok', url.slice(-60));
  }
  return objectUrl;
}

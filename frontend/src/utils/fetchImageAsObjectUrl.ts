/**
 * Fetch image as object URL with AbortSignal support
 *
 * Fetches an image URL and returns a blob object URL so that the request can be
 * canceled via AbortSignal. The caller must revoke the returned URL when done
 * (on abort, error, or when no longer needed) to avoid leaks.
 *
 * @module frontend/src/utils/fetchImageAsObjectUrl
 */

/**
 * Fetches an image and returns an object URL for the blob.
 * Rejects with AbortError when signal is aborted.
 * Caller must call URL.revokeObjectURL(url) when the URL is no longer needed.
 * Callers should not use the returned URL as the only display URL if the document
 * restricts blob: (e.g. use server URL for img src).
 *
 * @param url - Image URL to fetch
 * @param signal - AbortSignal to cancel the request (e.g. view navigation)
 * @returns Promise resolving to the object URL string
 * @throws DOMException with name 'AbortError' when signal is aborted
 */
export async function fetchImageAsObjectUrl(
  url: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Image fetch failed: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  return URL.createObjectURL(blob);
}

/**
 * BBCode stripping for album title fields.
 * Used so emitted JSON (metadata.albumTitle, children titles, index.json, search index)
 * contains plain text only. Description and summary are not passed here.
 *
 * Removes all [...] segments (opening, closing, and [tag=value]) and returns
 * the concatenated inner text. Nested or malformed tags leave remaining text;
 * no full parse is required.
 */

/**
 * Strip BBCode tags from a string. Removes every substring matching [...]
 * (e.g. [b], [/b], [color=red], [url=https://x.com]) and returns the plain text.
 * Idempotent: plain text is returned unchanged.
 *
 * @param text - Non-null title string (call site must not pass null/undefined)
 * @returns Plain text with all BBCode tags removed
 */
export function stripBBCode(text: string): string {
  return text.replace(/\[[^\]]*\]/g, '');
}

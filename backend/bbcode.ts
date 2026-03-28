/**
 * BBCode stripping for album title fields.
 * Used so emitted JSON (metadata.albumTitle, children titles, index.json, search index)
 * contains plain text only. Call sites (sqlUtils) decode HTML entities first, then
 * call stripBBCode, so stored titles are readable (e.g. Nässlan not N&auml;sslan).
 * Description and summary are not processed here.
 *
 * Removes all [...] segments (opening, closing, and [tag=value]) by iteratively
 * stripping innermost bracket pairs until stable (max 10 iterations). This handles
 * nested brackets like [[tag]...[/tag]] that single-pass regex would leave behind.
 */

/** Safety cap for iterative tag stripping to prevent infinite loops. */
const MAX_ITERATIONS = 10;

/**
 * Strip BBCode tags from a string. Iteratively removes innermost [...] pairs
 * (e.g. [b], [/b], [color=red], [url=https://x.com]) until no brackets remain
 * or MAX_ITERATIONS is reached. Handles nested brackets correctly.
 * Idempotent: plain text is returned unchanged.
 *
 * @param text - Non-null title string (call site must not pass null/undefined)
 * @returns Plain text with all BBCode tags removed
 */
export function stripBBCode(text: string): string {
  const pattern = /\[[^\[\]]*\]/g;
  let result = text;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const next = result.replace(pattern, '');
    if (next === result) break;
    result = next;
  }
  return result;
}

/**
 * Decode HTML entities for display strings (e.g. &auml;, &ouml;, &aring; → ä, ö, å).
 *
 * Use for album titles, breadcrumbs, subalbum labels, descriptions, etc.
 * Must run **before** BBCode parsing when used with parseBBCode so that
 * escapeHtml in the parser does not double-encode entities.
 *
 * Do **not** use for URLs, path, href, or other non-display contexts.
 *
 * @module frontend/src/utils/decodeHtmlEntities
 */

const NAMED_ENTITIES: [string, string][] = [
  ['&amp;', '&'],
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&#039;', "'"],
  ['&#39;', "'"],
  ['&auml;', 'ä'],
  ['&ouml;', 'ö'],
  ['&uuml;', 'ü'],
  ['&Auml;', 'Ä'],
  ['&Ouml;', 'Ö'],
  ['&Uuml;', 'Ü'],
  ['&szlig;', 'ß'],
  ['&aring;', 'å'],
  ['&Aring;', 'Å'],
];

const MAX_ITERATIONS = 10;

/**
 * Decode HTML entities in a string. Uses loop-until-stable so that
 * double-encoded entities (e.g. `&amp;auml;`) resolve correctly.
 * Process `&amp;` first, then other named entities and numeric refs.
 *
 * @param str - Input string (display use only)
 * @returns Decoded string, or '' for null/undefined
 */
export function decodeHtmlEntities(str: string | null | undefined): string {
  if (str == null || typeof str !== 'string') {
    return '';
  }
  let x = str;
  let iterations = 0;
  let prev: string;
  do {
    prev = x;
    for (const [entity, char] of NAMED_ENTITIES) {
      x = x.split(entity).join(char);
    }
    x = x.replace(/&#(\d+);/g, (_, n) =>
      String.fromCharCode(parseInt(n, 10)),
    );
    x = x.replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );
    iterations++;
  } while (prev !== x && iterations < MAX_ITERATIONS);
  return x;
}

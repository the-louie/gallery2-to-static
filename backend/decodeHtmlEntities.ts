/**
 * Decode HTML entities for album titles, descriptions, summaries, and layout header.
 * Used so emitted JSON contains readable plain text (e.g. Nässlan not N&auml;sslan).
 * Supports apostrophe entities &#039;, &#39;, &apos;, and numeric without semicolon (e.g. &#039).
 * Do not use for path components.
 *
 * @module backend/decodeHtmlEntities
 */

const NAMED_ENTITIES: [string, string][] = [
  ['&amp;', '&'],
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&#039;', "'"],
  ['&#39;', "'"],
  ['&apos;', "'"],
  ['&auml;', 'ä'],
  ['&ouml;', 'ö'],
  ['&uuml;', 'ü'],
  ['&Auml;', 'Ä'],
  ['&Ouml;', 'Ö'],
  ['&Uuml;', 'Ü'],
  ['&szlig;', 'ß'],
  ['&aring;', 'å'],
  ['&Aring;', 'Å'],
  ['&agrave;', 'à'],
  ['&Agrave;', 'À'],
  ['&eacute;', 'é'],
  ['&Eacute;', 'É'],
  ['&egrave;', 'è'],
  ['&Egrave;', 'È'],
  ['&ecirc;', 'ê'],
  ['&Ecirc;', 'Ê'],
  ['&euml;', 'ë'],
  ['&Euml;', 'Ë'],
  ['&iacute;', 'í'],
  ['&Iacute;', 'Í'],
  ['&ntilde;', 'ñ'],
  ['&Ntilde;', 'Ñ'],
];

const MAX_ITERATIONS = 10;

/**
 * Decode HTML entities in a string. Uses loop-until-stable so that
 * double-encoded entities (e.g. &amp;auml;) resolve correctly.
 * Process &amp; first, then other named entities and numeric refs.
 *
 * @param str - Input string (album title or layout header description)
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
    // Numeric entities without trailing semicolon (e.g. &#039 at end of string)
    x = x.replace(/&#(\d+)(?![0-9;])/g, (_, n) =>
      String.fromCharCode(parseInt(n, 10)),
    );
    iterations++;
  } while (prev !== x && iterations < MAX_ITERATIONS);
  return x;
}

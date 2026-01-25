/**
 * Decode HTML entities for album title fields only.
 * Used so emitted JSON (metadata.albumTitle, children titles, index.json)
 * contains readable plain text (e.g. Nässlan not N&auml;sslan).
 * Do not use for description, summary, or path components.
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
 * @param str - Input string (title field only)
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

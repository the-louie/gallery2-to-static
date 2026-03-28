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
 * Convert a numeric codepoint to a character if it falls within safe Unicode
 * ranges. Returns the original entity text unchanged for control characters,
 * lone surrogates, noncharacters, and out-of-range values.
 */
function safeFromCodePoint(codepoint: number, original: string): string {
  if (
    !Number.isFinite(codepoint) ||
    codepoint < 0 ||
    codepoint > 0x10ffff ||
    // C0 controls (except tab, LF, CR)
    codepoint <= 0x08 ||
    (codepoint >= 0x0b && codepoint <= 0x0c) ||
    (codepoint >= 0x0e && codepoint <= 0x1f) ||
    // DEL + C1 controls
    (codepoint >= 0x7f && codepoint <= 0x9f) ||
    // Surrogate pairs (invalid in isolation)
    (codepoint >= 0xd800 && codepoint <= 0xdfff) ||
    // Unicode noncharacters
    (codepoint >= 0xfdd0 && codepoint <= 0xfdef) ||
    (codepoint & 0xfffe) === 0xfffe
  ) {
    return original;
  }
  return String.fromCodePoint(codepoint);
}

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
    x = x.replace(/&#(\d+);/g, (match, n) =>
      safeFromCodePoint(parseInt(n, 10), match),
    );
    x = x.replace(/&#x([0-9a-fA-F]+);/g, (match, n) =>
      safeFromCodePoint(parseInt(n, 16), match),
    );
    // Numeric entities without trailing semicolon (e.g. &#039 at end of string)
    x = x.replace(/&#(\d+)(?![0-9;])/g, (match, n) =>
      safeFromCodePoint(parseInt(n, 10), match),
    );
    iterations++;
  } while (prev !== x && iterations < MAX_ITERATIONS);
  return x;
}

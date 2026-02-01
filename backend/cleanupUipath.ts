/**
 * Legacy URL path cleanup (matches Python extract.py).
 *
 * - decode: ASCII-friendly normalization via unidecode.
 * - cleanup_uipathcomponent: strip markup, unescape HTML, replace illegal chars, normalize.
 * - URL path segments use ASCII a/a/o for Nordic (å→a, ä→a, ö→o); all path construction must go through cleanup_uipathcomponent.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const unidecode = require('unidecode') as (s: string) => string;

const RE_ILLEGAL = /[\[\]\\\/\?%:|"\'><#\s&]/gi;
const RE_MARKUP = /\[.*?\]/g;

/** Nordic HTML named entities → ASCII for URL path. Applied before illegal-char replacement so & is not turned into _. Includes optional trailing semicolon and bare entity (e.g. &ouml without ;). */
const NORDIC_ENTITY_TO_ASCII: [RegExp, string][] = [
  [/&ouml;/gi, 'o'],
  [/&auml;/gi, 'a'],
  [/&aring;/gi, 'a'],
  [/&ouml(?!;)/gi, 'o'],
  [/&auml(?!;)/gi, 'a'],
  [/&aring(?!;)/gi, 'a'],
];
/** Unicode Nordic chars → ASCII for URL path. Applied at end so path never contains å, ä, ö. */
const NORDIC_UNICODE_TO_ASCII: [string, string][] = [
  ['å', 'a'],
  ['ä', 'a'],
  ['ö', 'o'],
  ['Å', 'a'],
  ['Ä', 'a'],
  ['Ö', 'o'],
];

/**
 * Decode: normalize to ASCII-friendly string (matches Python unidecode + iso-8859-15 intent).
 * Returns '' for null/undefined.
 */
export function decode(text: string | null | undefined): string {
  if (text == null) return '';
  return unidecode(String(text));
}

/**
 * Unescape HTML entities until stable (matches Python HTMLParser.unescape loop).
 */
function unescapeHtml(x: string): string {
  const entities: [RegExp, string][] = [
    [/&amp;/gi, '&'],
    [/&lt;/gi, '<'],
    [/&gt;/gi, '>'],
    [/&quot;/gi, '"'],
    [/&#39;/gi, "'"],
  ];
  let prev = '';
  while (prev !== x) {
    prev = x;
    for (const [re, rep] of entities) {
      re.lastIndex = 0;
      x = x.replace(re, rep);
    }
    x = x.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
    x = x.replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );
  }
  return x;
}

/**
 * Normalize Nordic characters to ASCII for URL path segments only.
 * Replaces HTML named entities (&ouml;, &auml;, &aring; and uppercase) and Unicode å, ä, ö (Å, Ä, Ö) with o, a, a.
 * Use so path output never contains entity names (e.g. ouml;) or Unicode Nordic in URLs.
 */
function normalizeNordicForPath(s: string): string {
  if (s.length === 0) return s;
  let x = s;
  for (const [re, rep] of NORDIC_ENTITY_TO_ASCII) {
    re.lastIndex = 0;
    x = x.replace(re, rep);
  }
  for (const [char, rep] of NORDIC_UNICODE_TO_ASCII) {
    x = x.split(char).join(rep);
  }
  return x;
}

/**
 * Normalize pathcomponent for use in thumb/link filenames (getThumbTarget, getLinkTarget).
 * Uses last path segment and applies cleanup_uipathcomponent so output matches on-disk
 * filenames produced by extract.py (spaces → _, etc).
 */
export function normalizePathcomponentForFilename(
    pathcomponent: string | null | undefined,
): string {
    if (pathcomponent == null) return '';
    const lastSegment = pathcomponent.split('/').pop() ?? '';
    return cleanup_uipathcomponent(lastSegment);
}

/**
 * Clean up directory/file names for URLs (matches Python cleanup_uipathcomponent).
 * Steps: replace \0 → decode → strip [.*?] → unescape HTML → Nordic norm → replace illegal chars → __→_, _-_→- → decode().lower() → Nordic norm.
 * URL path segments must go through this (and thus Nordic normalization); do not build paths from raw title/pathComponent elsewhere.
 */
export function cleanup_uipathcomponent(input: string | null | undefined): string {
  if (input == null) return '';
  let x = String(input).replace(/\0/g, '');
  x = decode(x);
  RE_MARKUP.lastIndex = 0;
  x = x.replace(RE_MARKUP, '');
  x = unescapeHtml(x);
  x = normalizeNordicForPath(x);
  RE_ILLEGAL.lastIndex = 0;
  x = x.replace(RE_ILLEGAL, '_');
  x = x.replace(/__/g, '_').replace(/_-_/g, '-');
  x = decode(x).toLowerCase();
  x = normalizeNordicForPath(x);
  return x;
}

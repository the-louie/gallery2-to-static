/**
 * Legacy URL path cleanup (matches Python extract.py).
 *
 * - decode: ASCII-friendly normalization via unidecode.
 * - cleanup_uipathcomponent: strip markup, unescape HTML, replace illegal chars, normalize.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const unidecode = require('unidecode') as (s: string) => string;

const RE_ILLEGAL = /[\[\]\\\/\?%:|"\'><#\s&]/gi;
const RE_MARKUP = /\[.*?\]/g;

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
 * Clean up directory/file names for URLs (matches Python cleanup_uipathcomponent).
 * Steps: replace \0 → decode → strip [.*?] → unescape HTML loop → replace illegal chars → __→_, _-_→- → decode().lower().
 */
export function cleanup_uipathcomponent(input: string | null | undefined): string {
  if (input == null) return '';
  let x = String(input).replace(/\0/g, '');
  x = decode(x);
  RE_MARKUP.lastIndex = 0;
  x = x.replace(RE_MARKUP, '');
  x = unescapeHtml(x);
  RE_ILLEGAL.lastIndex = 0;
  x = x.replace(RE_ILLEGAL, '_');
  x = x.replace(/__/g, '_').replace(/_-_/g, '-');
  return decode(x).toLowerCase();
}

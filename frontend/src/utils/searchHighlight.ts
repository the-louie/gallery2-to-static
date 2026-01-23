/**
 * Search highlight utility
 *
 * Provides functionality to highlight search terms in text using subsequence matching.
 * Characters in the query must appear in order but not necessarily adjacent.
 *
 * ## Usage
 *
 * ```typescript
 * import { highlightText } from './utils/searchHighlight';
 *
 * const highlighted = highlightText('FreeBSD', 'fbsd');
 * // Returns: highlighted parts for 'f', 'b', 's', 'd' characters
 * ```
 */

import { matchSubsequence } from './searchUtils';

/**
 * Escape HTML special characters to prevent XSS
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Highlight search terms in text using subsequence matching
 *
 * Returns an array of strings and objects representing the text with
 * highlighted portions. Highlighted portions are marked with objects
 * containing the text and a highlight flag. Each matched character
 * is highlighted individually.
 *
 * @param text - Text to highlight
 * @param query - Search query to highlight (matched as subsequence)
 * @returns Array of strings and highlight objects
 *
 * @example
 * ```typescript
 * const result = highlightText('FreeBSD', 'fbsd');
 * // Returns: [
 * //   { text: 'F', highlight: true },
 * //   'ree',
 * //   { text: 'B', highlight: true },
 * //   { text: 'S', highlight: true },
 * //   { text: 'D', highlight: true }
 * // ]
 * ```
 */
export function highlightText(
  text: string,
  query: string,
): Array<string | { text: string; highlight: boolean }> {
  if (!text || text.length === 0) {
    return [];
  }

  if (!query || query.trim().length === 0) {
    return [text];
  }

  // Use subsequence matching to find matched characters
  const match = matchSubsequence(text, query);
  if (!match.matched || match.matchIndices.length === 0) {
    return [text];
  }

  const parts: Array<string | { text: string; highlight: boolean }> = [];
  let lastIndex = 0;

  // Highlight each matched character
  for (const matchIndex of match.matchIndices) {
    // Add text before this match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    // Add highlighted character (preserve original case)
    parts.push({ text: text[matchIndex], highlight: true });

    lastIndex = matchIndex + 1;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Highlight search terms in text and return as HTML string using subsequence matching
 *
 * This version returns an HTML string with highlighted portions wrapped
 * in <mark> tags. Use this when you need to render HTML directly.
 * Each matched character is highlighted individually.
 *
 * @param text - Text to highlight
 * @param query - Search query to highlight (matched as subsequence)
 * @returns HTML string with highlighted portions
 *
 * @example
 * ```typescript
 * const html = highlightTextAsHtml('FreeBSD', 'fbsd');
 * // Returns: '<mark>F</mark>ree<mark>B</mark><mark>S</mark><mark>D</mark>'
 * ```
 */
export function highlightTextAsHtml(text: string, query: string): string {
  if (!text || text.length === 0) {
    return '';
  }

  if (!query || query.trim().length === 0) {
    return escapeHtml(text);
  }

  // Use subsequence matching to find matched characters
  const match = matchSubsequence(text, query);
  if (!match.matched || match.matchIndices.length === 0) {
    return escapeHtml(text);
  }

  const parts: string[] = [];
  let lastIndex = 0;

  // Highlight each matched character
  for (const matchIndex of match.matchIndices) {
    // Add escaped text before this match
    if (matchIndex > lastIndex) {
      parts.push(escapeHtml(text.substring(lastIndex, matchIndex)));
    }

    // Add highlighted character (preserve original case, escape HTML)
    parts.push(`<mark>${escapeHtml(text[matchIndex])}</mark>`);

    lastIndex = matchIndex + 1;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.substring(lastIndex)));
  }

  return parts.length > 0 ? parts.join('') : escapeHtml(text);
}

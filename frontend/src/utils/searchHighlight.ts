/**
 * Search highlight utility
 *
 * Provides functionality to highlight search terms in text.
 *
 * ## Usage
 *
 * ```typescript
 * import { highlightText } from './utils/searchHighlight';
 *
 * const highlighted = highlightText('Vacation photos', 'vacation');
 * // Returns: ['Vacation', ' photos'] with highlight markers
 * ```
 */

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
 * Highlight search terms in text
 *
 * Returns an array of strings and objects representing the text with
 * highlighted portions. Highlighted portions are marked with objects
 * containing the text and a highlight flag.
 *
 * @param text - Text to highlight
 * @param query - Search query to highlight
 * @returns Array of strings and highlight objects
 *
 * @example
 * ```typescript
 * const result = highlightText('Vacation photos', 'vacation');
 * // Returns: [
 * //   { text: 'Vacation', highlight: true },
 * //   ' photos'
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

  const normalizedQuery = query.trim().toLowerCase();
  const textLower = text.toLowerCase();
  const parts: Array<string | { text: string; highlight: boolean }> = [];
  let lastIndex = 0;

  // Find all matches (case-insensitive)
  let matchIndex = textLower.indexOf(normalizedQuery, lastIndex);
  while (matchIndex !== -1) {
    // Add text before match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    // Add highlighted match (preserve original case)
    const matchText = text.substring(
      matchIndex,
      matchIndex + normalizedQuery.length,
    );
    parts.push({ text: matchText, highlight: true });

    lastIndex = matchIndex + normalizedQuery.length;
    matchIndex = textLower.indexOf(normalizedQuery, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Highlight search terms in text and return as HTML string
 *
 * This version returns an HTML string with highlighted portions wrapped
 * in <mark> tags. Use this when you need to render HTML directly.
 *
 * @param text - Text to highlight
 * @param query - Search query to highlight
 * @returns HTML string with highlighted portions
 *
 * @example
 * ```typescript
 * const html = highlightTextAsHtml('Vacation photos', 'vacation');
 * // Returns: '<mark>Vacation</mark> photos'
 * ```
 */
export function highlightTextAsHtml(text: string, query: string): string {
  if (!text || text.length === 0) {
    return '';
  }

  if (!query || query.trim().length === 0) {
    return escapeHtml(text);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const textLower = text.toLowerCase();
  const parts: string[] = [];
  let lastIndex = 0;

  // Find all matches (case-insensitive)
  let matchIndex = textLower.indexOf(normalizedQuery, lastIndex);
  while (matchIndex !== -1) {
    // Add escaped text before match
    if (matchIndex > lastIndex) {
      parts.push(escapeHtml(text.substring(lastIndex, matchIndex)));
    }

    // Add highlighted match (preserve original case, escape HTML)
    const matchText = text.substring(
      matchIndex,
      matchIndex + normalizedQuery.length,
    );
    parts.push(`<mark>${escapeHtml(matchText)}</mark>`);

    lastIndex = matchIndex + normalizedQuery.length;
    matchIndex = textLower.indexOf(normalizedQuery, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.substring(lastIndex)));
  }

  return parts.length > 0 ? parts.join('') : escapeHtml(text);
}

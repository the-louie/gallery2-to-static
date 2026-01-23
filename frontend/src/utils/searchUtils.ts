/**
 * Search utility functions for subsequence matching
 *
 * Provides subsequence matching (fuzzy filtering) that allows searching for
 * characters that appear in order but not necessarily adjacent.
 *
 * ## Usage
 *
 * ```typescript
 * import { matchSubsequence, calculateSubsequenceScore } from './utils/searchUtils';
 *
 * const match = matchSubsequence('FreeBSD', 'fbsd');
 * // Returns: { matched: true, matchIndices: [0, 4, 5, 6] }
 *
 * const score = calculateSubsequenceScore('FreeBSD', 'fbsd', [0, 4, 5, 6]);
 * // Returns: relevance score
 * ```
 */

/**
 * Result of subsequence matching
 */
export interface SubsequenceMatch {
  /** Whether the query matches as a subsequence */
  matched: boolean;
  /** Indices of matched characters in the text */
  matchIndices: number[];
}

/**
 * Escape special regex characters in a string
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match a query as a subsequence in text using lazy regex
 *
 * Converts the query to a lazy regex pattern (e.g., "fbsd" becomes "f.*?b.*?s.*?d")
 * and finds the first match, returning the indices of matched characters.
 *
 * @param text - Text to search in
 * @param query - Query to match as subsequence
 * @returns Match result with matched flag and character indices
 *
 * @example
 * ```typescript
 * const match = matchSubsequence('FreeBSD', 'fbsd');
 * // Returns: { matched: true, matchIndices: [0, 4, 5, 6] }
 * ```
 */
export function matchSubsequence(
  text: string,
  query: string,
): SubsequenceMatch {
  // Handle edge cases
  if (!text || text.length === 0) {
    return { matched: false, matchIndices: [] };
  }

  if (!query || query.trim().length === 0) {
    return { matched: false, matchIndices: [] };
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length > text.length) {
    return { matched: false, matchIndices: [] };
  }

  // Convert query to lazy regex pattern
  // Escape special regex characters and join with .*? (lazy match)
  const escapedChars = trimmedQuery
    .split('')
    .map(char => escapeRegex(char))
    .join('.*?');
  const regexPattern = new RegExp(escapedChars, 'i'); // Case-insensitive

  // Find match
  const match = text.match(regexPattern);
  if (!match || match.index === undefined || !match[0]) {
    return { matched: false, matchIndices: [] };
  }

  // Find indices of matched characters within the matched span
  // Constrain search to the matched span to ensure correctness
  const matchIndices: number[] = [];
  const textLower = text.toLowerCase();
  const queryLower = trimmedQuery.toLowerCase();
  const matchStart = match.index;
  const matchEnd = matchStart + match[0].length;
  let textIndex = matchStart;
  let queryIndex = 0;

  // Find each character from query in order, within the matched span
  while (queryIndex < queryLower.length && textIndex < matchEnd) {
    if (textLower[textIndex] === queryLower[queryIndex]) {
      matchIndices.push(textIndex);
      queryIndex++;
    }
    textIndex++;
  }

  // If we didn't find all characters, it's not a valid match
  if (queryIndex < queryLower.length) {
    return { matched: false, matchIndices: [] };
  }

  return { matched: true, matchIndices };
}

/**
 * Calculate relevance score for a subsequence match
 *
 * Scoring considers:
 * - Base score for subsequence match
 * - Bonus for shorter character distances (tighter matches)
 * - Bonus for matches at start of text
 * - Penalty for very long distances
 *
 * @param text - Text that was matched
 * @param query - Query that matched
 * @param matchIndices - Indices of matched characters
 * @returns Relevance score (higher = more relevant)
 *
 * @example
 * ```typescript
 * const score = calculateSubsequenceScore('FreeBSD', 'fbsd', [0, 4, 5, 6]);
 * // Returns: score based on character proximity
 * ```
 */
export function calculateSubsequenceScore(
  text: string,
  query: string,
  matchIndices: number[],
): number {
  if (!matchIndices || matchIndices.length === 0) {
    return 0;
  }

  if (matchIndices.length !== query.trim().length) {
    return 0;
  }

  // Base score for subsequence match
  let score = 5;

  // Calculate average character distance
  let totalDistance = 0;
  for (let i = 1; i < matchIndices.length; i++) {
    totalDistance += matchIndices[i] - matchIndices[i - 1] - 1;
  }
  const avgDistance =
    matchIndices.length > 1 ? totalDistance / (matchIndices.length - 1) : 0;

  // Bonus for tighter matches (shorter distances)
  // Perfect match (adjacent characters) gets maximum bonus
  if (avgDistance === 0) {
    score += 10; // Exact substring match
  } else if (avgDistance <= 1) {
    score += 7; // Very close characters
  } else if (avgDistance <= 2) {
    score += 4; // Close characters
  } else if (avgDistance <= 5) {
    score += 2; // Moderate distance
  }
  // No bonus for avgDistance > 5

  // Penalty for very long distances
  if (avgDistance > 10) {
    score -= 2;
  }

  // Bonus for match at start of text
  if (matchIndices[0] === 0) {
    score += 3;
  } else if (matchIndices[0] <= 2) {
    score += 1;
  }

  // Bonus for shorter query (more specific)
  const queryLength = query.trim().length;
  if (queryLength >= 4) {
    score += 1;
  }

  return Math.max(0, score); // Ensure non-negative
}

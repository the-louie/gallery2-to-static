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
 * Maximum query length for subsequence search. Longer queries return no match.
 * The SearchBar input enforces the same limit (maxLength).
 */
export const MAX_SEARCH_QUERY_LENGTH = 32;

/**
 * Match a query as a subsequence in text (case-insensitive)
 *
 * Linear two-pointer scan: each query character is matched at its earliest position after the
 * previous one. This gives the same indices as the lazy regex `f.*?b.*?s.*?d` it replaces, without
 * that regex's catastrophic backtracking on non-matching input (SEC-13: a 12-character query could
 * block the tab for seconds per description).
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

  if (trimmedQuery.length > MAX_SEARCH_QUERY_LENGTH) {
    return { matched: false, matchIndices: [] };
  }

  const textLower = text.toLowerCase();
  const queryLower = trimmedQuery.toLowerCase();
  const matchIndices: number[] = [];
  let queryIndex = 0;
  for (let textIndex = 0; textIndex < textLower.length && queryIndex < queryLower.length; textIndex++) {
    if (textLower[textIndex] === queryLower[queryIndex]) {
      matchIndices.push(textIndex);
      queryIndex++;
    }
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
  _text: string,
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

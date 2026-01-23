import { describe, it, expect } from 'vitest';
import {
  matchSubsequence,
  calculateSubsequenceScore,
} from './searchUtils';

describe('searchUtils', () => {
  describe('matchSubsequence', () => {
    it('returns no match for empty text', () => {
      const result = matchSubsequence('', 'query');
      expect(result.matched).toBe(false);
      expect(result.matchIndices).toEqual([]);
    });

    it('returns no match for empty query', () => {
      const result = matchSubsequence('text', '');
      expect(result.matched).toBe(false);
      expect(result.matchIndices).toEqual([]);
    });

    it('returns no match for whitespace-only query', () => {
      const result = matchSubsequence('text', '   ');
      expect(result.matched).toBe(false);
      expect(result.matchIndices).toEqual([]);
    });

    it('returns no match when query is longer than text', () => {
      const result = matchSubsequence('abc', 'abcd');
      expect(result.matched).toBe(false);
      expect(result.matchIndices).toEqual([]);
    });

    it('matches exact substring (adjacent characters)', () => {
      const result = matchSubsequence('FreeBSD', 'Free');
      expect(result.matched).toBe(true);
      expect(result.matchIndices).toEqual([0, 1, 2, 3]);
    });

    it('matches subsequence (non-adjacent characters)', () => {
      const result = matchSubsequence('FreeBSD', 'fbsd');
      expect(result.matched).toBe(true);
      expect(result.matchIndices.length).toBe(4);
      expect(result.matchIndices[0]).toBe(0); // 'F'
      expect(result.matchIndices[1]).toBe(4); // 'B'
      expect(result.matchIndices[2]).toBe(5); // 'S'
      expect(result.matchIndices[3]).toBe(6); // 'D'
    });

    it('performs case-insensitive matching', () => {
      const result = matchSubsequence('FreeBSD', 'FBSD');
      expect(result.matched).toBe(true);
      expect(result.matchIndices.length).toBe(4);
    });

    it('matches single character query', () => {
      const result = matchSubsequence('FreeBSD', 'f');
      expect(result.matched).toBe(true);
      expect(result.matchIndices).toEqual([0]);
    });

    it('returns no match when characters are not in order', () => {
      const result = matchSubsequence('FreeBSD', 'dsbf');
      expect(result.matched).toBe(false);
    });

    it('handles special regex characters in query', () => {
      const result = matchSubsequence('test.test', 't.t');
      expect(result.matched).toBe(true);
    });

    it('handles unicode characters', () => {
      const result = matchSubsequence('café', 'cfe');
      expect(result.matched).toBe(true);
    });

    it('finds first match when multiple matches possible', () => {
      const result = matchSubsequence('test test', 'tt');
      expect(result.matched).toBe(true);
      // Should match first 't' and second 't' in first word
      expect(result.matchIndices[0]).toBe(0);
      expect(result.matchIndices[1]).toBe(3);
    });
  });

  describe('calculateSubsequenceScore', () => {
    it('returns 0 for empty match indices', () => {
      const score = calculateSubsequenceScore('text', 'query', []);
      expect(score).toBe(0);
    });

    it('returns 0 when indices length does not match query length', () => {
      const score = calculateSubsequenceScore('text', 'query', [0, 1]);
      expect(score).toBe(0);
    });

    it('gives high score for exact substring match', () => {
      const score = calculateSubsequenceScore('FreeBSD', 'Free', [0, 1, 2, 3]);
      expect(score).toBeGreaterThan(15); // Base 5 + exact match bonus 10 + start bonus 3
    });

    it('gives higher score for tighter matches', () => {
      const tightScore = calculateSubsequenceScore('FreeBSD', 'fbsd', [0, 4, 5, 6]);
      const looseScore = calculateSubsequenceScore('FreeBSD', 'fbsd', [0, 10, 20, 30]);
      expect(tightScore).toBeGreaterThan(looseScore);
    });

    it('gives bonus for match at start of text', () => {
      const startScore = calculateSubsequenceScore('FreeBSD', 'fbsd', [0, 4, 5, 6]);
      const middleScore = calculateSubsequenceScore('FreeBSD', 'bsd', [4, 5, 6]);
      expect(startScore).toBeGreaterThan(middleScore);
    });

    it('gives penalty for very long distances', () => {
      const longDistanceScore = calculateSubsequenceScore(
        'a' + 'x'.repeat(20) + 'b',
        'ab',
        [0, 21],
      );
      expect(longDistanceScore).toBeLessThan(10);
    });

    it('returns non-negative score', () => {
      const score = calculateSubsequenceScore('text', 'query', [0, 1, 2, 3, 4]);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });
});

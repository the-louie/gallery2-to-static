import { describe, it, expect } from 'vitest';
import { highlightText, highlightTextAsHtml } from './searchHighlight';

describe('searchHighlight', () => {
  describe('highlightText', () => {
    it('returns empty array for empty text', () => {
      const result = highlightText('', 'query');
      expect(result).toEqual([]);
    });

    it('returns text as-is for empty query', () => {
      const result = highlightText('Test text', '');
      expect(result).toEqual(['Test text']);
    });

    it('returns text as-is for whitespace-only query', () => {
      const result = highlightText('Test text', '   ');
      expect(result).toEqual(['Test text']);
    });

    it('highlights matching text in simple case (exact match)', () => {
      const result = highlightText('Vacation photos', 'vacation');
      expect(result.length).toBeGreaterThan(0);
      // Should highlight all characters of 'vacation'
      const highlights = result.filter(
        part => typeof part !== 'string' && part.highlight,
      );
      expect(highlights.length).toBeGreaterThan(0);
    });

    it('highlights subsequence matches', () => {
      const result = highlightText('FreeBSD', 'fbsd');
      expect(result.length).toBeGreaterThan(0);
      // Should highlight 'F', 'B', 'S', 'D' individually
      const highlights = result.filter(
        part => typeof part !== 'string' && part.highlight,
      );
      expect(highlights.length).toBe(4);
    });

    it('performs case-insensitive matching', () => {
      const result = highlightText('Vacation photos', 'VACATION');
      expect(result[0]).toEqual({ text: 'Vacation', highlight: true });
    });

    it('preserves original case in highlighted text', () => {
      const result = highlightText('Vacation Photos', 'vacation');
      expect(result[0]).toEqual({ text: 'Vacation', highlight: true });
    });

    it('highlights subsequence in multiple word text', () => {
      const result = highlightText('test test test', 'tt');
      expect(result.length).toBeGreaterThan(0);
      // Should highlight 't' characters that match subsequence
      const highlights = result.filter(
        part => typeof part !== 'string' && part.highlight,
      );
      expect(highlights.length).toBeGreaterThan(0);
    });

    it('handles text with no matches', () => {
      const result = highlightText('No matches here', 'xyz');
      expect(result).toEqual(['No matches here']);
    });

    it('handles query at start of text', () => {
      const result = highlightText('test text', 'test');
      const firstPart = result[0];
      expect(typeof firstPart !== 'string' && firstPart.highlight).toBe(true);
    });

    it('handles subsequence match at start', () => {
      const result = highlightText('FreeBSD', 'fbsd');
      const firstPart = result[0];
      expect(typeof firstPart !== 'string' && firstPart.highlight).toBe(true);
      expect(typeof firstPart !== 'string' && firstPart.text).toBe('F');
    });
  });

  describe('highlightTextAsHtml', () => {
    it('returns empty string for empty text', () => {
      const result = highlightTextAsHtml('', 'query');
      expect(result).toBe('');
    });

    it('returns escaped text for empty query', () => {
      const result = highlightTextAsHtml('Test text', '');
      expect(result).toBe('Test text');
    });

    it('highlights matching text with HTML (exact match)', () => {
      const result = highlightTextAsHtml('Vacation photos', 'vacation');
      expect(result).toContain('<mark>');
      expect(result).toContain(' photos');
    });

    it('highlights subsequence matches with HTML', () => {
      const result = highlightTextAsHtml('FreeBSD', 'fbsd');
      expect(result).toContain('<mark>F</mark>');
      expect(result).toContain('<mark>B</mark>');
      expect(result).toContain('<mark>S</mark>');
      expect(result).toContain('<mark>D</mark>');
    });

    it('escapes HTML in text', () => {
      const result = highlightTextAsHtml('<script>alert("xss")</script>', 'script');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('escapes HTML in highlighted text', () => {
      const result = highlightTextAsHtml('Test <b>bold</b> text', 'bold');
      expect(result).toContain('&lt;b&gt;');
      expect(result).not.toContain('<b>');
    });

    it('handles subsequence matches in multiple words', () => {
      const result = highlightTextAsHtml('test test test', 'tt');
      const matchCount = (result.match(/<mark>/g) || []).length;
      expect(matchCount).toBeGreaterThan(0);
    });
  });
});

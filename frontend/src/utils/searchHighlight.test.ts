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

    it('highlights matching text in simple case', () => {
      const result = highlightText('Vacation photos', 'vacation');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ text: 'Vacation', highlight: true });
      expect(result[1]).toBe(' photos');
    });

    it('performs case-insensitive matching', () => {
      const result = highlightText('Vacation photos', 'VACATION');
      expect(result[0]).toEqual({ text: 'Vacation', highlight: true });
    });

    it('preserves original case in highlighted text', () => {
      const result = highlightText('Vacation Photos', 'vacation');
      expect(result[0]).toEqual({ text: 'Vacation', highlight: true });
    });

    it('highlights multiple matches', () => {
      const result = highlightText('test test test', 'test');
      expect(result.length).toBeGreaterThan(1);
      const highlights = result.filter(
        part => typeof part !== 'string' && part.highlight,
      );
      expect(highlights.length).toBe(3);
    });

    it('handles text with no matches', () => {
      const result = highlightText('No matches here', 'xyz');
      expect(result).toEqual(['No matches here']);
    });

    it('handles query at start of text', () => {
      const result = highlightText('test text', 'test');
      expect(result[0]).toEqual({ text: 'test', highlight: true });
    });

    it('handles query at end of text', () => {
      const result = highlightText('some text', 'text');
      const lastPart = result[result.length - 1];
      expect(lastPart).toEqual({ text: 'text', highlight: true });
    });

    it('handles query in middle of text', () => {
      const result = highlightText('start middle end', 'middle');
      expect(result.some(part => 
        typeof part !== 'string' && part.text === 'middle' && part.highlight
      )).toBe(true);
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

    it('highlights matching text with HTML', () => {
      const result = highlightTextAsHtml('Vacation photos', 'vacation');
      expect(result).toContain('<mark>Vacation</mark>');
      expect(result).toContain(' photos');
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

    it('handles multiple matches', () => {
      const result = highlightTextAsHtml('test test test', 'test');
      const matchCount = (result.match(/<mark>/g) || []).length;
      expect(matchCount).toBe(3);
    });
  });
});

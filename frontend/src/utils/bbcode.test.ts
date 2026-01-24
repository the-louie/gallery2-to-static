/**
 * Tests for BBCode parsing utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  parseBBCode,
  parseBBCodeDecoded,
  clearBBCodeCache,
  getBBCodeCacheStats,
  extractUrlFromBBCode,
} from './bbcode';

describe('parseBBCode', () => {
  beforeEach(() => {
    clearBBCodeCache();
  });

  describe('Basic tag parsing', () => {
    it('parses bold tag [b]text[/b]', () => {
      const result = parseBBCode('[b]Bold text[/b]');
      const { container } = render(<>{result}</>);
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('Bold text');
    });

    it('parses italic tag [i]text[/i]', () => {
      const result = parseBBCode('[i]Italic text[/i]');
      const { container } = render(<>{result}</>);
      const em = container.querySelector('em');
      expect(em).toBeInTheDocument();
      expect(em?.textContent).toBe('Italic text');
    });

    it('parses underline tag [u]text[/u]', () => {
      const result = parseBBCode('[u]Underline text[/u]');
      const { container } = render(<>{result}</>);
      const u = container.querySelector('u');
      expect(u).toBeInTheDocument();
      expect(u?.textContent).toBe('Underline text');
    });

    it('parses strikethrough tag [s]text[/s]', () => {
      const result = parseBBCode('[s]Strikethrough text[/s]');
      const { container } = render(<>{result}</>);
      const s = container.querySelector('s');
      expect(s).toBeInTheDocument();
      expect(s?.textContent).toBe('Strikethrough text');
    });

    it('parses color tag [color=red]text[/color]', () => {
      const result = parseBBCode('[color=red]Red text[/color]');
      const { container } = render(<>{result}</>);
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span?.textContent).toBe('Red text');
      expect(span?.style.color).toBe('red');
    });

    it('parses size tag [size=12]text[/size]', () => {
      const result = parseBBCode('[size=12]Large text[/size]');
      const { container } = render(<>{result}</>);
      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
      expect(span?.textContent).toBe('Large text');
      expect(span?.style.fontSize).toBe('12px');
    });

    it('handles case-insensitive tags [B]text[/B]', () => {
      const result = parseBBCode('[B]Bold text[/B]');
      const { container } = render(<>{result}</>);
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('Bold text');
    });
  });

  describe('Nested tags', () => {
    it('parses nested tags [b][i]text[/i][/b]', () => {
      const result = parseBBCode('[b][i]Bold Italic[/i][/b]');
      const { container } = render(<>{result}</>);
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      const em = strong?.querySelector('em');
      expect(em).toBeInTheDocument();
      expect(em?.textContent).toBe('Bold Italic');
    });

    it('parses multiple nested tags [b][i][u]text[/u][/i][/b]', () => {
      const result = parseBBCode('[b][i][u]Bold Italic Underline[/u][/i][/b]');
      const { container } = render(<>{result}</>);
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      const em = strong?.querySelector('em');
      expect(em).toBeInTheDocument();
      const u = em?.querySelector('u');
      expect(u).toBeInTheDocument();
      expect(u?.textContent).toBe('Bold Italic Underline');
    });
  });

  describe('Edge cases', () => {
    it('handles unclosed tags gracefully [b]text', () => {
      const result = parseBBCode('[b]Unclosed text');
      const { container } = render(<>{result}</>);
      // Should render as plain text (tag is ignored)
      expect(container.textContent).toContain('[b]Unclosed text');
    });

    it('handles literal brackets [[b]]', () => {
      const result = parseBBCode('[[b]]');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('[b]');
      // Should not have any strong tags
      const strong = container.querySelector('strong');
      expect(strong).not.toBeInTheDocument();
    });

    it('handles literal brackets in text text [[b]] text', () => {
      const result = parseBBCode('text [[b]] text');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('text [b] text');
    });

    it('handles invalid tags [invalid]text[/invalid]', () => {
      const result = parseBBCode('[invalid]text[/invalid]');
      const { container } = render(<>{result}</>);
      // Invalid tags should be ignored
      expect(container.textContent).toContain('[invalid]text[/invalid]');
    });

    it('handles empty tags [b][/b]', () => {
      const result = parseBBCode('[b][/b]');
      const { container } = render(<>{result}</>);
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('');
    });

    it('handles mixed content text [b]bold[/b] text', () => {
      const result = parseBBCode('text [b]bold[/b] text');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('text bold text');
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('bold');
    });

    it('handles multiple tags [b]bold[/b] [i]italic[/i]', () => {
      const result = parseBBCode('[b]bold[/b] [i]italic[/i]');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('bold italic');
      const strong = container.querySelector('strong');
      const em = container.querySelector('em');
      expect(strong).toBeInTheDocument();
      expect(em).toBeInTheDocument();
    });
  });

  describe('Attribute validation', () => {
    it('accepts valid hex color values', () => {
      const result = parseBBCode('[color=#ff0000]Red[/color]');
      const { container } = render(<>{result}</>);
      const span = container.querySelector('span');
      expect(span?.style.color).toBe('rgb(255, 0, 0)'); // Browser converts hex to rgb
    });

    it('accepts valid named colors', () => {
      const result = parseBBCode('[color=blue]Blue[/color]');
      const { container } = render(<>{result}</>);
      const span = container.querySelector('span');
      expect(span?.style.color).toBe('blue');
    });

    it('accepts valid RGB color values', () => {
      const result = parseBBCode('[color=rgb(255, 0, 0)]Red[/color]');
      const { container } = render(<>{result}</>);
      const span = container.querySelector('span');
      expect(span?.style.color).toBe('rgb(255, 0, 0)');
    });

    it('accepts valid RGBA color values', () => {
      const result = parseBBCode('[color=rgba(255, 0, 0, 0.5)]Semi-transparent Red[/color]');
      const { container } = render(<>{result}</>);
      const span = container.querySelector('span');
      expect(span?.style.color).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('rejects invalid color values', () => {
      const result = parseBBCode('[color=invalidcolor]Text[/color]');
      const { container } = render(<>{result}</>);
      // Invalid color should be ignored, tag treated as literal
      expect(container.textContent).toContain('[color=invalidcolor]Text[/color]');
    });

    it('accepts valid size values', () => {
      const result = parseBBCode('[size=24]Large[/size]');
      const { container } = render(<>{result}</>);
      const span = container.querySelector('span');
      expect(span?.style.fontSize).toBe('24px');
    });

    it('rejects invalid size values (non-numeric)', () => {
      const result = parseBBCode('[size=invalid]Text[/size]');
      const { container } = render(<>{result}</>);
      // Invalid size should be ignored
      expect(container.textContent).toContain('[size=invalid]Text[/size]');
    });

    it('rejects size values outside valid range', () => {
      const result = parseBBCode('[size=100]Text[/size]');
      const { container } = render(<>{result}</>);
      // Size > 72 should be rejected
      expect(container.textContent).toContain('[size=100]Text[/size]');
    });
  });

  describe('Security - XSS prevention', () => {
    it('escapes HTML entities in text', () => {
      const result = parseBBCode('[b]<script>alert("xss")</script>[/b]');
      const { container } = render(<>{result}</>);
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      // Script tags should be escaped, not executed
      expect(strong?.textContent).toContain('<script>');
      expect(strong?.textContent).toContain('</script>');
      // Should not have any script elements
      const script = container.querySelector('script');
      expect(script).not.toBeInTheDocument();
    });

    it('prevents script tag injection', () => {
      const result = parseBBCode('<script>alert("xss")</script>');
      const { container } = render(<>{result}</>);
      // Script tags should be escaped
      expect(container.textContent).toContain('<script>');
      const script = container.querySelector('script');
      expect(script).not.toBeInTheDocument();
    });

    it('ignores unknown BBCode tags that could be malicious', () => {
      const result = parseBBCode('[script]alert("xss")[/script]');
      const { container } = render(<>{result}</>);
      // Unknown tags should be treated as literal text
      expect(container.textContent).toContain('[script]alert("xss")[/script]');
      const script = container.querySelector('script');
      expect(script).not.toBeInTheDocument();
    });

    it('sanitizes style attributes', () => {
      const result = parseBBCode('[color=red; javascript:alert("xss")]Text[/color]');
      const { container } = render(<>{result}</>);
      // Invalid color should be rejected
      expect(container.textContent).toContain('[color=red; javascript:alert("xss")]Text[/color]');
    });
  });

  describe('Caching', () => {
    it('caches parsed results', () => {
      const text = '[b]Bold text[/b]';
      parseBBCode(text);
      const stats1 = getBBCodeCacheStats();
      expect(stats1.size).toBe(1);

      // Parse again - should use cache
      parseBBCode(text);
      const stats2 = getBBCodeCacheStats();
      expect(stats2.size).toBe(1); // Cache size should not increase
    });

    it('can disable caching', () => {
      const text = '[b]Bold text[/b]';
      parseBBCode(text, { enableCache: false });
      const stats = getBBCodeCacheStats();
      expect(stats.size).toBe(0);
    });

    it('can clear cache', () => {
      parseBBCode('[b]Bold[/b]');
      expect(getBBCodeCacheStats().size).toBeGreaterThan(0);
      clearBBCodeCache();
      expect(getBBCodeCacheStats().size).toBe(0);
    });
  });

  describe('Empty and null inputs', () => {
    it('handles empty string', () => {
      const result = parseBBCode('');
      expect(result).toBe('');
    });

    it('handles null input', () => {
      const result = parseBBCode(null as unknown as string);
      expect(result).toBe(null);
    });

    it('handles undefined input', () => {
      const result = parseBBCode(undefined as unknown as string);
      expect(result).toBe(undefined);
    });
  });

  describe('Complex scenarios', () => {
    it('handles deeply nested tags', () => {
      const result = parseBBCode('[b][i][u][s]Text[/s][/u][/i][/b]');
      const { container } = render(<>{result}</>);
      expect(container.textContent).toBe('Text');
      const strong = container.querySelector('strong');
      const em = strong?.querySelector('em');
      const u = em?.querySelector('u');
      const s = u?.querySelector('s');
      expect(s).toBeInTheDocument();
    });

    it('handles tags with attributes and nested content', () => {
      const result = parseBBCode('[color=blue][b]Bold Blue[/b][/color]');
      const { container } = render(<>{result}</>);
      const span = container.querySelector('span');
      expect(span?.style.color).toBe('blue');
      const strong = span?.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('Bold Blue');
    });

    it('handles multiple color tags', () => {
      const result = parseBBCode('[color=red]Red[/color] [color=blue]Blue[/color]');
      const { container } = render(<>{result}</>);
      const spans = container.querySelectorAll('span');
      expect(spans.length).toBe(2);
      expect(spans[0]?.style.color).toBe('red');
      expect(spans[1]?.style.color).toBe('blue');
    });
  });
});

describe('extractUrlFromBBCode', () => {
  it('extracts [url=...]...[/url] with label', () => {
    const result = extractUrlFromBBCode('[url=https://example.com]Example[/url]');
    expect(result).not.toBeNull();
    expect(result?.url).toBe('https://example.com');
    expect(result?.label).toBe('Example');
  });

  it('extracts [url=...]...[/url] with http', () => {
    const result = extractUrlFromBBCode('[url=http://site.org]Site[/url]');
    expect(result).not.toBeNull();
    expect(result?.url).toBe('http://site.org');
    expect(result?.label).toBe('Site');
  });

  it('returns first match when multiple [url] tags present', () => {
    const text = 'a [url=https://first.com]First[/url] b [url=https://second.com]Second[/url]';
    const result = extractUrlFromBBCode(text);
    expect(result).not.toBeNull();
    expect(result?.url).toBe('https://first.com');
    expect(result?.label).toBe('First');
  });

  it('returns null when no match', () => {
    expect(extractUrlFromBBCode('no url here')).toBeNull();
    expect(extractUrlFromBBCode('[b]bold[/b]')).toBeNull();
    expect(extractUrlFromBBCode('')).toBeNull();
  });

  it('returns null for invalid URL scheme (javascript:)', () => {
    const result = extractUrlFromBBCode('[url=javascript:alert(1)]Click[/url]');
    expect(result).toBeNull();
  });

  it('returns null for data: URL', () => {
    const result = extractUrlFromBBCode('[url=data:text/html,foo]Data[/url]');
    expect(result).toBeNull();
  });

  it('extracts [url]...[/url] form (URL as content)', () => {
    const result = extractUrlFromBBCode('[url]https://example.com[/url]');
    expect(result).not.toBeNull();
    expect(result?.url).toBe('https://example.com');
    expect(result?.label).toBe('https://example.com');
  });

  it('handles empty or whitespace-only text', () => {
    expect(extractUrlFromBBCode('')).toBeNull();
    expect(extractUrlFromBBCode('   ')).toBeNull();
  });
});

describe('parseBBCodeDecoded', () => {
  beforeEach(() => {
    clearBBCodeCache();
  });

  it('decodes HTML entities then parses BBCode', () => {
    const result = parseBBCodeDecoded('N&auml;sslan');
    const { container } = render(<>{result}</>);
    expect(container.textContent).toBe('Nässlan');
  });

  it('decodes double-encoded entities then parses', () => {
    const result = parseBBCodeDecoded('[b]N&amp;auml;sslan[/b]');
    const { container } = render(<>{result}</>);
    const strong = container.querySelector('strong');
    expect(strong).toBeInTheDocument();
    expect(strong?.textContent).toBe('Nässlan');
  });

  it('handles empty string', () => {
    expect(parseBBCodeDecoded('')).toBe('');
  });

  it('handles null/undefined like parseBBCode', () => {
    expect(parseBBCodeDecoded(null as unknown as string)).toBe(null);
    expect(parseBBCodeDecoded(undefined as unknown as string)).toBe(undefined);
  });
});

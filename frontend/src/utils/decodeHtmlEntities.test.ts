/**
 * Unit tests for decodeHtmlEntities
 */

import { describe, it, expect } from 'vitest';
import { decodeHtmlEntities } from './decodeHtmlEntities';

describe('decodeHtmlEntities', () => {
  it('decodes &auml; → ä, &ouml; → ö, &uuml; → ü', () => {
    expect(decodeHtmlEntities('&auml;')).toBe('ä');
    expect(decodeHtmlEntities('&ouml;')).toBe('ö');
    expect(decodeHtmlEntities('&uuml;')).toBe('ü');
    expect(decodeHtmlEntities('N&auml;sslan')).toBe('Nässlan');
  });

  it('decodes double-encoded &amp;auml; → ä', () => {
    expect(decodeHtmlEntities('&amp;auml;')).toBe('ä');
    expect(decodeHtmlEntities('N&amp;auml;sslan')).toBe('Nässlan');
  });

  it('decodes multiple entities in one string', () => {
    expect(decodeHtmlEntities('&auml;&ouml;&uuml;')).toBe('äöü');
    expect(decodeHtmlEntities('a &amp; b &lt; c')).toBe('a & b < c');
  });

  it('returns empty string for empty input', () => {
    expect(decodeHtmlEntities('')).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(decodeHtmlEntities(null as unknown as string)).toBe('');
    expect(decodeHtmlEntities(undefined as unknown as string)).toBe('');
  });

  it('returns string unchanged when no entities', () => {
    expect(decodeHtmlEntities('Hello World')).toBe('Hello World');
    expect(decodeHtmlEntities('Album 42')).toBe('Album 42');
  });

  it('decodes &#N; decimal numeric entities', () => {
    expect(decodeHtmlEntities('&#228;')).toBe('ä');
    expect(decodeHtmlEntities('&#246;')).toBe('ö');
    expect(decodeHtmlEntities('&#65;')).toBe('A');
  });

  it('decodes &#xN; hex numeric entities', () => {
    expect(decodeHtmlEntities('&#xe4;')).toBe('ä');
    expect(decodeHtmlEntities('&#xE4;')).toBe('ä');
    expect(decodeHtmlEntities('&#x41;')).toBe('A');
  });

  it('decodes &lt;, &gt;, &quot;, &#39;, &amp;', () => {
    expect(decodeHtmlEntities('&lt;')).toBe('<');
    expect(decodeHtmlEntities('&gt;')).toBe('>');
    expect(decodeHtmlEntities('&quot;')).toBe('"');
    expect(decodeHtmlEntities('&#39;')).toBe("'");
    expect(decodeHtmlEntities('&amp;')).toBe('&');
    expect(decodeHtmlEntities('a &amp; b')).toBe('a & b');
  });

  it('decodes &amp;amp; to &', () => {
    expect(decodeHtmlEntities('&amp;amp;')).toBe('&');
  });

  it('decodes &#039; as apostrophe', () => {
    expect(decodeHtmlEntities('&#039;')).toBe("'");
  });

  it('decodes &Auml;, &Ouml;, &Uuml;, &szlig;', () => {
    expect(decodeHtmlEntities('&Auml;')).toBe('Ä');
    expect(decodeHtmlEntities('&Ouml;')).toBe('Ö');
    expect(decodeHtmlEntities('&Uuml;')).toBe('Ü');
    expect(decodeHtmlEntities('&szlig;')).toBe('ß');
  });

  it('handles empty &#; (no digits) as no-op', () => {
    expect(decodeHtmlEntities('&#;')).toBe('&#;');
  });

  it('handles incomplete &#x (no hex) as no-op', () => {
    expect(decodeHtmlEntities('&#x')).toBe('&#x');
  });
});

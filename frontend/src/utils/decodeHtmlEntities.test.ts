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

  it('decodes &#039; and &#39; as apostrophe', () => {
    expect(decodeHtmlEntities('&#039;')).toBe("'");
    expect(decodeHtmlEntities('&#39;')).toBe("'");
  });

  it('decodes DigitalChaos&#039;05 to DigitalChaos\'05', () => {
    expect(decodeHtmlEntities('DigitalChaos&#039;05')).toBe("DigitalChaos'05");
  });

  it('decodes numeric entities without trailing semicolon', () => {
    expect(decodeHtmlEntities('&#039')).toBe("'");
    expect(decodeHtmlEntities('x&#39y')).toBe("x'y");
  });

  it('decodes &Auml;, &Ouml;, &Uuml;, &szlig;', () => {
    expect(decodeHtmlEntities('&Auml;')).toBe('Ä');
    expect(decodeHtmlEntities('&Ouml;')).toBe('Ö');
    expect(decodeHtmlEntities('&Uuml;')).toBe('Ü');
    expect(decodeHtmlEntities('&szlig;')).toBe('ß');
  });

  it('decodes &aring; and &Aring; (Nordic å/Å)', () => {
    expect(decodeHtmlEntities('&aring;')).toBe('å');
    expect(decodeHtmlEntities('&Aring;')).toBe('Å');
    expect(decodeHtmlEntities('G&aring;rd')).toBe('Gård');
  });

  it('decodes Latin accents: &eacute;, &agrave;, &egrave;, &ecirc;, &euml;, &iacute;, &ntilde;', () => {
    expect(decodeHtmlEntities('&eacute;')).toBe('é');
    expect(decodeHtmlEntities('&Eacute;')).toBe('É');
    expect(decodeHtmlEntities('&agrave;')).toBe('à');
    expect(decodeHtmlEntities('&Agrave;')).toBe('À');
    expect(decodeHtmlEntities('&egrave;')).toBe('è');
    expect(decodeHtmlEntities('&ecirc;')).toBe('ê');
    expect(decodeHtmlEntities('&euml;')).toBe('ë');
    expect(decodeHtmlEntities('&iacute;')).toBe('í');
    expect(decodeHtmlEntities('&ntilde;')).toBe('ñ');
    expect(decodeHtmlEntities('&Ntilde;')).toBe('Ñ');
  });

  it('decodes real-world title and name examples', () => {
    expect(decodeHtmlEntities('Daniel Lehn&eacute;r')).toBe('Daniel Lehnér');
    expect(decodeHtmlEntities('Catten &amp; Mamma')).toBe('Catten & Mamma');
  });

  it('decodes &#233; decimal and combined entity-heavy string', () => {
    expect(decodeHtmlEntities('&#233;')).toBe('é');
    expect(
      decodeHtmlEntities('Catten &amp; Mamma &ouml; &eacute; &#233;'),
    ).toBe('Catten & Mamma ö é é');
  });

  it('decodes double-encoded &amp;eacute; to é', () => {
    expect(decodeHtmlEntities('&amp;eacute;')).toBe('é');
  });

  it('handles empty &#; (no digits) as no-op', () => {
    expect(decodeHtmlEntities('&#;')).toBe('&#;');
  });

  it('handles incomplete &#x (no hex) as no-op', () => {
    expect(decodeHtmlEntities('&#x')).toBe('&#x');
  });

  it('decodes triple-encoded &amp;amp;amp; to &', () => {
    expect(decodeHtmlEntities('&amp;amp;amp;')).toBe('&');
    expect(decodeHtmlEntities('&amp;amp;amp;lt;')).toBe('<');
  });

  it('decodes mixed entity types in one string', () => {
    expect(decodeHtmlEntities('&amp; &lt; &gt; &quot; &#39;')).toBe('& < > " \'');
    expect(decodeHtmlEntities('&#65; &amp; &#x42;')).toBe('A & B');
  });

  it('handles malformed entities correctly', () => {
    expect(decodeHtmlEntities('&invalid;')).toBe('&invalid;');
    expect(decodeHtmlEntities('&ampinvalid')).toBe('&ampinvalid');
    expect(decodeHtmlEntities('&#abc;')).toBe('&#abc;');
    expect(decodeHtmlEntities('&#xgh;')).toBe('&#xgh;');
  });

  it('handles very long strings with many entities', () => {
    const longString = '&amp; '.repeat(1000);
    const result = decodeHtmlEntities(longString);
    expect(result).toBe('& '.repeat(1000));
    expect(result.length).toBe(2000);
  });

  it('handles entities at string boundaries', () => {
    expect(decodeHtmlEntities('&amp;test')).toBe('&test');
    expect(decodeHtmlEntities('test&amp;')).toBe('test&');
    expect(decodeHtmlEntities('&amp;test&amp;')).toBe('&test&');
  });
});

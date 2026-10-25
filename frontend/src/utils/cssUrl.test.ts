import { describe, it, expect } from 'vitest';
import { cssUrl } from './cssUrl';

describe('cssUrl (SEC-16)', () => {
  it('wraps a normal URL', () => {
    expect(cssUrl('/g2data/albums/a/b%20c.jpg')).toBe('url("/g2data/albums/a/b%20c.jpg")');
  });

  it('escapes backslash before quote, so \\" cannot close the string', () => {
    expect(cssUrl('/x\\") , url("https://evil.example/y')).toBe('url("/x\\\\\\") , url(\\"https://evil.example/y")');
  });

  it('escapes line breaks', () => {
    expect(cssUrl('/a\nb\rc')).toBe('url("/a\\a b\\d c")');
  });

  it('the browser parses the escaped value back to one url() with the original string', () => {
    const el = document.createElement('div');
    const nasty = '/x\\"); background: red; ("';
    el.style.backgroundImage = cssUrl(nasty);
    expect(el.style.background).not.toContain('red');
  });
});

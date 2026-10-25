import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The document shell matches the 2006 Gallery 2 pages where a static page can (THEME-01 T-12)
describe('index.html', () => {
  const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');

  it('XHTML 1.0 Strict doctype, Content-Type meta, body.gallery, title from VITE_SITE_NAME', () => {
    expect(html).toMatch(/^<!DOCTYPE html PUBLIC "-\/\/W3C\/\/DTD XHTML 1\.0 Strict\/\/EN"/);
    expect(html).toContain('<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />');
    expect(html).toContain('<body class="gallery">');
    expect(html).toContain('<title>%VITE_SITE_NAME%</title>');
    expect(html).toContain('name="viewport"');
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * modern.css restyles the light and dark themes only (Sprint 12 T-11). The classic theme is a 1:1
 * Gallery 2 reproduction, so every rule in the file must be scoped to the two modern themes.
 */
describe('styles/modern.css', () => {
  const css = readFileSync(resolve(__dirname, 'modern.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  // selectors: text before a "{" that is not inside a declaration block
  const selectors: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of css) {
    if (ch === '{') {
      if (depth === 0 || buf.trim().startsWith('@')) selectors.push(buf.trim());
      else if (depth === 1) selectors.push(buf.trim());
      depth++;
      buf = '';
    } else if (ch === '}') {
      depth--;
      buf = '';
    } else if (ch === ';' && depth > 0) {
      buf = '';
    } else {
      buf += ch;
    }
  }
  const rules = selectors.filter((s) => s !== '' && !s.startsWith('@'));

  it('has rules', () => {
    expect(rules.length).toBeGreaterThan(40);
  });

  it('scopes every selector to the light or dark theme, never the classic one', () => {
    for (const sel of rules) {
      // split on commas outside parentheses (":is(a, b)" is one selector)
      for (const part of sel.split(/,(?![^(]*\))/)) {
        const p = part.trim();
        expect(p, p).toMatch(/^(\[data-theme="(light|dark)"\]|:is\(\[data-theme="light"\], \[data-theme="dark"\]\))/);
      }
    }
  });

  it('sets the palette tokens the components consume, in both themes', () => {
    for (const theme of ['light', 'dark']) {
      const block = css.slice(css.indexOf(`[data-theme="${theme}"] {`));
      for (const token of ['--color-text', '--color-background', '--color-border', '--color-focus', '--album-card-bg', '--image-bg', '--font-sans']) {
        expect(block, `${theme} ${token}`).toContain(`${token}:`);
      }
    }
  });
});

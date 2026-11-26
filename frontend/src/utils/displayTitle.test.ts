import { describe, it, expect } from 'vitest';
import { displayTitle } from './displayTitle';

describe('displayTitle (TITLE-01)', () => {
  it('drops a known image extension and turns underscores into spaces', () => {
    expect(displayTitle('Glitched2025_0038.jpg')).toBe('Glitched2025 0038');
    expect(displayTitle('CIMG0053_.JPG')).toBe('CIMG0053');
    expect(displayTitle('foo_bar_baz.PNG')).toBe('foo bar baz');
    expect(displayTitle('holiday.webp')).toBe('holiday');
    expect(displayTitle('a.heic')).toBe('a');
  });

  it('leaves a title without a known extension or underscore unchanged', () => {
    expect(displayTitle('Glitched 2025')).toBe('Glitched 2025');
    expect(displayTitle('DreamHack')).toBe('DreamHack');
  });

  it('only strips a trailing image extension, not a mid-string dot', () => {
    expect(displayTitle('v1.2 final.jpg')).toBe('v1.2 final');
    expect(displayTitle('report.pdf')).toBe('report.pdf'); // not an image extension
  });
});

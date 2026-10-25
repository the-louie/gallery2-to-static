import { describe, it, expect } from 'vitest';
import { jumpRange, parsePage, pageHref, formatG2Date } from './matrixPaging';

describe('jumpRange (Gallery 2 pager, pageWindowSize 6)', () => {
  it('matches the 2006 pages', () => {
    expect(jumpRange(1, 24)).toEqual([1, 2, 3, 4, 5, 6, 24]); // dhphotos: "1 2 3 4 5 6 ... 24"
    expect(jumpRange(1, 4)).toEqual([1, 2, 3, 4]); // main.php: "1 2 3 4"
  });

  it('middle and end pages', () => {
    expect(jumpRange(12, 24)).toEqual([1, 9, 10, 11, 12, 13, 14, 15, 24]);
    expect(jumpRange(24, 24)).toEqual([1, 18, 19, 20, 21, 22, 23, 24]);
    expect(jumpRange(4, 24)).toEqual([1, 2, 3, 4, 5, 6, 24]); // window pinned to page 1
  });

  it('one page and no pages', () => {
    expect(jumpRange(1, 1)).toEqual([1]);
    expect(jumpRange(1, 0)).toEqual([]);
  });
});

describe('parsePage / pageHref', () => {
  it('parses ?page=', () => {
    expect(parsePage(null)).toBe(1);
    expect(parsePage('3')).toBe(3);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('-2')).toBe(1);
    expect(parsePage('2x')).toBe(1);
    expect(parsePage('99999999')).toBe(1);
  });

  it('page 1 has no query', () => {
    expect(pageHref('/a/b/', 1)).toBe('/a/b/');
    expect(pageHref('/a/b/', 2)).toBe('/a/b/?page=2');
  });
});

describe('formatG2Date', () => {
  it('US order in Swedish local time', () => {
    expect(formatG2Date(1133038025)).toBe('11/26/2005'); // Battlefrag.com album
    expect(formatG2Date(1132995297)).toBe('11/26/2005'); // CIMG0053_.JPG, 09:54 in Stockholm
    expect(formatG2Date(1104534000)).toBe('01/01/2005'); // 2004-12-31 23:00 UTC = midnight in Stockholm
  });

  it('empty without a timestamp', () => {
    expect(formatG2Date(null)).toBe('');
    expect(formatG2Date(undefined)).toBe('');
  });
});

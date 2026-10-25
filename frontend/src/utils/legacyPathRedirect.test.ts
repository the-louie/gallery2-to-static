import { describe, it, expect } from 'vitest';
import { legacyUrlToCleanPath } from './legacyPathRedirect';

const at = (pathname: string, search = '', hash = '') => legacyUrlToCleanPath({ pathname, search, hash });

describe('legacyUrlToCleanPath (URL-01, LOGIC-32)', () => {
  it('moves hash URLs to clean paths', () => {
    expect(at('/', '', '#/dreamhack/dreamhack_97/martin_ojes')).toBe('/dreamhack/dreamhack_97/martin_ojes');
    expect(at('/', '', '#/album/7/image/12')).toBe('/album/7/image/12');
    expect(at('/', '', '#/search?q=dh')).toBe('/search?q=dh');
  });

  it('drops an explicit index.html', () => {
    expect(at('/dreamhack/index.html')).toBe('/dreamhack/');
    expect(at('/index.html')).toBe('/');
    expect(at('/a/b/index.htm', '?x=1')).toBe('/a/b/?x=1');
  });

  it('leaves clean URLs alone', () => {
    expect(at('/')).toBeNull();
    expect(at('/dreamhack/dreamhack_97/')).toBeNull();
    expect(at('/dreamhack/dreamhack_summer_08/s%C3%B6ndag', '?page=2')).toBeNull();
    expect(at('/a', '', '#main-content')).toBeNull();
  });
});

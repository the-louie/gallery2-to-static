import { describe, it, expect } from 'vitest';
import { legacyPathToHash } from './legacyPathRedirect';

const at = (pathname: string, search = '', hash = '') => legacyPathToHash({ pathname, search, hash });

describe('legacyPathToHash (LOGIC-32)', () => {
  it('maps old path URLs into the hash', () => {
    expect(at('/dreamhack/dreamhack_97/martin_ojes/')).toBe('/#/dreamhack/dreamhack_97/martin_ojes/');
    expect(at('/badalan/badalan_v1.0/')).toBe('/#/badalan/badalan_v1.0/');
    expect(at('/dreamhack/dreamhack_summer_08/s%C3%B6ndag')).toBe('/#/dreamhack/dreamhack_summer_08/s%C3%B6ndag');
    expect(at('/dreamhack/index.html')).toBe('/#/dreamhack/');
    expect(at('/a/b', '?x=1')).toBe('/#/a/b?x=1');
  });

  it('leaves app URLs and the root alone', () => {
    expect(at('/')).toBeNull();
    expect(at('/index.html')).toBeNull();
    expect(at('/', '', '#/album/7')).toBeNull();
    expect(at('/dreamhack/', '', '#/album/7')).toBeNull();
  });

  it('applied to the real location, HashRouter then sees the album path', () => {
    window.history.replaceState(null, '', '/dreamhack/dreamhack_97/');
    const target = legacyPathToHash(window.location);
    window.history.replaceState(null, '', target!);
    expect(window.location.pathname).toBe('/');
    expect(window.location.hash).toBe('#/dreamhack/dreamhack_97/');
    window.history.replaceState(null, '', '/');
  });
});

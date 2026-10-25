import { describe, it, expect } from 'vitest';
import { getViewKey } from './viewKey';

describe('getViewKey', () => {
  it('drops a trailing /image/<id> so lightbox steps keep the same key', () => {
    expect(getViewKey('/album/7/image/12')).toBe('/album/7');
    expect(getViewKey('/album/7/image/13')).toBe('/album/7');
    expect(getViewKey('/dreamhack/dh97/image/5')).toBe('/dreamhack/dh97');
    expect(getViewKey('/dreamhack/dh97/image/5/')).toBe('/dreamhack/dh97');
  });

  it('opening the lightbox from the album keeps the album key', () => {
    expect(getViewKey('/album/7')).toBe(getViewKey('/album/7/image/1'));
  });

  it('changes when the album changes', () => {
    expect(getViewKey('/album/7/image/1')).not.toBe(getViewKey('/album/8/image/1'));
    expect(getViewKey('/a/b')).not.toBe(getViewKey('/a/c'));
  });

  it('keeps other paths as they are', () => {
    expect(getViewKey('/')).toBe('/');
    expect(getViewKey('/image/5')).toBe('/');
    expect(getViewKey('/search')).toBe('/search');
    expect(getViewKey('/a/image')).toBe('/a/image');
    expect(getViewKey('/a/b/')).toBe('/a/b');
  });
});

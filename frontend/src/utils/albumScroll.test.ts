import { describe, it, expect, vi, afterEach } from 'vitest';
import { rememberAlbumScroll, takeAlbumScroll, isFromAlbumState } from './albumScroll';

describe('albumScroll (LOGIC-17)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('remembers once per album path', () => {
    rememberAlbumScroll('/album/7', 1234.6);
    expect(takeAlbumScroll('/album/8')).toBeNull();
    expect(takeAlbumScroll('/album/7')).toBe(1235);
    expect(takeAlbumScroll('/album/7')).toBeNull();
  });

  it('ignores bad stored values and unavailable storage', () => {
    sessionStorage.setItem('album-scroll:/x', 'abc');
    expect(takeAlbumScroll('/x')).toBeNull();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => rememberAlbumScroll('/y', 10)).not.toThrow();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(takeAlbumScroll('/y')).toBeNull();
  });

  it('recognises the from-album state', () => {
    expect(isFromAlbumState({ fromAlbum: true })).toBe(true);
    expect(isFromAlbumState({ fromAlbum: 'yes' })).toBe(false);
    expect(isFromAlbumState(null)).toBe(false);
  });
});

/**
 * Unit tests for albumPath utilities (path-based album URL building).
 */

import { describe, it, expect } from 'vitest';
import {
  titleToSegment,
  getAlbumPath,
  getImagePath,
  getAlbumPathFromAlbum,
  getChildAlbumPath,
} from './albumPath';
import type { BreadcrumbPath } from '@/types';

describe('albumPath', () => {
  describe('titleToSegment', () => {
    it('returns empty string for null or undefined', () => {
      expect(titleToSegment(null)).toBe('');
      expect(titleToSegment(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
      expect(titleToSegment('')).toBe('');
    });

    it('lowercases and replaces spaces with underscore', () => {
      expect(titleToSegment('Test Album')).toBe('test_album');
      expect(titleToSegment('Photos')).toBe('photos');
      expect(titleToSegment('Backspace 2.0')).toBe('backspace_2_0');
    });

    it('replaces illegal URL chars with underscore', () => {
      expect(titleToSegment('A/B\\C?')).toMatch(/^[a-z0-9_\-]+$/);
    });

    it('normalizes Nordic entities to ASCII', () => {
      expect(titleToSegment('åäö')).toBe('aaa');
      expect(titleToSegment('ÅÄÖ')).toBe('aaa');
    });
  });

  describe('getAlbumPath', () => {
    it('returns "/" for empty or missing breadcrumb', () => {
      expect(getAlbumPath([])).toBe('/');
      expect(getAlbumPath(null as unknown as BreadcrumbPath)).toBe('/');
      expect(getAlbumPath(undefined as unknown as BreadcrumbPath)).toBe('/');
    });

    it('returns last item path when present', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Root', path: '/' },
        { id: 8, title: 'Albums', path: '/albums' },
      ];
      expect(getAlbumPath(path)).toBe('/albums');
    });

    it('returns "/" when last item has no path', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Root', path: '/' },
        { id: 8, title: 'Albums', path: null },
      ];
      expect(getAlbumPath(path)).toBe('/');
    });
  });

  describe('getImagePath', () => {
    it('builds path with album path prefix', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Root', path: '/' },
        { id: 8, title: 'Albums', path: '/albums' },
      ];
      expect(getImagePath(path, 123)).toBe('/albums/image/123');
    });

    it('builds /image/{id} when album path is root', () => {
      expect(getImagePath([], 99)).toBe('/image/99');
      const rootOnly: BreadcrumbPath = [{ id: 7, title: 'Root', path: '/' }];
      expect(getImagePath(rootOnly, 99)).toBe('/image/99');
    });
  });

  describe('getAlbumPathFromAlbum', () => {
    it('returns album.path when set', () => {
      expect(getAlbumPathFromAlbum({ path: '/custom/path', title: 'Ignore' })).toBe('/custom/path');
      expect(getAlbumPathFromAlbum({ path: '/one', title: null })).toBe('/one');
    });

    it('builds path from title when path missing', () => {
      expect(getAlbumPathFromAlbum({ title: 'Test Album' })).toBe('/test_album');
      expect(getAlbumPathFromAlbum({ title: 'Root', path: null })).toBe('/root');
      expect(getAlbumPathFromAlbum({ title: 'Root', path: '' })).toBe('/root');
    });
  });

  describe('getChildAlbumPath', () => {
    it('returns childPath when set', () => {
      const parent: BreadcrumbPath = [{ id: 7, title: 'Root', path: '/' }];
      expect(
        getChildAlbumPath(parent, 'Child', 10, '/emitted/child'),
      ).toBe('/emitted/child');
    });

    it('builds path from parent breadcrumb and child title when childPath missing', () => {
      const parent: BreadcrumbPath = [
        { id: 7, title: 'Root', path: '/' },
        { id: 8, title: 'Parent', path: '/parent' },
      ];
      expect(getChildAlbumPath(parent, 'Child', 10)).toBe('/parent/child');
    });

    it('handles root parent', () => {
      const parent: BreadcrumbPath = [{ id: 7, title: 'Root', path: '/' }];
      expect(getChildAlbumPath(parent, 'First', 1)).toBe('/first');
    });
  });
});

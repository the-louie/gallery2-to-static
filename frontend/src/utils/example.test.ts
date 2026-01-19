import { describe, it, expect } from 'vitest';

/**
 * Example utility function for demonstration
 * This is a simple function to demonstrate unit testing patterns
 */
function formatAlbumTitle(title: string): string {
  if (!title) return 'Untitled Album';
  return title.trim();
}

function getImageUrl(pathComponent: string, isThumbnail = false): string {
  const baseUrl = '/images';
  const prefix = isThumbnail ? '/thumbnails' : '';
  return `${baseUrl}${prefix}/${pathComponent}`;
}

function filterAlbums(items: Array<{ type: string }>): Array<{ type: string }> {
  return items.filter((item) => item.type === 'GalleryAlbumItem');
}

function filterPhotos(items: Array<{ type: string }>): Array<{ type: string }> {
  return items.filter((item) => item.type === 'GalleryPhotoItem');
}

describe('Utility Functions', () => {
  describe('formatAlbumTitle', () => {
    it('returns formatted title for valid input', () => {
      expect(formatAlbumTitle('  My Album  ')).toBe('My Album');
      expect(formatAlbumTitle('Test Album')).toBe('Test Album');
    });

    it('returns "Untitled Album" for empty string', () => {
      expect(formatAlbumTitle('')).toBe('Untitled Album');
    });

    it('handles whitespace-only strings', () => {
      expect(formatAlbumTitle('   ')).toBe('Untitled Album');
    });
  });

  describe('getImageUrl', () => {
    it('generates correct full image URL', () => {
      expect(getImageUrl('album/photo.jpg')).toBe('/images/album/photo.jpg');
    });

    it('generates correct thumbnail URL', () => {
      expect(getImageUrl('album/photo.jpg', true)).toBe(
        '/images/thumbnails/album/photo.jpg',
      );
    });

    it('handles nested paths', () => {
      expect(getImageUrl('album/subalbum/photo.jpg')).toBe(
        '/images/album/subalbum/photo.jpg',
      );
    });
  });

  describe('filterAlbums', () => {
    it('filters albums from mixed array', () => {
      const items = [
        { type: 'GalleryAlbumItem' },
        { type: 'GalleryPhotoItem' },
        { type: 'GalleryAlbumItem' },
      ];

      const albums = filterAlbums(items);
      expect(albums).toHaveLength(2);
      expect(albums.every((item) => item.type === 'GalleryAlbumItem')).toBe(
        true,
      );
    });

    it('returns empty array when no albums present', () => {
      const items = [
        { type: 'GalleryPhotoItem' },
        { type: 'GalleryPhotoItem' },
      ];

      expect(filterAlbums(items)).toHaveLength(0);
    });
  });

  describe('filterPhotos', () => {
    it('filters photos from mixed array', () => {
      const items = [
        { type: 'GalleryAlbumItem' },
        { type: 'GalleryPhotoItem' },
        { type: 'GalleryPhotoItem' },
      ];

      const photos = filterPhotos(items);
      expect(photos).toHaveLength(2);
      expect(photos.every((item) => item.type === 'GalleryPhotoItem')).toBe(
        true,
      );
    });

    it('returns empty array when no photos present', () => {
      const items = [
        { type: 'GalleryAlbumItem' },
        { type: 'GalleryAlbumItem' },
      ];

      expect(filterPhotos(items)).toHaveLength(0);
    });
  });
});

/**
 * Tests for imageUrl utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getImageUrl, getImageUrlWithFormat, getAlbumThumbnailUrl, getAlbumHighlightImageUrl } from './imageUrl';
import type { Image, Album } from '../types';
import * as imageConfig from './imageConfig';

describe('imageUrl utilities', () => {
  const mockImage: Image = {
    id: 1,
    type: 'GalleryPhotoItem',
    hasChildren: false,
    title: 'Test Photo',
    description: 'Test description',
    pathComponent: 'test-album/test-photo.jpg',
    timestamp: 1234567890,
    width: 1920,
    height: 1080,
    thumb_width: 200,
    thumb_height: 150,
  };

  beforeEach(() => {
    // Mock getImageBaseUrl to return default by default
    vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/images');
  });

  describe('getImageUrl', () => {
    it('returns full image URL when useThumbnail is false', () => {
      const url = getImageUrl(mockImage, false);
      expect(url).toBe('/images/test-album/test-photo.jpg');
    });

    it('returns full image URL by default', () => {
      const url = getImageUrl(mockImage);
      expect(url).toBe('/images/test-album/test-photo.jpg');
    });

    it('returns thumbnail URL when useThumbnail is true', () => {
      const url = getImageUrl(mockImage, true);
      expect(url).toBe('/images/test-album/t__test-photo.jpg');
    });

    it('handles image with no directory path', () => {
      const imageNoDir: Image = {
        ...mockImage,
        pathComponent: 'photo.jpg',
      };
      const fullUrl = getImageUrl(imageNoDir, false);
      const thumbUrl = getImageUrl(imageNoDir, true);

      expect(fullUrl).toBe('/images/photo.jpg');
      expect(thumbUrl).toBe('/images/t__photo.jpg');
    });

    it('handles nested directory paths', () => {
      const nestedImage: Image = {
        ...mockImage,
        pathComponent: 'album/subalbum/photo.jpg',
      };
      const url = getImageUrl(nestedImage, true);
      expect(url).toBe('/images/album/subalbum/t__photo.jpg');
    });

    it('handles empty pathComponent', () => {
      const emptyImage: Image = {
        ...mockImage,
        pathComponent: '',
      };
      const url = getImageUrl(emptyImage, false);
      expect(url).toBe('/images');
    });

    it('handles custom thumbnail prefix', () => {
      const url = getImageUrl(mockImage, true, 'thumb_');
      expect(url).toBe('/images/test-album/thumb_test-photo.jpg');
    });

    it('handles special characters in pathComponent', () => {
      const specialImage: Image = {
        ...mockImage,
        pathComponent: 'album/photo with spaces.jpg',
      };
      const url = getImageUrl(specialImage, false);
      // PathComponent is used as-is (URL encoding should be handled by browser)
      expect(url).toBe('/images/album/photo with spaces.jpg');
    });

    it('handles images with different file extensions', () => {
      const pngImage: Image = {
        ...mockImage,
        pathComponent: 'album/image.png',
      };
      const jpegImage: Image = {
        ...mockImage,
        pathComponent: 'album/image.jpeg',
      };

      expect(getImageUrl(pngImage, true)).toBe('/images/album/t__image.png');
      expect(getImageUrl(jpegImage, true)).toBe('/images/album/t__image.jpeg');
    });

    it('strips leading slash from pathComponent to avoid double slash with baseUrl', () => {
      const imageWithLeadingSlash: Image = {
        ...mockImage,
        pathComponent: '/album/photo.jpg',
      };
      expect(getImageUrl(imageWithLeadingSlash, false)).toBe('/images/album/photo.jpg');
      expect(getImageUrl(imageWithLeadingSlash, true)).toBe('/images/album/t__photo.jpg');
    });

    it('prefers urlPath over pathComponent when present', () => {
      const imageWithUrlPath: Image = {
        ...mockImage,
        pathComponent: 'raw/raw.jpg',
        urlPath: 'legacy/legacy_photo.jpg',
      };
      expect(getImageUrl(imageWithUrlPath, false)).toBe('/images/legacy/legacy_photo.jpg');
      expect(getImageUrl(imageWithUrlPath, true)).toBe('/images/legacy/t__legacy_photo.jpg');
    });

    it('falls back to pathComponent when urlPath missing', () => {
      const imageNoUrlPath: Image = {
        ...mockImage,
        pathComponent: 'album/photo.jpg',
      };
      expect(getImageUrl(imageNoUrlPath, false)).toBe('/images/album/photo.jpg');
      expect(getImageUrl(imageNoUrlPath, true)).toBe('/images/album/t__photo.jpg');
    });

    it('uses urlPath without ___ when backend emits pathcomponent-only filename', () => {
      const imageWithUrlPath: Image = {
        ...mockImage,
        pathComponent: 'theenigma/enigma09/20090418-IMG_1720.jpg',
        urlPath: 'the_enigma/enigma_09/20090418-img_1720.jpg',
      };
      expect(getImageUrl(imageWithUrlPath, false)).toBe('/images/the_enigma/enigma_09/20090418-img_1720.jpg');
    });
  });

  describe('getImageUrlWithFormat', () => {
    it('returns original format URL by default', () => {
      const url = getImageUrlWithFormat(mockImage, false, 'original');
      expect(url).toBe('/images/test-album/test-photo.jpg');
    });

    it('returns WebP format URL for full image', () => {
      const url = getImageUrlWithFormat(mockImage, false, 'webp');
      expect(url).toBe('/images/test-album/test-photo.webp');
    });

    it('returns AVIF format URL for full image', () => {
      const url = getImageUrlWithFormat(mockImage, false, 'avif');
      expect(url).toBe('/images/test-album/test-photo.avif');
    });

    it('returns WebP format URL for thumbnail', () => {
      const url = getImageUrlWithFormat(mockImage, true, 'webp');
      expect(url).toBe('/images/test-album/t__test-photo.webp');
    });

    it('returns AVIF format URL for thumbnail', () => {
      const url = getImageUrlWithFormat(mockImage, true, 'avif');
      expect(url).toBe('/images/test-album/t__test-photo.avif');
    });

    it('handles images without extension', () => {
      const noExtImage: Image = {
        ...mockImage,
        pathComponent: 'album/image',
      };
      const webpUrl = getImageUrlWithFormat(noExtImage, false, 'webp');
      expect(webpUrl).toBe('/images/album/image.webp');
    });

    it('handles images with different extensions', () => {
      const pngImage: Image = {
        ...mockImage,
        pathComponent: 'album/image.png',
      };
      const webpUrl = getImageUrlWithFormat(pngImage, false, 'webp');
      expect(webpUrl).toBe('/images/album/image.webp');
    });

    it('handles nested directory paths with format', () => {
      const nestedImage: Image = {
        ...mockImage,
        pathComponent: 'album/subalbum/photo.jpg',
      };
      const url = getImageUrlWithFormat(nestedImage, true, 'webp');
      expect(url).toBe('/images/album/subalbum/t__photo.webp');
    });

    it('handles custom thumbnail prefix with format', () => {
      const url = getImageUrlWithFormat(mockImage, true, 'webp', 'thumb_');
      expect(url).toBe('/images/test-album/thumb_test-photo.webp');
    });
  });

  describe('getImageUrl with external domain', () => {
    it('uses absolute base URL for full image', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const url = getImageUrl(mockImage, false);
      expect(url).toBe('https://cdn.example.com/test-album/test-photo.jpg');
    });

    it('uses absolute base URL for thumbnail', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const url = getImageUrl(mockImage, true);
      expect(url).toBe('https://cdn.example.com/test-album/t__test-photo.jpg');
    });

    it('uses relative base URL for full image', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/gallery-images');
      const url = getImageUrl(mockImage, false);
      expect(url).toBe('/gallery-images/test-album/test-photo.jpg');
    });

    it('uses relative base URL for thumbnail', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/gallery-images');
      const url = getImageUrl(mockImage, true);
      expect(url).toBe('/gallery-images/test-album/t__test-photo.jpg');
    });

    it('handles absolute URL with nested paths', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const nestedImage: Image = {
        ...mockImage,
        pathComponent: 'album/subalbum/photo.jpg',
      };
      const url = getImageUrl(nestedImage, false);
      expect(url).toBe('https://cdn.example.com/album/subalbum/photo.jpg');
    });

    it('handles absolute URL with image in root', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const rootImage: Image = {
        ...mockImage,
        pathComponent: 'photo.jpg',
      };
      const url = getImageUrl(rootImage, false);
      expect(url).toBe('https://cdn.example.com/photo.jpg');
    });

    it('handles special characters with external domain', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const specialImage: Image = {
        ...mockImage,
        pathComponent: 'album/photo with spaces.jpg',
      };
      const url = getImageUrl(specialImage, false);
      expect(url).toBe('https://cdn.example.com/album/photo with spaces.jpg');
    });
  });

  describe('getImageUrlWithFormat with external domain', () => {
    it('uses absolute base URL with WebP format', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const url = getImageUrlWithFormat(mockImage, false, 'webp');
      expect(url).toBe('https://cdn.example.com/test-album/test-photo.webp');
    });

    it('uses absolute base URL with AVIF format', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const url = getImageUrlWithFormat(mockImage, false, 'avif');
      expect(url).toBe('https://cdn.example.com/test-album/test-photo.avif');
    });

    it('uses absolute base URL with WebP thumbnail', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const url = getImageUrlWithFormat(mockImage, true, 'webp');
      expect(url).toBe('https://cdn.example.com/test-album/t__test-photo.webp');
    });

    it('uses relative base URL with WebP format', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/gallery-images');
      const url = getImageUrlWithFormat(mockImage, false, 'webp');
      expect(url).toBe('/gallery-images/test-album/test-photo.webp');
    });

    it('handles nested paths with external domain and format', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const nestedImage: Image = {
        ...mockImage,
        pathComponent: 'album/subalbum/photo.jpg',
      };
      const url = getImageUrlWithFormat(nestedImage, true, 'webp');
      expect(url).toBe('https://cdn.example.com/album/subalbum/t__photo.webp');
    });
  });

  describe('getAlbumThumbnailUrl', () => {
    const mockAlbum: Album = {
      id: 1,
      type: 'GalleryAlbumItem',
      hasChildren: true,
      title: 'Test Album',
      description: 'Test description',
      pathComponent: 'test-album',
      timestamp: 1234567890,
      width: null,
      height: null,
      thumb_width: null,
      thumb_height: null,
      thumbnailPathComponent: 'test-album/thumbnail.jpg',
    };

    it('returns thumbnail URL with default base URL', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/images');
      const url = getAlbumThumbnailUrl(mockAlbum);
      expect(url).toBe('/images/test-album/t__thumbnail.jpg');
    });

    it('returns null when album has no thumbnail or highlight', () => {
      const albumWithoutThumb: Album = {
        ...mockAlbum,
        thumbnailPathComponent: null,
        thumbnailUrlPath: null,
        highlightImageUrl: undefined,
      };
      const url = getAlbumThumbnailUrl(albumWithoutThumb);
      expect(url).toBeNull();
    });

    it('falls back to highlightImageUrl when no thumbnail fields', () => {
      const albumWithHighlight: Album = {
        ...mockAlbum,
        thumbnailPathComponent: null,
        thumbnailUrlPath: null,
        highlightImageUrl: 'internationella/hackers_at_large_2001/gea/trip_to_hal_2001___gea_to_hal.jpg',
      };
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/images');
      const url = getAlbumThumbnailUrl(albumWithHighlight);
      expect(url).toBe('/images/internationella/hackers_at_large_2001/gea/trip_to_hal_2001___gea_to_hal.jpg');
    });

    it('uses absolute base URL for album thumbnail', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const url = getAlbumThumbnailUrl(mockAlbum);
      expect(url).toBe('https://cdn.example.com/test-album/t__thumbnail.jpg');
    });

    it('uses relative base URL for album thumbnail', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/gallery-images');
      const url = getAlbumThumbnailUrl(mockAlbum);
      expect(url).toBe('/gallery-images/test-album/t__thumbnail.jpg');
    });

    it('handles custom thumbnail prefix with external domain', () => {
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const url = getAlbumThumbnailUrl(mockAlbum, 'thumb_');
      expect(url).toBe('https://cdn.example.com/test-album/thumb_thumbnail.jpg');
    });

    it('prefers thumbnailUrlPath over thumbnailPathComponent when present', () => {
      const albumWithLegacy: Album = {
        ...mockAlbum,
        thumbnailPathComponent: 'raw/thumb.jpg',
        thumbnailUrlPath: 'legacy/path/t__legacy_thumb.jpg',
      };
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/images');
      const url = getAlbumThumbnailUrl(albumWithLegacy);
      expect(url).toBe('/images/legacy/path/t__legacy_thumb.jpg');
    });

    it('falls back to thumbnailPathComponent when thumbnailUrlPath missing', () => {
      const albumFallback: Album = {
        ...mockAlbum,
        thumbnailPathComponent: 'album/thumb.jpg',
        thumbnailUrlPath: undefined,
      };
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/images');
      const url = getAlbumThumbnailUrl(albumFallback);
      expect(url).toBe('/images/album/t__thumb.jpg');
    });

    it('strips leading slash from thumbnailUrlPath to avoid double slash', () => {
      const albumWithLeadingSlash: Album = {
        ...mockAlbum,
        thumbnailUrlPath: '/legacy/path/t__thumb.jpg',
        thumbnailPathComponent: undefined,
        highlightImageUrl: undefined,
      };
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/images');
      const url = getAlbumThumbnailUrl(albumWithLeadingSlash);
      expect(url).toBe('/images/legacy/path/t__thumb.jpg');
    });

    it('strips leading slash from highlightImageUrl to avoid double slash', () => {
      const albumHighlightOnly: Album = {
        ...mockAlbum,
        thumbnailUrlPath: null,
        thumbnailPathComponent: undefined,
        highlightImageUrl: '/internationella/hackers_at_large_2001/gea/image.jpg',
      };
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/images');
      const url = getAlbumThumbnailUrl(albumHighlightOnly);
      expect(url).toBe('/images/internationella/hackers_at_large_2001/gea/image.jpg');
    });
  });

  describe('getAlbumHighlightImageUrl', () => {
    const mockAlbum: Album = {
      id: 1,
      type: 'GalleryAlbumItem',
      hasChildren: true,
      title: 'Test Album',
      description: null,
      pathComponent: 'test-album',
      timestamp: null,
      width: null,
      height: null,
      thumb_width: null,
      thumb_height: null,
      thumbnailPathComponent: 'test-album/thumb.jpg',
    };

    it('returns null when highlightImageUrl is missing', () => {
      const url = getAlbumHighlightImageUrl(mockAlbum);
      expect(url).toBeNull();
    });

    it('returns null when highlightImageUrl is empty string', () => {
      const album: Album = { ...mockAlbum, highlightImageUrl: '' };
      const url = getAlbumHighlightImageUrl(album);
      expect(url).toBeNull();
    });

    it('returns full URL when highlightImageUrl is set', () => {
      const album: Album = {
        ...mockAlbum,
        highlightImageUrl: 'internationella/gea/image.jpg',
      };
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/images');
      const url = getAlbumHighlightImageUrl(album);
      expect(url).toBe('/images/internationella/gea/image.jpg');
    });

    it('does not use thumbnailPathComponent or thumbnailUrlPath', () => {
      const albumWithThumbOnly: Album = {
        ...mockAlbum,
        thumbnailPathComponent: 'album/thumb.jpg',
        thumbnailUrlPath: 'legacy/thumb.jpg',
        highlightImageUrl: undefined,
      };
      const url = getAlbumHighlightImageUrl(albumWithThumbOnly);
      expect(url).toBeNull();
    });

    it('uses base URL from config', () => {
      const album: Album = { ...mockAlbum, highlightImageUrl: 'path/to/highlight.jpg' };
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('https://cdn.example.com');
      const url = getAlbumHighlightImageUrl(album);
      expect(url).toBe('https://cdn.example.com/path/to/highlight.jpg');
    });

    it('strips leading slash from highlightImageUrl', () => {
      const album: Album = { ...mockAlbum, highlightImageUrl: '/path/highlight.jpg' };
      vi.spyOn(imageConfig, 'getImageBaseUrl').mockReturnValue('/images');
      const url = getAlbumHighlightImageUrl(album);
      expect(url).toBe('/images/path/highlight.jpg');
    });
  });
});

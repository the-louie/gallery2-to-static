/**
 * Tests for imageUrl utility functions
 */

import { describe, it, expect } from 'vitest';
import { getImageUrl } from './imageUrl';
import type { Image } from '../types';

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
      expect(url).toBe('/images/test-album/__t_test-photo.jpg');
    });

    it('handles image with no directory path', () => {
      const imageNoDir: Image = {
        ...mockImage,
        pathComponent: 'photo.jpg',
      };
      const fullUrl = getImageUrl(imageNoDir, false);
      const thumbUrl = getImageUrl(imageNoDir, true);

      expect(fullUrl).toBe('/images/photo.jpg');
      expect(thumbUrl).toBe('/images/__t_photo.jpg');
    });

    it('handles nested directory paths', () => {
      const nestedImage: Image = {
        ...mockImage,
        pathComponent: 'album/subalbum/photo.jpg',
      };
      const url = getImageUrl(nestedImage, true);
      expect(url).toBe('/images/album/subalbum/__t_photo.jpg');
    });

    it('handles empty pathComponent', () => {
      const emptyImage: Image = {
        ...mockImage,
        pathComponent: '',
      };
      const url = getImageUrl(emptyImage, false);
      expect(url).toBe('/images/');
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

      expect(getImageUrl(pngImage, true)).toBe('/images/album/__t_image.png');
      expect(getImageUrl(jpegImage, true)).toBe('/images/album/__t_image.jpeg');
    });
  });
});

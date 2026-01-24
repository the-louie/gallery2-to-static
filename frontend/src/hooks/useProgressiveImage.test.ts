/**
 * Progressive Image Loading Hook Tests
 *
 * Tests for useProgressiveImage hook covering state transitions, format detection,
 * error handling, and cleanup.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@/test-utils';
import { useProgressiveImage } from './useProgressiveImage';
import type { Image } from '@/types';
import * as imageFormat from '@/utils/imageFormat';
import * as imageUrl from '@/utils/imageUrl';

// Mock dependencies
vi.mock('@/utils/imageFormat');
vi.mock('@/utils/imageUrl');

describe('useProgressiveImage', () => {
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

  let mockImageElement: {
    onload: (() => void) | null;
    onerror: (() => void) | null;
    src: string;
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock Image constructor
    mockImageElement = {
      onload: null,
      onerror: null,
      src: '',
    };

    global.Image = vi.fn(() => mockImageElement as any) as any;

    // Mock imageUrl functions
    vi.spyOn(imageUrl, 'getImageUrl').mockImplementation((image, useThumbnail) => {
      if (useThumbnail) {
        return '/images/test-album/t__test-photo.jpg';
      }
      return '/images/test-album/test-photo.jpg';
    });

    vi.spyOn(imageUrl, 'getImageUrlWithFormat').mockImplementation(
      (image, useThumbnail, format) => {
        const baseUrl = useThumbnail
          ? '/images/test-album/t__test-photo'
          : '/images/test-album/test-photo';
        if (format === 'webp') {
          return `${baseUrl}.webp`;
        }
        if (format === 'avif') {
          return `${baseUrl}.avif`;
        }
        return `${baseUrl}.jpg`;
      },
    );

    // Mock format detection
    vi.spyOn(imageFormat, 'getBestFormat').mockResolvedValue('original');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts in thumbnail state', () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage));

      expect(result.current.state).toBe('thumbnail');
      expect(result.current.hasError).toBe(false);
      expect(result.current.thumbnailUrl).toBe('/images/test-album/t__test-photo.jpg');
    });

    it('handles null image', () => {
      const { result } = renderHook(() => useProgressiveImage(null));

      expect(result.current.state).toBe('error');
      expect(result.current.hasError).toBe(true);
      expect(result.current.error).toBe('No image provided');
    });
  });

  describe('thumbnail loading', () => {
    it('transitions to thumbnail-loaded when thumbnail loads', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage));

      // Wait for format detection
      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      // Trigger thumbnail load
      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });
    });

    it('continues to full image loading even if thumbnail fails', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage));

      // Wait for format detection
      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      // Trigger thumbnail error
      if (mockImageElement.onerror) {
        mockImageElement.onerror();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });
    });

    it('skips thumbnail when useThumbnail is false', async () => {
      const { result } = renderHook(() =>
        useProgressiveImage(mockImage, false),
      );

      // Wait for format detection
      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      // Should skip directly to thumbnail-loaded state
      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });
    });
  });

  describe('full image loading', () => {
    it('transitions to full-loaded when full image loads', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage));

      // Wait for format detection
      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      // Trigger thumbnail load
      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      // Trigger full image load
      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('full-loaded');
        expect(result.current.hasError).toBe(false);
      });
    });

    it('falls back to original format when format variant fails', async () => {
      vi.spyOn(imageFormat, 'getBestFormat').mockResolvedValue('webp');

      const { result } = renderHook(() => useProgressiveImage(mockImage));

      // Wait for format detection
      await waitFor(() => {
        expect(result.current.fullImageUrl).toContain('.webp');
      });

      // Trigger thumbnail load
      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      // Trigger full image error (WebP fails)
      if (mockImageElement.onerror) {
        mockImageElement.onerror();
      }

      // Should create new image for fallback
      await waitFor(() => {
        // Should have created fallback image
        expect(global.Image).toHaveBeenCalledTimes(3); // thumbnail + webp + fallback
      });

      // Trigger fallback image load
      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('full-loaded');
        expect(result.current.fullImageUrl).toContain('.jpg');
      });
    });

    it('sets error state when all formats fail', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage));

      // Wait for format detection
      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      // Trigger thumbnail load
      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      // Trigger full image error (original format)
      if (mockImageElement.onerror) {
        mockImageElement.onerror();
      }

      // Since format is already 'original', should set error
      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.hasError).toBe(true);
        expect(result.current.error).toBe('Failed to load image');
      });
    });
  });

  describe('format detection', () => {
    it('uses AVIF format when supported', async () => {
      vi.spyOn(imageFormat, 'getBestFormat').mockResolvedValue('avif');

      const { result } = renderHook(() => useProgressiveImage(mockImage));

      await waitFor(() => {
        expect(result.current.fullImageUrl).toContain('.avif');
      });
    });

    it('uses WebP format when AVIF not supported', async () => {
      vi.spyOn(imageFormat, 'getBestFormat').mockResolvedValue('webp');

      const { result } = renderHook(() => useProgressiveImage(mockImage));

      await waitFor(() => {
        expect(result.current.fullImageUrl).toContain('.webp');
      });
    });

    it('falls back to original when format detection fails', async () => {
      vi.spyOn(imageFormat, 'getBestFormat').mockRejectedValue(
        new Error('Format detection failed'),
      );

      const { result } = renderHook(() => useProgressiveImage(mockImage));

      await waitFor(() => {
        expect(result.current.fullImageUrl).toContain('.jpg');
      });
    });
  });

  describe('cleanup', () => {
    it('cleans up on unmount', () => {
      const { unmount } = renderHook(() => useProgressiveImage(mockImage));

      unmount();

      // Should clean up image references
      expect(mockImageElement.onload).toBeNull();
      expect(mockImageElement.onerror).toBeNull();
    });

    it('does not update state after unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useProgressiveImage(mockImage),
      );

      unmount();

      // Try to trigger load after unmount
      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      // State should not change (component unmounted)
      expect(result.current.state).toBe('thumbnail');
    });
  });

  describe('image change', () => {
    it('resets state when image changes', async () => {
      const { result, rerender } = renderHook(
        ({ image }) => useProgressiveImage(image),
        {
          initialProps: { image: mockImage },
        },
      );

      // Wait for format detection
      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      // Trigger thumbnail load
      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      // Change image
      const newImage: Image = {
        ...mockImage,
        id: 2,
        pathComponent: 'new-album/new-photo.jpg',
      };

      rerender({ image: newImage });

      // State should reset
      expect(result.current.state).toBe('thumbnail');
      expect(result.current.hasError).toBe(false);
    });
  });
});

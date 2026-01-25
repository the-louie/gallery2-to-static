/**
 * Progressive Image Loading Hook Tests
 *
 * Tests for useProgressiveImage hook covering state transitions, format detection,
 * error handling, and cleanup.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { ViewAbortProvider } from '@/contexts/ViewAbortContext';
import { useProgressiveImage } from './useProgressiveImage';
import type { Image } from '@/types';
import * as imageFormat from '@/utils/imageFormat';
import * as imageUrl from '@/utils/imageUrl';

vi.mock('@/utils/imageFormat');
vi.mock('@/utils/imageUrl');

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={['/']}>
        <ViewAbortProvider>{children}</ViewAbortProvider>
      </MemoryRouter>
    );
  };
}

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

    vi.spyOn(imageFormat, 'getBestFormat').mockResolvedValue('original');

    // Mock fetch for fetchImageAsObjectUrl (thumbnail and full image loads)
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      }),
    ) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts in thumbnail state', () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      expect(result.current.state).toBe('thumbnail');
      expect(result.current.hasError).toBe(false);
      expect(result.current.thumbnailUrl).toBe('/images/test-album/t__test-photo.jpg');
    });

    it('handles null image', () => {
      const { result } = renderHook(() => useProgressiveImage(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.state).toBe('error');
      expect(result.current.hasError).toBe(true);
      expect(result.current.error).toBe('No image provided');
    });
  });

  describe('thumbnail loading', () => {
    it('transitions to thumbnail-loaded when thumbnail loads', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      await waitFor(() => {
        expect(mockImageElement.onload).toBeDefined();
      });

      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });
    });

    it('continues to full image loading even if thumbnail fails', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      await waitFor(() => {
        expect(mockImageElement.onerror).toBeDefined();
      });

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
      {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });
    });
  });

  describe('full image loading', () => {
    it('transitions to full-loaded when full image loads', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

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

      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toContain('.webp');
      });

      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      if (mockImageElement.onerror) {
        mockImageElement.onerror();
      }

      await waitFor(() => {
        expect(global.Image).toHaveBeenCalledTimes(3);
      });

      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('full-loaded');
        expect(result.current.fullImageUrl).toContain('.jpg');
      });
    });

    it('sets error state when all formats fail', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      if (mockImageElement.onerror) {
        mockImageElement.onerror();
      }

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

      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toContain('.avif');
      });
    });

    it('uses WebP format when AVIF not supported', async () => {
      vi.spyOn(imageFormat, 'getBestFormat').mockResolvedValue('webp');

      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toContain('.webp');
      });
    });

    it('falls back to original when format detection fails', async () => {
      vi.spyOn(imageFormat, 'getBestFormat').mockRejectedValue(
        new Error('Format detection failed'),
      );

      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toContain('.jpg');
      });
    });
  });

  describe('cleanup', () => {
    it('cleans up on unmount', () => {
      const { unmount } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      unmount();

      expect(mockImageElement.onload).toBeNull();
      expect(mockImageElement.onerror).toBeNull();
    });

    it('does not update state after unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useProgressiveImage(mockImage),
      {
        wrapper: createWrapper(),
      });

      unmount();

      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      expect(result.current.state).toBe('thumbnail');
    });
  });

  describe('image change', () => {
    it('resets state when image changes', async () => {
      const { result, rerender } = renderHook(
        ({ image }) => useProgressiveImage(image),
        {
          initialProps: { image: mockImage },
          wrapper: createWrapper(),
        },
      );

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBeTruthy();
      });

      if (mockImageElement.onload) {
        mockImageElement.onload();
      }

      await waitFor(() => {
        expect(result.current.state).toBe('thumbnail-loaded');
      });

      const newImage: Image = {
        ...mockImage,
        id: 2,
        pathComponent: 'new-album/new-photo.jpg',
      };

      rerender({ image: newImage });

      expect(result.current.state).toBe('thumbnail');
      expect(result.current.hasError).toBe(false);
    });
  });
});

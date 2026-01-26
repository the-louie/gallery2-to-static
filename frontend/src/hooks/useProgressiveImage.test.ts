/**
 * Progressive Image Loading Hook Tests
 *
 * Tests for useProgressiveImage hook covering state transitions,
 * error handling, and cleanup. Hook uses only original image URLs from data.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { ViewAbortProvider } from '@/contexts/ViewAbortContext';
import { useProgressiveImage } from './useProgressiveImage';
import type { Image } from '@/types';
import * as imageUrl from '@/utils/imageUrl';

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
      expect(result.current.thumbnailUrl).toBe('');
    });

    it('handles null image', () => {
      const { result } = renderHook(() => useProgressiveImage(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.state).toBe('error');
      expect(result.current.hasError).toBe(true);
      expect(result.current.error).toBe('No image provided');
      expect(result.current.thumbnailUrl).toBe('');
      expect(result.current.fullImageUrl).toBe('');
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

    it('falls back to server URL when thumbnail blob fails (e.g. security)', async () => {
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
        expect(result.current.thumbnailUrl).toBe('/images/test-album/t__test-photo.jpg');
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

    it('falls back to server URL when full image blob fails (e.g. security)', async () => {
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
        expect(result.current.state).toBe('full-loaded');
        expect(result.current.hasError).toBe(false);
        expect(result.current.error).toBe(null);
        expect(result.current.fullImageUrl).toBe('/images/test-album/test-photo.jpg');
      });
    });
  });

  describe('image URL', () => {
    it('uses server URL for full image until full image is loaded', async () => {
      const { result } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.fullImageUrl).toBe('/images/test-album/test-photo.jpg');
      });
    });

    it('returns object URLs for display after load to avoid duplicate network request', async () => {
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
      });

      expect(result.current.thumbnailUrl).toMatch(/^blob:/);
      expect(result.current.fullImageUrl).toMatch(/^blob:/);
    });
  });

  describe('cleanup', () => {
    it('cleans up on unmount without throwing', () => {
      const { result, unmount } = renderHook(() => useProgressiveImage(mockImage), {
        wrapper: createWrapper(),
      });

      expect(result.current.state).toBe('thumbnail');
      unmount();
      // Hook cleanup revokes object URLs and clears refs; unmount must not throw
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

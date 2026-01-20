/**
 * Tests for useImagePreload hook
 *
 * @module frontend/src/hooks/useImagePreload
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useImagePreload } from './useImagePreload';
import type { Image } from '@/types';
import * as imagePreload from '@/utils/imagePreload';
import * as imageUrl from '@/utils/imageUrl';

describe('useImagePreload', () => {
  const mockImages: Image[] = [
    {
      id: 1,
      type: 'GalleryPhotoItem',
      hasChildren: false,
      title: 'Image 1',
      description: '',
      pathComponent: 'album/image1.jpg',
      timestamp: 1000,
      width: 100,
      height: 100,
      thumb_width: 50,
      thumb_height: 50,
    },
    {
      id: 2,
      type: 'GalleryPhotoItem',
      hasChildren: false,
      title: 'Image 2',
      description: '',
      pathComponent: 'album/image2.jpg',
      timestamp: 2000,
      width: 200,
      height: 200,
      thumb_width: 100,
      thumb_height: 100,
    },
    {
      id: 3,
      type: 'GalleryPhotoItem',
      hasChildren: false,
      title: 'Image 3',
      description: '',
      pathComponent: 'album/image3.jpg',
      timestamp: 3000,
      width: 300,
      height: 300,
      thumb_width: 150,
      thumb_height: 150,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(imagePreload, 'preloadImage').mockResolvedValue(undefined);
    vi.spyOn(imageUrl, 'getImageUrl').mockImplementation(
      (image: Image) => `/images/${image.pathComponent}`,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preloads next and previous images for middle image', async () => {
    renderHook(() => useImagePreload(mockImages[1], mockImages));

    await waitFor(() => {
      expect(imagePreload.preloadImage).toHaveBeenCalledTimes(2);
      expect(imagePreload.preloadImage).toHaveBeenCalledWith('/images/album/image1.jpg');
      expect(imagePreload.preloadImage).toHaveBeenCalledWith('/images/album/image3.jpg');
    });
  });

  it('preloads only next image for first image', async () => {
    renderHook(() => useImagePreload(mockImages[0], mockImages));

    await waitFor(() => {
      expect(imagePreload.preloadImage).toHaveBeenCalledTimes(1);
      expect(imagePreload.preloadImage).toHaveBeenCalledWith('/images/album/image2.jpg');
    });
  });

  it('preloads only previous image for last image', async () => {
    renderHook(() => useImagePreload(mockImages[2], mockImages));

    await waitFor(() => {
      expect(imagePreload.preloadImage).toHaveBeenCalledTimes(1);
      expect(imagePreload.preloadImage).toHaveBeenCalledWith('/images/album/image2.jpg');
    });
  });

  it('does not preload for single image', () => {
    renderHook(() => useImagePreload(mockImages[0], [mockImages[0]]));

    expect(imagePreload.preloadImage).not.toHaveBeenCalled();
  });

  it('does not preload when current image is null', () => {
    renderHook(() => useImagePreload(null, mockImages));

    expect(imagePreload.preloadImage).not.toHaveBeenCalled();
  });

  it('does not preload when current image is not in album context', () => {
    const imageNotInContext: Image = {
      ...mockImages[0],
      id: 999,
    };
    renderHook(() => useImagePreload(imageNotInContext, mockImages));

    expect(imagePreload.preloadImage).not.toHaveBeenCalled();
  });

  it('updates preloading when image changes', async () => {
    const { rerender } = renderHook(
      ({ image, context }) => useImagePreload(image, context),
      {
        initialProps: { image: mockImages[0], context: mockImages },
      },
    );

    await waitFor(() => {
      expect(imagePreload.preloadImage).toHaveBeenCalledTimes(1);
    });

    vi.clearAllMocks();

    rerender({ image: mockImages[1], context: mockImages });

    await waitFor(() => {
      expect(imagePreload.preloadImage).toHaveBeenCalledTimes(2);
    });
  });

  it('handles preload errors gracefully', async () => {
    vi.spyOn(imagePreload, 'preloadImage').mockRejectedValue(new Error('Preload failed'));

    // Should not throw
    renderHook(() => useImagePreload(mockImages[1], mockImages));

    await waitFor(() => {
      expect(imagePreload.preloadImage).toHaveBeenCalled();
    });
  });

  it('cleans up on unmount', async () => {
    const { unmount } = renderHook(() => useImagePreload(mockImages[1], mockImages));

    await waitFor(() => {
      expect(imagePreload.preloadImage).toHaveBeenCalled();
    });

    // Unmount should not throw
    unmount();

    // Verify preload was called (cleanup doesn't prevent the call, just error handling)
    expect(imagePreload.preloadImage).toHaveBeenCalled();
  });
});

/**
 * Tests for useImageNavigation hook
 *
 * @module frontend/src/hooks/useImageNavigation
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useImageNavigation } from './useImageNavigation';
import type { Image } from '@/types';

describe('useImageNavigation', () => {
  const mockImages: Image[] = [
    { id: 1, type: 'GalleryPhotoItem', hasChildren: false, title: 'Image 1', description: '', pathComponent: 'img1', timestamp: 1000, width: 100, height: 100, thumb_width: 50, thumb_height: 50 },
    { id: 2, type: 'GalleryPhotoItem', hasChildren: false, title: 'Image 2', description: '', pathComponent: 'img2', timestamp: 2000, width: 200, height: 200, thumb_width: 100, thumb_height: 100 },
    { id: 3, type: 'GalleryPhotoItem', hasChildren: false, title: 'Image 3', description: '', pathComponent: 'img3', timestamp: 3000, width: 300, height: 300, thumb_width: 150, thumb_height: 150 },
  ];

  it('should return correct navigation state for middle image', () => {
    const { result } = renderHook(() =>
      useImageNavigation(mockImages, 2)
    );

    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.totalImages).toBe(3);

    const nextImage = result.current.getNextImage();
    expect(nextImage).not.toBeNull();
    expect(nextImage?.id).toBe(3);

    const previousImage = result.current.getPreviousImage();
    expect(previousImage).not.toBeNull();
    expect(previousImage?.id).toBe(1);
  });

  it('should return correct navigation state for first image', () => {
    const { result } = renderHook(() =>
      useImageNavigation(mockImages, 1)
    );

    expect(result.current.hasNext).toBe(true);
    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.totalImages).toBe(3);

    const nextImage = result.current.getNextImage();
    expect(nextImage).not.toBeNull();
    expect(nextImage?.id).toBe(2);

    const previousImage = result.current.getPreviousImage();
    expect(previousImage).toBeNull();
  });

  it('should return correct navigation state for last image', () => {
    const { result } = renderHook(() =>
      useImageNavigation(mockImages, 3)
    );

    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(true);
    expect(result.current.currentIndex).toBe(2);
    expect(result.current.totalImages).toBe(3);

    const nextImage = result.current.getNextImage();
    expect(nextImage).toBeNull();

    const previousImage = result.current.getPreviousImage();
    expect(previousImage).not.toBeNull();
    expect(previousImage?.id).toBe(2);
  });

  it('should handle empty images array', () => {
    const { result } = renderHook(() =>
      useImageNavigation([], null)
    );

    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.totalImages).toBe(0);

    expect(result.current.getNextImage()).toBeNull();
    expect(result.current.getPreviousImage()).toBeNull();
  });

  it('should handle single image', () => {
    const singleImage: Image[] = [mockImages[0]];

    const { result } = renderHook(() =>
      useImageNavigation(singleImage, 1)
    );

    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.totalImages).toBe(1);

    expect(result.current.getNextImage()).toBeNull();
    expect(result.current.getPreviousImage()).toBeNull();
  });

  it('should handle null currentImageId', () => {
    const { result } = renderHook(() =>
      useImageNavigation(mockImages, null)
    );

    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.totalImages).toBe(3);

    expect(result.current.getNextImage()).toBeNull();
    expect(result.current.getPreviousImage()).toBeNull();
  });

  it('should handle invalid currentImageId (not in array)', () => {
    const { result } = renderHook(() =>
      useImageNavigation(mockImages, 999)
    );

    expect(result.current.hasNext).toBe(false);
    expect(result.current.hasPrevious).toBe(false);
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.totalImages).toBe(3);

    expect(result.current.getNextImage()).toBeNull();
    expect(result.current.getPreviousImage()).toBeNull();
  });
});

/**
 * Type compatibility tests for frontend type definitions
 *
 * These tests verify that the frontend types are compatible with the existing
 * Child interface and JSON data structure.
 */

import { describe, it, expect } from 'vitest';
import type {
  Child,
  Album,
  Image,
  AlbumOrImage,
} from './index';
import { isAlbum, isImage } from './index';
import {
  mockAlbum,
  mockPhoto,
  mockAlbumWithChildren,
  mockPhotoPortrait,
  mockPhotoNoThumb,
  mockChildren,
} from '../__mocks__/mockData';

describe('Type Compatibility', () => {
  it('should be compatible with existing Child interface', () => {
    const child: Child = mockAlbum;
    expect(child).toBeDefined();
    expect(child.type).toBe('GalleryAlbumItem');
  });

  it('should correctly type albums from mock data', () => {
    const album: Album = mockAlbum as Album;
    expect(album.type).toBe('GalleryAlbumItem');
    expect(album.width).toBeNull();
    expect(album.height).toBeNull();
  });

  it('should correctly type images from mock data', () => {
    const image: Image = mockPhoto as Image;
    expect(image.type).toBe('GalleryPhotoItem');
    expect(typeof image.width).toBe('number');
    expect(typeof image.height).toBe('number');
  });

  it('should handle images without thumbnails', () => {
    const image: Image = mockPhotoNoThumb as Image;
    expect(image.type).toBe('GalleryPhotoItem');
    expect(image.thumb_width).toBeNull();
    expect(image.thumb_height).toBeNull();
  });
});

describe('Type Guards', () => {
  it('isAlbum should correctly identify albums', () => {
    expect(isAlbum(mockAlbum)).toBe(true);
    expect(isAlbum(mockAlbumWithChildren)).toBe(true);
    expect(isAlbum(mockPhoto)).toBe(false);
  });

  it('isImage should correctly identify images', () => {
    expect(isImage(mockPhoto)).toBe(true);
    expect(isImage(mockPhotoPortrait)).toBe(true);
    expect(isImage(mockAlbum)).toBe(false);
  });

  it('type guards should narrow types correctly', () => {
    const item: Child = mockAlbum;
    if (isAlbum(item)) {
      // TypeScript should narrow to Album here
      const album: Album = item;
      expect(album.type).toBe('GalleryAlbumItem');
    }

    const item2: Child = mockPhoto;
    if (isImage(item2)) {
      // TypeScript should narrow to Image here
      const image: Image = item2;
      expect(image.type).toBe('GalleryPhotoItem');
    }
  });
});

describe('Discriminated Union', () => {
  it('should handle mixed arrays of albums and images', () => {
    const items: AlbumOrImage[] = mockChildren as AlbumOrImage[];
    expect(items.length).toBeGreaterThan(0);

    const albums = items.filter(isAlbum);
    const images = items.filter(isImage);

    expect(albums.length).toBeGreaterThan(0);
    expect(images.length).toBeGreaterThan(0);
  });

  it('should allow type narrowing in conditional blocks', () => {
    const item: AlbumOrImage = mockAlbum as AlbumOrImage;

    if (item.type === 'GalleryAlbumItem') {
      const album: Album = item;
      expect(album.type).toBe('GalleryAlbumItem');
    } else {
      const image: Image = item;
      expect(image.type).toBe('GalleryPhotoItem');
    }
  });
});

describe('Type Exports', () => {
  it('should export all required types', () => {
    // This test verifies that types are properly exported and importable
    // If any of these imports fail, the test will fail at compile time
    const _album: Album = mockAlbum as Album;
    const _image: Image = mockPhoto as Image;
    const _union: AlbumOrImage = mockAlbum as AlbumOrImage;
    const _child: Child = mockAlbum;

    expect(_album).toBeDefined();
    expect(_image).toBeDefined();
    expect(_union).toBeDefined();
    expect(_child).toBeDefined();
  });
});

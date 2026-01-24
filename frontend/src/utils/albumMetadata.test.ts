/**
 * Tests for albumMetadata utility functions
 *
 * @module frontend/src/utils/albumMetadata.test
 */

import { describe, it, expect } from 'vitest';
import { getAlbumMetadata, albumFromMetadata } from './albumMetadata';
import type { Child } from '../../../backend/types';
import type { Album, Image } from '@/types';

describe('getAlbumMetadata', () => {
  const mockAlbum: Album = {
    id: 1,
    type: 'GalleryAlbumItem',
    hasChildren: true,
    title: 'Test Album',
    description: 'Test Description',
    pathComponent: 'test-album',
    timestamp: 1234567890,
    width: null,
    height: null,
    thumb_width: null,
    thumb_height: null,
  };

  const mockImage: Image = {
    id: 2,
    type: 'GalleryPhotoItem',
    hasChildren: false,
    title: 'Test Image',
    description: 'Test Image Description',
    pathComponent: 'test-image.jpg',
    timestamp: 1234567890,
    width: 1920,
    height: 1080,
    thumb_width: 200,
    thumb_height: 150,
  };

  const mockParentData: Child[] = [mockAlbum, mockImage];

  it('should return album metadata when album exists in parent data', () => {
    const result = getAlbumMetadata(1, mockParentData);
    expect(result).not.toBeNull();
    expect(result).toEqual(mockAlbum);
    expect(result?.title).toBe('Test Album');
    expect(result?.description).toBe('Test Description');
  });

  it('should return null when album ID does not exist', () => {
    const result = getAlbumMetadata(999, mockParentData);
    expect(result).toBeNull();
  });

  it('should return null when ID exists but is an image, not an album', () => {
    const result = getAlbumMetadata(2, mockParentData);
    expect(result).toBeNull();
  });

  it('should return null when parentData is empty array', () => {
    const result = getAlbumMetadata(1, []);
    expect(result).toBeNull();
  });

  it('should return null when parentData is not an array', () => {
    const result = getAlbumMetadata(1, null as unknown as Child[]);
    expect(result).toBeNull();
  });

  it('should handle multiple albums and return correct one', () => {
    const album2: Album = {
      id: 3,
      type: 'GalleryAlbumItem',
      hasChildren: false,
      title: 'Another Album',
      description: 'Another Description',
      pathComponent: 'another-album',
      timestamp: 1234567890,
      width: null,
      height: null,
      thumb_width: null,
      thumb_height: null,
    };

    const multipleAlbums: Child[] = [mockAlbum, album2, mockImage];
    const result = getAlbumMetadata(3, multipleAlbums);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(3);
    expect(result?.title).toBe('Another Album');
  });
});

describe('albumFromMetadata', () => {
  it('builds Album from AlbumMetadata', () => {
    const meta = {
      albumId: 42,
      albumTitle: 'My Album',
      albumDescription: 'Desc',
      albumTimestamp: 1234567890,
      ownerName: 'Owner',
    };
    const album = albumFromMetadata(meta);
    expect(album.id).toBe(42);
    expect(album.type).toBe('GalleryAlbumItem');
    expect(album.title).toBe('My Album');
    expect(album.description).toBe('Desc');
    expect(album.ownerName).toBe('Owner');
  });
});

import type { Child } from '../../../types';

/**
 * Mock data for testing
 * Matches the structure of real JSON data from ./data/ directory
 */

/**
 * Mock album item (GalleryAlbumItem)
 */
export const mockAlbum: Child = {
  id: 1,
  type: 'GalleryAlbumItem',
  hasChildren: true,
  title: 'Test Album',
  description: 'Test album for JSON import verification',
  pathComponent: 'test-album',
  timestamp: 1234567890,
  width: null,
  height: null,
  thumb_width: null,
  thumb_height: null,
};

/**
 * Mock photo item (GalleryPhotoItem)
 */
export const mockPhoto: Child = {
  id: 2,
  type: 'GalleryPhotoItem',
  hasChildren: false,
  title: 'Test Photo',
  description: 'Test photo for JSON import verification',
  pathComponent: 'test-album/test-photo.jpg',
  timestamp: 1234567891,
  width: 1920,
  height: 1080,
  thumb_width: 200,
  thumb_height: 150,
};

/**
 * Mock album with multiple children
 */
export const mockAlbumWithChildren: Child = {
  id: 10,
  type: 'GalleryAlbumItem',
  hasChildren: true,
  title: 'Parent Album',
  description: 'An album containing child albums and photos',
  pathComponent: 'parent-album',
  timestamp: 1609459200,
  width: null,
  height: null,
  thumb_width: null,
  thumb_height: null,
};

/**
 * Mock photo with different dimensions
 */
export const mockPhotoPortrait: Child = {
  id: 3,
  type: 'GalleryPhotoItem',
  hasChildren: false,
  title: 'Portrait Photo',
  description: 'A portrait orientation photo',
  pathComponent: 'test-album/portrait-photo.jpg',
  timestamp: 1234567892,
  width: 1080,
  height: 1920,
  thumb_width: 150,
  thumb_height: 200,
};

/**
 * Mock photo without thumbnail dimensions
 */
export const mockPhotoNoThumb: Child = {
  id: 4,
  type: 'GalleryPhotoItem',
  hasChildren: false,
  title: 'Photo Without Thumb',
  description: 'A photo without thumbnail dimensions',
  pathComponent: 'test-album/no-thumb-photo.jpg',
  timestamp: 1234567893,
  width: 2560,
  height: 1440,
  thumb_width: null,
  thumb_height: null,
};

/**
 * Array of mock children (albums and photos mixed)
 */
export const mockChildren: Child[] = [
  mockAlbum,
  mockPhoto,
  mockPhotoPortrait,
  mockPhotoNoThumb,
];

/**
 * Array of mock albums only
 */
export const mockAlbums: Child[] = [mockAlbum, mockAlbumWithChildren];

/**
 * Array of mock photos only
 */
export const mockPhotos: Child[] = [
  mockPhoto,
  mockPhotoPortrait,
  mockPhotoNoThumb,
];

/**
 * Empty array for testing empty states
 */
export const mockEmptyChildren: Child[] = [];

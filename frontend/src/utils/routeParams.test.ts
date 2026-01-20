import { describe, it, expect } from 'vitest';
import { parseAlbumId, parseImageId } from './routeParams';

describe('parseAlbumId', () => {
  it('parses valid positive integer string', () => {
    expect(parseAlbumId('7')).toBe(7);
    expect(parseAlbumId('42')).toBe(42);
    expect(parseAlbumId('1000')).toBe(1000);
  });

  it('returns null for undefined', () => {
    expect(parseAlbumId(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseAlbumId('')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(parseAlbumId('abc')).toBeNull();
    expect(parseAlbumId('7abc')).toBeNull();
    expect(parseAlbumId('abc7')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(parseAlbumId('0')).toBeNull();
  });

  it('returns null for negative numbers', () => {
    expect(parseAlbumId('-1')).toBeNull();
    expect(parseAlbumId('-42')).toBeNull();
  });

  it('returns null for decimal numbers', () => {
    expect(parseAlbumId('7.5')).toBeNull();
    expect(parseAlbumId('42.0')).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(parseAlbumId('Infinity')).toBeNull();
  });

  it('returns null for NaN string', () => {
    expect(parseAlbumId('NaN')).toBeNull();
  });
});

describe('parseImageId', () => {
  it('parses valid positive integer string', () => {
    expect(parseImageId('7')).toBe(7);
    expect(parseImageId('42')).toBe(42);
    expect(parseImageId('1000')).toBe(1000);
  });

  it('returns null for undefined', () => {
    expect(parseImageId(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseImageId('')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(parseImageId('abc')).toBeNull();
    expect(parseImageId('7abc')).toBeNull();
    expect(parseImageId('abc7')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(parseImageId('0')).toBeNull();
  });

  it('returns null for negative numbers', () => {
    expect(parseImageId('-1')).toBeNull();
    expect(parseImageId('-42')).toBeNull();
  });

  it('returns null for decimal numbers', () => {
    expect(parseImageId('7.5')).toBeNull();
    expect(parseImageId('42.0')).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(parseImageId('Infinity')).toBeNull();
  });

  it('returns null for NaN string', () => {
    expect(parseImageId('NaN')).toBeNull();
  });
});

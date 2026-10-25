import { describe, it, expect } from 'vitest';
import { peerWindow, truncateTitle } from './matrixPeers';

describe('peerWindow (Gallery 2 core.LoadPeers, windowSize 6)', () => {
  it('matches the 2006 pages', () => {
    // dhphotos.html: Battlefrag.com is 3 of 18 → 1..6, ..., 18
    expect(peerWindow(18, 2)).toEqual([0, 1, 2, 3, 4, 5, 17]);
    // photo-CIMG0053_.html: photo 1 of 287 → 1..6, ..., 287
    expect(peerWindow(287, 0)).toEqual([0, 1, 2, 3, 4, 5, 286]);
  });

  it('centres the window in the middle and adds both ends', () => {
    expect(peerWindow(287, 100)).toEqual([0, 98, 99, 100, 101, 102, 103, 286]);
  });

  it('pins to the end', () => {
    expect(peerWindow(18, 17)).toEqual([0, 12, 13, 14, 15, 16, 17]);
    expect(peerWindow(18, 15)).toEqual([0, 12, 13, 14, 15, 16, 17]);
  });

  it('short lists show everything', () => {
    expect(peerWindow(1, 0)).toEqual([0]);
    expect(peerWindow(6, 3)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(peerWindow(7, 3)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('nothing for an unknown current', () => {
    expect(peerWindow(0, 0)).toEqual([]);
    expect(peerWindow(5, 5)).toEqual([]);
    expect(peerWindow(5, -1)).toEqual([]);
  });
});

describe('truncateTitle (Gallery 2 entitytruncate:14)', () => {
  it('keeps titles of 14 characters or fewer', () => {
    expect(truncateTitle('Battlefrag.com')).toBe('Battlefrag.com');
    expect(truncateTitle('CIMG0053_.JPG')).toBe('CIMG0053_.JPG');
  });

  it('cuts at a word boundary when it can', () => {
    expect(truncateTitle('DreamHack Winter 05')).toBe('DreamHack...');
    expect(truncateTitle('Grattis louie!')).toBe('Grattis louie!');
    expect(truncateTitle('Alla vi som var på dreamhack')).toBe('Alla vi som...');
  });

  it('breaks a long word when there is no space to back up to', () => {
    expect(truncateTitle('Supercalifragilistic')).toBe('Supercalifr...');
  });

  it('counts characters, not bytes', () => {
    expect(truncateTitle('Söndagsbilderåäö')).toBe('Söndagsbild...');
  });
});

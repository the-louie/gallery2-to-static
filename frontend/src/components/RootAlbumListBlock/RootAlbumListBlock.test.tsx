/**
 * Tests for RootAlbumListBlock component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { RootAlbumListBlock } from './RootAlbumListBlock';
import { mockAlbum, mockAlbumWithChildren } from '@/__mocks__/mockData';
import type { Album } from '@/types';

const baseAlbum: Album = {
  ...mockAlbum,
  type: 'GalleryAlbumItem',
  description: null,
  ownerName: null,
} as Album;
const albumWithDesc: Album = {
  ...baseAlbum,
  id: 10,
  description: 'Test description',
  ownerName: 'Test Owner',
  timestamp: 1609459200000,
} as Album;

function makeSub(id: number, title: string, ts: number): Album {
  return { ...mockAlbum, type: 'GalleryAlbumItem', id, title, timestamp: ts } as Album;
}

describe('RootAlbumListBlock', () => {
  it('renders album title and thumbnail link', () => {
    render(
      <RootAlbumListBlock album={baseAlbum} subalbums={[]} />,
    );
    expect(screen.getByText(/Album:/)).toBeInTheDocument();
    expect(screen.getByText('Test Album')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /open album: test album/i });
    expect(link).toHaveAttribute('href', '/album/1');
  });

  it('hides description when missing', () => {
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('shows description when present', () => {
    render(<RootAlbumListBlock album={albumWithDesc} subalbums={[]} />);
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('hides owner when null or empty', () => {
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
    expect(screen.queryByText('Owner')).not.toBeInTheDocument();
  });

  it('shows owner when present', () => {
    render(<RootAlbumListBlock album={albumWithDesc} subalbums={[]} />);
    expect(screen.getByText('Test Owner')).toBeInTheDocument();
  });

  it('hides Subalbums section when subalbums empty', () => {
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
    expect(screen.queryByText(/Subalbums:/i)).not.toBeInTheDocument();
  });

  it('shows Subalbums section with links when subalbums present', () => {
    const sub: Album = { ...mockAlbumWithChildren, type: 'GalleryAlbumItem' } as Album;
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[sub]} />);
    expect(screen.getByText(/Subalbums:/i)).toBeInTheDocument();
    const subLink = screen.getByRole('link', { name: 'Parent Album' });
    expect(subLink).toHaveAttribute('href', '/album/10');
  });

  it('shows all subalbum links and no "... And much more" when ≤5 subalbums', () => {
    const sub1: Album = { ...mockAlbumWithChildren, type: 'GalleryAlbumItem', id: 10, title: 'Parent Album', timestamp: 1609459200 } as Album;
    const sub2: Album = { ...mockAlbum, type: 'GalleryAlbumItem', id: 11, title: 'Sub A', timestamp: 1609459100 } as Album;
    const sub3: Album = { ...mockAlbum, type: 'GalleryAlbumItem', id: 12, title: 'Sub B', timestamp: 1609459000 } as Album;
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[sub1, sub2, sub3]} />);
    expect(screen.getByText(/Subalbums:/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Parent Album' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub A' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub B' })).toBeInTheDocument();
    expect(screen.queryByText(/\.\.\. And much more/i)).not.toBeInTheDocument();
  });

  it('shows all 5 subalbum links and no "... And much more" when exactly 5 subalbums', () => {
    const subs: Album[] = [
      makeSub(10, 'Parent Album', 1609459200),
      makeSub(11, 'Sub A', 1609459100),
      makeSub(12, 'Sub B', 1609459000),
      makeSub(13, 'Sub C', 1609458900),
      makeSub(14, 'Sub D', 1609458800),
    ];
    render(<RootAlbumListBlock album={baseAlbum} subalbums={subs} />);
    expect(screen.getByText(/Subalbums:/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Parent Album' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub A' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub B' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub C' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub D' })).toBeInTheDocument();
    expect(screen.queryByText(/\.\.\. And much more/i)).not.toBeInTheDocument();
  });

  it('shows only 5 subalbum links and "... And much more" when >5 subalbums', () => {
    const subs: Album[] = [
      makeSub(10, 'Parent Album', 1609459200),
      makeSub(11, 'Sub A', 1609459100),
      makeSub(12, 'Sub B', 1609459000),
      makeSub(13, 'Sub C', 1609458900),
      makeSub(14, 'Sub D', 1609458800),
      makeSub(15, 'Sub E', 1609458700),
    ];
    render(<RootAlbumListBlock album={baseAlbum} subalbums={subs} />);
    expect(screen.getByText(/Subalbums:/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Parent Album' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub A' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub B' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub C' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub D' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sub E' })).not.toBeInTheDocument();
    expect(screen.getByText(/\.\.\. And much more/i)).toBeInTheDocument();
  });

  it('renders BBCode-formatted subalbum title', () => {
    const sub: Album = {
      ...mockAlbumWithChildren,
      type: 'GalleryAlbumItem',
      id: 42,
      title: '[b]Bold Subalbum[/b]',
    } as Album;
    const { container } = render(<RootAlbumListBlock album={baseAlbum} subalbums={[sub]} />);
    expect(screen.getByText(/Subalbums:/i)).toBeInTheDocument();
    expect(screen.getByText('Bold Subalbum')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Bold Subalbum' });
    expect(link).toHaveAttribute('href', '/album/42');
    const list = container.querySelector('.root-album-list-block-subalbums-list');
    expect(list?.querySelector('strong')).toHaveTextContent('Bold Subalbum');
  });

  it('shows Website link when summary has [url=...]...[/url]', () => {
    const withUrl: Album = {
      ...baseAlbum,
      id: 20,
      summary: '[url=https://example.com]Example[/url]',
    } as Album;
    render(<RootAlbumListBlock album={withUrl} subalbums={[]} />);
    const ext = screen.getByRole('link', { name: 'Example' });
    expect(ext).toHaveAttribute('href', 'https://example.com');
  });

  it('thumbnail link navigates to album', () => {
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
    const link = screen.getByRole('link', { name: /open album: test album/i });
    expect(link).toHaveAttribute('href', '/album/1');
  });
});

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

  it('shows Website link when summary has [url=...]...[/url]', () => {
    const withUrl: Album = {
      ...baseAlbum,
      id: 20,
      summary: '[url=https://example.com]Example[/url]',
    } as Album;
    render(<RootAlbumListBlock album={withUrl} subalbums={[]} />);
    expect(screen.getByText(/Website:/i)).toBeInTheDocument();
    const ext = screen.getByRole('link', { name: 'Example' });
    expect(ext).toHaveAttribute('href', 'https://example.com');
  });

  it('thumbnail link navigates to album', () => {
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
    const link = screen.getByRole('link', { name: /open album: test album/i });
    expect(link).toHaveAttribute('href', '/album/1');
  });
});

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
  it('renders album title', () => {
    render(
      <RootAlbumListBlock album={baseAlbum} subalbums={[]} />,
    );
    expect(screen.getByText('Test Album')).toBeInTheDocument();
    const titleLink = screen.getByRole('link', { name: /open album: test album/i });
    expect(titleLink).toBeInTheDocument();
    expect(titleLink).toHaveAttribute('href', '/album/1');
  });

  it('title link navigates to album page', () => {
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
    const h2 = screen.getByRole('heading', { name: 'Test Album' });
    const titleLink = h2.querySelector('a');
    expect(titleLink).toBeInTheDocument();
    expect(titleLink).toHaveAttribute('href', '/album/1');
  });

  it('title link has correct accessibility attributes', () => {
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
    const h2 = screen.getByRole('heading', { name: 'Test Album' });
    const titleLink = h2.querySelector('a');
    expect(titleLink).toHaveAttribute('aria-label', 'Open album: Test Album');
  });

  it('hides description when missing', () => {
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('shows description when present', () => {
    render(<RootAlbumListBlock album={albumWithDesc} subalbums={[]} />);
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders BBCode in description', () => {
    const albumWithBBCodeDesc: Album = {
      ...baseAlbum,
      id: 30,
      description: '[b]bold[/b] text',
    } as Album;
    const { container } = render(<RootAlbumListBlock album={albumWithBBCodeDesc} subalbums={[]} />);
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getByText(' text')).toBeInTheDocument();
    const descPara = container.querySelector('.root-album-list-block-description');
    expect(descPara).toBeInTheDocument();
    const strong = descPara?.querySelector('strong');
    expect(strong).toBeInTheDocument();
    expect(strong).toHaveTextContent('bold');
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

  it('shows all subalbum links and no "... And much more" when ≤6 subalbums', () => {
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

  it('shows all 6 subalbum links and no "... And much more" when exactly 6 subalbums', () => {
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
    expect(screen.getByRole('link', { name: 'Sub E' })).toBeInTheDocument();
    expect(screen.queryByText(/\.\.\. And much more/i)).not.toBeInTheDocument();
  });

  it('shows only 6 subalbum links and "... And much more" when >6 subalbums', () => {
    const subs: Album[] = [
      makeSub(10, 'Parent Album', 1609459200),
      makeSub(11, 'Sub A', 1609459100),
      makeSub(12, 'Sub B', 1609459000),
      makeSub(13, 'Sub C', 1609458900),
      makeSub(14, 'Sub D', 1609458800),
      makeSub(15, 'Sub E', 1609458700),
      makeSub(16, 'Sub F', 1609458600),
    ];
    render(<RootAlbumListBlock album={baseAlbum} subalbums={subs} />);
    expect(screen.getByText(/Subalbums:/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Parent Album' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub A' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub B' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub C' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub D' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub E' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sub F' })).not.toBeInTheDocument();
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


  describe('HTML Entity Decoding', () => {
    it('decodes HTML entities in main album title', () => {
      const albumWithEntities: Album = {
        ...baseAlbum,
        title: 'Album &amp; Photos',
      };
      render(<RootAlbumListBlock album={albumWithEntities} subalbums={[]} />);
      expect(screen.getByText('Album & Photos')).toBeInTheDocument();
    });

    it('decodes double-encoded HTML entities in title', () => {
      const albumWithEntities: Album = {
        ...baseAlbum,
        title: 'Album &amp;amp; More',
      };
      render(<RootAlbumListBlock album={albumWithEntities} subalbums={[]} />);
      expect(screen.getByText('Album & More')).toBeInTheDocument();
    });

    it('decodes HTML entities in aria-label', () => {
      const albumWithEntities: Album = {
        ...baseAlbum,
        title: 'Album &amp; Photos',
      };
      render(<RootAlbumListBlock album={albumWithEntities} subalbums={[]} />);
      const titleLink = screen.getByRole('link', { name: /open album: album & photos/i });
      expect(titleLink).toBeInTheDocument();
    });

    it('decodes HTML entities in subalbum titles', () => {
      const sub: Album = {
        ...mockAlbumWithChildren,
        type: 'GalleryAlbumItem',
        id: 42,
        title: 'Subalbum &amp; More',
      } as Album;
      render(<RootAlbumListBlock album={baseAlbum} subalbums={[sub]} />);
      expect(screen.getByText('Subalbum & More')).toBeInTheDocument();
    });

    it('decodes HTML entities with BBCode formatting', () => {
      const albumWithBoth: Album = {
        ...baseAlbum,
        title: '[b]Album &amp; Photos[/b]',
      };
      const { container } = render(<RootAlbumListBlock album={albumWithBoth} subalbums={[]} />);
      expect(screen.getByText('Album & Photos')).toBeInTheDocument();
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('Album & Photos');
    });
  });

  describe('Security - HTML Injection Prevention', () => {
    it('escapes HTML entities in titles (React default escaping)', () => {
      const albumWithScript: Album = {
        ...baseAlbum,
        title: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      };
      const { container } = render(<RootAlbumListBlock album={albumWithScript} subalbums={[]} />);
      // React should escape the decoded <script> tags
      expect(screen.getByText('<script>alert("XSS")</script>')).toBeInTheDocument();
      // Verify no actual script tag exists in DOM
      expect(container.querySelector('script')).not.toBeInTheDocument();
    });

    it('does not use dangerouslySetInnerHTML', () => {
      const albumWithHTML: Album = {
        ...baseAlbum,
        title: '[b]Bold[/b]',
      };
      const { container } = render(<RootAlbumListBlock album={albumWithHTML} subalbums={[]} />);
      // Verify BBCode is parsed to React elements, not raw HTML
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      // Verify no dangerouslySetInnerHTML was used (no raw HTML strings)
      expect(container.innerHTML).not.toContain('[b]');
    });
  });
});

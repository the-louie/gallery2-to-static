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
    const blockLink = screen.getByRole('link', { name: /open album: test album/i });
    expect(blockLink).toBeInTheDocument();
    expect(blockLink).toHaveAttribute('href', '/test_album');
  });

  it('block link is the single link to the album and wraps title area', () => {
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
    const blockLink = screen.getByRole('link', { name: /open album: test album/i });
    expect(blockLink).toHaveAttribute('href', '/test_album');
    expect(blockLink).toHaveClass('root-album-list-block-block-link');
    const h2 = screen.getByRole('heading', { name: 'Test Album' });
    expect(blockLink).toContainElement(h2);
  });

  it('block link has correct accessibility attributes', () => {
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
    const blockLink = screen.getByRole('link', { name: /open album: test album/i });
    expect(blockLink).toHaveAttribute('aria-label', 'Open album: Test Album');
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

  it('renders [url] in description as link', () => {
    const albumWithUrlInDesc: Album = {
      ...baseAlbum,
      id: 31,
      description: 'See [url=https://example.com]example[/url] for more.',
    } as Album;
    const { container } = render(<RootAlbumListBlock album={albumWithUrlInDesc} subalbums={[]} />);
    const descPara = container.querySelector('.root-album-list-block-description');
    expect(descPara).toBeInTheDocument();
    const link = descPara?.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveTextContent('example');
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
    expect(screen.queryByRole('region', { name: 'Subalbums' })).not.toBeInTheDocument();
  });

  it('shows Subalbums section with links when subalbums present', () => {
    const sub: Album = { ...mockAlbumWithChildren, type: 'GalleryAlbumItem' } as Album;
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[sub]} />);
    expect(screen.getByRole('region', { name: 'Subalbums' })).toBeInTheDocument();
    const subLink = screen.getByRole('link', { name: 'Parent Album' });
    expect(subLink).toHaveAttribute('href', '/album/10');
  });

  it('shows all subalbum links and no "...and more!" when ≤10 subalbums', () => {
    const sub1: Album = { ...mockAlbumWithChildren, type: 'GalleryAlbumItem', id: 10, title: 'Parent Album', timestamp: 1609459200 } as Album;
    const sub2: Album = { ...mockAlbum, type: 'GalleryAlbumItem', id: 11, title: 'Sub A', timestamp: 1609459100 } as Album;
    const sub3: Album = { ...mockAlbum, type: 'GalleryAlbumItem', id: 12, title: 'Sub B', timestamp: 1609459000 } as Album;
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[sub1, sub2, sub3]} />);
    expect(screen.getByRole('region', { name: 'Subalbums' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Parent Album' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub A' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sub B' })).toBeInTheDocument();
    expect(screen.queryByText('...and more!')).not.toBeInTheDocument();
  });

  it('shows all 10 subalbum links and no "...and more!" when exactly 10 subalbums', () => {
    const subs: Album[] = [
      makeSub(10, 'Sub 1', 1609459200),
      makeSub(11, 'Sub 2', 1609459100),
      makeSub(12, 'Sub 3', 1609459000),
      makeSub(13, 'Sub 4', 1609458900),
      makeSub(14, 'Sub 5', 1609458800),
      makeSub(15, 'Sub 6', 1609458700),
      makeSub(16, 'Sub 7', 1609458600),
      makeSub(17, 'Sub 8', 1609458500),
      makeSub(18, 'Sub 9', 1609458400),
      makeSub(19, 'Sub 10', 1609458300),
    ];
    render(<RootAlbumListBlock album={baseAlbum} subalbums={subs} />);
    expect(screen.getByRole('region', { name: 'Subalbums' })).toBeInTheDocument();
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByRole('link', { name: `Sub ${i}` })).toBeInTheDocument();
    }
    expect(screen.queryByText('...and more!')).not.toBeInTheDocument();
  });

  it('shows only 10 subalbum links and "...and more!" when >10 subalbums', () => {
    const subs: Album[] = [
      makeSub(10, 'Sub 1', 1609459200),
      makeSub(11, 'Sub 2', 1609459100),
      makeSub(12, 'Sub 3', 1609459000),
      makeSub(13, 'Sub 4', 1609458900),
      makeSub(14, 'Sub 5', 1609458800),
      makeSub(15, 'Sub 6', 1609458700),
      makeSub(16, 'Sub 7', 1609458600),
      makeSub(17, 'Sub 8', 1609458500),
      makeSub(18, 'Sub 9', 1609458400),
      makeSub(19, 'Sub 10', 1609458300),
      makeSub(20, 'Sub 11', 1609458200),
    ];
    render(<RootAlbumListBlock album={baseAlbum} subalbums={subs} />);
    expect(screen.getByRole('region', { name: 'Subalbums' })).toBeInTheDocument();
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByRole('link', { name: `Sub ${i}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole('link', { name: 'Sub 11' })).not.toBeInTheDocument();
    expect(screen.getByText('...and more!')).toBeInTheDocument();
  });

  it('renders BBCode-formatted subalbum title', () => {
    const sub: Album = {
      ...mockAlbumWithChildren,
      type: 'GalleryAlbumItem',
      id: 42,
      title: '[b]Bold Subalbum[/b]',
    } as Album;
    const { container } = render(<RootAlbumListBlock album={baseAlbum} subalbums={[sub]} />);
    expect(screen.getByRole('region', { name: 'Subalbums' })).toBeInTheDocument();
    expect(screen.getByText('Bold Subalbum')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Bold Subalbum' });
    expect(link).toHaveAttribute('href', '/album/42');
    const list = container.querySelector('.root-album-list-block-subalbums-list');
    expect(list?.querySelector('strong')).toHaveTextContent('Bold Subalbum');
  });

  it('shows Images meta row when album has totalDescendantImageCount', () => {
    const albumWithCount: Album = {
      ...baseAlbum,
      id: 15,
      totalDescendantImageCount: 100,
    } as Album;
    render(<RootAlbumListBlock album={albumWithCount} subalbums={[]} />);
    expect(screen.getByText('Images')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('does not show Images meta row when totalDescendantImageCount is missing', () => {
    render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
    expect(screen.queryByText('Images')).not.toBeInTheDocument();
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

  describe('Block link and exclusions', () => {
    it('block link exists with href to album and contains no duplicate album link', () => {
      const { container } = render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
      const blockLink = screen.getByRole('link', { name: /open album: test album/i });
      expect(blockLink).toHaveAttribute('href', '/test_album');
      const albumLinksInside = blockLink.querySelectorAll('a[href="/test_album"]');
      expect(albumLinksInside.length).toBe(0);
    });

    it('website link is not inside the block link', () => {
      const withUrl: Album = {
        ...baseAlbum,
        id: 20,
        summary: '[url=https://example.com]Event site[/url]',
      } as Album;
      const { container } = render(<RootAlbumListBlock album={withUrl} subalbums={[]} />);
      const blockLink = container.querySelector('.root-album-list-block-block-link');
      const websiteLink = screen.getByRole('link', { name: 'Event site' });
      expect(blockLink).not.toContainElement(websiteLink);
      expect(websiteLink).toHaveAttribute('href', 'https://example.com');
    });

    it('subalbum links are not inside the block link', () => {
      const sub: Album = { ...mockAlbumWithChildren, type: 'GalleryAlbumItem', id: 99, title: 'Sub Album' } as Album;
      const { container } = render(<RootAlbumListBlock album={baseAlbum} subalbums={[sub]} />);
      const blockLink = container.querySelector('.root-album-list-block-block-link');
      const subLink = screen.getByRole('link', { name: 'Sub Album' });
      expect(blockLink).not.toContainElement(subLink);
      expect(subLink).toHaveAttribute('href', '/album/99');
    });

    it('only one link to the album page (the block link)', () => {
      render(<RootAlbumListBlock album={baseAlbum} subalbums={[]} />);
      const albumLinks = screen.getAllByRole('link').filter((el) => el.getAttribute('href') === '/test_album');
      expect(albumLinks.length).toBe(1);
      expect(albumLinks[0]).toHaveAttribute('aria-label', 'Open album: Test Album');
    });
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

    it('decodes Latin accent entities in main title', () => {
      const albumWithAccent: Album = {
        ...baseAlbum,
        title: 'Daniel Lehn&eacute;r',
      };
      render(<RootAlbumListBlock album={albumWithAccent} subalbums={[]} />);
      expect(screen.getByText('Daniel Lehnér')).toBeInTheDocument();
    });
  });

  describe('Highlight image background', () => {
    it('does not render background layer when album has no highlightImageUrl', () => {
      const albumNoHighlight: Album = {
        ...baseAlbum,
        highlightImageUrl: undefined,
        thumbnailPathComponent: undefined,
        thumbnailUrlPath: undefined,
      } as Album;
      const { container } = render(<RootAlbumListBlock album={albumNoHighlight} subalbums={[]} />);
      const bg = container.querySelector('.root-album-list-block-bg');
      expect(bg).not.toBeInTheDocument();
    });

    it('renders background layer when album has highlightImageUrl', () => {
      const albumWithHighlight: Album = {
        ...baseAlbum,
        id: 99,
        highlightImageUrl: 'path/to/highlight.jpg',
      } as Album;
      const { container } = render(<RootAlbumListBlock album={albumWithHighlight} subalbums={[]} />);
      const bg = container.querySelector('.root-album-list-block-bg');
      expect(bg).toBeInTheDocument();
      expect(bg).toHaveAttribute('role', 'presentation');
      expect(bg).toHaveAttribute('aria-hidden', 'true');
      expect((bg as HTMLElement).style.backgroundImage).toContain('path/to/highlight.jpg');
    });

    it('does not render highlight background when album has only thumbnail path and no highlightImageUrl', () => {
      const albumThumbOnly: Album = {
        ...baseAlbum,
        thumbnailPathComponent: 'album/thumb.jpg',
        thumbnailUrlPath: undefined,
        highlightImageUrl: undefined,
      } as Album;
      const { container } = render(<RootAlbumListBlock album={albumThumbOnly} subalbums={[]} />);
      const bg = container.querySelector('.root-album-list-block-bg');
      expect(bg).not.toBeInTheDocument();
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

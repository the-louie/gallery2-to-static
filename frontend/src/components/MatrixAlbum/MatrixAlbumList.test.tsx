import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { MatrixAlbumList } from './MatrixAlbumList';
import type { Album, Child } from '@/types';

vi.mock('@/hooks/useSubalbumsMap', () => ({
  useSubalbumsMap: (ids: number[]) => ({
    subalbumsMap: new Map(ids.map((id) => [id, id === 211 ? subalbums : []])),
    isLoading: false,
    error: null,
  }),
}));

const subalbums = [
  { id: 342, type: 'GalleryAlbumItem', title: 'Hackers At Large 2001', path: '/internationella/hackers_at_large_2001' },
  { id: 487, type: 'GalleryAlbumItem', title: 'The Party 01', path: '/internationella/the_party_01' },
] as unknown as Album[];
const international = {
  id: 211, type: 'GalleryAlbumItem', hasChildren: true, title: 'Internationella', timestamp: 1114000000, viewCount: 17910,
  summary: 'Events from around the world.', path: '/internationella', childCount: 12, totalDescendantCount: 3947,
  highlightThumbnailUrlPath: 'international/t__240.jpg',
} as unknown as Child;
const skogslan = {
  id: 540232, type: 'GalleryAlbumItem', hasChildren: true, title: 'Skogslan', timestamp: 1258600000, viewCount: 2762,
  path: '/skogslan', childCount: 1, totalDescendantCount: 9, highlightThumbnailUrlPath: 'skogslan/t__a.jpg',
} as unknown as Child;
const info = (cell: Element) => [...cell.querySelectorAll('.summary')].map((s) => s.textContent);

describe('MatrixAlbumList (classic-list theme, S13 T-09, QA-09)', () => {
  it('one row per album as on the 2013 root page: thumbnail cell, "Album: title" + summary + info, sub-album tree', () => {
    render(<MatrixAlbumList albumPath="/" items={[international, skogslan]} />);
    const rows = document.querySelectorAll('table.gsAlbumList tr');
    expect(rows).toHaveLength(2);
    const cells = rows[0].querySelectorAll('td');
    expect(cells).toHaveLength(3);
    expect(cells[0]).toHaveClass('giAlbumCell', 'gcBackground1');
    const img = screen.getByRole('img', { name: 'Internationella' });
    expect(img).toHaveAttribute('width', '150');
    expect(img.closest('a')).toHaveAttribute('href', '/internationella/');
    expect(cells[1].querySelector('.giTitle')).toHaveTextContent(/^Album: Internationella$/);
    expect(cells[1].querySelector('.giDescription')).toHaveTextContent('Events from around the world.');
    expect(info(cells[1])).toEqual(['Date: 04/20/2005', 'Size: 12 items (3947 items total)', 'Views: 17910']);
    expect(cells[2]).toHaveClass('tree');
    expect(cells[2].querySelector('h4')).toHaveTextContent('Subalbums:');
    const links = [...cells[2].querySelectorAll('li a')];
    expect(links.map((a) => a.textContent)).toEqual(['Hackers At Large 2001', 'The Party 01']);
    expect(links[0]).toHaveAttribute('href', '/internationella/hackers_at_large_2001/');
  });

  it('an album without sub-albums keeps an empty tree cell; no pager inside the list', () => {
    render(<MatrixAlbumList albumPath="/" items={[skogslan]} />);
    const tree = document.querySelector('td.tree')!;
    expect(tree.querySelector('h4')).toBeNull();
    expect(document.querySelector('.gsPages')).toBeNull();
  });
});

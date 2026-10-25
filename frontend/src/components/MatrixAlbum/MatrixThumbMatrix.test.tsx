import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { MatrixThumbMatrix } from './MatrixThumbMatrix';
import type { Child } from '@/types';

const photo = {
  id: 57215, type: 'GalleryPhotoItem', title: 'CIMG0053_.JPG', timestamp: 1132995297, viewCount: 1074,
  pathComponent: 'dreamhack/dhw05/dhphotos/CIMG0053_.JPG', urlPath: 'dreamhack/dhw05/dhphotos/CIMG0053_.JPG',
} as unknown as Child;
const album = {
  id: 23281, type: 'GalleryAlbumItem', title: 'DH-Photo', timestamp: 1118300000, viewCount: 65057,
  summary: 'OFFICIELLA BILDER', path: '/dreamhack/dreamhack_winter_05/dh-photo', childCount: 9,
  totalDescendantImageCount: 864, highlightThumbnailUrlPath: 'dreamhack/dhw05/dhw05dh/t__a.jpg',
} as unknown as Child;
const info = (cell: Element) => [...cell.querySelectorAll('.summary')].map((s) => s.textContent);

describe('MatrixThumbMatrix (THEME-01)', () => {
  it('photo cell as in the 2006 dhphotos page: 150px thumbnail, title, Date, Views', () => {
    render(<MatrixThumbMatrix albumPath="/dh/dhw05/" items={[photo]} />);
    const cell = document.querySelector('td.giItemCell')!;
    const img = screen.getByRole('img', { name: 'CIMG0053_.JPG' });
    expect(img).toHaveAttribute('width', '150');
    expect(img).toHaveAttribute('src', expect.stringContaining('t__CIMG0053_.JPG'));
    expect(img.closest('a')).toHaveAttribute('href', '/dh/dhw05/cimg0053_');
    expect(cell.querySelector('.giTitle')).toHaveTextContent('CIMG0053_.JPG');
    expect(info(cell)).toEqual(['Date: 11/26/2005', 'Views: 1074']);
  });

  it('album cell as in the 2006 dhw05 page: grey cell, summary, Size with total, Views', () => {
    render(<MatrixThumbMatrix albumPath="/dh/" items={[album]} />);
    const cell = document.querySelector('td.giAlbumCell.gcBackground1')!;
    expect(cell.querySelector('.giTitle')).toHaveTextContent(/^DH-Photo$/);
    expect(cell.querySelector('.giDescription')).toHaveTextContent('OFFICIELLA BILDER');
    expect(info(cell)).toEqual(['Date: 06/09/2005', 'Size: 9 items (864 items total)', 'Views: 65057']);
    expect(screen.getByRole('img', { name: 'DH-Photo' }).closest('a')).toHaveAttribute('href', '/dreamhack/dreamhack_winter_05/dh-photo/');
  });

  it('rows of three; a short last row is filled with empty cells', () => {
    const items = Array.from({ length: 4 }, (_, i) => ({ ...photo, id: i, title: `P${i}`, pathComponent: `p${i}.jpg` })) as Child[];
    render(<MatrixThumbMatrix albumPath="/" items={items} />);
    const rows = document.querySelectorAll('.gsThumbMatrix tr');
    expect(rows).toHaveLength(2);
    expect(rows[1].querySelectorAll('td')).toHaveLength(3);
    expect(rows[1].querySelectorAll('td.giItemCell')).toHaveLength(1);
  });

  it('no views line without a count; "no thumbnail" for a photo without one', () => {
    render(<MatrixThumbMatrix albumPath="/" items={[{ ...photo, viewCount: 0, thumbnailMissing: true } as Child]} />);
    expect(document.querySelector('.viewCount')).toBeNull();
    expect(screen.getByRole('link', { name: 'no thumbnail' })).toHaveAttribute('href', '/cimg0053_');
  });
});

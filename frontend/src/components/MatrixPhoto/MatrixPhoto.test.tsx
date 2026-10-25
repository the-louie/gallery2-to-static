import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, userEvent } from '@/test-utils';
import { Routes, Route, useLocation } from 'react-router-dom';
import { MatrixPhoto } from './MatrixPhoto';
import { useAlbumData } from '@/hooks/useAlbumData';
import type { AlbumMetadata, Child } from '@/types';

vi.mock('@/hooks/useAlbumData', () => ({ useAlbumData: vi.fn() }));

const PATH = '/dh/battlefrag.com';
const metadata = {
  albumId: 57207, albumTitle: 'Battlefrag.com', albumDescription: null, albumTimestamp: null, ownerName: null,
  breadcrumbPath: [{ id: 7, title: 'Home', path: '/' }, { id: 57207, title: 'Battlefrag.com', path: PATH }],
} as AlbumMetadata;
const photo = (id: number, name: string, w = 1200, h = 1600) =>
  ({
    id, type: 'GalleryPhotoItem', title: name, pathComponent: `x/${name}`, urlPath: `x/${name}`,
    timestamp: 1132995297, ownerName: 'Patrick', width: w, height: h,
  }) as unknown as Child;
const children = [
  photo(1, 'CIMG0053_.JPG'),
  { id: 9, type: 'GalleryAlbumItem', title: 'Sub', path: `${PATH}/sub` } as unknown as Child,
  photo(2, 'CIMG0053h.JPG'),
  photo(3, 'small.jpg', 640, 480),
];

function Where() {
  const l = useLocation();
  return <span data-testid="where">{l.pathname + l.search}</span>;
}
const show = (imageId: number, url = `${PATH}/x`) =>
  render(
    <Routes>
      <Route path="*" element={<><MatrixPhoto albumId={57207} imageId={imageId} /><Where /></>} />
    </Routes>,
    { initialEntries: [url] },
  );
const navLinks = () =>
  [...document.querySelectorAll('.gbNavigator')[0].querySelectorAll('a')].map((a) => `${a.className}:${a.getAttribute('href')}`);

describe('MatrixPhoto (THEME-01)', () => {
  beforeEach(() => {
    vi.mocked(useAlbumData).mockReturnValue({ data: children, metadata, isLoading: false, error: null, refetch: vi.fn() });
  });

  it('header as in the 2006 photo page: title, Date, Owner, Size select, Full size link', () => {
    show(1);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('CIMG0053_.JPG');
    expect([...document.querySelectorAll('.block-core-ItemInfo .summary')].map((s) => s.textContent)).toEqual([
      'Date: 11/26/2005',
      'Owner: Patrick',
    ]);
    const select = screen.getByRole('combobox', { name: 'Size' });
    expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['768x1024', '1200x1600']);
    expect(select).toHaveValue('resized');
    expect(screen.getByRole('link', { name: '1200x1600' })).toHaveAttribute('href', `${PATH}/cimg0053_?size=full`);
    const img = screen.getByRole('img', { name: 'CIMG0053_.JPG' });
    expect(img).toHaveAttribute('width', '768');
    expect(img).toHaveAttribute('src', '/g2data/albums/x/CIMG0053_.JPG');
  });

  it('navigator over the photos only (sub-albums skipped)', () => {
    show(1);
    expect(navLinks()).toEqual([`next:${PATH}/cimg0053h`, `last:${PATH}/small`]);
    expect(document.querySelector('.next-and-last')).toHaveClass('no-previous');
  });

  it('a middle photo has first/previous too', () => {
    show(2);
    expect(navLinks()).toEqual([`next:${PATH}/small`, `last:${PATH}/small`, `first:${PATH}/cimg0053_`, `previous:${PATH}/cimg0053_`]);
  });

  it('?size=full shows the original; the select switches between the two', async () => {
    show(1, `${PATH}/cimg0053_?size=full`);
    expect(screen.getByRole('img', { name: 'CIMG0053_.JPG' })).toHaveAttribute('width', '1200');
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Size' }), 'resized');
    expect(screen.getByTestId('where')).toHaveTextContent(new RegExp(`^${PATH}/cimg0053_$`));
  });

  it('a photo of 1024px or less has only its own size', () => {
    show(3);
    const select = screen.getByRole('combobox', { name: 'Size' });
    expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toEqual(['640x480']);
    expect(screen.getByRole('img', { name: 'small.jpg' })).toHaveAttribute('width', '640');
  });

  it('arrow keys step through the photos', () => {
    show(2);
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByTestId('where')).toHaveTextContent(`${PATH}/small`);
  });

  it('the thumbnail stands in, blurred, until the photo has loaded', () => {
    show(1);
    expect(document.querySelector('.gsImagePlaceholder')).toHaveAttribute('src', expect.stringContaining('t__CIMG0053_.JPG'));
    fireEvent.load(screen.getByRole('img', { name: 'CIMG0053_.JPG' }));
    expect(document.querySelector('.gsImagePlaceholder')).toBeNull();
  });

  it('a photo not in the album, and the loading state', () => {
    show(99);
    expect(screen.getByRole('alert')).toHaveTextContent('This photo is not in the album.');
    vi.mocked(useAlbumData).mockReturnValue({ data: null, metadata: null, isLoading: true, error: null, refetch: vi.fn() });
    show(1);
    expect(screen.getByRole('status', { name: 'Loading photo' })).toBeInTheDocument();
  });
});

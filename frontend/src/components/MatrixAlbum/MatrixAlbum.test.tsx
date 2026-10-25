import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { Routes, Route, useLocation } from 'react-router-dom';
import { MatrixAlbum } from './MatrixAlbum';
import { useAlbumData } from '@/hooks/useAlbumData';
import type { AlbumMetadata, Child } from '@/types';

vi.mock('@/hooks/useAlbumData', () => ({ useAlbumData: vi.fn() }));

const PATH = '/dreamhack/dreamhack_winter_05/battlefrag.com';
const metadata = {
  albumId: 57207,
  albumTitle: 'Battlefrag.com',
  albumDescription: '[url=http://www.battlefrag.com]Battlefrag[/url]s bilder från DHW05',
  albumTimestamp: 1133038025,
  ownerName: 'Ann-peter',
  totalDescendantImageCount: 287,
  breadcrumbPath: [
    { id: 7, title: 'Home', path: '/' },
    { id: 57207, title: 'Battlefrag.com', path: PATH },
  ],
} as AlbumMetadata;
const photos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: 1000 + i, type: 'GalleryPhotoItem', title: `CIMG${i}.JPG`, pathComponent: `x/CIMG${i}.JPG`,
  })) as unknown as Child[];

function at(children: Child[], meta: AlbumMetadata = metadata) {
  vi.mocked(useAlbumData).mockReturnValue({ data: children, metadata: meta, isLoading: false, error: null, refetch: vi.fn() });
}

function Where() {
  const l = useLocation();
  return <span data-testid="where">{l.pathname + l.search}</span>;
}

const show = (url: string) =>
  render(
    <Routes>
      <Route path="*" element={<><MatrixAlbum albumId={57207} /><Where /></>} />
    </Routes>,
    { initialEntries: [url] },
  );

const navTexts = () =>
  [...document.querySelectorAll('.gbNavigator')].map((n) =>
    [...n.querySelectorAll('a')].map((a) => `${a.className}:${a.getAttribute('href')}`).join(' '),
  );

describe('MatrixAlbum (THEME-01)', () => {
  beforeEach(() => at(photos(287)));

  it('header block: title, description with BBCode, Date / Owner / Size', () => {
    show(`${PATH}/`);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Battlefrag.com');
    expect(screen.getByRole('link', { name: 'Battlefrag' })).toHaveAttribute('href', 'http://www.battlefrag.com');
    const info = document.querySelector('.giInfo')!;
    expect([...info.querySelectorAll('.summary')].map((s) => s.textContent)).toEqual([
      'Date: 11/26/2005',
      'Owner: Ann-peter',
      'Size: 287 items',
    ]);
  });

  it('page 1 of 24: next/last only, 12 items, pager "1 2 3 4 5 6 ... 24"', () => {
    show(`${PATH}/`);
    expect(navTexts()).toEqual([
      `next:${PATH}/?page=2 last:${PATH}/?page=24`,
      `next:${PATH}/?page=2 last:${PATH}/?page=24`,
    ]);
    expect(document.querySelector('.next-and-last')).toHaveClass('no-previous');
    expect(document.querySelectorAll('.giItemCell')).toHaveLength(12);
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent(/^Page: 123456...24$/);
    expect(screen.getByRole('link', { name: '24' })).toHaveAttribute('href', `${PATH}/?page=24`);
  });

  it('a middle page has first/previous too; the last page has no next/last', () => {
    show(`${PATH}/?page=2`);
    expect(navTexts()[0]).toBe(`next:${PATH}/?page=3 last:${PATH}/?page=24 first:${PATH}/ previous:${PATH}/`);
    expect(document.querySelector('.next-and-last')).not.toHaveClass('no-previous');
    expect(screen.getByText('CIMG12.JPG')).toBeInTheDocument();
  });

  it('the last page', () => {
    show(`${PATH}/?page=24`);
    expect(navTexts()[0]).toBe(`first:${PATH}/ previous:${PATH}/?page=23`);
    expect(document.querySelectorAll('.giItemCell')).toHaveLength(11);
  });

  it('a page past the end goes to the last page; a bad page number is page 1', () => {
    show(`${PATH}/?page=99`);
    expect(screen.getByTestId('where')).toHaveTextContent(`${PATH}/?page=24`);
  });

  it('one page: no navigator, pager "Page: 1"', () => {
    at(photos(5));
    show(`${PATH}/?page=x`);
    expect(document.querySelector('.gbNavigator')).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent(/^Page: 1$/);
  });

  it('an album with sub-albums shows the items total', () => {
    const subs = [
      { id: 1, type: 'GalleryAlbumItem', title: 'A', path: '/a', totalDescendantImageCount: 100 },
      { id: 2, type: 'GalleryAlbumItem', title: 'B', path: '/b', totalDescendantImageCount: 150 },
    ] as unknown as Child[];
    at(subs, { ...metadata, totalDescendantImageCount: 250 });
    show(`${PATH}/`);
    expect(document.querySelector('.size')).toHaveTextContent('Size: 2 items (252 items total)');
  });

  it('uses the exported items total when the data has it', () => {
    at(photos(5), { ...metadata, totalDescendantImageCount: 5, totalDescendantCount: 5 });
    show(`${PATH}/`);
    expect(document.querySelector('.size')).toHaveTextContent(/^Size: 5 items$/);
    at(photos(5), { ...metadata, totalDescendantCount: 878 });
    show(`${PATH}/`);
    expect(document.querySelectorAll('.size')[1]).toHaveTextContent('Size: 5 items (878 items total)');
  });

  it('an empty album says so', () => {
    at([]);
    show(`${PATH}/`);
    expect(screen.getByText('This album is empty.')).toBeInTheDocument();
    expect(document.querySelector('.size')).toBeNull();
  });

  it('loading and error states', () => {
    vi.mocked(useAlbumData).mockReturnValue({ data: null, metadata: null, isLoading: true, error: null, refetch: vi.fn() });
    show(`${PATH}/`);
    expect(screen.getByRole('status', { name: 'Loading album' })).toBeInTheDocument();
  });
});

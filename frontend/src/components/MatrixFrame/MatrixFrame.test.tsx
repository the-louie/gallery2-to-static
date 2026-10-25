import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { MatrixFrame } from './MatrixFrame';
import { useMatrixLocation } from '@/hooks/useMatrixLocation';
import type { MatrixLocation } from '@/utils/matrixLocation';

vi.mock('@/hooks/useMatrixLocation', () => ({ useMatrixLocation: vi.fn() }));
vi.mock('@/hooks/useSiteMetadata', () => ({ useSiteMetadata: () => ({ siteName: 'lanbilder.se' }) }));

const battlefrag = {
  album: {
    metadata: {
      albumId: 57207,
      albumTitle: 'Battlefrag.com',
      breadcrumbPath: [
        { id: 7, title: 'Home', path: '/' },
        { id: 4352, title: 'DreamHack', path: '/dreamhack' },
        { id: 23271, title: 'DreamHack Winter 05', path: '/dreamhack/dreamhack_winter_05' },
        { id: 57207, title: 'Battlefrag.com', path: '/dreamhack/dreamhack_winter_05/battlefrag.com' },
      ],
    },
    children: [],
  },
  photo: null,
} as unknown as MatrixLocation;

const at = (location: MatrixLocation | null) =>
  vi.mocked(useMatrixLocation).mockReturnValue({ location, isLoading: false });

describe('MatrixFrame (THEME-01)', () => {
  beforeEach(() => at(battlefrag));

  it('breadcrumb: site name for the root, album links with a trailing slash, current album as text', () => {
    render(<MatrixFrame>page</MatrixFrame>, { initialEntries: ['/dreamhack/dreamhack_winter_05/battlefrag.com/'] });
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const links = nav.querySelectorAll('a');
    expect([...links].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['lanbilder.se', '/'],
      ['DreamHack', '/dreamhack/'],
      ['DreamHack Winter 05', '/dreamhack/dreamhack_winter_05/'],
    ]);
    const current = nav.querySelector('[aria-current="page"]');
    expect(current).toHaveTextContent('Battlefrag.com');
    expect(current).toHaveClass('BreadCrumb-4');
    expect(links[0]).toHaveClass('BreadCrumb-1');
  });

  it('on a photo the album is a link and the photo title is the current crumb', () => {
    at({ ...battlefrag, photo: { id: 57215, title: 'CIMG0053_.JPG' } } as unknown as MatrixLocation);
    render(<MatrixFrame>page</MatrixFrame>, { initialEntries: ['/dreamhack/dreamhack_winter_05/battlefrag.com/cimg0053_'] });
    expect(screen.getByRole('link', { name: 'Battlefrag.com' })).toHaveAttribute(
      'href',
      '/dreamhack/dreamhack_winter_05/battlefrag.com/',
    );
    expect(screen.getByText('CIMG0053_.JPG')).toHaveAttribute('aria-current', 'page');
  });

  it('pages without an album show the site name only', () => {
    at(null);
    render(<MatrixFrame>page</MatrixFrame>, { initialEntries: ['/not-found'] });
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toHaveTextContent(/^lanbilder\.se$/);
    expect(screen.getByRole('link', { name: 'lanbilder.se' })).toHaveAttribute('href', '/');
  });

  it('renders the sidebar, the page in main, and the three footer badges', () => {
    render(<MatrixFrame sidebar={<p>side</p>}>the page</MatrixFrame>);
    expect(screen.getByRole('complementary')).toHaveTextContent('side');
    expect(screen.getByRole('main')).toHaveTextContent('the page');
    expect(screen.getByAltText('XHTML 1.0')).toBeInTheDocument();
    expect(screen.getByAltText('Gallery 2.0')).toBeInTheDocument();
    expect(screen.getByAltText('G2.0: Unpossible!')).toBeInTheDocument();
  });
});

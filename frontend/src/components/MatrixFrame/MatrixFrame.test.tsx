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

  it('titles the page like Gallery 2: the item title, the site name on the root (T-12)', () => {
    render(<MatrixFrame>page</MatrixFrame>, { initialEntries: ['/dreamhack/dreamhack_winter_05/battlefrag.com/'] });
    expect(document.title).toBe('Battlefrag.com');
    expect(document.getElementById('gallery')).toHaveClass('g2-matrix');
    at({ ...battlefrag, photo: { id: 57215, title: 'CIMG0053_.JPG' } } as unknown as MatrixLocation);
    render(<MatrixFrame>page</MatrixFrame>, { initialEntries: ['/x/y'] });
    expect(document.title).toBe('CIMG0053_.JPG');
    at(null);
    render(<MatrixFrame>page</MatrixFrame>, { initialEntries: ['/search'] });
    expect(document.title).toBe('lanbilder.se');
  });

  it('shows the header image slot only when the build sets VITE_BANNER_SRC and VITE_BANNER_HREF', () => {
    render(<MatrixFrame>page</MatrixFrame>);
    expect(document.getElementById('gsHeader')).toBeNull();
    // random names, as served (BANNER-02): nothing in the URL names a banner or a size
    vi.stubEnv('VITE_BANNER_SRC', '/vu04lg/030gn6bs6zzx.jpg');
    vi.stubEnv('VITE_BANNER_SRC_2X', '/vu04lg/khpjl009qnsy.jpg');
    vi.stubEnv('VITE_BANNER_SRC_SMALL', '/vu04lg/wppw1eunbula.jpg');
    vi.stubEnv('VITE_BANNER_SRC_LARGE', '/vu04lg/u466yup58fa4.jpg');
    vi.stubEnv('VITE_BANNER_SRC_LARGE_2X', '/vu04lg/cd34xasasja5.jpg');
    vi.stubEnv('VITE_BANNER_HREF', 'https://glitched.se/sv/');
    vi.stubEnv('VITE_BANNER_ALT', 'Glitched');
    render(<MatrixFrame>page</MatrixFrame>);
    const link = document.querySelector('#gsHeader a')!;
    expect(link).toHaveAttribute('href', 'https://glitched.se/sv/');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const img = link.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/vu04lg/030gn6bs6zzx.jpg');
    expect(img).toHaveAttribute('srcset', '/vu04lg/030gn6bs6zzx.jpg, /vu04lg/khpjl009qnsy.jpg 2x');
    expect(img).toHaveAttribute('alt', 'Glitched');
    const sources = link.querySelectorAll('source');
    expect(sources[0]).toHaveAttribute('media', '(max-width: 759px)');
    expect(sources[1]).toHaveAttribute('media', '(min-width: 1024px)');
    expect(sources[1]).toHaveAttribute('srcset', '/vu04lg/u466yup58fa4.jpg, /vu04lg/cd34xasasja5.jpg 2x');
    // the markup gives ad-blockers nothing to match on (operator, 2026-10-26, BANNER-02): Gallery 2's own
    // #gsHeader, no banner/ad words, no width/height size attributes
    const slot = document.getElementById('gsHeader')!.outerHTML;
    expect(slot).not.toMatch(/banner|advert|sponsor|\bads?\b|\d{3}x\d{2}\b/i);
    expect(img).not.toHaveAttribute('width');
    expect(img).not.toHaveAttribute('height');
    vi.unstubAllEnvs();
  });

  it('pages without an album show the site name only', () => {
    at(null);
    render(<MatrixFrame>page</MatrixFrame>, { initialEntries: ['/not-found'] });
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toHaveTextContent(/^lanbilder\.se$/);
    expect(screen.getByRole('link', { name: 'lanbilder.se' })).toHaveAttribute('href', '/');
  });

  it('renders the sidebar, the page in main, and the three footer badges', () => {
    render(<MatrixFrame>the page</MatrixFrame>);
    expect(screen.getByRole('complementary')).toHaveTextContent('Advanced Search');
    expect(screen.getByRole('main')).toHaveTextContent('the page');
    expect(screen.getByAltText('XHTML 1.0')).toBeInTheDocument();
    expect(screen.getByAltText('Gallery 2.0')).toBeInTheDocument();
    expect(screen.getByAltText('G2.0: Unpossible!')).toBeInTheDocument();
  });
});

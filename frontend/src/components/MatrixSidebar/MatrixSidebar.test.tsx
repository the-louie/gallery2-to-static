import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, userEvent } from '@/test-utils';
import { MatrixSidebar } from './MatrixSidebar';
import type { AlbumFile, Child } from '@/types';
import type { MatrixLocation } from '@/utils/matrixLocation';

const mockNavigate = vi.fn();
const mockSetTheme = vi.fn();
let mockIsClassicList = false;
vi.mock('@/contexts/ThemeContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/ThemeContext')>()),
  useTheme: () => ({ setTheme: mockSetTheme, theme: 'classic', effectiveTheme: 'classic', isClassic: true, isClassicList: mockIsClassicList, isDark: false, isLight: false, availableThemes: [] }),
}));
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

const trail = [
  { id: 7, title: 'Home', path: '/' },
  { id: 4352, title: 'DreamHack', path: '/dreamhack' },
  { id: 23271, title: 'DreamHack Winter 05', path: '/dreamhack/dreamhack_winter_05' },
];
const names = ['DH-Photo', 'Bamsegrill', 'Battlefrag.com', 'DeaziD', 'eXinet', 'G3', 'Hinken', 'IQue', 'kasstkniw',
  'Lindmark', 'Louie', 'Mandisplutten', 'sebbz', 'TukTuk', 'virus84', 'Grattis louie!', 'mave', 'Alla vi som var på dreamhack'];
const dhw05 = {
  metadata: { albumId: 23271, albumTitle: 'DreamHack Winter 05', breadcrumbPath: trail },
  children: names.map((title, i) => ({
    id: 100 + i, type: 'GalleryAlbumItem', title, path: `/dreamhack/dreamhack_winter_05/a${i}`,
  })),
} as unknown as AlbumFile;
const battlefrag = {
  metadata: { albumId: 102, albumTitle: 'Battlefrag.com', breadcrumbPath: [...trail, { id: 102, title: 'Battlefrag.com', path: '/dreamhack/dreamhack_winter_05/a2' }] },
  children: Array.from({ length: 287 }, (_, i) => ({
    id: 1000 + i, type: 'GalleryPhotoItem', title: `CIMG${i}.JPG`, pathComponent: `dreamhack/dhw05/dhphotos/CIMG${i}.JPG`,
  })),
} as unknown as AlbumFile;

const peerTexts = () =>
  [...document.querySelectorAll('.block-core-PeerList a, .block-core-PeerList span')].map((e) => e.textContent);

describe('MatrixSidebar (THEME-01)', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('album page: the siblings as in the 2006 dhphotos page (1–6, ..., last), current bold, no link', () => {
    render(<MatrixSidebar location={{ album: battlefrag, photo: null, parent: dhw05 }} />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('DreamHack Winter 05');
    expect(peerTexts()).toEqual(['1. DH-Photo', '2. Bamsegrill', '3. Battlefrag.com', '4. DeaziD', '5. eXinet', '6. G3', '...', '18. Alla vi som...']);
    expect(screen.getByText('3. Battlefrag.com')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '1. DH-Photo' })).toHaveAttribute('href', '/dreamhack/dreamhack_winter_05/a0/');
    expect(screen.getByRole('link', { name: '18. Alla vi som...' })).toHaveAttribute('title', 'Alla vi som var på dreamhack');
  });

  it("photo page: the album's photos, links by photo slug", () => {
    const photo = battlefrag.children[0] as Child;
    render(<MatrixSidebar location={{ album: battlefrag, photo, parent: null } as MatrixLocation} />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Battlefrag.com');
    expect(peerTexts()).toEqual(['1. CIMG0.JPG', '2. CIMG1.JPG', '3. CIMG2.JPG', '4. CIMG3.JPG', '5. CIMG4.JPG', '6. CIMG5.JPG', '...', '287. CIMG286.JPG']);
    expect(screen.getByRole('link', { name: '2. CIMG1.JPG' })).toHaveAttribute('href', '/dreamhack/dreamhack_winter_05/a2/cimg1');
  });

  it('root and non-album pages: search and item links, no peer list; no Add Comment', () => {
    render(<MatrixSidebar location={null} />);
    expect(document.querySelector('.block-core-PeerList')).toBeNull();
    expect(screen.getByRole('link', { name: 'Advanced Search' })).toHaveAttribute('href', '/search');
    expect(screen.getByRole('link', { name: 'View Slideshow' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Slideshow (Fullscreen)' })).toBeInTheDocument();
    expect(screen.queryByText(/Add Comment/)).toBeNull();
  });

  it('"Theme: modern" at the bottom switches to the modern dark theme (S12 T-10, S13 T-01)', async () => {
    render(<MatrixSidebar location={null} />);
    const blocks = document.querySelectorAll('.gbBlock');
    const last = blocks[blocks.length - 1];
    const button = screen.getByRole('button', { name: 'Theme: modern' });
    expect(last.contains(button)).toBe(true);
    await userEvent.setup().click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('"Theme: classic list" switches to the 2013 root list; in that theme the button goes back (S13 T-10)', async () => {
    render(<MatrixSidebar location={null} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Theme: classic list' }));
    expect(mockSetTheme).toHaveBeenCalledWith('classic-list');
    expect(screen.queryByRole('button', { name: 'Theme: classic' })).toBeNull();
    mockIsClassicList = true;
    render(<MatrixSidebar location={null} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Theme: classic' }));
    expect(mockSetTheme).toHaveBeenCalledWith('classic');
    mockIsClassicList = false;
  });

  it('search: Enter goes to the results; an empty box does nothing', async () => {
    const user = userEvent.setup();
    render(<MatrixSidebar location={null} />);
    const box = screen.getByRole('textbox', { name: 'Search the Gallery' });
    expect(box).toHaveAttribute('placeholder', 'Search the Gallery');
    await user.type(box, '{Enter}');
    expect(mockNavigate).not.toHaveBeenCalled();
    await user.type(box, ' dream hack {Enter}');
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=dream%20hack');
  });
});

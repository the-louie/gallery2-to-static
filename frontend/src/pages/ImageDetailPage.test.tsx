import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { ImageDetailPage } from './ImageDetailPage';
import { useParams } from 'react-router-dom';
import type { Image } from '@/types';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: () => mockNavigate,
  };
});

// Mock useAlbumData for hierarchical route tests
const mockUseAlbumData = vi.fn();
vi.mock('@/hooks/useAlbumData', () => ({
  useAlbumData: (id: number | null) => mockUseAlbumData(id),
}));

describe('ImageDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockUseAlbumData.mockReturnValue({
      data: null,
      metadata: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('displays legacy route message for /image/:id without album context', () => {
    vi.mocked(useParams).mockReturnValue({ id: '42' });

    render(<ImageDetailPage />, { initialEntries: ['/image/42'] });

    expect(screen.getByText(/Legacy Route Not Supported/i)).toBeInTheDocument();
    expect(
      screen.getByText(/album image route format/i),
    ).toBeInTheDocument();
  });

  it('displays error when image ID is invalid', () => {
    vi.mocked(useParams).mockReturnValue({ id: 'invalid' });

    render(<ImageDetailPage />, { initialEntries: ['/image/invalid'] });

    expect(screen.getByText(/Invalid Image ID/i)).toBeInTheDocument();
    expect(
      screen.getByText(/The image ID in the URL is invalid/i),
    ).toBeInTheDocument();
  });

  it('redirects to 404 when image ID is invalid', () => {
    vi.mocked(useParams).mockReturnValue({ id: 'invalid' });

    render(<ImageDetailPage />, { initialEntries: ['/image/invalid'] });

    expect(mockNavigate).toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('displays home link for legacy route', () => {
    vi.mocked(useParams).mockReturnValue({ id: '42' });

    render(<ImageDetailPage />, { initialEntries: ['/image/42'] });

    const homeLink = screen.getByRole('button', { name: /go to home page/i });
    expect(homeLink).toBeInTheDocument();
  });

  it('shows lightbox when album 338910 data loads with image 395090 (hierarchical route)', () => {
    const image395090: Image = {
      id: 395090,
      type: 'GalleryPhotoItem',
      hasChildren: false,
      title: '',
      description: null,
      summary: null,
      ownerName: 'David Hulth',
      pathComponent: 'dreamhack/dhs07/dhs07crew/hulth/onsdag/IMG_3817.JPG',
      timestamp: 1181771517,
      width: 1024,
      height: 683,
      thumb_width: null,
      thumb_height: null,
      order: 1000,
      urlPath: 'dreamhack/dreamhack_summer_07/crewbilder/hulth/onsdag/___img_3817.jpg',
    };
    mockUseAlbumData.mockReturnValue({
      data: [image395090],
      metadata: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useParams).mockReturnValue({ albumId: '338910', imageId: '395090' });

    const { container } = render(<ImageDetailPage />, {
      initialEntries: ['/album/338910/image/395090'],
    });

    expect(mockUseAlbumData).toHaveBeenCalledWith(338910);
    expect(container.querySelector('.image-detail-page')).toBeInTheDocument();
    expect(screen.queryByText(/Image Not Found/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Error Loading Image/i)).not.toBeInTheDocument();
  });
});

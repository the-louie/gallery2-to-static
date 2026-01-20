import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import { AlbumDetailPage } from './AlbumDetailPage';
import { useAlbumData } from '@/hooks/useAlbumData';
import { useParams } from 'react-router-dom';
import { DataLoadError } from '@/utils/dataLoader';
import { mockChildren } from '@/__mocks__/mockData';

// Mock the useAlbumData hook (used by AlbumDetail component)
vi.mock('@/hooks/useAlbumData', () => ({
  useAlbumData: vi.fn(),
}));

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

describe('AlbumDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('displays loading state', () => {
    vi.mocked(useAlbumData).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useParams).mockReturnValue({ id: '7' });

    render(<AlbumDetailPage />, { initialEntries: ['/album/7'] });

    // AlbumDetail shows loading state with AlbumGridSkeleton
    expect(screen.getByLabelText('Loading albums')).toBeInTheDocument();
  });

  it('displays albums and images when data is loaded', async () => {
    vi.mocked(useAlbumData).mockReturnValue({
      data: mockChildren,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useParams).mockReturnValue({ id: '7' });

    render(<AlbumDetailPage />, { initialEntries: ['/album/7'] });

    await waitFor(() => {
      expect(screen.getByText('Albums')).toBeInTheDocument();
    });

    expect(screen.getByText('Images')).toBeInTheDocument();
  });

  it('displays error message when album not found', () => {
    const error = new DataLoadError('Album not found', 'NOT_FOUND');

    vi.mocked(useAlbumData).mockReturnValue({
      data: null,
      isLoading: false,
      error,
      refetch: vi.fn(),
    });

    vi.mocked(useParams).mockReturnValue({ id: '999' });

    render(<AlbumDetailPage />, { initialEntries: ['/album/999'] });

    expect(screen.getByText(/Error Loading Album/i)).toBeInTheDocument();
    expect(screen.getByText('Album not found')).toBeInTheDocument();
  });

  it('displays error message on network error', () => {
    const error = new DataLoadError('Network error', 'NETWORK_ERROR');

    vi.mocked(useAlbumData).mockReturnValue({
      data: null,
      isLoading: false,
      error,
      refetch: vi.fn(),
    });

    vi.mocked(useParams).mockReturnValue({ id: '7' });

    render(<AlbumDetailPage />, { initialEntries: ['/album/7'] });

    expect(screen.getByText(/Error Loading Album/i)).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('displays empty state when album has no children', () => {
    vi.mocked(useAlbumData).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useParams).mockReturnValue({ id: '7' });

    render(<AlbumDetailPage />, { initialEntries: ['/album/7'] });

    expect(screen.getByText(/Empty Album/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This album contains no albums or images/i),
    ).toBeInTheDocument();
  });

  it('redirects to 404 when album ID is invalid', () => {
    vi.mocked(useAlbumData).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useParams).mockReturnValue({ id: 'invalid' });

    render(<AlbumDetailPage />, { initialEntries: ['/album/invalid'] });

    expect(mockNavigate).toHaveBeenCalledWith('/not-found', { replace: true });
  });
});

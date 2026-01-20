import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import { ImageDetailPage } from './ImageDetailPage';
import { useParams } from 'react-router-dom';

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

describe('ImageDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('displays placeholder content with valid image ID', () => {
    vi.mocked(useParams).mockReturnValue({ id: '42' });

    render(<ImageDetailPage />, { initialEntries: ['/image/42'] });

    expect(screen.getByText('Image Detail View')).toBeInTheDocument();
    expect(screen.getByText('Image ID: 42')).toBeInTheDocument();
    expect(
      screen.getByText(/The lightbox component will be implemented/i),
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

  it('displays home link', () => {
    vi.mocked(useParams).mockReturnValue({ id: '42' });

    render(<ImageDetailPage />, { initialEntries: ['/image/42'] });

    const homeLink = screen.getByRole('button', { name: /go to home page/i });
    expect(homeLink).toBeInTheDocument();
  });
});

/**
 * Tests for RootAlbumListView component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { RootAlbumListView } from './RootAlbumListView';
import { FilterProvider } from '@/contexts/FilterContext';
import { mockAlbums } from '@/__mocks__/mockData';
import type { Child } from '../../../backend/types';
import * as useAlbumDataHook from '@/hooks/useAlbumData';
import * as useSubalbumsMapHook from '@/hooks/useSubalbumsMap';

vi.mock('@/hooks/useAlbumData', () => ({ useAlbumData: vi.fn() }));
vi.mock('@/hooks/useSubalbumsMap', () => ({ useSubalbumsMap: vi.fn() }));
vi.mock('@/hooks/useSort', () => ({ useSort: vi.fn(() => ({ option: 'order-asc' as const, setOption: vi.fn() })) }));
vi.mock('@/hooks/useScrollPosition', () => ({
  useScrollPosition: vi.fn(() => ({
    scrollTop: 0,
    setScrollTop: vi.fn(),
    saveScrollPosition: vi.fn(),
    clearScrollPosition: vi.fn(),
  })),
}));

const mockUseAlbumData = vi.mocked(useAlbumDataHook.useAlbumData);
const mockUseSubalbumsMap = vi.mocked(useSubalbumsMapHook.useSubalbumsMap);

function renderWithProviders(ui: React.ReactElement) {
  return render(<FilterProvider>{ui}</FilterProvider>);
}

describe('RootAlbumListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSubalbumsMap.mockReturnValue({
      subalbumsMap: new Map(),
      isLoading: false,
      error: null,
    });
  });

  it('shows loading skeleton when loading', () => {
    mockUseAlbumData.mockReturnValue({
      data: null,
      metadata: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RootAlbumListView albumId={7} />);
    expect(screen.getByLabelText(/loading albums/i)).toBeInTheDocument();
  });

  it('shows error and Retry when load fails', async () => {
    const refetch = vi.fn();
    mockUseAlbumData.mockReturnValue({
      data: null,
      metadata: null,
      isLoading: false,
      error: new Error('Load failed'),
      refetch,
    });

    renderWithProviders(<RootAlbumListView albumId={7} />);
    expect(screen.getByText(/error loading albums/i)).toBeInTheDocument();
    expect(screen.getByText(/Load failed/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows empty state when no albums', () => {
    mockUseAlbumData.mockReturnValue({
      data: [] as Child[],
      metadata: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RootAlbumListView albumId={7} />);
    expect(screen.getByText(/no albums found/i)).toBeInTheDocument();
  });

  it('renders list of albums when data loaded', () => {
    mockUseAlbumData.mockReturnValue({
      data: mockAlbums as Child[],
      metadata: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RootAlbumListView albumId={7} />);
    expect(screen.getByRole('region', { name: /root albums/i })).toBeInTheDocument();
    expect(screen.getByText(/Albums/)).toBeInTheDocument();
    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.getByText('Parent Album')).toBeInTheDocument();
  });

  it('applies filter and sort via context', () => {
    mockUseAlbumData.mockReturnValue({
      data: mockAlbums as Child[],
      metadata: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RootAlbumListView albumId={7} />);
    expect(screen.getByRole('combobox', { name: /sort by/i })).toBeInTheDocument();
  });
});

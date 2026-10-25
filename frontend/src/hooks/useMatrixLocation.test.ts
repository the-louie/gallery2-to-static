import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMatrixLocation } from './useMatrixLocation';
import { loadMatrixLocation, type MatrixLocation } from '@/utils/matrixLocation';

vi.mock('@/utils/matrixLocation', () => ({ loadMatrixLocation: vi.fn() }));

const loc = (id: number) => ({ album: { metadata: { albumId: id }, children: [] }, photo: null }) as unknown as MatrixLocation;

describe('useMatrixLocation (THEME-01)', () => {
  it('loads the location and keeps the previous one while the next loads', async () => {
    let resolveNext: (l: MatrixLocation) => void = () => {};
    vi.mocked(loadMatrixLocation)
      .mockResolvedValueOnce(loc(1))
      .mockReturnValueOnce(new Promise((r) => { resolveNext = r; }));
    const { result, rerender } = renderHook(({ p }) => useMatrixLocation(p), { initialProps: { p: '/a/' } });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.location?.album.metadata.albumId).toBe(1));
    expect(result.current.isLoading).toBe(false);

    rerender({ p: '/b/' });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.location?.album.metadata.albumId).toBe(1);
    resolveNext(loc(2));
    await waitFor(() => expect(result.current.location?.album.metadata.albumId).toBe(2));
  });

  it('a load error gives no location (the page shows the error)', async () => {
    vi.mocked(loadMatrixLocation).mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useMatrixLocation('/a/'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.location).toBeNull();
  });
});

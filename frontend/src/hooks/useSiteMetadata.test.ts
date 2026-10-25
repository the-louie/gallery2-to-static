/**
 * useSiteMetadata Hook Tests
 *
 * Loading once and the module-level cache (REFAC-01: cached data is the initial state).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const index = { rootAlbumId: 7, rootAlbumFile: '7.json', siteName: 'lanbilder.se', siteDescription: 'LAN photos' };
const loadIndex = vi.fn();
vi.mock('@/utils/dataLoader', async (orig) => ({
  ...(await orig<typeof import('@/utils/dataLoader')>()),
  loadIndex: () => loadIndex(),
}));

// The hook keeps a module-level cache: import a fresh copy per test
async function freshHook() {
  vi.resetModules();
  return (await import('./useSiteMetadata')).useSiteMetadata;
}

describe('useSiteMetadata', () => {
  beforeEach(() => loadIndex.mockReset());

  it('loads index.json, then a later mount renders the cached data on its first render', async () => {
    loadIndex.mockResolvedValue(index);
    const useSiteMetadata = await freshHook();

    const first = renderHook(() => useSiteMetadata());
    expect(first.result.current.isLoading).toBe(true);
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    expect(first.result.current).toMatchObject({ siteName: 'lanbilder.se', siteDescription: 'LAN photos', rootAlbumId: 7, error: null });

    const renders: boolean[] = [];
    const second = renderHook(() => {
      const r = useSiteMetadata();
      renders.push(r.isLoading);
      return r;
    });
    expect(renders[0]).toBe(false);
    expect(second.result.current.siteName).toBe('lanbilder.se');
    expect(loadIndex).toHaveBeenCalledTimes(1);
  });

  it('shares one request between components mounted while it is pending', async () => {
    let resolve!: (v: typeof index) => void;
    loadIndex.mockReturnValue(new Promise((r) => { resolve = r; }));
    const useSiteMetadata = await freshHook();
    const a = renderHook(() => useSiteMetadata());
    const b = renderHook(() => useSiteMetadata());
    resolve(index);
    await waitFor(() => expect(b.result.current.isLoading).toBe(false));
    expect(a.result.current.rootAlbumId).toBe(7);
    expect(b.result.current.rootAlbumId).toBe(7);
    expect(loadIndex).toHaveBeenCalledTimes(1);
  });
});

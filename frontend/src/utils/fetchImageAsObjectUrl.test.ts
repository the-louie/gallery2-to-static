/**
 * Tests for fetchImageAsObjectUrl
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchImageAsObjectUrl } from './fetchImageAsObjectUrl';

describe('fetchImageAsObjectUrl', () => {
  const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    revokeSpy.mockClear();
  });

  it('returns an object URL on success', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(blob),
      }),
    ) as any;

    const controller = new AbortController();
    const url = await fetchImageAsObjectUrl('/img.jpg', controller.signal);

    expect(url).toMatch(/^blob:/);
    expect(global.fetch).toHaveBeenCalledWith('/img.jpg', { signal: controller.signal });
  });

  it('rejects with AbortError when signal is aborted', async () => {
    const controller = new AbortController();
    let resolveFetch: (value: unknown) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    global.fetch = vi.fn(() => fetchPromise) as any;

    const resultPromise = fetchImageAsObjectUrl('/img.jpg', controller.signal);
    controller.abort();

    resolveFetch!({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    });

    await expect(resultPromise).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('rejects when response is not ok', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      }),
    ) as any;

    const controller = new AbortController();
    await expect(
      fetchImageAsObjectUrl('/missing.jpg', controller.signal),
    ).rejects.toThrow(/Image fetch failed/);
  });

  it('caller must revoke the returned URL', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob()),
      }),
    ) as any;

    const controller = new AbortController();
    const url = await fetchImageAsObjectUrl('/img.jpg', controller.signal);

    URL.revokeObjectURL(url);
    expect(revokeSpy).toHaveBeenCalledWith(url);
  });
});

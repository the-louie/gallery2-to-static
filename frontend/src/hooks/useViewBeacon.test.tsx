import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendViewBeacon, resetViewBeaconsForTests } from './useViewBeacon';

describe('view beacon (S15 T-09)', () => {
  beforeEach(() => resetViewBeaconsForTests());
  afterEach(() => vi.unstubAllGlobals());

  it('sends one beacon per item per page session', () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    expect(sendViewBeacon(14364)).toBe(true);
    expect(sendViewBeacon(14364)).toBe(false);
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon).toHaveBeenCalledWith('/api/view/14364');
  });

  it('falls back to a keepalive POST without credentials when sendBeacon is missing', () => {
    vi.stubGlobal('navigator', {});
    const f = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', f);
    sendViewBeacon(7);
    expect(f).toHaveBeenCalledWith('/api/view/7', { method: 'POST', keepalive: true, credentials: 'omit' });
  });
});

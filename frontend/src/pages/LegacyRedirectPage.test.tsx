import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test-utils';
import { Routes, Route, useLocation } from 'react-router-dom';
import { LegacyRedirectPage } from './LegacyRedirectPage';
import { resolveLegacyUrl } from '@/utils/legacyG2';

vi.mock('@/utils/legacyG2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/legacyG2')>()),
  resolveLegacyUrl: vi.fn(),
}));

function Where() {
  const l = useLocation();
  return <span data-testid="where">{l.pathname + l.search}</span>;
}
const show = (url: string) =>
  render(
    <Routes>
      <Route path="/v/*" element={<LegacyRedirectPage />} />
      <Route path="/main.php" element={<LegacyRedirectPage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { initialEntries: [url] },
  );

describe('LegacyRedirectPage (URL-02)', () => {
  beforeEach(() => vi.mocked(resolveLegacyUrl).mockReset());

  it('replaces an old album URL with the new one', async () => {
    vi.mocked(resolveLegacyUrl).mockResolvedValue('/dreamhack/dreamhack_winter_05/battlefrag.com/?page=2');
    show('/v/dreamhack/dhw05/dhphotos/?g2_page=2');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dreamhack/dreamhack_winter_05/battlefrag.com/?page=2'));
    expect(resolveLegacyUrl).toHaveBeenCalledWith({ kind: 'album', g2Path: 'dreamhack/dhw05/dhphotos', page: 2 });
  });

  it('an unknown old URL goes to /not-found', async () => {
    vi.mocked(resolveLegacyUrl).mockResolvedValue(null);
    show('/main.php?g2_itemId=1');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/not-found'));
  });

  it('a URL that is not an old one goes to /not-found without resolving', () => {
    show('/main.php?g2_itemId=abc');
    expect(screen.getByTestId('where')).toHaveTextContent('/not-found');
    expect(resolveLegacyUrl).not.toHaveBeenCalled();
  });

  it('a load failure shows Retry, which resolves again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(resolveLegacyUrl).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce('/');
    show('/v/');
    const retry = await screen.findByRole('button', { name: 'Retry' });
    fireEvent.click(retry);
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/$/));
  });
});

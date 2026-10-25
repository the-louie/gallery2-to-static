/**
 * LegacyRedirectPage – old Gallery 2 URLs (`/v/…`, `/main.php?g2_itemId=N`) are resolved to the
 * app's URLs and replaced in the history (URL-02; `utils/legacyG2.ts`). Unknown ones go to
 * /not-found; a data load failure shows Retry like PathResolverPage.
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { parseLegacyUrl, resolveLegacyUrl } from '@/utils/legacyG2';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function LegacyRedirectPage() {
  const { pathname, search } = useLocation();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; target: string | null | 'failed' } | null>(null);
  const key = `${attempt}:${pathname}${search}`;

  const url = parseLegacyUrl(pathname, search);

  useEffect(() => {
    if (url === null) return;
    let cancelled = false;
    resolveLegacyUrl(url)
      .then((target) => {
        if (!cancelled) setState({ key, target });
      })
      .catch((err: unknown) => {
        console.error('LegacyRedirectPage: could not load the legacy index', err);
        if (!cancelled) setState({ key, target: 'failed' });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- url derives from pathname + search
  }, [key]);

  if (url === null) return <Navigate to="/not-found" replace />;
  if (state?.key !== key) {
    return (
      <div className="path-resolver-page path-resolver-page-loading">
        <LoadingSpinner />
      </div>
    );
  }
  if (state.target === 'failed') {
    return (
      <div className="path-resolver-page path-resolver-page-error" role="alert" aria-live="assertive">
        <h2>Could not load the gallery</h2>
        <p>The album list could not be loaded. Check your connection and try again.</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)}>
          Retry
        </button>
      </div>
    );
  }
  return <Navigate to={state.target ?? '/not-found'} replace />;
}

export default LegacyRedirectPage;

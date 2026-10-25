/**
 * Hook: the album and photo at a pathname, for the Matrix frame (classic theme, THEME-01).
 *
 * Keeps showing the previous location while the next one loads, so the nav bar and sidebar do not
 * flash empty between pages. `location` is null for pages that are not an album or photo, and
 * after a load error (the page itself shows the error).
 *
 * @example
 * ```tsx
 * const { location } = useMatrixLocation(useLocation().pathname);
 * const trail = location?.album.metadata.breadcrumbPath ?? [];
 * ```
 */

import { useEffect, useState } from 'react';
import { loadMatrixLocation, type MatrixLocation } from '@/utils/matrixLocation';

interface UseMatrixLocationResult {
  location: MatrixLocation | null;
  /** True until the pathname's location is known */
  isLoading: boolean;
}

export function useMatrixLocation(pathname: string): UseMatrixLocationResult {
  const [loaded, setLoaded] = useState<{ pathname: string; location: MatrixLocation | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMatrixLocation(pathname)
      .then((location) => {
        if (!cancelled) setLoaded({ pathname, location });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ pathname, location: null });
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return { location: loaded?.location ?? null, isLoading: loaded?.pathname !== pathname };
}

/**
 * @deprecated This test file tests the deprecated useBreadcrumbPath hook.
 * Breadcrumbs are now built in the backend and stored in album metadata.
 * Use metadata.breadcrumbPath from useAlbumData instead.
 * This file is kept for reference but tests are no longer relevant.
 */

import { describe, it } from 'vitest';

describe('useBreadcrumbPath (deprecated)', () => {
  it('is deprecated - breadcrumbs now come from backend metadata', () => {
    // This hook is deprecated - breadcrumbs are built in backend
    // and stored in album metadata. Frontend reads from metadata via useAlbumData.
    expect(true).toBe(true);
  });
});

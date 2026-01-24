/**
 * @deprecated This test file tests deprecated breadcrumbPath utilities.
 * Breadcrumbs are now built in the backend and stored in album metadata.
 * This file is kept for reference but tests are no longer relevant.
 */

import { describe, it } from 'vitest';

describe('breadcrumbPath (deprecated)', () => {
  it('is deprecated - breadcrumbs now come from backend metadata', () => {
    // This module is deprecated - breadcrumbs are built in backend
    // and stored in album metadata. Frontend reads from metadata.
    expect(true).toBe(true);
  });
});

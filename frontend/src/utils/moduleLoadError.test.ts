import { describe, it, expect } from 'vitest';
import { isModuleLoadError } from './moduleLoadError';

describe('isModuleLoadError (S13 T-07, QA-08)', () => {
  it('recognises the browsers\' dynamic import failures', () => {
    for (const m of [
      'Failed to fetch dynamically imported module: https://x/assets/js/SearchResultsPage-abc.js',
      'error loading dynamically imported module: https://x/a.js',
      'Importing a module script failed.',
      'Loading chunk 12 failed.',
      'Unable to preload CSS for https://x/assets/css/SearchResultsPage-abc.css',
    ]) {
      expect(isModuleLoadError(new TypeError(m)), m).toBe(true);
    }
  });

  it('leaves other errors to resetError', () => {
    expect(isModuleLoadError(new Error('Root album not found'))).toBe(false);
    expect(isModuleLoadError(new TypeError('Failed to fetch'))).toBe(false);
  });
});

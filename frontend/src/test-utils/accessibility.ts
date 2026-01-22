/**
 * Accessibility testing utilities
 *
 * Provides helper functions for accessibility testing using vitest-axe
 *
 * Note: Matchers should be extended in test setup file (src/test/setup.ts)
 * using: import * as matchers from 'vitest-axe/matchers'; expect.extend(matchers);
 */

import { axe } from 'vitest-axe';
import type { AxeResults } from 'vitest-axe';

/**
 * Test component for accessibility violations
 * @param container - The container element to test
 * @param options - Optional axe configuration
 * @returns Promise that resolves with axe results
 */
export async function testAccessibility(
  container: HTMLElement,
  options?: Parameters<typeof axe>[1],
): Promise<AxeResults> {
  return axe(container, options);
}

/**
 * Assert that a component has no accessibility violations
 * @param container - The container element to test
 * @param options - Optional axe configuration
 */
export async function expectNoViolations(
  container: HTMLElement,
  options?: Parameters<typeof axe>[1],
): Promise<void> {
  const results = await testAccessibility(container, options);
  expect(results).toHaveNoViolations();
}

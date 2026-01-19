import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Re-export user-event utilities
export { userEvent };

// Note: jest-dom matchers are imported globally in test/setup.ts
// This import ensures they're available when test-utils is imported

/**
 * Custom render function that wraps React Testing Library's render
 * with any necessary providers (Theme, Router, etc.)
 *
 * This can be extended in the future to include providers as needed.
 *
 * @param ui - The React element to render
 * @param options - Render options from React Testing Library
 * @returns Render result with all testing utilities
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  // For now, just use the default render
  // In the future, this can wrap with ThemeProvider, Router, etc.
  return render(ui, options);
}

// Override the default render export
export { customRender as render };

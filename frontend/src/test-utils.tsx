import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
 * Wraps components with MemoryRouter for testing React Router components.
 *
 * @param ui - The React element to render
 * @param options - Render options from React Testing Library
 * @param options.initialEntries - Initial route entries for MemoryRouter (default: ['/'])
 * @returns Render result with all testing utilities
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    initialEntries?: string[];
  },
) {
  const { initialEntries = ['/'], ...renderOptions } = options || {};

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };

  return render(ui, { ...renderOptions, wrapper: Wrapper });
}

// Override the default render export
export { customRender as render };

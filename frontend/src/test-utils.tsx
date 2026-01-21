import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ThemeProvider, type ThemePreference } from './contexts';

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Re-export user-event utilities
export { userEvent };

// Note: jest-dom matchers are imported globally in test/setup.ts
// This import ensures they're available when test-utils is imported

/**
 * Custom render options extending React Testing Library's render options
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route entries for MemoryRouter (default: ['/']) */
  initialEntries?: string[];
  /** Default theme preference for testing (default: 'light') */
  defaultThemePreference?: ThemePreference;
}

/**
 * Custom render function that wraps React Testing Library's render
 * with any necessary providers (Theme, Router, etc.)
 *
 * Wraps components with MemoryRouter and ThemeProvider for testing.
 *
 * @param ui - The React element to render
 * @param options - Render options including custom options
 * @param options.initialEntries - Initial route entries for MemoryRouter (default: ['/'])
 * @param options.defaultThemePreference - Default theme preference (default: 'light')
 * @returns Render result with all testing utilities
 */
function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const {
    initialEntries = ['/'],
    defaultThemePreference = 'light',
    ...renderOptions
  } = options || {};

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <ThemeProvider defaultPreference={defaultThemePreference}>
          {children}
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  return render(ui, { ...renderOptions, wrapper: Wrapper });
}

// Override the default render export
export { customRender as render };

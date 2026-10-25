/**
 * ThemeDropdown with no themes (LINT-01): the early return now comes after all hooks, so switching
 * between an empty and a non-empty theme list keeps the hook order and does not throw.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const themeState: { availableThemes: Array<{ name: string; label: string }> } = { availableThemes: [] };

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    availableThemes: themeState.availableThemes,
  }),
}));

import { ThemeDropdown } from './ThemeDropdown';

describe('ThemeDropdown without themes', () => {
  it('renders the disabled "No themes" button, and survives the list changing', () => {
    const onError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(<ThemeDropdown />);
    expect(screen.getByRole('button', { name: /no themes available/i })).toBeDisabled();

    themeState.availableThemes = [{ name: 'light', label: 'Light' }];
    rerender(<ThemeDropdown />);
    themeState.availableThemes = [];
    rerender(<ThemeDropdown />);

    expect(screen.getByRole('button', { name: /no themes available/i })).toBeInTheDocument();
    expect(onError.mock.calls.flat().join(' ')).not.toMatch(/order of Hooks|Rendered (more|fewer) hooks/);
    onError.mockRestore();
  });
});

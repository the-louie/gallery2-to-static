/**
 * ThemeDropdown Component Tests
 *
 * Tests for the theme dropdown component.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, userEvent } from '@/test-utils';
import { ThemeDropdown } from './ThemeDropdown';

describe('ThemeDropdown', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    localStorage.removeItem('gallery-theme-migrated');

    // Reset document attribute
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
    localStorage.removeItem('gallery-theme-migrated');
  });

  it('renders theme dropdown button', () => {
    render(<ThemeDropdown />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('theme-dropdown-button');
  });

  it('displays current theme name', () => {
    render(<ThemeDropdown />, { defaultTheme: 'light' });

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Light');
  });

  it('opens dropdown on button click', async () => {
    const user = userEvent.setup();

    render(<ThemeDropdown />);

    const button = screen.getByRole('button');
    await user.click(button);

    const menu = screen.getByRole('listbox');
    expect(menu).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();

    render(<ThemeDropdown />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Click outside
    await user.click(document.body);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes dropdown when selecting a theme', async () => {
    const user = userEvent.setup();

    render(<ThemeDropdown />, { defaultTheme: 'light' });

    const button = screen.getByRole('button');
    await user.click(button);

    const darkOption = screen.getByRole('option', { name: /dark/i });
    await user.click(darkOption);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('changes theme when option is selected', async () => {
    const user = userEvent.setup();

    render(<ThemeDropdown />, { defaultTheme: 'light' });

    const button = screen.getByRole('button');
    await user.click(button);

    const darkOption = screen.getByRole('option', { name: /dark/i });
    await user.click(darkOption);

    // Theme should be dark now
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('navigates options with arrow keys', async () => {
    const user = userEvent.setup();

    render(<ThemeDropdown />, { defaultTheme: 'light' });

    const button = screen.getByRole('button');
    button.focus();
    await user.keyboard('{Enter}');

    // Press ArrowDown
    await user.keyboard('{ArrowDown}');

    const options = screen.getAllByRole('option');
    const focusedOption = options.find((opt) => opt.classList.contains('theme-dropdown-option-focused'));
    expect(focusedOption).toBeDefined();
  });

  it('selects option with Enter key', async () => {
    const user = userEvent.setup();

    render(<ThemeDropdown />, { defaultTheme: 'light' });

    const button = screen.getByRole('button');
    button.focus();
    await user.keyboard('{Enter}');

    // Navigate to dark and select
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown with Escape key', async () => {
    const user = userEvent.setup();

    render(<ThemeDropdown />);

    const button = screen.getByRole('button');
    button.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    render(<ThemeDropdown />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(button).toHaveAttribute('aria-label');
  });

  it('marks selected option with aria-selected', async () => {
    const user = userEvent.setup();

    render(<ThemeDropdown />, { defaultTheme: 'light' });

    const button = screen.getByRole('button');
    await user.click(button);

    const lightOption = screen.getByRole('option', { name: /light/i });
    expect(lightOption).toHaveAttribute('aria-selected', 'true');
  });

  it('applies custom className', () => {
    render(<ThemeDropdown className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('theme-dropdown-button');
    expect(button).toHaveClass('custom-class');
  });

  it('displays theme icons', () => {
    render(<ThemeDropdown />, { defaultTheme: 'light' });

    const button = screen.getByRole('button');
    const icon = button.querySelector('svg.theme-dropdown-icon');
    expect(icon).toBeInTheDocument();
  });

  it('shows checkmark for selected option', async () => {
    const user = userEvent.setup();

    render(<ThemeDropdown />, { defaultTheme: 'light' });

    const button = screen.getByRole('button');
    await user.click(button);

    const lightOption = screen.getByRole('option', { name: /light/i });
    const checkmark = lightOption.querySelector('svg.theme-dropdown-check');
    expect(checkmark).toBeInTheDocument();
  });
});

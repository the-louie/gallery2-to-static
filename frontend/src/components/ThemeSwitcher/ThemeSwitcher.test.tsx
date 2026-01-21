/**
 * ThemeSwitcher Component Tests
 *
 * Tests for the theme switcher button component.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, userEvent } from '@/test-utils';
import { ThemeSwitcher } from './ThemeSwitcher';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Reset document attribute
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders theme switcher button', () => {
    render(<ThemeSwitcher />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('theme-switcher');
  });

  it('displays sun icon for light theme', () => {
    render(<ThemeSwitcher />, { defaultThemePreference: 'light' });

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('light');

    // Check for SVG icon
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('displays moon icon for dark theme', () => {
    render(<ThemeSwitcher />, { defaultThemePreference: 'dark' });

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('dark');

    // Check for SVG icon
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('displays auto icon for system preference', () => {
    render(<ThemeSwitcher />, { defaultThemePreference: 'system' });

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('system');

    // Check for SVG icon (computer/monitor icon)
    const svg = button.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('cycles through preferences on click', async () => {
    const user = userEvent.setup();

    render(<ThemeSwitcher />, { defaultThemePreference: 'light' });

    const button = screen.getByRole('button');

    // Light -> Dark
    expect(button).toHaveTextContent('light');
    await user.click(button);
    expect(button).toHaveTextContent('dark');

    // Dark -> System
    await user.click(button);
    expect(button).toHaveTextContent('system');

    // System -> Light
    await user.click(button);
    expect(button).toHaveTextContent('light');
  });

  it('responds to keyboard Enter', async () => {
    const user = userEvent.setup();

    render(<ThemeSwitcher />, { defaultThemePreference: 'light' });

    const button = screen.getByRole('button');
    button.focus();

    expect(button).toHaveTextContent('light');
    await user.keyboard('{Enter}');
    expect(button).toHaveTextContent('dark');
  });

  it('responds to keyboard Space', async () => {
    const user = userEvent.setup();

    render(<ThemeSwitcher />, { defaultThemePreference: 'light' });

    const button = screen.getByRole('button');
    button.focus();

    expect(button).toHaveTextContent('light');
    await user.keyboard(' ');
    expect(button).toHaveTextContent('dark');
  });

  it('has correct aria-label for light mode', () => {
    render(<ThemeSwitcher />, { defaultThemePreference: 'light' });

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute(
      'aria-label',
      'Theme: Light mode. Click to switch to dark mode.'
    );
  });

  it('has correct aria-label for dark mode', () => {
    render(<ThemeSwitcher />, { defaultThemePreference: 'dark' });

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute(
      'aria-label',
      'Theme: Dark mode. Click to switch to system mode.'
    );
  });

  it('has correct aria-label for system mode', () => {
    render(<ThemeSwitcher />, { defaultThemePreference: 'system' });

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute(
      'aria-label',
      'Theme: System mode. Click to switch to light mode.'
    );
  });

  it('applies custom className', () => {
    render(<ThemeSwitcher className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('theme-switcher');
    expect(button).toHaveClass('custom-class');
  });

  it('has title attribute', () => {
    render(<ThemeSwitcher />, { defaultThemePreference: 'light' });

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Theme: light');
  });

  it('is focusable', () => {
    render(<ThemeSwitcher />);

    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
  });

  it('has type="button" attribute', () => {
    render(<ThemeSwitcher />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('icons have aria-hidden attribute', () => {
    render(<ThemeSwitcher />);

    const button = screen.getByRole('button');
    const svg = button.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});

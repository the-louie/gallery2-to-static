/**
 * SearchBar Component Tests
 *
 * Tests for the search bar component with debouncing and keyboard navigation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';
import { BrowserRouter } from 'react-router-dom';

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/', search: '' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const renderSearchBar = (props = {}) => {
    return render(
      <BrowserRouter>
        <SearchBar {...props} />
      </BrowserRouter>,
    );
  };

  it('renders search input', () => {
    renderSearchBar();

    const input = screen.getByRole('searchbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'search');
  });

  it('displays placeholder text', () => {
    renderSearchBar({ placeholder: 'Custom placeholder' });

    const input = screen.getByPlaceholderText('Custom placeholder');
    expect(input).toBeInTheDocument();
  });

  it('shows clear button when input has value', async () => {
    const user = userEvent.setup({ delay: null });
    renderSearchBar();

    const input = screen.getByRole('searchbox');
    await user.type(input, 'test');

    const clearButton = screen.getByRole('button', { name: /clear/i });
    expect(clearButton).toBeInTheDocument();
  });

  it('hides clear button when input is empty', () => {
    renderSearchBar();

    const clearButton = screen.queryByRole('button', { name: /clear/i });
    expect(clearButton).not.toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderSearchBar();

    const input = screen.getByRole('searchbox');
    await user.type(input, 'test');

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(input).toHaveValue('');
  });

  it('debounces search navigation', async () => {
    const user = userEvent.setup({ delay: null });
    renderSearchBar({ debounceDelay: 300 });

    const input = screen.getByRole('searchbox');
    await user.type(input, 'test');

    // Should not navigate immediately
    expect(mockNavigate).not.toHaveBeenCalled();

    // Fast-forward time
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/search?q=test');
    });
  });

  it('navigates immediately on form submit', async () => {
    const user = userEvent.setup({ delay: null });
    renderSearchBar({ debounceDelay: 300 });

    const input = screen.getByRole('searchbox');
    await user.type(input, 'test');
    await user.keyboard('{Enter}');

    // Should navigate immediately without waiting for debounce
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=test');
  });

  it('clears search on Escape key', async () => {
    const user = userEvent.setup({ delay: null });
    renderSearchBar();

    const input = screen.getByRole('searchbox');
    await user.type(input, 'test');
    await user.keyboard('{Escape}');

    expect(input).toHaveValue('');
  });

  it('has proper ARIA attributes', () => {
    renderSearchBar();

    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('aria-label', 'Search albums and images');

    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('aria-label', 'Search albums and images');
    expect(input).toHaveAttribute('aria-describedby', 'search-bar-description');
  });

  it('applies custom className', () => {
    renderSearchBar({ className: 'custom-class' });

    const form = screen.getByRole('search');
    expect(form).toHaveClass('search-bar', 'custom-class');
  });
});

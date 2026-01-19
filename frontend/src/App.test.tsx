import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, userEvent } from '@/test-utils';
import App from '@/App';
import { mockChildren } from '@/__mocks__/mockData';

describe('App', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any mocks
    vi.restoreAllMocks();
  });

  it('renders the main heading', () => {
    // Mock successful fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockChildren,
    } as Response);

    render(<App />);

    expect(screen.getByText('Gallery 2 to Static')).toBeInTheDocument();
    expect(
      screen.getByText('Frontend application initialized'),
    ).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    // Mock a delayed fetch
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => mockChildren,
            } as Response);
          }, 100);
        }),
    );

    render(<App />);

    // Initially, data should not be displayed
    expect(screen.queryByText(/Successfully loaded/)).not.toBeInTheDocument();
  });

  it('displays data after successful fetch', async () => {
    // Mock successful fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockChildren,
    } as Response);

    render(<App />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Successfully loaded/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Successfully loaded \d+ items/)).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    // Mock failed fetch
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<App />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
  });

  it('displays error message on non-ok response', async () => {
    // Mock non-ok response
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    } as Response);

    render(<App />);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Error: Failed to load JSON: Not Found/),
    ).toBeInTheDocument();
  });

  it('calls fetch with correct URL', () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockChildren,
    } as Response);

    render(<App />);

    expect(global.fetch).toHaveBeenCalledWith('/data/test.json');
  });

  it('handles button click to reload data', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockChildren,
    } as Response);

    render(<App />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/Successfully loaded/)).toBeInTheDocument();
    });

    // Clear the mock call count
    vi.clearAllMocks();

    // Find and click the reload button
    const reloadButton = screen.getByRole('button', { name: /reload data/i });
    expect(reloadButton).toBeInTheDocument();
    await user.click(reloadButton);

    // Verify fetch was called again
    expect(global.fetch).toHaveBeenCalledWith('/data/test.json');
  });

  it('disables button while loading', async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    global.fetch = vi.fn().mockReturnValue(fetchPromise);

    render(<App />);

    // Wait for initial load to complete
    resolveFetch!({
      ok: true,
      json: async () => mockChildren,
    } as Response);

    await waitFor(() => {
      expect(screen.getByText(/Successfully loaded/)).toBeInTheDocument();
    });

    // Start a new delayed fetch
    let resolveDelayedFetch: (value: Response) => void;
    const delayedFetchPromise = new Promise<Response>((resolve) => {
      resolveDelayedFetch = resolve;
    });
    global.fetch = vi.fn().mockReturnValue(delayedFetchPromise);

    const reloadButton = screen.getByRole('button', { name: /reload data/i });
    await user.click(reloadButton);

    // Button should be disabled and show loading text
    expect(reloadButton).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Resolve the fetch
    resolveDelayedFetch!({
      ok: true,
      json: async () => mockChildren,
    } as Response);

    // Wait for loading to complete
    await waitFor(() => {
      expect(reloadButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockChildren,
      } as Response);

      render(<App />);

      // Check for main heading
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toHaveTextContent('Gallery 2 to Static');

      // Check for subheading when data is loaded
      // This will be checked in async test
    });

    it('button has accessible label', () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockChildren,
      } as Response);

      render(<App />);

      const button = screen.getByRole('button', { name: /reload data/i });
      expect(button).toHaveAttribute('aria-label', 'Reload data');
    });

    it('error message is accessible', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<App />);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Error:/);
        expect(errorMessage).toBeInTheDocument();
        // Error should be visible and readable
        expect(errorMessage).toHaveTextContent('Error: Network error');
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockChildren,
      } as Response);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Successfully loaded/)).toBeInTheDocument();
      });

      // Button should be focusable
      const button = screen.getByRole('button', { name: /reload data/i });
      button.focus();
      expect(button).toHaveFocus();

      // Button should be activatable with Enter key
      vi.clearAllMocks();
      await user.keyboard('{Enter}');
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

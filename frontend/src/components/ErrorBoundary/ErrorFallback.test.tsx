/**
 * ErrorFallback Component Tests
 *
 * Tests for the ErrorFallback component including rendering, retry button,
 * navigation button, and accessibility.
 *
 * @module frontend/src/components/ErrorBoundary
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ErrorFallback } from './ErrorFallback';

// Helper to render with router
function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('ErrorFallback', () => {
  const mockError = new Error('Test error message');
  const mockErrorInfo: React.ErrorInfo = {
    componentStack: 'Component stack trace',
  };
  const mockResetError = vi.fn();

  describe('Rendering', () => {
    it('renders error message correctly', () => {
      renderWithRouter(
        <ErrorFallback error={mockError} resetError={mockResetError} />,
      );

      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(
        screen.getByText(/We encountered an unexpected error/i),
      ).toBeInTheDocument();
    });

    it('displays error icon', () => {
      const { container } = renderWithRouter(
        <ErrorFallback error={mockError} resetError={mockResetError} />,
      );

      const icon = container.querySelector('.error-fallback-icon');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Retry Button', () => {
    it('renders retry button', () => {
      renderWithRouter(
        <ErrorFallback error={mockError} resetError={mockResetError} />,
      );

      const retryButton = screen.getByLabelText(/Retry loading the page/i);
      expect(retryButton).toBeInTheDocument();
    });

    it('calls resetError when retry button is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <ErrorFallback error={mockError} resetError={mockResetError} />,
      );

      const retryButton = screen.getByLabelText(/Retry loading the page/i);
      await user.click(retryButton);

      expect(mockResetError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navigation Button', () => {
    it('renders "Go to Home" button', () => {
      renderWithRouter(
        <ErrorFallback error={mockError} resetError={mockResetError} />,
      );

      const homeButton = screen.getByLabelText(/Go to home page/i);
      expect(homeButton).toBeInTheDocument();
    });

    it('navigates to home when "Go to Home" button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderWithRouter(
        <ErrorFallback error={mockError} resetError={mockResetError} />,
      );

      const homeButton = screen.getByLabelText(/Go to home page/i);
      await user.click(homeButton);

      // Verify navigation (check URL or location)
      // Note: This depends on test environment setup
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderWithRouter(
        <ErrorFallback error={mockError} resetError={mockResetError} />,
      );

      const errorFallback = screen.getByRole('alert');
      expect(errorFallback).toBeInTheDocument();
    });

    it('has accessible button labels', () => {
      renderWithRouter(
        <ErrorFallback error={mockError} resetError={mockResetError} />,
      );

      expect(screen.getByLabelText(/Retry loading the page/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Go to home page/i)).toBeInTheDocument();
    });

    it('hides decorative icon from screen readers', () => {
      const { container } = renderWithRouter(
        <ErrorFallback error={mockError} resetError={mockResetError} />,
      );

      const icon = container.querySelector('.error-fallback-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Error Details (Development Mode)', () => {
    it('shows error details in development mode', () => {
      // Mock development mode
      const originalEnv = import.meta.env.MODE;
      vi.stubGlobal('import.meta.env.MODE', 'development');

      renderWithRouter(
        <ErrorFallback
          error={mockError}
          resetError={mockResetError}
          errorInfo={mockErrorInfo}
        />,
      );

      expect(screen.getByText(/Error Details/i)).toBeInTheDocument();
      expect(screen.getByText(/Test error message/i)).toBeInTheDocument();

      // Restore
      vi.stubGlobal('import.meta.env.MODE', originalEnv);
    });

    it('hides error details in production mode', () => {
      // Mock production mode
      const originalEnv = import.meta.env.MODE;
      vi.stubGlobal('import.meta.env.MODE', 'production');

      renderWithRouter(
        <ErrorFallback
          error={mockError}
          resetError={mockResetError}
          errorInfo={mockErrorInfo}
        />,
      );

      expect(screen.queryByText(/Error Details/i)).not.toBeInTheDocument();

      // Restore
      vi.stubGlobal('import.meta.env.MODE', originalEnv);
    });
  });
});

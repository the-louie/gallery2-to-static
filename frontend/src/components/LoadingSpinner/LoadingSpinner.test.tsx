/**
 * LoadingSpinner Component Tests
 *
 * Tests for the LoadingSpinner component including rendering, size variants,
 * and accessibility.
 *
 * @module frontend/src/components/LoadingSpinner
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('renders loading spinner', () => {
      render(<LoadingSpinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('renders with default label', () => {
      render(<LoadingSpinner />);
      expect(screen.getByLabelText('Loading...')).toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<LoadingSpinner label="Loading data..." />);
      expect(screen.getByLabelText('Loading data...')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      const { container } = render(<LoadingSpinner size="small" />);
      const spinner = container.querySelector('.loading-spinner-small');
      expect(spinner).toBeInTheDocument();
    });

    it('renders medium size (default)', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('.loading-spinner-medium');
      expect(spinner).toBeInTheDocument();
    });

    it('renders large size', () => {
      const { container } = render(<LoadingSpinner size="large" />);
      const spinner = container.querySelector('.loading-spinner-large');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<LoadingSpinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading...');
      expect(spinner).toHaveAttribute('aria-live', 'polite');
    });

    it('hides decorative elements from screen readers', () => {
      const { container } = render(<LoadingSpinner />);
      const circle = container.querySelector('.loading-spinner-circle');
      expect(circle).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom Class Name', () => {
    it('applies custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);
      const spinner = container.querySelector('.custom-class');
      expect(spinner).toBeInTheDocument();
    });
  });
});

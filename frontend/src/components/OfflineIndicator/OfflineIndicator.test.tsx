/**
 * OfflineIndicator Component Tests
 *
 * Tests for the OfflineIndicator component including rendering, offline detection,
 * and accessibility.
 *
 * @module frontend/src/components/OfflineIndicator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { OfflineIndicator } from './OfflineIndicator';
import * as useOfflineDetectionModule from '@/hooks/useOfflineDetection';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders when offline', () => {
      vi.spyOn(useOfflineDetectionModule, 'useOfflineDetection').mockReturnValue({
        isOffline: true,
        isOnline: false,
      });

      render(<OfflineIndicator />);
      expect(
        screen.getByText(/You are currently offline/i),
      ).toBeInTheDocument();
    });

    it('does not render when online', () => {
      vi.spyOn(useOfflineDetectionModule, 'useOfflineDetection').mockReturnValue({
        isOffline: false,
        isOnline: true,
      });

      const { container } = render(<OfflineIndicator />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes when offline', () => {
      vi.spyOn(useOfflineDetectionModule, 'useOfflineDetection').mockReturnValue({
        isOffline: true,
        isOnline: false,
      });

      render(<OfflineIndicator />);
      const indicator = screen.getByRole('alert');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute('aria-live', 'assertive');
      expect(indicator).toHaveAttribute('aria-label', 'Network status: Offline');
    });

    it('hides decorative icon from screen readers', () => {
      vi.spyOn(useOfflineDetectionModule, 'useOfflineDetection').mockReturnValue({
        isOffline: true,
        isOnline: false,
      });

      render(<OfflineIndicator />);
      const icon = screen.getByText('⚠️');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom Class Name', () => {
    it('applies custom className', () => {
      vi.spyOn(useOfflineDetectionModule, 'useOfflineDetection').mockReturnValue({
        isOffline: true,
        isOnline: false,
      });

      const { container } = render(<OfflineIndicator className="custom-class" />);
      const indicator = container.querySelector('.custom-class');
      expect(indicator).toBeInTheDocument();
    });
  });
});

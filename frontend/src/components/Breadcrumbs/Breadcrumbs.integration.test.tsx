/**
 * Breadcrumbs Integration Tests
 *
 * End-to-end integration tests for breadcrumb navigation flow,
 * including routing integration and navigation behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { Breadcrumbs } from './Breadcrumbs';
import { buildBreadcrumbPath } from '@/utils/breadcrumbPath';
import type { BreadcrumbPath } from '@/types';

// Mock the breadcrumbPath utility
vi.mock('@/utils/breadcrumbPath', () => ({
  buildBreadcrumbPath: vi.fn(),
}));

describe('Breadcrumbs Integration', () => {
  const mockBuildBreadcrumbPath = vi.mocked(buildBreadcrumbPath);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Navigation Flow', () => {
    it('navigates correctly when clicking breadcrumb links', async () => {
      const user = userEvent.setup();
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
        { id: 20, title: '2024', path: '/album/20' },
      ];

      render(<Breadcrumbs path={path} />, { initialEntries: ['/album/20'] });

      const homeLink = screen.getByRole('link', { name: 'Go to home page' });
      const photosLink = screen.getByRole('link', { name: 'Go to Photos album' });

      // Verify links have correct hrefs
      expect(homeLink).toHaveAttribute('href', '/');
      expect(photosLink).toHaveAttribute('href', '/album/10');

      // Click home link
      await user.click(homeLink);
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('updates breadcrumb path when navigating between albums', async () => {
      const path1: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      const path2: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
        { id: 20, title: '2024', path: '/album/20' },
      ];

      const { rerender } = render(<Breadcrumbs path={path1} />, {
        initialEntries: ['/album/10'],
      });

      expect(screen.getByText('Photos')).toHaveAttribute('aria-current', 'page');

      // Update to nested path
      rerender(<Breadcrumbs path={path2} />);

      expect(screen.getByText('2024')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('link', { name: 'Go to Photos album' })).toBeInTheDocument();
    });
  });

  describe('Browser Navigation Integration', () => {
    it('works with browser back/forward navigation', async () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />, { initialEntries: ['/album/10'] });

      const homeLink = screen.getByRole('link', { name: 'Go to home page' });
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });

  describe('Deep Linking', () => {
    it('displays correct breadcrumb for deep album paths', () => {
      const deepPath: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
        { id: 20, title: '2024', path: '/album/20' },
        { id: 30, title: 'January', path: '/album/30' },
        { id: 40, title: 'Week 1', path: '/album/40' },
      ];

      render(<Breadcrumbs path={deepPath} />, {
        initialEntries: ['/album/40'],
      });

      expect(screen.getByRole('link', { name: 'Go to home page' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to Photos album' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to 2024 album' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to January album' })).toBeInTheDocument();
      expect(screen.getByText('Week 1')).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Error Handling in Integration', () => {
    it('handles missing breadcrumb path gracefully', () => {
      const { container } = render(<Breadcrumbs path={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('handles single-item path (just home) gracefully', () => {
      const singlePath: BreadcrumbPath = [{ id: 7, title: 'Home', path: '/' }];
      const { container } = render(<Breadcrumbs path={singlePath} />);

      expect(container.firstChild).toBeNull();
    });
  });
});

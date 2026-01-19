/**
 * AlbumGridSkeleton Component Tests
 *
 * Tests for the AlbumGridSkeleton loading placeholder component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { AlbumGridSkeleton } from './AlbumGridSkeleton';

describe('AlbumGridSkeleton', () => {
  describe('Component Rendering', () => {
    it('renders default number of skeleton items', () => {
      render(<AlbumGridSkeleton />);
      const items = screen.getAllByRole('status');
      expect(items).toHaveLength(1); // One status container
      const skeletonItems = document.querySelectorAll('.album-grid-skeleton-item');
      expect(skeletonItems).toHaveLength(6); // Default count
    });

    it('renders custom number of skeleton items', () => {
      render(<AlbumGridSkeleton count={10} />);
      const skeletonItems = document.querySelectorAll('.album-grid-skeleton-item');
      expect(skeletonItems).toHaveLength(10);
    });

    it('applies custom className', () => {
      const { container } = render(
        <AlbumGridSkeleton className="custom-class" />,
      );
      const skeleton = container.querySelector('.album-grid-skeleton');
      expect(skeleton).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<AlbumGridSkeleton />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', 'Loading albums');
      expect(status).toHaveAttribute('aria-busy', 'true');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Skeleton Structure', () => {
    it('renders skeleton items with thumbnail and content placeholders', () => {
      render(<AlbumGridSkeleton count={1} />);
      const item = document.querySelector('.album-grid-skeleton-item');
      expect(item).toBeInTheDocument();
      expect(item?.querySelector('.album-grid-skeleton-thumbnail')).toBeInTheDocument();
      expect(item?.querySelector('.album-grid-skeleton-content')).toBeInTheDocument();
      expect(item?.querySelector('.album-grid-skeleton-title')).toBeInTheDocument();
      expect(item?.querySelector('.album-grid-skeleton-count')).toBeInTheDocument();
    });
  });
});

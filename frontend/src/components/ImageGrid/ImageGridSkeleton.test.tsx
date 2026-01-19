/**
 * ImageGridSkeleton Component Tests
 *
 * Tests for the ImageGridSkeleton loading placeholder component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { ImageGridSkeleton } from './ImageGridSkeleton';

describe('ImageGridSkeleton', () => {
  describe('Component Rendering', () => {
    it('renders default number of skeleton items', () => {
      render(<ImageGridSkeleton />);
      const items = screen.getAllByRole('status');
      expect(items).toHaveLength(1); // One status container
      const skeletonItems = document.querySelectorAll('.image-grid-skeleton-item');
      expect(skeletonItems).toHaveLength(6); // Default count
    });

    it('renders custom number of skeleton items', () => {
      render(<ImageGridSkeleton count={10} />);
      const skeletonItems = document.querySelectorAll('.image-grid-skeleton-item');
      expect(skeletonItems).toHaveLength(10);
    });

    it('applies custom className', () => {
      const { container } = render(
        <ImageGridSkeleton className="custom-class" />,
      );
      const skeleton = container.querySelector('.image-grid-skeleton');
      expect(skeleton).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ImageGridSkeleton />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', 'Loading images');
      expect(status).toHaveAttribute('aria-busy', 'true');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Skeleton Structure', () => {
    it('renders skeleton items with thumbnail placeholder', () => {
      render(<ImageGridSkeleton count={1} />);
      const item = document.querySelector('.image-grid-skeleton-item');
      expect(item).toBeInTheDocument();
      expect(item?.querySelector('.image-grid-skeleton-thumbnail')).toBeInTheDocument();
    });
  });
});

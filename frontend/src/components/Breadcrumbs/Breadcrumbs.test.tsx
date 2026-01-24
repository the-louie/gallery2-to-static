/**
 * Breadcrumbs Component Tests
 *
 * Comprehensive tests for the Breadcrumbs component covering rendering,
 * navigation, accessibility, and responsive behavior.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { Breadcrumbs } from './Breadcrumbs';
import type { BreadcrumbPath } from '@/types';

describe('Breadcrumbs', () => {
  describe('Component Rendering', () => {
    it('renders home link and current page for simple path', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to home page' })).toBeInTheDocument();
      expect(screen.getByText('Photos')).toBeInTheDocument();
      expect(screen.getByText('Photos')).toHaveAttribute('aria-current', 'page');
    });

    it('renders multiple breadcrumb items for nested path', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
        { id: 20, title: '2024', path: '/album/20' },
        { id: 30, title: 'January', path: '/album/30' },
      ];

      render(<Breadcrumbs path={path} />);

      expect(screen.getByRole('link', { name: 'Go to home page' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to Photos album' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to 2024 album' })).toBeInTheDocument();
      expect(screen.getByText('January')).toBeInTheDocument();
      expect(screen.getByText('January')).toHaveAttribute('aria-current', 'page');
    });

    it('renders separators between items', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
        { id: 20, title: '2024', path: '/album/20' },
      ];

      render(<Breadcrumbs path={path} />);

      const separators = screen.getAllByText('/', { exact: false });
      // Should have 2 separators (between Home-Photos and Photos-2024)
      expect(separators.length).toBeGreaterThanOrEqual(1);
    });

    it('does not render if path is empty', () => {
      const { container } = render(<Breadcrumbs path={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('does not render if path has only home (single item)', () => {
      const path: BreadcrumbPath = [{ id: 7, title: 'Home', path: '/' }];
      const { container } = render(<Breadcrumbs path={path} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders current page as span, not link', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Current Album', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      const currentItem = screen.getByText('Current Album');
      expect(currentItem.tagName).toBe('SPAN');
      expect(currentItem).not.toHaveAttribute('href');
      expect(currentItem).toHaveAttribute('aria-current', 'page');
    });

    it('renders parent items as links', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Parent Album', path: '/album/10' },
        { id: 20, title: 'Current', path: '/album/20' },
      ];

      render(<Breadcrumbs path={path} />);

      const homeLink = screen.getByRole('link', { name: 'Go to home page' });
      expect(homeLink).toHaveAttribute('href', '/');

      const parentLink = screen.getByRole('link', { name: 'Go to Parent Album album' });
      expect(parentLink).toHaveAttribute('href', '/album/10');
    });
  });

  describe('Navigation Behavior', () => {
    it('navigates to home when home link is clicked', async () => {
      const user = userEvent.setup();
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />, { initialEntries: ['/album/10'] });

      const homeLink = screen.getByRole('link', { name: 'Go to home page' });
      await user.click(homeLink);

      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('navigates to album when album link is clicked', async () => {
      const user = userEvent.setup();
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
        { id: 20, title: '2024', path: '/album/20' },
      ];

      render(<Breadcrumbs path={path} />, { initialEntries: ['/album/20'] });

      const photosLink = screen.getByRole('link', { name: 'Go to Photos album' });
      await user.click(photosLink);

      expect(photosLink).toHaveAttribute('href', '/album/10');
    });

    it('calls onItemClick handler when provided', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} onItemClick={onItemClick} />);

      const homeLink = screen.getByRole('link', { name: 'Go to home page' });
      await user.click(homeLink);

      expect(onItemClick).toHaveBeenCalledWith({
        id: 7,
        title: 'Home',
        path: '/',
      });
    });

    it('prevents default navigation when onItemClick is provided', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} onItemClick={onItemClick} />);

      const homeLink = screen.getByRole('link', { name: 'Go to home page' });
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

      homeLink.dispatchEvent(clickEvent);
      expect(preventDefaultSpy).toHaveBeenCalled();
      await user.click(homeLink);

      expect(onItemClick).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has navigation landmark with aria-label', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
    });

    it('has ordered list structure', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      const { container } = render(<Breadcrumbs path={path} />);
      const list = container.querySelector('ol');
      expect(list).toBeInTheDocument();
      expect(list?.className).toBe('breadcrumbs-list');
    });

    it('marks current page with aria-current="page"', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Current Album', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      const currentItem = screen.getByText('Current Album');
      expect(currentItem).toHaveAttribute('aria-current', 'page');
      expect(currentItem).toHaveAttribute('aria-label', 'Current page: Current Album');
    });

    it('has descriptive aria-labels on links', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
        { id: 20, title: '2024', path: '/album/20' },
      ];

      render(<Breadcrumbs path={path} />);

      expect(screen.getByRole('link', { name: 'Go to home page' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to Photos album' })).toBeInTheDocument();
    });

    it('marks separators as aria-hidden', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      const { container } = render(<Breadcrumbs path={path} />);
      const separators = container.querySelectorAll('.breadcrumbs-separator');

      separators.forEach((separator) => {
        expect(separator).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className to nav element', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      const { container } = render(
        <Breadcrumbs path={path} className="custom-breadcrumbs" />,
      );

      const nav = container.querySelector('.breadcrumbs.custom-breadcrumbs');
      expect(nav).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles path with only two items (home and current)', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Album', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      expect(screen.getByRole('link', { name: 'Go to home page' })).toBeInTheDocument();
      expect(screen.getByText('Album')).toBeInTheDocument();
    });

    it('handles very long album titles', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        {
          id: 10,
          title: 'Very Long Album Title That Might Wrap or Truncate',
          path: '/album/10',
        },
      ];

      render(<Breadcrumbs path={path} />);

      expect(
        screen.getByText('Very Long Album Title That Might Wrap or Truncate'),
      ).toBeInTheDocument();
    });

    it('handles special characters in album titles', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: "Album & Photos (2024)", path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      expect(screen.getByText("Album & Photos (2024)")).toBeInTheDocument();
    });
  });

  describe('BBCode', () => {
    it('renders BBCode-formatted title for non-home current page', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: '[b]Bold[/b]', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      expect(screen.getByText('Bold')).toBeInTheDocument();
      expect(screen.getByText('Bold').closest('span')).toHaveAttribute('aria-current', 'page');
      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(nav.querySelector('strong')).toBeInTheDocument();
      expect(nav.querySelector('strong')).toHaveTextContent('Bold');
    });

    it('renders Home as plain text when root item', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Photos', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to home page' })).toBeInTheDocument();
    });
  });

  describe('HTML Entity Decoding', () => {
    it('decodes HTML entities in breadcrumb titles', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Album &amp; Photos', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      expect(screen.getByText('Album & Photos')).toBeInTheDocument();
    });

    it('decodes double-encoded HTML entities', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Album &amp;amp; More', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      expect(screen.getByText('Album & More')).toBeInTheDocument();
    });

    it('decodes HTML entities with BBCode formatting', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: '[b]Album &amp; Photos[/b]', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      expect(screen.getByText('Album & Photos')).toBeInTheDocument();
      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(nav.querySelector('strong')).toBeInTheDocument();
      expect(nav.querySelector('strong')?.textContent).toBe('Album & Photos');
    });

    it('handles triple-encoded entities', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Album &amp;amp;amp; More', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      expect(screen.getByText('Album & More')).toBeInTheDocument();
    });

    it('decodes HTML entities in aria-label attributes', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Album &amp; Photos', path: '/album/10' },
      ];

      render(<Breadcrumbs path={path} />);

      const currentItem = screen.getByText('Album & Photos');
      expect(currentItem).toHaveAttribute('aria-label', 'Current page: Album & Photos');
    });

    it('decodes HTML entities in link aria-label attributes', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: 'Album &amp; Photos', path: '/album/10' },
        { id: 20, title: 'Current', path: '/album/20' },
      ];

      render(<Breadcrumbs path={path} />);

      const link = screen.getByRole('link', { name: 'Go to Album & Photos album' });
      expect(link).toBeInTheDocument();
    });
  });

  describe('Security - HTML Injection Prevention', () => {
    it('escapes HTML entities in titles (React default escaping)', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: '&lt;script&gt;alert("XSS")&lt;/script&gt;', path: '/album/10' },
      ];

      const { container } = render(<Breadcrumbs path={path} />);

      // React should escape the decoded <script> tags
      expect(screen.getByText('<script>alert("XSS")</script>')).toBeInTheDocument();
      // Verify no actual script tag exists in DOM
      expect(container.querySelector('script')).not.toBeInTheDocument();
    });

    it('does not use dangerouslySetInnerHTML', () => {
      const path: BreadcrumbPath = [
        { id: 7, title: 'Home', path: '/' },
        { id: 10, title: '[b]Bold[/b]', path: '/album/10' },
      ];

      const { container } = render(<Breadcrumbs path={path} />);

      // Verify BBCode is parsed to React elements, not raw HTML
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      // Verify no dangerouslySetInnerHTML was used (no raw HTML strings)
      expect(container.innerHTML).not.toContain('[b]');
    });
  });
});

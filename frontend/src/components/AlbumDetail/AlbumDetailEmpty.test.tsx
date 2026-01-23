/**
 * AlbumDetailEmpty Component Tests
 *
 * Tests for the AlbumDetailEmpty component covering rendering,
 * navigation, and edge cases.
 *
 * @module frontend/src/components/AlbumDetail
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { AlbumDetailEmpty } from './AlbumDetailEmpty';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AlbumDetailEmpty', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  describe('Component Rendering', () => {
    it('renders empty album message', () => {
      render(<AlbumDetailEmpty />);
      expect(screen.getByText('Empty Album')).toBeInTheDocument();
      expect(
        screen.getByText('This album contains no albums or images.'),
      ).toBeInTheDocument();
    });

    it('renders back button with correct aria-label', () => {
      render(<AlbumDetailEmpty />);
      const backButton = screen.getByLabelText('Go up');
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveTextContent('Go Up');
    });

    it('renders home button', () => {
      render(<AlbumDetailEmpty />);
      const homeButton = screen.getByLabelText('Go to home page');
      expect(homeButton).toBeInTheDocument();
      expect(homeButton).toHaveTextContent('Go to Home');
    });
  });

  describe('Navigation', () => {
    it('calls custom onBackClick handler when provided', async () => {
      const user = userEvent.setup();
      const handleBackClick = vi.fn();

      render(<AlbumDetailEmpty onBackClick={handleBackClick} />);

      const backButton = screen.getByLabelText('Go up');
      await user.click(backButton);

      expect(handleBackClick).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to home when onBackClick is not provided', async () => {
      const user = userEvent.setup();

      render(<AlbumDetailEmpty />);

      const backButton = screen.getByLabelText('Go up');
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('navigates to home when home button is clicked', async () => {
      const user = userEvent.setup();

      render(<AlbumDetailEmpty />);

      const homeButton = screen.getByLabelText('Go to home page');
      await user.click(homeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Accessibility', () => {
    it('has accessible back button', () => {
      render(<AlbumDetailEmpty />);
      const backButton = screen.getByLabelText('Go up');
      expect(backButton).toBeInTheDocument();
      expect(backButton.tagName).toBe('BUTTON');
    });

    it('has accessible home button', () => {
      render(<AlbumDetailEmpty />);
      const homeButton = screen.getByLabelText('Go to home page');
      expect(homeButton).toBeInTheDocument();
      expect(homeButton.tagName).toBe('BUTTON');
    });
  });
});

/**
 * SearchHighlight Component Tests
 *
 * Tests for the search highlight component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import { SearchHighlight } from './SearchHighlight';

// Mock dataLoader to prevent unhandled fetch rejections from ThemeContext
vi.mock('@/utils/dataLoader', () => ({
  loadPathIndex: vi.fn().mockResolvedValue({}),
  findRootAlbumId: vi.fn().mockResolvedValue(7),
  loadAlbum: vi.fn().mockResolvedValue(null),
}));

// Mock albumThemesConfig to prevent unhandled fetch rejections from ThemeContext
vi.mock('@/utils/albumThemesConfig', () => ({
  loadAlbumThemesConfig: vi.fn().mockResolvedValue({}),
  getAlbumIdFromPath: vi.fn().mockReturnValue(null),
  getThemeForAlbum: vi.fn().mockReturnValue(null),
}));

describe('SearchHighlight', () => {
  it('renders text without highlighting when query is empty', () => {
    render(<SearchHighlight text="Test text" query="" />);
    expect(screen.getByText('Test text')).toBeInTheDocument();
  });

  it('renders text without highlighting when query is whitespace', () => {
    render(<SearchHighlight text="Test text" query="   " />);
    expect(screen.getByText('Test text')).toBeInTheDocument();
  });

  it('highlights matching text', () => {
    const { container } = render(
      <SearchHighlight text="Vacation photos" query="vacation" />,
    );
    // Subsequence matching highlights each character individually
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(8); // V,a,c,a,t,i,o,n
    expect(marks[0].textContent).toBe('V');
  });

  it('performs case-insensitive matching', () => {
    const { container } = render(
      <SearchHighlight text="Vacation photos" query="VACATION" />,
    );
    // Subsequence matching highlights each character individually
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(8); // V,a,c,a,t,i,o,n
    expect(marks[0].textContent).toBe('V');
  });

  it('handles empty text', () => {
    const { container } = render(<SearchHighlight text="" query="test" />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('handles null text', () => {
    const { container } = render(<SearchHighlight text={null} query="test" />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('handles undefined text', () => {
    const { container } = render(<SearchHighlight text={undefined} query="test" />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('uses custom HTML tag', () => {
    const { container } = render(
      <SearchHighlight text="Test" query="test" as="div" />,
    );
    // The container element should be a DIV
    const div = container.querySelector('div');
    expect(div).not.toBeNull();
    expect(div!.tagName).toBe('DIV');
  });

  it('applies custom className', () => {
    const { container } = render(
      <SearchHighlight text="Test" query="test" className="custom-class" />,
    );
    const element = container.querySelector('.custom-class');
    expect(element).not.toBeNull();
    expect(element).toHaveClass('custom-class');
  });

  it('highlights matching characters', () => {
    const { container } = render(
      <SearchHighlight text="test test test" query="test" />,
    );
    // Subsequence matching highlights 4 characters (t,e,s,t) from the text
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(4);
    marks.forEach((mark) => {
      expect(mark.tagName).toBe('MARK');
    });
  });
});

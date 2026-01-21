/**
 * SearchHighlight Component Tests
 *
 * Tests for the search highlight component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { SearchHighlight } from './SearchHighlight';

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
    render(<SearchHighlight text="Vacation photos" query="vacation" />);
    expect(screen.getByText('Vacation photos')).toBeInTheDocument();
    const mark = screen.getByText('Vacation');
    expect(mark.tagName).toBe('MARK');
  });

  it('performs case-insensitive matching', () => {
    render(<SearchHighlight text="Vacation photos" query="VACATION" />);
    const mark = screen.getByText('Vacation');
    expect(mark.tagName).toBe('MARK');
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
    render(<SearchHighlight text="Test" query="test" as="div" />);
    const element = screen.getByText('Test');
    expect(element.tagName).toBe('DIV');
  });

  it('applies custom className', () => {
    render(<SearchHighlight text="Test" query="test" className="custom-class" />);
    const element = screen.getByText('Test');
    expect(element).toHaveClass('custom-class');
  });

  it('highlights multiple matches', () => {
    render(<SearchHighlight text="test test test" query="test" />);
    const marks = screen.getAllByText('test');
    expect(marks.length).toBe(3);
    marks.forEach(mark => {
      expect(mark.tagName).toBe('MARK');
    });
  });
});

/**
 * SortDropdown Component Tests
 *
 * Tests for the sort dropdown select component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '@/test-utils';
import { SortDropdown } from './SortDropdown';
import type { SortOption } from '@/types';

describe('SortDropdown', () => {
  it('renders sort dropdown select', () => {
    const handleChange = vi.fn();
    render(
      <SortDropdown currentOption="date-desc" onOptionChange={handleChange} />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveClass('sort-dropdown');
  });

  it('displays current option as selected', () => {
    const handleChange = vi.fn();
    render(
      <SortDropdown currentOption="name-asc" onOptionChange={handleChange} />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('name-asc');
  });

  it('renders all sort options', () => {
    const handleChange = vi.fn();
    render(
      <SortDropdown currentOption="date-desc" onOptionChange={handleChange} />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.options);

    expect(options).toHaveLength(6);
    expect(options[0].value).toBe('date-desc');
    expect(options[1].value).toBe('date-asc');
    expect(options[2].value).toBe('name-asc');
    expect(options[3].value).toBe('name-desc');
    expect(options[4].value).toBe('size-asc');
    expect(options[5].value).toBe('size-desc');
  });

  it('displays human-readable labels for options', () => {
    const handleChange = vi.fn();
    render(
      <SortDropdown currentOption="date-desc" onOptionChange={handleChange} />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.options);

    expect(options[0].textContent).toBe('Date (Newest First)');
    expect(options[1].textContent).toBe('Date (Oldest First)');
    expect(options[2].textContent).toBe('Name (A-Z)');
    expect(options[3].textContent).toBe('Name (Z-A)');
    expect(options[4].textContent).toBe('Size (Smallest First)');
    expect(options[5].textContent).toBe('Size (Largest First)');
  });

  it('calls onOptionChange when option is selected', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <SortDropdown currentOption="date-desc" onOptionChange={handleChange} />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    await user.selectOptions(select, 'name-asc');

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('name-asc');
  });

  it('updates selected value when currentOption prop changes', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <SortDropdown currentOption="date-desc" onOptionChange={handleChange} />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('date-desc');

    rerender(
      <SortDropdown currentOption="name-asc" onOptionChange={handleChange} />
    );

    expect(select.value).toBe('name-asc');
  });

  it('applies className prop', () => {
    const handleChange = vi.fn();
    render(
      <SortDropdown
        currentOption="date-desc"
        onOptionChange={handleChange}
        className="custom-class"
      />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('sort-dropdown');
    expect(select).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    const handleChange = vi.fn();
    render(
      <SortDropdown currentOption="date-desc" onOptionChange={handleChange} />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-label', 'Sort by');
    expect(select).toHaveAttribute('title', 'Sort by: Date (Newest First)');
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <SortDropdown currentOption="date-desc" onOptionChange={handleChange} />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Focus the select
    select.focus();
    expect(select).toHaveFocus();

    // Use arrow keys to navigate (native select behavior)
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    // Should have called onChange
    expect(handleChange).toHaveBeenCalled();
  });

  it('handles all sort options', () => {
    const handleChange = vi.fn();
    const options: SortOption[] = [
      'date-asc',
      'date-desc',
      'name-asc',
      'name-desc',
      'size-asc',
      'size-desc',
    ];

    options.forEach((option) => {
      const { unmount } = render(
        <SortDropdown currentOption={option} onOptionChange={handleChange} />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe(option);

      unmount();
    });
  });

  it('updates title attribute when currentOption changes', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <SortDropdown currentOption="date-desc" onOptionChange={handleChange} />
    );

    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('title', 'Sort by: Date (Newest First)');

    rerender(
      <SortDropdown currentOption="name-asc" onOptionChange={handleChange} />
    );

    expect(select).toHaveAttribute('title', 'Sort by: Name (A-Z)');
  });
});

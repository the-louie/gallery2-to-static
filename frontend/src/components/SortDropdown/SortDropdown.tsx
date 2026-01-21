/**
 * SortDropdown Component
 *
 * An accessible dropdown component that allows users to select a sort option
 * for albums or images. Uses native select element for full keyboard and
 * screen reader support.
 *
 * ## Features
 *
 * - All sort options available (date, name, size - ascending/descending)
 * - Human-readable option labels
 * - Full keyboard navigation (native select behavior)
 * - Screen reader support with proper ARIA labels
 * - Accessible focus indicators
 *
 * ## Accessibility
 *
 * - Uses native `<select>` element for built-in accessibility
 * - Dynamic aria-label describes current selection
 * - Focus indicator meets WCAG 2.1 AA requirements
 * - All options are keyboard accessible
 *
 * ## Usage
 *
 * ```tsx
 * import { SortDropdown } from './components/SortDropdown';
 * import { useSort } from '@/hooks/useSort';
 *
 * function AlbumGrid() {
 *   const { option, setOption } = useSort('albums');
 *
 *   return (
 *     <SortDropdown
 *       currentOption={option}
 *       onOptionChange={setOption}
 *     />
 *   );
 * }
 * ```
 */

import React from 'react';
import type { SortOption, SortDropdownProps } from '@/types';
import './SortDropdown.css';

/**
 * Get human-readable label for a sort option
 *
 * @param option - Sort option
 * @returns Human-readable label
 */
function getSortLabel(option: SortOption): string {
  switch (option) {
    case 'date-asc':
      return 'Date (Oldest First)';
    case 'date-desc':
      return 'Date (Newest First)';
    case 'name-asc':
      return 'Name (A-Z)';
    case 'name-desc':
      return 'Name (Z-A)';
    case 'size-asc':
      return 'Size (Smallest First)';
    case 'size-desc':
      return 'Size (Largest First)';
    default:
      return option;
  }
}

/**
 * All available sort options
 */
const SORT_OPTIONS: SortOption[] = [
  'date-desc',
  'date-asc',
  'name-asc',
  'name-desc',
  'size-asc',
  'size-desc',
];

/**
 * SortDropdown component
 *
 * Dropdown select for choosing sort option. Uses native select for accessibility.
 *
 * @param props - Component props
 * @returns SortDropdown select element
 *
 * @example
 * ```tsx
 * <SortDropdown
 *   currentOption="date-desc"
 *   onOptionChange={(option) => console.log(option)}
 * />
 * ```
 */
export function SortDropdown({
  currentOption,
  onOptionChange,
  className,
}: SortDropdownProps): React.ReactElement {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newOption = event.target.value as SortOption;
    onOptionChange(newOption);
  };

  const selectClassName = className
    ? `sort-dropdown ${className}`
    : 'sort-dropdown';

  return (
    <select
      className={selectClassName}
      value={currentOption}
      onChange={handleChange}
      aria-label="Sort by"
      title={`Sort by: ${getSortLabel(currentOption)}`}
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {getSortLabel(option)}
        </option>
      ))}
    </select>
  );
}

export default SortDropdown;

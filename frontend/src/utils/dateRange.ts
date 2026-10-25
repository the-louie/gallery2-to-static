/**
 * Date range helpers for the date filter (LOGIC-18): the inputs are local 'YYYY-MM-DD' dates; the
 * range is milliseconds from local start of day to the last millisecond of the end day.
 */
import type { FilterCriteria } from '@/types';

/** Open ends of a one-sided range (only a start, or only an end date). */
export const DATE_RANGE_OPEN_START = 0;
export const DATE_RANGE_OPEN_END = Number.MAX_SAFE_INTEGER;

/** 'YYYY-MM-DD' (input value) → local midnight in ms. `new Date('YYYY-MM-DD')` would be UTC. */
function dateStringToStartOfDay(dateString: string): number {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** 'YYYY-MM-DD' → last millisecond of that local day, so the end date is inclusive. */
function dateStringToEndOfDay(dateString: string): number {
  const [y, m, d] = dateString.split('-').map(Number);
  return new Date(y, m - 1, d + 1).getTime() - 1;
}

/** Range for the two input values; one-sided when only one is set; undefined when neither. */
export function dateInputsToRange(
  startDate: string,
  endDate: string,
): FilterCriteria['dateRange'] {
  if (!startDate && !endDate) return undefined;
  let start = startDate ? dateStringToStartOfDay(startDate) : DATE_RANGE_OPEN_START;
  let end = endDate ? dateStringToEndOfDay(endDate) : DATE_RANGE_OPEN_END;
  if (startDate && endDate && start > end) {
    // dates entered the wrong way round: use them as a range anyway
    start = dateStringToStartOfDay(endDate);
    end = dateStringToEndOfDay(startDate);
  }
  return { start, end };
}

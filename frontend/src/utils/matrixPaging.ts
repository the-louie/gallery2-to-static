/**
 * Paging and dates of Gallery 2's Matrix album page (classic theme, THEME-01), ported from
 * Gallery 2.3.2 `GalleryTheme::loadCommonTemplateData` ('jumpRange', pageWindowSize 6) and checked
 * against the 2006 pages: page 1 of 24 → "1 2 3 4 5 6 ... 24", page 1 of 4 → "1 2 3 4".
 */

/** The lanbilder.se Matrix settings: 3 columns × 4 rows */
export const MATRIX_COLUMNS = 3;
export const MATRIX_PER_PAGE = 12;

const PAGE_WINDOW = 6;

/** Page numbers the pager lists (1-based): a window of 6 around `page`, plus the first and the last. */
export function jumpRange(page: number, totalPages: number): number[] {
  if (totalPages < 1) return [];
  let lower = Math.max(page - Math.floor(PAGE_WINDOW / 2), 1);
  let upper = Math.min(page + Math.floor(PAGE_WINDOW / 2), totalPages);
  if (upper === totalPages) {
    lower = Math.max(upper - PAGE_WINDOW, 1);
  } else if (lower === 1) {
    upper = Math.min(lower + (PAGE_WINDOW - 1), totalPages);
  }
  const range: number[] = [];
  if (lower > 1) range.push(1);
  for (let i = lower; i <= upper; i++) range.push(i);
  if (upper < totalPages) range.push(totalPages);
  return range;
}

/** The `?page=` value as a page number: 1 when missing or not a positive integer. */
export function parsePage(value: string | null): number {
  if (value === null || !/^\d{1,6}$/.test(value)) return 1;
  return Math.max(Number(value), 1);
}

/** URL of page `page` of an album: page 1 has no query (Gallery 2 linked it without g2_page). */
export function pageHref(albumPath: string, page: number): string {
  return page <= 1 ? albumPath : `${albumPath}?page=${page}`;
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Stockholm',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Gallery 2's date: US order, local time of the Swedish server ("11/26/2005"); '' without a timestamp. */
export function formatG2Date(timestamp: number | null | undefined): string {
  if (timestamp == null || !Number.isFinite(timestamp)) return '';
  return DATE_FORMAT.format(new Date(timestamp * 1000));
}

/** lanbilder.se's Gallery 2 resize: the longest side 1024px (CIMG0053_.JPG 1200x1600 → 768x1024) */
export const RESIZE_MAX = 1024;

/** The resized dimensions Gallery 2 showed by default, or null when the original is no larger. */
export function resizedSize(width: number, height: number): { width: number; height: number } | null {
  const longest = Math.max(width, height);
  if (longest <= RESIZE_MAX) return null;
  const scale = RESIZE_MAX / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

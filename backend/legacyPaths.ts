/**
 * Legacy link and thumb targets (matches Python get_link_target, get_thumb_target).
 * Output: filename only (no directory).
 */

/**
 * Link target filename for full-size image.
 * If pathcomponent and uipathcomponent differ (case-insensitive): uipathcomponent + '___' + pathcomponent + '.jpg'.
 * Else: uipathcomponent + '.jpg'.
 * Then .lower() and .replace('.jpg.jpg', '.jpg').
 */
export function getLinkTarget(
  uipathcomponent: string,
  pathcomponent: string,
): string {
  let suffix = '';
  if (pathcomponent && uipathcomponent.toLowerCase() !== pathcomponent.toLowerCase()) {
    suffix = '___' + pathcomponent;
  }
  let name = uipathcomponent + suffix + '.jpg';
  return name.toLowerCase().replace('.jpg.jpg', '.jpg');
}

/**
 * Thumb target filename.
 * If pathcomponent: thumbPrefix + uipathcomponent + '___' + pathcomponent; else thumbPrefix + uipathcomponent.
 * Then + '.jpg', .lower(), .replace('.jpg.jpg', '.jpg').
 */
export function getThumbTarget(
  uipathcomponent: string,
  pathcomponent: string,
  thumbPrefix: string,
): string {
  const suffix = pathcomponent ? '___' + pathcomponent : '';
  let name = thumbPrefix + uipathcomponent + suffix + '.jpg';
  return name.toLowerCase().replace('.jpg.jpg', '.jpg');
}

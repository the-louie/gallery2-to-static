/**
 * Legacy link and thumb targets (matches Python get_link_target, get_thumb_target).
 * Output: filename only (no directory).
 *
 * Convention: When uipathcomponent is empty, emitted filename equals pathcomponent
 * (normalized) to match exported assets that use pathcomponent-based filenames only.
 * The ___ prefix is used only when uipathcomponent is non-empty and differs from
 * pathcomponent (and only if the export produces such filenames).
 */

function normalizeFilename(name: string): string {
  return name.toLowerCase().replace(/\.jpg\.jpg$/i, '.jpg');
}

/**
 * Link target filename for full-size image.
 * When uipathcomponent is empty: pathcomponent normalized (lowercase, .jpg.jpg → .jpg).
 * Else when pathcomponent and uipathcomponent differ (case-insensitive): uipathcomponent + '___' + pathcomponent, then + '.jpg' and normalized.
 * Else: uipathcomponent + '.jpg' normalized.
 */
export function getLinkTarget(
  uipathcomponent: string,
  pathcomponent: string,
): string {
  if (!uipathcomponent) {
    return normalizeFilename(pathcomponent);
  }
  let suffix = '';
  if (pathcomponent && uipathcomponent.toLowerCase() !== pathcomponent.toLowerCase()) {
    suffix = '___' + pathcomponent;
  }
  const name = uipathcomponent + suffix + '.jpg';
  return normalizeFilename(name);
}

/**
 * Thumb target filename.
 * When uipathcomponent is empty: thumbPrefix + pathcomponent normalized.
 * Else if pathcomponent: thumbPrefix + uipathcomponent + '___' + pathcomponent; else thumbPrefix + uipathcomponent.
 * Then + '.jpg' and normalized.
 */
export function getThumbTarget(
  uipathcomponent: string,
  pathcomponent: string,
  thumbPrefix: string,
): string {
  if (!uipathcomponent) {
    return thumbPrefix + normalizeFilename(pathcomponent);
  }
  const suffix = pathcomponent ? '___' + pathcomponent : '';
  const name = thumbPrefix + uipathcomponent + suffix + '.jpg';
  return normalizeFilename(name);
}

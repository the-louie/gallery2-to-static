/**
 * Clean a photo title for display (TITLE-01, operator 2026-11-26). Gallery 2 photo titles are usually
 * the upload filename ("Glitched2025_0038.jpg"); drop a well-known image extension and turn underscores
 * into spaces so they read as "Glitched2025 0038". Applied to photo titles at render only — the stored
 * title and the URL slug are unchanged. Album titles are left alone by the callers.
 */
const KNOWN_IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif|tiff?|bmp|avif)$/i;

export function displayTitle(title: string): string {
  return title.replace(KNOWN_IMAGE_EXT, '').replace(/_/g, ' ').trim();
}

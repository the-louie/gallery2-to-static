/**
 * Build-time settings. `VITE_PUBLIC_SITE` is the origin that serves the
 * public gallery's `/g2data/…` images (thumbnails come back from the API as
 * public-site paths). Empty = same origin as the admin UI.
 */
export const PUBLIC_SITE: string = (
  import.meta.env.VITE_PUBLIC_SITE ?? ""
).replace(/\/$/, "");

/** Absolute URL of a public-site image path, or null when there is none. */
export function publicImageUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${PUBLIC_SITE}${path}`;
}

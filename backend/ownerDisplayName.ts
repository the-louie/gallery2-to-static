/**
 * Normalize owner display name for emitted JSON.
 * Maps the Gallery 2 default owner label to a display name used in the static output.
 */

/** Value from Gallery 2 DB (fullName/userName) that is replaced in output. */
export const OWNER_DISPLAY_NAME_GALLERY_ADMIN = 'Gallery Administrator';

/** Display name written to album metadata and children when source is Gallery Administrator. */
export const OWNER_DISPLAY_NAME_THE_LOUIE = 'The Louie';

/**
 * Normalize owner name for display: replace "Gallery Administrator" with "The Louie";
 * all other values (including null) are returned unchanged.
 *
 * @param name - Raw owner name from DB (string or null)
 * @returns Normalized display name for emitted JSON
 */
export function normalizeOwnerDisplayName(name: string | null): string | null {
  if (name === OWNER_DISPLAY_NAME_GALLERY_ADMIN) {
    return OWNER_DISPLAY_NAME_THE_LOUIE;
  }
  return name;
}

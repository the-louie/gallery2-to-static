/**
 * CSS url() value for a background image (SEC-16). The URL is already percent-encoded per path
 * segment (imageUrl.ts), but escape anything that could still end the quoted string or the
 * declaration: backslash first, then double quote, and line breaks as CSS hex escapes.
 */
export function cssUrl(url: string): string {
  const escaped = url
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\a ')
    .replace(/\r/g, '\\d ')
    .replace(/\f/g, '\\c ');
  return `url("${escaped}")`;
}

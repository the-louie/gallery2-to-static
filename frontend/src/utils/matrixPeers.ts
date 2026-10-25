/**
 * Gallery 2's sidebar peer list (block core.PeerList, classic theme THEME-01), ported from
 * Gallery 2.3.2: the window logic of `core.LoadPeers` (modules/core/Callbacks.inc) with the
 * Matrix theme's windowSize 6, and the `entitytruncate:14` title modifier
 * (lib/smarty_plugins/modifier.entitytruncate.php). Checked against the 2006 pages: current 3 of 18
 * shows 1–6, "...", 18; current 1 of 287 shows 1–6, "...", 287.
 */

/** Gallery 2 passes windowSize 6; LoadPeers works with windowSize - 1 */
const WINDOW = 5;

/**
 * Zero-based indexes of the peers to list, in order: a window around `current` (widened to the
 * full size when it touches either end) plus the first and the last peer.
 */
export function peerWindow(count: number, current: number): number[] {
  if (count <= 0 || current < 0 || current >= count) return [];
  const last = count - 1;
  let start = Math.max(current - Math.floor(WINDOW / 2), 0);
  let end = Math.min(current + Math.floor((WINDOW + 1) / 2), last);
  if (start === 0) {
    end = Math.min(last, WINDOW);
  } else if (end === last) {
    start = Math.max(last - WINDOW, 0);
  }
  const indexes: number[] = [];
  if (start > 0) indexes.push(0);
  for (let i = start; i <= end; i++) indexes.push(i);
  if (end < last) indexes.push(last);
  return indexes;
}

/**
 * Gallery 2's entitytruncate: at most `length` characters; a longer title is cut to
 * `length - 3`, backed up to the last space when that would split a word, and gets "...".
 */
export function truncateTitle(title: string, length = 14): string {
  const chars = [...title];
  if (chars.length <= length) return title;
  let piece = chars.slice(0, length - 3).join('');
  const n = length - 3;
  if (chars[n - 1] !== ' ' && chars[n] !== ' ') {
    const space = piece.lastIndexOf(' ');
    if (space > 0) piece = piece.slice(0, space);
  }
  return `${piece}...`;
}

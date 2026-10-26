/**
 * Album list order, shared by the generator (public site) and the admin UI.
 * Operator, 2026-10-26: "Internationella" always at the top, then "Demoparties", then the rest
 * alphabetically (Swedish collation, numbers in order). The pins match the exact title, trimmed.
 */
export const PINNED_ALBUM_TITLES: readonly string[] = ['Internationella', 'Demoparties'];

/** 0 for the first pinned title, 1 for the second, …; the list length for everything else. */
export function pinnedRank(title: string | null | undefined): number {
    const i = PINNED_ALBUM_TITLES.indexOf((title ?? '').trim());
    return i === -1 ? PINNED_ALBUM_TITLES.length : i;
}

/** Pinned titles first in their order, then `collator` on the titles (null = ''). */
export function compareAlbumTitles(collator: Intl.Collator, a: string | null | undefined, b: string | null | undefined): number {
    return pinnedRank(a) - pinnedRank(b) || collator.compare(a ?? '', b ?? '');
}

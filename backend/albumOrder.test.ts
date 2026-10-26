// Shared album order: pinned titles first, then Swedish alphabetical (operator, 2026-10-26).
import assert from 'node:assert/strict';
import { compareAlbumTitles, pinnedRank } from '../shared/albumOrder.ts';
import { sortChildren } from './tree.ts';

const sv = new Intl.Collator('sv', { sensitivity: 'base', numeric: true });
assert.strictEqual(pinnedRank('Internationella'), 0);
assert.strictEqual(pinnedRank(' Demoparties '), 1, 'trimmed');
assert.strictEqual(pinnedRank('DreamHack'), 2);
assert.strictEqual(pinnedRank(null), 2);
assert.strictEqual(pinnedRank('internationella'), 2, 'exact title only');

const titles = ['Örebro', 'DreamHack', 'Demoparties', 'AskersundsLAN', 'Internationella', 'Badalan', null];
assert.deepStrictEqual([...titles].sort((a, b) => compareAlbumTitles(sv, a, b)),
    ['Internationella', 'Demoparties', null, 'AskersundsLAN', 'Badalan', 'DreamHack', 'Örebro']);

// through sortChildren: albums (pinned, then A–Ö) before photos
const list = [
    { id: 1, type: 'photo' as const, title: 'A', position: 0 },
    { id: 2, type: 'album' as const, title: 'DreamHack', position: 1 },
    { id: 3, type: 'album' as const, title: 'Demoparties', position: 2 },
    { id: 4, type: 'album' as const, title: 'Internationella', position: 3 },
    { id: 5, type: 'album' as const, title: 'Badalan', position: 4 },
];
assert.deepStrictEqual(sortChildren(list, 'title').map((c) => c.id), [4, 3, 5, 2, 1]);
assert.deepStrictEqual(sortChildren(list, 'position').map((c) => c.id), [2, 3, 4, 5, 1], 'position mode: Gallery 2 order, no pins');
console.log('albumOrder tests passed');

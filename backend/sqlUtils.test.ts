/**
 * Unit tests for the row mapping in sqlUtils.getChildren (fake connection, no database).
 */

import assert from 'assert';
import sqlUtils from './sqlUtils.ts';
import type { Config } from './types.ts';

const config = { gallerySettings: { tablePrefix: 'g2_', columnPrefix: 'g_' } } as unknown as Config;

function fakeConnection(rows: unknown[]) {
  const calls: string[] = [];
  return {
    calls,
    connection: { execute: async (sql: string) => { calls.push(sql); return [rows, []]; } },
  };
}

const row = (extra: Record<string, unknown>) => ({
  id: 57215, type: 'GalleryPhotoItem', hasChildren: 0, title: 'CIMG0053_.JPG', description: null,
  ownerId: 6, summary: null, ownerFullName: 'Patrick', ownerUserName: 'patrick',
  pathComponent: 'CIMG0053_.JPG', timestamp: 1132995297, width: 1200, height: 1600,
  thumb_width: 150, thumb_height: 200, order: null, ...extra,
});

async function run(): Promise<void> {
  // viewCount (THEME-01): selected from ItemAttributesMap and mapped when present
  const { connection, calls } = fakeConnection([row({ viewCount: 1766 }), row({ id: 57216, viewCount: null })]);
  const children = await sqlUtils(connection as never, config).getChildren(57207);
  assert.match(calls[0], /iam\.g_viewCount as viewCount/);
  assert.strictEqual(children[0].viewCount, 1766);
  assert.ok(!('viewCount' in children[1]), 'no viewCount key when Gallery 2 has none');

  // a non-numeric viewCount is dropped (warning, like any other nullable numeric column)
  const bad = fakeConnection([row({ viewCount: 'lots' })]);
  const warn = console.warn;
  console.warn = () => {};
  try {
    const [c] = await sqlUtils(bad.connection as never, config).getChildren(1);
    assert.ok(!('viewCount' in c));
  } finally {
    console.warn = warn;
  }

  console.log('sqlUtils tests passed');
}

run().catch((err) => { console.error(err); process.exit(1); });

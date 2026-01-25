/**
 * Unit tests for decodeHtmlEntities and decode-then-strip title pipeline.
 */

import assert from 'assert';
import { decodeHtmlEntities } from './decodeHtmlEntities';
import { stripBBCode } from './bbcode';

function run(): void {
  // decodeHtmlEntities
  assert.strictEqual(decodeHtmlEntities('&auml;'), 'ä');
  assert.strictEqual(decodeHtmlEntities('&aring;'), 'å');
  assert.strictEqual(decodeHtmlEntities('&Aring;'), 'Å');
  assert.strictEqual(decodeHtmlEntities('N&auml;sslan'), 'Nässlan');
  assert.strictEqual(decodeHtmlEntities('&amp;'), '&');
  assert.strictEqual(decodeHtmlEntities('a &amp; b'), 'a & b');
  assert.strictEqual(decodeHtmlEntities(''), '');
  assert.strictEqual(decodeHtmlEntities(null as unknown as string), '');
  assert.strictEqual(decodeHtmlEntities(undefined as unknown as string), '');
  assert.strictEqual(decodeHtmlEntities('&#228;'), 'ä');
  assert.strictEqual(decodeHtmlEntities('&#xE4;'), 'ä');

  // decode then strip: plain text with entities and BBCode
  const title1 = 'N&auml;sslan [b]bold[/b]';
  assert.strictEqual(stripBBCode(decodeHtmlEntities(title1)), 'Nässlan bold');

  const title2 = '[i]Italic &ouml;[/i]';
  assert.strictEqual(stripBBCode(decodeHtmlEntities(title2)), 'Italic ö');

  // only entities
  assert.strictEqual(stripBBCode(decodeHtmlEntities('G&aring;rd')), 'Gård');

  // only tags
  assert.strictEqual(stripBBCode(decodeHtmlEntities('[b]Bold[/b]')), 'Bold');

  // empty
  assert.strictEqual(stripBBCode(decodeHtmlEntities('')), '');
  assert.strictEqual(stripBBCode(decodeHtmlEntities(null as unknown as string)), '');

  // New named entities: &eacute;, &agrave;, &egrave;, &ecirc;, &euml;, &iacute;, &ntilde; and uppercase
  assert.strictEqual(decodeHtmlEntities('&eacute;'), 'é');
  assert.strictEqual(decodeHtmlEntities('&Eacute;'), 'É');
  assert.strictEqual(decodeHtmlEntities('&agrave;'), 'à');
  assert.strictEqual(decodeHtmlEntities('&Agrave;'), 'À');
  assert.strictEqual(decodeHtmlEntities('&egrave;'), 'è');
  assert.strictEqual(decodeHtmlEntities('&Egrave;'), 'È');
  assert.strictEqual(decodeHtmlEntities('&ecirc;'), 'ê');
  assert.strictEqual(decodeHtmlEntities('&Ecirc;'), 'Ê');
  assert.strictEqual(decodeHtmlEntities('&euml;'), 'ë');
  assert.strictEqual(decodeHtmlEntities('&Euml;'), 'Ë');
  assert.strictEqual(decodeHtmlEntities('&iacute;'), 'í');
  assert.strictEqual(decodeHtmlEntities('&Iacute;'), 'Í');
  assert.strictEqual(decodeHtmlEntities('&ntilde;'), 'ñ');
  assert.strictEqual(decodeHtmlEntities('&Ntilde;'), 'Ñ');
  assert.strictEqual(decodeHtmlEntities('Daniel Lehn&eacute;r'), 'Daniel Lehnér');
  assert.strictEqual(decodeHtmlEntities('Catten &amp; Mamma'), 'Catten & Mamma');
  assert.strictEqual(decodeHtmlEntities('&#233;'), 'é');
  // Double-encoded: &amp;eacute; → é
  assert.strictEqual(decodeHtmlEntities('&amp;eacute;'), 'é');
  // Combined entities in one string
  assert.strictEqual(
    decodeHtmlEntities('Catten &amp; Mamma &ouml; &eacute; &#233;'),
    'Catten & Mamma ö é é',
  );

  console.log('decodeHtmlEntities tests passed');
}

run();

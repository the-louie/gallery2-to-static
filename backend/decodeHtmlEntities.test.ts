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

  // Apostrophe entities (&#039; and &#39;) for album 23390 / parent titles
  assert.strictEqual(decodeHtmlEntities('&#039;'), "'");
  assert.strictEqual(decodeHtmlEntities('&#39;'), "'");
  assert.strictEqual(decodeHtmlEntities('DigitalChaos&#039;05'), "DigitalChaos'05");
  // Numeric without trailing semicolon
  assert.strictEqual(decodeHtmlEntities('&#039'), "'");
  assert.strictEqual(decodeHtmlEntities('x&#39y'), "x'y");
  assert.strictEqual(decodeHtmlEntities('&apos;'), "'");
  assert.strictEqual(decodeHtmlEntities("world&apos;s"), "world's");

  // SEC-01: Control character rejection
  assert.strictEqual(decodeHtmlEntities('&#0;'), '&#0;', 'null byte rejected');
  assert.strictEqual(decodeHtmlEntities('&#1;'), '&#1;', 'SOH rejected');
  assert.strictEqual(decodeHtmlEntities('&#8;'), '&#8;', 'backspace rejected');
  assert.strictEqual(decodeHtmlEntities('&#11;'), '&#11;', 'VT rejected');
  assert.strictEqual(decodeHtmlEntities('&#12;'), '&#12;', 'FF rejected');
  assert.strictEqual(decodeHtmlEntities('&#14;'), '&#14;', 'SO rejected');
  assert.strictEqual(decodeHtmlEntities('&#31;'), '&#31;', 'US rejected');
  assert.strictEqual(decodeHtmlEntities('&#127;'), '&#127;', 'DEL rejected');
  assert.strictEqual(decodeHtmlEntities('&#128;'), '&#128;', 'C1 control start rejected');
  assert.strictEqual(decodeHtmlEntities('&#159;'), '&#159;', 'C1 control end rejected');

  // SEC-01: Allowed control-like characters (whitespace)
  assert.strictEqual(decodeHtmlEntities('&#9;'), '\t', 'tab allowed');
  assert.strictEqual(decodeHtmlEntities('&#10;'), '\n', 'LF allowed');
  assert.strictEqual(decodeHtmlEntities('&#13;'), '\r', 'CR allowed');

  // SEC-01: Surrogate pair rejection
  assert.strictEqual(decodeHtmlEntities('&#55296;'), '&#55296;', 'surrogate start (0xD800) rejected');
  assert.strictEqual(decodeHtmlEntities('&#57343;'), '&#57343;', 'surrogate end (0xDFFF) rejected');
  assert.strictEqual(decodeHtmlEntities('&#xD800;'), '&#xD800;', 'hex surrogate rejected');
  assert.strictEqual(decodeHtmlEntities('&#xDFFF;'), '&#xDFFF;', 'hex surrogate end rejected');

  // SEC-01: Out-of-range rejection
  assert.strictEqual(decodeHtmlEntities('&#1114112;'), '&#1114112;', '>0x10FFFF rejected');
  assert.strictEqual(decodeHtmlEntities('&#x110000;'), '&#x110000;', 'hex >0x10FFFF rejected');
  assert.strictEqual(decodeHtmlEntities('&#99999999;'), '&#99999999;', 'very large decimal rejected');

  // SEC-01: Unicode noncharacter rejection
  assert.strictEqual(decodeHtmlEntities('&#xFDD0;'), '&#xFDD0;', 'noncharacter 0xFDD0 rejected');
  assert.strictEqual(decodeHtmlEntities('&#xFDEF;'), '&#xFDEF;', 'noncharacter 0xFDEF rejected');
  assert.strictEqual(decodeHtmlEntities('&#xFFFE;'), '&#xFFFE;', 'noncharacter 0xFFFE rejected');
  assert.strictEqual(decodeHtmlEntities('&#xFFFF;'), '&#xFFFF;', 'noncharacter 0xFFFF rejected');

  // SEC-01: Valid printable ASCII still works
  assert.strictEqual(decodeHtmlEntities('&#32;'), ' ', 'space (0x20) allowed');
  assert.strictEqual(decodeHtmlEntities('&#65;'), 'A', 'A (0x41) still works');
  assert.strictEqual(decodeHtmlEntities('&#126;'), '~', 'tilde (0x7E) allowed');

  // SEC-01: Valid BMP non-ASCII still works
  assert.strictEqual(decodeHtmlEntities('&#160;'), '\u00A0', 'NBSP (0xA0) allowed');
  assert.strictEqual(decodeHtmlEntities('&#228;'), 'ä', 'ä (0xE4) still works');
  assert.strictEqual(decodeHtmlEntities('&#233;'), 'é', 'é (0xE9) still works');

  // SEC-01: Supplementary plane characters (now correctly handled via fromCodePoint)
  assert.strictEqual(decodeHtmlEntities('&#128512;'), '😀', 'emoji U+1F600 works with fromCodePoint');
  assert.strictEqual(decodeHtmlEntities('&#x1F600;'), '😀', 'hex emoji works');

  // SEC-01: Without-semicolon variant also validates
  assert.strictEqual(decodeHtmlEntities('&#0 '), '&#0 ', 'null byte without semicolon rejected');
  assert.strictEqual(decodeHtmlEntities('x&#55296y'), 'x&#55296y', 'surrogate without semicolon rejected');

  console.log('decodeHtmlEntities tests passed');
}

run();

/**
 * Unit tests for stripBBCode.
 */

import assert from 'assert';
import { stripBBCode } from './bbcode';

function run(): void {
  // [b]Bold[/b] → "Bold"
  assert.strictEqual(stripBBCode('[b]Bold[/b]'), 'Bold');

  // [i]nested [b]text[/b][/i] → "nested text"
  assert.strictEqual(stripBBCode('[i]nested [b]text[/b][/i]'), 'nested text');

  // [color=red]Red[/color] → "Red"
  assert.strictEqual(stripBBCode('[color=red]Red[/color]'), 'Red');

  // [url=https://x.com]Click[/url] → "Click"
  assert.strictEqual(stripBBCode('[url=https://x.com]Click[/url]'), 'Click');

  // Plain text unchanged
  assert.strictEqual(stripBBCode('Plain text'), 'Plain text');

  // Empty string
  assert.strictEqual(stripBBCode(''), '');

  // Unclosed [b]Unclosed → "Unclosed"
  assert.strictEqual(stripBBCode('[b]Unclosed'), 'Unclosed');

  // All-tag string [b][/b]
  assert.strictEqual(stripBBCode('[b][/b]'), '');

  // Mixed content
  assert.strictEqual(stripBBCode('Start [i]middle[/i] end'), 'Start middle end');

  // Idempotent: plain text unchanged when run again
  const plain = 'No tags here';
  assert.strictEqual(stripBBCode(stripBBCode(plain)), plain);

  // [tag=value] style
  assert.strictEqual(stripBBCode('[size=14]Big[/size]'), 'Big');

  console.log('bbcode tests passed');
}

run();

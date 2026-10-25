/**
 * Unit tests for stripBBCode.
 */

import assert from 'assert';
import { stripBBCode } from './bbcode.ts';

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

  // Nested brackets: [[img]dangerous[/img]] → ""
  assert.strictEqual(stripBBCode('[[img]dangerous[/img]]'), '');

  // Double outer brackets: [[b]Bold[/b]] → ""
  assert.strictEqual(stripBBCode('[[b]Bold[/b]]'), '');

  // Text with nested brackets: Hello [[b]world[/b]] there → "Hello  there"
  assert.strictEqual(stripBBCode('Hello [[b]world[/b]] there'), 'Hello  there');

  // Triple nesting: [[[deep]]] → ""
  assert.strictEqual(stripBBCode('[[[deep]]]'), '');

  // Unmatched single bracket is left as-is (not a valid tag pair)
  assert.strictEqual(stripBBCode('text [ more'), 'text [ more');

  // Only ] bracket remains
  assert.strictEqual(stripBBCode('text ] more'), 'text ] more');

  // Deeply nested (11 levels): should strip up to 10 levels, one [] remains
  const deep11 = '['.repeat(11) + 'x' + ']'.repeat(11);
  const result = stripBBCode(deep11);
  // After 10 iterations: iter 1 strips [x], iters 2-10 strip 9 empty [] pairs
  // Leaves one [] pair (would need 11 iterations to fully strip)
  assert.strictEqual(result, '[]');

  console.log('bbcode tests passed');
}

run();

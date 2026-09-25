import { test } from 'node:test';
import assert from 'node:assert/strict';

import { clamp, emptyLink, EDITOR_FIELD, EDITOR_BLOCK_FRAME, EDITOR_TYPE, fieldLabel, fieldToneClass } from './editorCanvas.js';

test('clamp bounds a numeric value and falls back for anything else', () => {
  assert.equal(clamp(5, 0, 10, -1), 5);
  assert.equal(clamp(50, 0, 10, -1), 10);
  assert.equal(clamp(-5, 0, 10, -1), 0);
  assert.equal(clamp('', 0, 10, -1), -1);
  assert.equal(clamp('abc', 0, 10, -1), -1);
});

test('emptyLink matches the Gutenberg LinkControl shape', () => {
  assert.deepEqual(emptyLink(), { url: '', opensInNewTab: false });
});

test('every EDITOR_TYPE tier reads design tokens, not literal sizes', () => {
  for (const value of Object.values(EDITOR_TYPE)) {
    assert.match(value, /var\(--text-/);
    assert.doesNotMatch(value, /text-\d/);
  }
});

test('fieldToneClass names a color, a placeholder color and a ring for both tones', () => {
  for (const onDark of [true, false]) {
    const tone = fieldToneClass(onDark);
    assert.match(tone, /\btext-\[color:/);
    assert.match(tone, /\bplaceholder:text-\[color:/);
    assert.match(tone, /\bfocus-visible:ring-/);
  }
  assert.match(fieldToneClass(true), /ring-current/);
  assert.match(fieldToneClass(false), /ring-\[color:var\(--color-primary\)\]/);
});

test('EDITOR_FIELD grows and wraps, and EDITOR_BLOCK_FRAME is the dashed edge', () => {
  assert.match(EDITOR_FIELD, /resize-none overflow-hidden/);
  assert.match(EDITOR_BLOCK_FRAME, /outline-dashed/);
});

test('fieldLabel adds a one-based position only for a repeated field', () => {
  assert.equal(fieldLabel('Heading'), 'Heading');
  assert.equal(fieldLabel('Entry heading', 1), 'Entry heading 2');
  assert.equal(fieldLabel('Entry heading', 0), 'Entry heading 1');
});

test('fieldLabel is empty without a label, never the word "undefined"', () => {
  assert.equal(fieldLabel(undefined, 0), '');
  assert.equal(fieldLabel('', 2), '');
});

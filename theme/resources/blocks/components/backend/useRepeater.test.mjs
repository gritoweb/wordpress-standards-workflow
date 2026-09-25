import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./useRepeater.js', import.meta.url));
const { useRepeater, itemKey } = await executeBundle(entry, wpEditorStubs(), 'UseRepeaterBundle');

// Renders a component that calls the hook and hands back what it returned.
// Re-rendering with the cursor reset and state kept is how a second render
// reads the active row the first render's handlers set.
function harness(items) {
  const writes = [];
  resetWpEditorTest();
  let repeater;
  const Probe = () => {
    // setItems stands in for setAttributes: the next render sees what was saved.
    repeater = useRepeater({
      items,
      setItems: (next) => {
        writes.push(next);
        items = next;
      },
      blank: () => ({ fresh: true }),
    });
    return null;
  };
  const rerender = () => {
    globalThis.__wpEditorTest.stateCursor = 0;
    renderToStaticMarkup(React.createElement(Probe));
    return repeater;
  };
  return { rerender, writes, get: () => repeater };
}

test('add appends a blank row and makes it the active one', () => {
  const h = harness([{ a: 1 }, { a: 2 }]);
  h.rerender().add();
  assert.deepEqual(h.writes[0], [{ a: 1 }, { a: 2 }, { fresh: true }]);
  assert.equal(h.rerender().active, 2);
});

test('update merges the patch and keeps every other key on the item', () => {
  const h = harness([{ a: 1, key: 'k', extra: true }, { a: 2 }]);
  h.rerender().update(0, { a: 9 });
  assert.deepEqual(h.writes[0], [{ a: 9, key: 'k', extra: true }, { a: 2 }]);
});

test('move reorders and the moved item stays active', () => {
  const h = harness([{ n: 'a' }, { n: 'b' }, { n: 'c' }]);
  h.rerender().move(0, 2);
  assert.deepEqual(h.writes[0].map((e) => e.n), ['b', 'c', 'a']);
  assert.equal(h.rerender().active, 2);
});

test('removing the active row activates the nearest survivor', () => {
  const h = harness([{ n: 'a' }, { n: 'b' }, { n: 'c' }]);
  h.rerender().setActive(2);
  h.rerender().remove(2);
  assert.deepEqual(h.writes[0].map((e) => e.n), ['a', 'b']);
  assert.equal(h.rerender().active, 1);
});

test('removing the last remaining row leaves index 0 and no active item', () => {
  const h = harness([{ n: 'a' }]);
  h.rerender().remove(0);
  assert.deepEqual(h.writes[0], []);
  assert.equal(h.rerender().active, 0);
});

test('a saved value that is not an array reads as an empty list', () => {
  assert.deepEqual(harness(null).rerender().items, []);
  assert.deepEqual(harness('nope').rerender().items, []);
});

test('an active index past the end (a row removed elsewhere) clamps to the last row', () => {
  const h = harness([{ n: 'a' }, { n: 'b' }, { n: 'c' }]);
  h.rerender().setActive(2);
  const shorter = harness([{ n: 'a' }]);
  globalThis.__wpEditorTest.state = [2];
  assert.equal(shorter.rerender().active, 0);
});

test('itemKey uses the saved key and falls back to the index', () => {
  assert.equal(itemKey({ key: 'k' }, 3), 'k');
  assert.equal(itemKey({}, 3), 3);
});

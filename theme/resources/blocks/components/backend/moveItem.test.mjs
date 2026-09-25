import assert from 'node:assert/strict';
import { test } from 'node:test';
import { moveItem } from './moveItem.js';

test('moves an item forward and back without mutating the input', () => {
  const list = ['a', 'b', 'c', 'd'];

  assert.deepEqual(moveItem(list, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveItem(list, 3, 1), ['a', 'd', 'b', 'c']);
  assert.deepEqual(list, ['a', 'b', 'c', 'd']);
});

test('an out-of-range index behaves like the old inline splice', () => {
  assert.deepEqual(moveItem(['a', 'b'], 5, 0), [undefined, 'a', 'b']);
  assert.deepEqual(moveItem(['a', 'b'], 0, 9), ['b', 'a']);
});

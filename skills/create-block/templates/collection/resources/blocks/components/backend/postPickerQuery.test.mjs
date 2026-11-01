import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visibleRecords } from './postPickerQuery.js';

const post = (id, title, date, extra = {}) => ({ id, title: { rendered: title }, date, ...extra });
const records = [post(1, 'Beta', '2026-01-01'), post(2, 'Alpha', '2026-03-01'), post(3, 'Gamma', '2026-02-01'), post(4, 'Locked', '2026-04-01', { content: { protected: true } })];
const ids = (options) => visibleRecords({ records, ...options }).map((r) => r.id);

test('All: title order, exclusions win, protected records never show', () => {
  assert.deepEqual(ids({ excludeIds: [3] }), [2, 1]);
});

test('Selected: manual keeps the list order and drops the unavailable', () => {
  assert.deepEqual(ids({ includeIds: [3, 4, 99, 1] }), [3, 1]);
});

test('date sorts both ways, and the limit applies after the sort', () => {
  assert.deepEqual(ids({ orderby: 'date' }), [2, 3, 1]);
  assert.deepEqual(ids({ orderby: 'date', order: 'asc', limit: 2 }), [1, 3]);
});

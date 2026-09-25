import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./useCollectionSummary.js', import.meta.url));

// useSelect runs the callback against a fake core store the test controls.
const DATA_STUB = `
export function useSelect(map) {
  return map(() => ({
    getEntityRecords: () => globalThis.__records,
    hasResolutionFailed: () => Boolean(globalThis.__failed),
  }));
}`;
const I18N = `
export function __(value) { return value; }
export function _n(single, plural, count) { return count === 1 ? single : plural; }
export function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%(\\d+)\\$[sd]|%[sd]/g, (_, n) => args[n ? n - 1 : i++]);
}`;

const { summarizeCollection, useCollectionSummary } = await executeBundle(
  entry,
  wpEditorStubs({ '@wordpress/data': DATA_STUB, '@wordpress/i18n': I18N }),
  'UseCollectionSummaryBundle',
);

const rec = (id, protectedRecord = false) => ({ id, content: { protected: protectedRecord } });
const base = { contentType: 'person', postsPerPage: 0, pagination: 'pager', orderby: 'title' };

test('no content type is "unset", a failed query is "error", a pending one is "loading"', () => {
  assert.equal(summarizeCollection({ ...base, contentType: '' }).state, 'unset');
  assert.equal(summarizeCollection({ ...base, records: [], queryFailed: true }).state, 'error');
  assert.equal(summarizeCollection({ ...base, records: null }).state, 'loading');
});

test('an empty include list shows every published record, sorted by the chosen order', () => {
  const summary = summarizeCollection({ ...base, records: [rec(1), rec(2), rec(3)] });
  assert.equal(summary.state, 'resolved');
  assert.equal(summary.message, '3 shown, by title. All on one page.');
  assert.equal(summary.extra, null);
});

test('the exclude list always wins, and a successful empty result counts zero', () => {
  assert.match(summarizeCollection({ ...base, records: [rec(1), rec(2)], excludeIds: [2] }).message, /^1 shown,/);
  assert.match(summarizeCollection({ ...base, records: [] }).message, /^0 shown,/);
});

test('a chosen record that is missing or password-protected is reported as unavailable', () => {
  const summary = summarizeCollection({ ...base, records: [rec(1), rec(2, true)], includeIds: [1, 2, 9] });
  assert.match(summary.message, /^1 shown,/);
  assert.equal(summary.extra, '2 chosen records are not published and will not appear.');
  assert.equal(
    summarizeCollection({ ...base, records: [rec(1)], includeIds: [1, 9] }).extra,
    '1 chosen record is not published and will not appear.',
  );
});

test('manual sort reads the include list order, and each sort names its order', () => {
  const records = [rec(1), rec(2)];
  assert.match(summarizeCollection({ ...base, records, orderby: 'manual', includeIds: [2, 1] }).message, /in the order of the list\./);
  assert.match(summarizeCollection({ ...base, records, orderby: 'manual' }).message, /by title\./);
  assert.match(summarizeCollection({ ...base, records, orderby: 'date' }).message, /newest first\./);
});

test('the summary ends with the paging line', () => {
  const summary = summarizeCollection({ ...base, records: [rec(1)], postsPerPage: 6, pagination: 'loadMore', moreText: 'More' });
  assert.match(summary.message, /6 per page, with a More button\.$/);
});

test('the hook queries the store and summarizes it', () => {
  let seen;
  const Probe = ({ attributes }) => {
    seen = useCollectionSummary(attributes);
    return null;
  };
  const run = (attributes) => {
    renderToStaticMarkup(React.createElement(Probe, { attributes }));
    return seen;
  };

  globalThis.__failed = false;
  globalThis.__records = [rec(1), rec(2)];
  assert.match(run({ ...base, includeIds: null, excludeIds: undefined }).message, /^2 shown,/);

  globalThis.__records = null;
  assert.equal(run(base).state, 'loading');

  globalThis.__failed = true;
  assert.equal(run(base).state, 'error');
  assert.equal(run({ ...base, contentType: '' }).state, 'unset');
});

test('the shown count goes through _n(), so a language with plural forms can inflect it', async () => {
  const i18n = `
export function __(value) { return value; }
export function _n(single, plural, count) { return count === 1 ? 'ONE ' + single : 'MANY ' + plural; }
export function sprintf(format, ...args) { let i = 0; return format.replace(/%d/g, () => args[i++]); }`;
  const { summarizeCollection: summarize } = await executeBundle(
    entry,
    wpEditorStubs({ '@wordpress/data': DATA_STUB, '@wordpress/i18n': i18n }),
    'UseCollectionSummaryPluralBundle',
  );

  assert.match(summarize({ ...base, records: [rec(1)] }).message, /^ONE 1 shown,/);
  assert.match(summarize({ ...base, records: [rec(1), rec(2)] }).message, /^MANY 2 shown,/);
});

test('with no content type the selector returns the same empty list every time, so the block does not re-render on every store change', async () => {
  const data = `
export function useSelect(map) {
  const value = map(() => ({ getEntityRecords: () => null, hasResolutionFailed: () => false }));
  (globalThis.__selected ||= []).push(value);
  return value;
}`;
  const { useCollectionSummary: hook } = await executeBundle(
    entry,
    wpEditorStubs({ '@wordpress/data': data, '@wordpress/i18n': I18N }),
    'UseCollectionSummaryStableBundle',
  );

  globalThis.__selected = [];
  hook({ contentType: '' });
  hook({ contentType: '' });

  assert.equal(globalThis.__selected.length, 2);
  assert.equal(globalThis.__selected[0].records, globalThis.__selected[1].records);
});


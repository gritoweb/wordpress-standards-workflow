import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./PagingControls.jsx', import.meta.url));
const { PagingControls, pagingSummary } = await executeBundle(entry, wpEditorStubs(), 'PagingControlsBundle');

test('the summary says everything is on one page for zero, and describes each paging mode', () => {
  assert.equal(pagingSummary({ postsPerPage: 0, pagination: 'pager' }), 'All on one page.');
  assert.equal(pagingSummary({ postsPerPage: 12, pagination: 'pager' }), '12 per page, with numbered pages.');
  assert.equal(
    pagingSummary({ postsPerPage: 12, pagination: 'loadMore', moreText: 'Show more' }),
    '12 per page, with a Show more button.',
  );
  assert.equal(
    pagingSummary({ postsPerPage: 12, pagination: 'loadMore', moreText: '' }),
    '12 per page, with a Load More button.',
  );
});

function controls(attributes) {
  resetWpEditorTest();
  const writes = [];
  renderToStaticMarkup(React.createElement(PagingControls, { attributes, setAttributes: (patch) => writes.push(patch) }));
  return { writes, test: globalThis.__wpEditorTest };
}

test('results per page runs 0 to 48 and a cleared value saves 0', () => {
  const { writes, test: t } = controls({ postsPerPage: 6, pagination: 'pager', moreText: '' });
  const [range] = t.ranges;
  assert.equal(range.label, 'Results per page');
  assert.deepEqual([range.min, range.max], [0, 48]);
  range.onChange(undefined);
  assert.deepEqual(writes, [{ postsPerPage: 0 }]);
});

test('Paging offers numbered pages and load more', () => {
  const { test: t } = controls({ postsPerPage: 6, pagination: 'pager', moreText: '' });
  assert.deepEqual(t.selects[0].options.map((o) => o.value), ['pager', 'loadMore']);
});

test('the Load more label field shows only with load-more paging (INSP-9)', () => {
  const labels = (attributes) => renderToStaticMarkup(React.createElement(PagingControls, { attributes, setAttributes() {} }));
  resetWpEditorTest();
  assert.doesNotMatch(labels({ postsPerPage: 6, pagination: 'pager', moreText: 'x' }), /Load more label/);
  assert.match(labels({ postsPerPage: 6, pagination: 'loadMore', moreText: 'x' }), /aria-label="Load more label"/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./DividerControl.jsx', import.meta.url));
const { DividerControl, dividerClass } = await executeBundle(entry, wpEditorStubs(), 'DividerControlBundle');

test('offers the three divider options', () => {
  resetWpEditorTest();
  renderToStaticMarkup(React.createElement(DividerControl, { value: 'none', onChange: () => {} }));
  assert.deepEqual(globalThis.__wpEditorTest.selects[0].options, [
    { label: 'None', value: 'none' },
    { label: 'Above the section', value: 'above' },
    { label: 'Below the section', value: 'below' },
  ]);
});

test('dividerClass matches the front end rule for above/below and is empty for none', () => {
  assert.equal(dividerClass('above'), 'border-t-2 border-[color:var(--color-primary)]');
  assert.equal(dividerClass('below'), 'border-b-2 border-[color:var(--color-primary)]');
  assert.equal(dividerClass('none'), '');
  assert.equal(dividerClass('sideways'), '');
});

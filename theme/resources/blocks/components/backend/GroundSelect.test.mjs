import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./GroundSelect.jsx', import.meta.url));
const CONFIG = ['kit-config-stub', "export default { grounds: [{ name: 'ink', token: '--color-ink', light: false }] };"];
const { GroundSelect, groundOptions } = await executeBundle(
  entry,
  [...wpEditorStubs(), CONFIG],
  'GroundSelectBundle',
  { 'kit.config.json': 'kit-config-stub' },
);

test('the options start with Default, whose value is the empty string', () => {
  assert.deepEqual(groundOptions(), [
    { label: 'Default', value: '' },
    { label: 'Ink', value: 'ink' },
  ]);
});

test('the select is labeled Ground and shows Default for a block with no ground', () => {
  resetWpEditorTest();
  renderToStaticMarkup(React.createElement(GroundSelect, { value: undefined, onChange: () => {} }));
  const [select] = globalThis.__wpEditorTest.selects;
  assert.equal(select.label, 'Ground');
  assert.equal(select.value, '');
  assert.equal(select.options[0].value, '');
});

test('a project with no grounds still offers Default', () => {
  assert.deepEqual(groundOptions().slice(0, 1), [{ label: 'Default', value: '' }]);
});

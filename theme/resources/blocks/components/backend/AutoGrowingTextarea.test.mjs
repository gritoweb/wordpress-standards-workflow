import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';

const entry = fileURLToPath(new URL('./AutoGrowingTextarea.jsx', import.meta.url));
const { AutoGrowingTextarea } = await executeBundle(entry, [], 'AutoGrowingTextareaBundle');

test('starts at one row and grows via field-sizing:content', () => {
  const markup = renderToStaticMarkup(React.createElement(AutoGrowingTextarea, { value: 'hi', onChange: () => {} }));
  assert.match(markup, /rows="1"/);
  assert.match(markup, /field-sizing:content/);
});

test('forwards arbitrary props (placeholder, className, etc.)', () => {
  const markup = renderToStaticMarkup(
    React.createElement(AutoGrowingTextarea, { value: '', onChange: () => {}, placeholder: 'Say something', className: 'w-full' }),
  );
  assert.match(markup, /placeholder="Say something"/);
  assert.match(markup, /class="[^"]*\bw-full\b[^"]*"/);
});

test('onChange receives the string, not the event', () => {
  let received;
  const element = AutoGrowingTextarea({ value: '', onChange: (value) => { received = value; } });
  element.props.onChange({ target: { value: 'typed' } });
  assert.equal(received, 'typed');
});

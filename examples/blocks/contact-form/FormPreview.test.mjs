import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../theme/scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../theme/scripts/wp-editor-stubs.mjs';

resetWpEditorTest();
const { FormPreview } = await executeBundle(
  new URL('./FormPreview.jsx', import.meta.url).pathname,
  wpEditorStubs({ '@wordpress/i18n': 'export function __(value) { return value; }' }),
  'FormPreviewBundle',
);

const render = (props) =>
  renderToStaticMarkup(
    React.createElement(FormPreview, { formId: 0, formShortcode: '', gravity: { status: 'ready', forms: [], fields: null }, partProps: {}, ...props }),
  );

test('a chosen form shows its name and its fields as text, never as inputs', () => {
  const markup = render({
    formId: 5,
    gravity: {
      status: 'ready',
      forms: [{ id: 5, title: 'Contact us' }],
      fields: [
        { id: 1, label: 'Name', type: 'text', required: true },
        { id: 2, label: 'Message', type: 'textarea', required: false },
      ],
    },
  });

  assert.match(markup, /data-form-state="gravity"/);
  assert.match(markup, /Contact us/);
  assert.match(markup, /<li[^>]*>Name<span aria-hidden="true"> \*<\/span><\/li>/);
  assert.match(markup, /<li[^>]*>Message<\/li>/);
  assert.doesNotMatch(markup, /<input|<textarea|<select/);
});

test('a form whose fields have not loaded shows its ID', () => {
  assert.match(render({ formId: 7 }), /#7/);
});

test('a shortcode form shows the shortcode as text', () => {
  const markup = render({ formShortcode: '[cf7 id="1"]' });

  assert.match(markup, /data-form-state="shortcode"/);
  assert.match(markup, /\[cf7 id=&quot;1&quot;\]/);
});

test('no form at all points to the Form panel', () => {
  assert.match(render({}), /data-form-state="unset"[^>]*>Choose a form in the Form panel\./);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./CtaPreview.jsx', import.meta.url));
const CONFIG = ['kit-config-stub', "export default { grounds: [{ name: 'ink', token: '--color-ink', light: false }] };"];
const { CtaPreview, ctaPreviewLabel } = await executeBundle(
  entry,
  [...wpEditorStubs(), CONFIG],
  'CtaPreviewBundle',
  { 'kit.config.json': 'kit-config-stub' },
);

const link = { url: 'https://example.com', opensInNewTab: false };
const render = (props) => renderToStaticMarkup(React.createElement(CtaPreview, props));

test('the label reads the text when complete, "Complete button" when half set, "Add button" when empty', () => {
  assert.equal(ctaPreviewLabel('Go', link), 'Go');
  assert.equal(ctaPreviewLabel('Go', { url: '' }), 'Complete button');
  assert.equal(ctaPreviewLabel('', link), 'Complete button');
  assert.equal(ctaPreviewLabel('', { url: '' }), 'Add button');
  assert.equal(ctaPreviewLabel('', undefined), 'Add button');
});

test('it is a group span with the front-end button classes that never takes a click', () => {
  const markup = render({ text: 'Go', link, icon: 'arrow', iconPosition: 'before' });
  assert.match(markup, /^<span [^>]*role="group"/);
  assert.match(markup, /aria-label="Button preview"/);
  assert.match(markup, /class="btn btn-primary btn-icon-arrow btn-icon-before"/);
  assert.match(markup, /style="pointer-events:none"/);
  assert.doesNotMatch(markup, /components-button|<a /);
});

test('a dark ground switches the button family, and a tone override wins over the ground', () => {
  assert.match(render({ text: 'Go', link, ground: 'ink' }), /btn-on-dark/);
  assert.match(render({ text: 'Go', link, ground: '', tone: 'light' }), /btn-on-dark/);
});

test('empty and not selected renders nothing, empty and selected offers Add button', () => {
  assert.equal(render({ text: '', link: { url: '' } }), '');
  assert.match(render({ text: '', link: { url: '' }, isSelected: true }), />Add button</);
});

test('an entrance part style merges without losing pointer-events', () => {
  const markup = render({ text: 'Go', link, style: { '--e-i': 2 } });
  assert.match(markup, /style="--e-i:2;pointer-events:none"/);
});

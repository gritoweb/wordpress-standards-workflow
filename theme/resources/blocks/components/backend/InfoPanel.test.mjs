import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';

const entry = fileURLToPath(new URL('./InfoPanel.jsx', import.meta.url));
const { InfoPanel } = await executeBundle(entry, [], 'InfoPanelBundle');

test('the background reads the --color-ink token through color-mix, no hard-coded rgb', () => {
  const markup = renderToStaticMarkup(React.createElement(InfoPanel, { title: 'Note' }, 'body'));
  assert.match(markup, /color-mix\(in srgb, var\(--color-ink\) 8%, transparent\)/);
  assert.doesNotMatch(markup, /rgb\(51 52 42/);
});

test('renders the title and children', () => {
  const markup = renderToStaticMarkup(React.createElement(InfoPanel, { title: 'Heads up' }, 'Body text'));
  assert.match(markup, />Heads up</);
  assert.match(markup, />Body text</);
});

test('titleGap controls the title bottom margin', () => {
  const markup = renderToStaticMarkup(React.createElement(InfoPanel, { title: 'Note', titleGap: 20 }, 'x'));
  assert.match(markup, /margin-bottom:20px/);
});

// A canvas mounting InfoPanel as an entrance part passes its own style
// (entrancePartProps()'s --e-i), which must extend the panel's own fixed
// look, not get silently dropped by it.
test('a caller style prop extends the panel style instead of replacing it', () => {
  const markup = renderToStaticMarkup(
    React.createElement(InfoPanel, { title: 'Note', style: { '--e-i': 2 } }, 'x'),
  );
  assert.match(markup, /--e-i:2/);
  assert.match(markup, /border-radius/);
});

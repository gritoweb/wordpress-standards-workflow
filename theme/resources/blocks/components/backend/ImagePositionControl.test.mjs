import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./ImagePositionControl.jsx', import.meta.url));

const { ImagePositionControl, focalCss } = await executeBundle(entry, wpEditorStubs(), 'ImagePositionControlBundle');

function render(props, { open = false } = {}) {
  resetWpEditorTest();
  // The component's one useState(false) call is cursor 0; pre-seeding it
  // is how this fake hook simulates "the grid is already open" for SSR,
  // which never fires the real onClick that would open it.
  if (open) globalThis.__wpEditorTest.state[0] = true;
  return renderToStaticMarkup(React.createElement(ImagePositionControl, { value: 'center', onChange: () => {}, ...props }));
}

test('the toggle is collapsed by default with aria-expanded=false', () => {
  const markup = render({});
  assert.match(markup, /aria-expanded="false"/);
});

test('the grid is not rendered until the toggle opens', () => {
  assert.doesNotMatch(render({}), /role="group"/);
});

test('the toggle reflects aria-expanded=true once open', () => {
  assert.match(render({}, { open: true }), /aria-expanded="true"/);
});

test('every grid button has an aria-label naming its position and aria-pressed for the active one', () => {
  const markup = render({ value: 'top-left' }, { open: true });

  assert.match(markup, /aria-label="Top left"[^>]*aria-pressed="true"/);
  assert.match(markup, /aria-label="Bottom right"[^>]*aria-pressed="false"/);
  assert.match(markup, /role="group" aria-label="Position"/);
});

test('focalCss maps every position to the same CSS pairs BlockImagePosition.php uses', () => {
  assert.equal(focalCss('top-left'), 'left top');
  assert.equal(focalCss('center'), 'center center');
  assert.equal(focalCss('bottom-right'), 'right bottom');
});

test('focalCss falls back to "center center" for an unknown position', () => {
  assert.equal(focalCss('nowhere'), 'center center');
});

test('the toggle button label defaults to "Position" and accepts an override', () => {
  assert.match(render({}), />Position</);
  assert.match(render({ label: 'Background position' }), />Background position</);
});

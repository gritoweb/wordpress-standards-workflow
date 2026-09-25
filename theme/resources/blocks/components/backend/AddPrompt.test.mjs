import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';

const entry = fileURLToPath(new URL('./AddPrompt.jsx', import.meta.url));
const { AddPrompt } = await executeBundle(entry, [], 'AddPromptBundle');

test('the prompt is a keyboard-reachable role=button span', () => {
  const markup = renderToStaticMarkup(React.createElement(AddPrompt, { label: 'Add office details', onClick: () => {} }));
  assert.match(markup, /^<span role="button" tabindex="0"/);
  assert.match(markup, />Add office details</);
});

test('click, Enter and Space call onClick; other keys do not', () => {
  let calls = 0;
  const element = AddPrompt({ label: 'Add', onClick: () => calls++ });
  const prevented = [];
  element.props.onClick();
  for (const key of ['Enter', ' ', 'a']) {
    element.props.onKeyDown({ key, preventDefault: () => prevented.push(key) });
  }
  assert.equal(calls, 3);
  assert.deepEqual(prevented, ['Enter', ' ']);
});

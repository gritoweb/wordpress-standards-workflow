import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./LinkPicker.jsx', import.meta.url));

// The canvas iframe has its own realm, so its elements fail the admin
// window's `instanceof HTMLElement` — this must be set before the module is
// evaluated, since the patch runs at module load time.
class HTMLElement {}
class HTMLInputElement extends HTMLElement {}
globalThis.window = { HTMLElement, HTMLInputElement };

// wp-editor-stubs.mjs's default @wordpress/element only exports useState (a
// fake, cursor-based hook — real React hooks would bundle a second copy of
// react inside the Vite build, breaking react-dom/server's dispatcher). This
// reuses that exact default and appends the one extra hook LinkPicker needs,
// instead of hand-duplicating the cursor logic or editing the shared file.
const defaultElement = new Map(wpEditorStubs()).get('@wordpress/element');

const OVERRIDES = {
  '@wordpress/element': `${defaultElement}\nlet __idCounter = 0;\nexport function useId() { return 'test-id-' + __idCounter++; }\n`,
  '@wordpress/block-editor': `
export function LinkControl(props) {
  globalThis.__wpEditorTest.linkControls = globalThis.__wpEditorTest.linkControls ?? [];
  globalThis.__wpEditorTest.linkControls.push(props);
  return null;
}`,
  '@wordpress/components': `
import React from 'react';
export function Button(props) {
  globalThis.__wpEditorTest.buttons.push(props);
  return React.createElement('button', { 'aria-labelledby': props['aria-labelledby'], onClick: props.onClick }, props.children);
}
export function Popover(props) {
  globalThis.__wpEditorTest.popovers = globalThis.__wpEditorTest.popovers ?? [];
  globalThis.__wpEditorTest.popovers.push(props);
  return React.createElement('div', null, props.children);
}`,
};

resetWpEditorTest();
const { LinkPicker } = await executeBundle(entry, wpEditorStubs(OVERRIDES), 'LinkPickerBundle');

test('an element from another realm still counts as an HTMLElement', () => {
  const foreignElement = { nodeType: 1 };
  assert.equal(foreignElement instanceof HTMLElement, true);
});

test('the widened check does not leak to HTMLElement subclasses', () => {
  const foreignElement = { nodeType: 1 };
  assert.equal(foreignElement instanceof HTMLInputElement, false);
  assert.equal(new HTMLElement() instanceof HTMLInputElement, false);
  assert.equal(new HTMLInputElement() instanceof HTMLInputElement, true);
});

// M8: nodeType === 1 alone also matches SVG and MathML elements, widening
// core/plugin `instanceof HTMLElement` checks across the whole admin page.
test('an SVG element from any realm is not an HTMLElement', () => {
  const svgElement = { nodeType: 1, namespaceURI: 'http://www.w3.org/2000/svg' };
  assert.equal(svgElement instanceof HTMLElement, false);
});

test('a cross-realm HTML element with an explicit HTML namespace still counts', () => {
  const foreignInput = { nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml' };
  assert.equal(foreignInput instanceof HTMLElement, true);
});

function render(props) {
  resetWpEditorTest();
  globalThis.__wpEditorTest.linkControls = [];
  globalThis.__wpEditorTest.popovers = [];
  const markup = renderToStaticMarkup(React.createElement(LinkPicker, { value: {}, onChange: () => {}, ...props }));
  return { markup, linkControl: globalThis.__wpEditorTest.linkControls[0] };
}

test('the canvas trigger shows the placeholder when there is no url', () => {
  const { markup } = render({});
  assert.match(markup, /Select link…/);
});

test('the canvas trigger shows the url once set', () => {
  const { markup } = render({ value: { url: 'https://example.com' } });
  assert.match(markup, /https:\/\/example\.com/);
});

test("the trigger button's accessible name is tied to the label, not just visually adjacent", () => {
  const { markup } = render({ label: 'CTA link' });
  const labelId = markup.match(/id="([^"]+)"/)?.[1];
  assert.ok(labelId, 'label element should have an id');
  assert.match(markup, new RegExp(`aria-labelledby="${labelId}"`));
});

test('fullWidth renders the class with no ws- prefix', () => {
  const { markup } = render({ fullWidth: true });
  assert.match(markup, /class="link-picker/);
  assert.doesNotMatch(markup, /ws-link-picker/);
});

test('fullWidth renders LinkControl inline, not behind a trigger button', () => {
  const { markup, linkControl } = render({ fullWidth: true, value: { url: 'https://example.com' } });
  assert.ok(linkControl);
  assert.doesNotMatch(markup, /<button/);
});

test('LinkControl gets the value and settings passed through unchanged', () => {
  const settings = [{ id: 'nofollow', title: 'Mark as nofollow' }];
  const { linkControl } = render({ fullWidth: true, value: { url: 'https://example.com' }, settings });
  assert.equal(linkControl.value.url, 'https://example.com');
  assert.equal(linkControl.settings, settings);
});

test('onRemove is used when provided; otherwise onChange clears the link', () => {
  let removed = false;
  const { linkControl } = render({ fullWidth: true, onRemove: () => (removed = true) });
  linkControl.onRemove();
  assert.equal(removed, true);
});

test('with no onRemove, the LinkControl remove handler clears the value through onChange', () => {
  let changed;
  const { linkControl } = render({ fullWidth: true, onChange: (v) => (changed = v) });
  linkControl.onRemove();
  assert.deepEqual(changed, { url: '', opensInNewTab: false });
});

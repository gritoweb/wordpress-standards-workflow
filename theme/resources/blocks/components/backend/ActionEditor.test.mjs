import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { cascade } from '../../../../scripts/css-cascade.mjs';
import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./ActionEditor.jsx', import.meta.url));

// ActionEditor renders the real LinkPicker.jsx, so it needs the same
// element/block-editor/components surface LinkPicker.test.mjs stubs.
const defaultElement = new Map(wpEditorStubs()).get('@wordpress/element');
const OVERRIDES = {
  '@wordpress/element': `${defaultElement}\nlet __idCounter = 0;\nexport function useId() { return 'test-id-' + __idCounter++; }\n`,
  // wp-editor-stubs.mjs's default @wordpress/i18n only exports __; sprintf
  // does a plain %s substitution, enough for these tests.
  '@wordpress/i18n': `
export function __(value) { return value; }
export function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%s/g, () => args[i++]);
}
`,
  '@wordpress/block-editor': `export function LinkControl() { return null; }`,
  '@wordpress/components': `
import React from 'react';
export function Button(props) { return React.createElement('button', { onClick: props.onClick }, props.children); }
export function Popover(props) { return React.createElement('div', null, props.children); }
`,
};

globalThis.window = { HTMLElement: class {} };

const { ActionEditor, ctaIconClass } = await executeBundle(entry, wpEditorStubs(OVERRIDES), 'ActionEditorBundle');

function render(props) {
  resetWpEditorTest();
  return renderToStaticMarkup(
    React.createElement(ActionEditor, {
      groupLabel: 'CTA',
      label: 'Text',
      linkLabel: 'Link',
      text: '',
      link: null,
      onTextChange: () => {},
      onLinkChange: () => {},
      ...props,
    }),
  );
}

test('ctaIconClass matches BlockAttributes::ctaIconClass in PHP', () => {
  assert.equal(ctaIconClass('arrow', 'before'), 'btn-icon-arrow btn-icon-before');
  assert.equal(ctaIconClass('arrow', 'after'), 'btn-icon-arrow');
  assert.equal(ctaIconClass('sparkle', ''), '');
  assert.equal(ctaIconClass('', ''), '');
});

test('the "open in a new tab" checkbox has a translatable, non-concatenated accessible name', () => {
  const markup = render({ linkLabel: 'CTA link' });
  assert.match(markup, /aria-label="Open CTA link in a new tab"/);
});

test('the group has an accessible name from groupLabel', () => {
  const markup = render({ groupLabel: 'Primary action' });
  assert.match(markup, /aria-label="Primary action"/);
});

test('the icon controls are absent without onIconChange', () => {
  const markup = render({});
  assert.doesNotMatch(markup, /Icon position/);
});

test('the icon position toggle only appears once an icon is chosen', () => {
  const withoutIcon = render({ onIconChange: () => {}, icon: 'none' });
  assert.doesNotMatch(withoutIcon, /Icon position/);

  const withIcon = render({ onIconChange: () => {}, icon: 'arrow', iconPosition: 'before' });
  assert.match(withIcon, /Icon position/);
  assert.match(withIcon, /aria-pressed="true"[^>]*>Before label/);
});

test('stacked drops the Tailwind classes in favour of inline styles', () => {
  const markup = render({ stacked: true });
  assert.doesNotMatch(markup, /class="mt-3 grid/);
  assert.match(markup, /display:flex;flex-direction:column/);
});

// WordPress gives .block-editor-link-control `min-width: 350px`, and the
// inspector sidebar is 280px wide, so the destination field scrolled
// sideways. Inline styles cannot reach a core class, so the stacked picker
// ships a rule scoped to its own wrapper.
const CORE_LINK_CONTROL = '.block-editor-link-control { position: relative; min-width: 350px; }';
const inlineCss = (markup) => [...markup.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

// Inline on the canvas, the theme CSS breaks LinkControl's preview row, so stacked keeps the popover trigger (7a9e232).
test('stacked keeps the LinkPicker trigger instead of rendering LinkControl inline', () => {
  const markup = render({ stacked: true });

  assert.doesNotMatch(markup, /class="link-picker"/);
  assert.equal(inlineCss(markup), '');
});

test('the canvas picker keeps core\'s link control rules untouched', () => {
  assert.equal(inlineCss(render({ stacked: false })), '');
});

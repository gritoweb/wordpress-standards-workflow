import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./EditorSection.jsx', import.meta.url));
const defaults = new Map(wpEditorStubs());

// useBlockProps with its own style, so the merge with the entrance style is
// observable.
const BLOCK_EDITOR = `${defaults.get('@wordpress/block-editor')}
export function useBlockProps(props = {}) {
  return { className: 'wp-block-test', style: { color: 'red' }, ...props };
}`;

const CONFIG = ['kit-config-stub', "export default { grounds: [{ name: 'ink', token: '--color-ink', light: false }] };"];

const { EditorSection } = await executeBundle(
  entry,
  [...wpEditorStubs({ '@wordpress/block-editor': BLOCK_EDITOR }), CONFIG],
  'EditorSectionBundle',
  { 'kit.config.json': 'kit-config-stub' },
);

const entrance = { type: 'fade', direction: 'up', unit: 'px', trigger: 'section', distance: 40, duration: null, delay: null, stagger: null };
const render = (props) =>
  renderToStaticMarkup(React.createElement(EditorSection, { slug: 'demo', entrance, ...props }, React.createElement('p', null, 'inside')));

test('the root is a section with the block props, the slug, the dashed edge and the inner container', () => {
  const markup = render({});
  assert.match(markup, /^<section [^>]*class="wp-block-test demo-editor /);
  assert.match(markup, /outline-dashed/);
  assert.match(markup, /<div class="demo-editor__inner container"><p>inside<\/p><\/div>/);
});

test('the root carries the same responsive padding the page prints, from the block attributes', () => {
  assert.match(render({}), /class="[^"]*\bpy-14 md:py-28 px-5 lg:px-\[6rem\]/);
  const custom = render({ attributes: { paddingVertMobile: 0, paddingVertDesktop: 218, paddingXMobile: false, paddingXDesktop: false } });
  assert.match(custom, /class="[^"]*\bpy-0 md:py-\[13\.625rem\] px-0 lg:px-0/);
});

test('the block style and the entrance style merge into one style attribute', () => {
  const markup = render({});
  assert.equal((markup.match(/ style="/g) ?? []).length, 1);
  assert.match(markup, /style="color:red;--e-distance:40px"/);
  assert.match(markup, /data-entrance="fade"/);
});

test('a configured ground and a divider reach the class list and data-divider', () => {
  const markup = render({ ground: 'ink', sectionDivider: 'above' });
  assert.match(markup, /ground-ink on-dark/);
  assert.match(markup, /border-t-2/);
  assert.match(markup, /data-divider="above"/);
});

test('an unknown ground prints no ground class, and no divider means none', () => {
  const markup = render({ ground: 'gone' });
  assert.doesNotMatch(markup, /ground-gone/);
  assert.match(markup, /data-divider="none"/);
});

test('extra props land on the root so a block can print its data attributes', () => {
  assert.match(render({ 'data-media-position': 'left' }), /<section [^>]*data-media-position="left"/);
});

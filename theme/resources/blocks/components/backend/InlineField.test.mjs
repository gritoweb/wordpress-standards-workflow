import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./InlineField.jsx', import.meta.url));
const { InlineField, InlineHeading } = await executeBundle(entry, wpEditorStubs(), 'InlineFieldBundle');

const render = (Component, props) =>
  renderToStaticMarkup(React.createElement(Component, { value: 'Hello', onChange: () => {}, label: 'Heading', ...props }));

test('a field is a growing textarea with a name, the reset, its own color and a focus ring', () => {
  const markup = render(InlineField, {});
  assert.match(markup, /^<textarea /);
  assert.match(markup, /aria-label="Heading"/);
  assert.match(markup, /resize-none overflow-hidden border-0 bg-transparent p-1/);
  assert.match(markup, /text-\[color:var\(--color-ink\)\]/);
  assert.match(markup, /placeholder:text-/);
  assert.match(markup, /focus-visible:ring-\[color:var\(--color-primary\)\]/);
});

test('on a dark ground or a photo the field reads light and rings in the current color', () => {
  const markup = render(InlineField, { onDark: true });
  assert.match(markup, /text-\[color:var\(--color-light\)\]/);
  assert.match(markup, /focus-visible:ring-current/);
});

test('a repeated field adds its position to its name', () => {
  assert.match(render(InlineField, { label: 'Entry heading', position: 1 }), /aria-label="Entry heading 2"/);
});

test('onChange gets the string, not the event', () => {
  const seen = [];
  // AutoGrowingTextarea turns the event into the string, so render one level down to reach the textarea.
  const field = InlineField({ label: 'Heading', value: '', onChange: (value) => seen.push(value) });
  field.type(field.props).props.onChange({ target: { value: 'typed' } });
  assert.deepEqual(seen, ['typed']);
});

test('a heading pairs its front-end class with an EDITOR_TYPE tier', () => {
  const markup = render(InlineHeading, { tier: 'statement', headingClass: 'heading-1' });
  assert.match(markup, / heading-1 text-\[length:var\(--text-h3-mobile\)\]/);
  assert.match(render(InlineHeading, {}), / heading-2 text-\[length:var\(--text-h4-mobile\)\]/);
});

// forms.css styles every textarea in @layer components, which beats the
// heading ramp in @layer base, so a heading field would draw in the body font
// at the input weight. The field names its level's face itself (CANVAS-3).
test('a heading field keeps the display font and its level\'s weight, whatever the tier', () => {
  for (const level of [1, 2, 3, 4, 5, 6]) {
    for (const tier of ['statement', 'section', 'entry', 'cardTitle']) {
      const markup = render(InlineHeading, { tier, headingClass: `heading-${level}` });

      assert.match(markup, /\bfont-display\b/, `heading-${level} at ${tier}`);
      assert.match(markup, new RegExp(`font-\\[weight:var\\(--text-h${level}--font-weight\\)\\]`), `heading-${level} at ${tier}`);
    }
  }
});

test('a heading field that asks for regular weight keeps it', () => {
  const markup = render(InlineHeading, { headingClass: 'heading-4', className: 'heading-regular' });

  assert.doesNotMatch(markup, /font-\[weight:/);
  assert.match(markup, /heading-regular/);
});

test('a plain field names no face, so it keeps the body one', () => {
  assert.doesNotMatch(render(InlineField, {}), /font-display|font-\[weight:/);
});

// Tailwind only generates classes it finds written out in source, so a
// weight class built from a template string ships no CSS.
test('every heading weight class InlineField can emit is written out in full in its source', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('./InlineField.jsx', import.meta.url), 'utf8');
  for (const level of [1, 2, 3, 4, 5, 6]) {
    assert.ok(source.includes(`font-[weight:var(--text-h${level}--font-weight)]`), `h${level} weight class`);
  }
});

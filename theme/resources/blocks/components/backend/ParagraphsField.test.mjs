import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';

const entry = fileURLToPath(new URL('./ParagraphsField.jsx', import.meta.url));

// The rich-text stub models text-only content: the offsets these tests use
// index plain characters, which is what the real create/split do for a
// paragraph without inline formats.
const { ParagraphsField, parseParagraphs, serializeParagraphs } = await executeBundle(
  entry,
  [
    [
      '@wordpress/block-editor',
      `export function RichText() { return null; }
      export function BlockControls() { return null; }
      export const store = 'core/block-editor';
      export function useBlockEditContext() { return { clientId: 'block-1' }; }`,
    ],
    [
      '@wordpress/data',
      `export function useSelect() {
        return {
          getSelectionStart: () => globalThis.__selection,
          getSelectionEnd: () => globalThis.__selection,
        };
      }
      export function useDispatch() {
        return {
          selectionChange: (...args) => globalThis.__selectionChanges.push(args),
        };
      }`,
    ],
    [
      '@wordpress/components',
      'export function ToolbarGroup() { return null; } export function ToolbarButton() { return null; }',
    ],
    ['@wordpress/i18n', 'export function __(value) { return value; }'],
    ['@wordpress/element', 'export function useId() { return "f"; } export function RawHTML() { return null; }'],
    [
      '@wordpress/rich-text',
      `export function create({ html }) {
        return { html, text: html.replace(/<[^>]*>/g, ''), start: 0, end: 0 };
      }
      export function split(value) {
        return [
          { html: value.html.slice(0, value.start) },
          { html: value.html.slice(value.end) },
        ];
      }
      export function toHTMLString({ value }) { return value.html; }`,
    ],
  ],
  'ParagraphsFieldTestBundle',
);

const VIRTUES =
  '<p><strong>First value:</strong></p><p>We uphold the first standard.</p>' +
  '<p><strong>Second value:</strong></p><p>We treat everyone with respect.</p>' +
  '<p><strong>Third value:</strong></p><p>We keep learning.</p>' +
  '<p><strong>Fourth value:</strong></p><p>We finish what we start.</p>' +
  '<p><strong>Fifth value:</strong></p><p>We leave things better.</p>';

const enter = (overrides = {}) => ({
  key: 'Enter',
  shiftKey: false,
  preventDefault() {
    this.prevented = true;
  },
  ...overrides,
});

let changes;

function render(value, extra = {}) {
  changes = [];
  const element = ParagraphsField({
    value,
    onChange: (next) => changes.push(next),
    placeholder: 'Write the body',
    className: 'owner p-1',
    'aria-label': 'Body',
    ...extra,
  });

  const children = React.Children.toArray(element.props.children);
  const controls = children.find((child) => child.props.group === 'block');

  return {
    wrapper: element,
    fields: children.filter((child) => child !== controls),
    // Bulleted then numbered, as the editor's block toolbar shows them.
    buttons: React.Children.toArray(controls.props.children.props.children),
  };
}

const itemsOf = (list) => React.Children.toArray(list.props.children);

beforeEach(() => {
  globalThis.__selection = { offset: 0 };
  globalThis.__selectionChanges = [];
});

// The full-value round trip is what stops an edit from deleting content.
const roundTrip = (value) => serializeParagraphs(parseParagraphs(value));

test('parse and serialize round-trip a multi-paragraph value byte for byte', () => {
  assert.equal(parseParagraphs(VIRTUES).length, 10);
  assert.equal(parseParagraphs(VIRTUES)[0].html, '<strong>First value:</strong>');
  assert.equal(roundTrip(VIRTUES), VIRTUES);
});

test('lists, headings, attributes and separators round-trip byte for byte', () => {
  for (const value of [
    '<p>Intro</p><ul><li>Keep this service</li></ul><p>Tail</p>',
    '<p class="has-text-align-center">One</p>\n<p>Two</p>',
    '<!-- wp:paragraph --><p>One</p><!-- /wp:paragraph -->\n<h3>Head</h3>\n<p class="x">Two</p>',
    'Before<p>One</p>After',
  ]) {
    assert.equal(roundTrip(value), value);
  }
});

test('a value without paragraphs is one paragraph and stays unwrapped', () => {
  assert.deepEqual(parseParagraphs('Plain <em>text</em>'), [
    { open: '', html: 'Plain <em>text</em>' },
  ]);
  assert.deepEqual(parseParagraphs(''), [{ open: '', html: '' }]);
  assert.deepEqual(parseParagraphs(undefined), [{ open: '', html: '' }]);
  assert.equal(roundTrip('Plain <em>text</em>'), 'Plain <em>text</em>');
  assert.equal(serializeParagraphs([{ open: '<p>', html: '' }]), '');
});

test('non-paragraph content stays on the canvas and survives an edit', () => {
  const value = '<p>Intro</p><h3>Keep</h3><p class="c">Tail</p>';
  const { fields } = render(value);

  assert.equal(fields.length, 3);
  assert.equal(fields[1].props.children, '<h3>Keep</h3>');

  fields[0].props.onChange('Intro!');
  fields[2].props.onChange('Tail!');

  assert.deepEqual(changes, [
    '<p>Intro!</p><h3>Keep</h3><p class="c">Tail</p>',
    '<p>Intro</p><h3>Keep</h3><p class="c">Tail!</p>',
  ]);
});

test('paragraph attributes survive a split, on the first part only', () => {
  const { fields } = render('<p class="c">Hello world</p>\n<p>Two</p>');
  globalThis.__selection = { offset: 5 };

  fields[0].props.onKeyDown(enter());

  assert.deepEqual(changes, [
    '<p class="c">Hello</p><p> world</p>\n<p>Two</p>',
  ]);
});

test('merge only joins paragraphs that touch', () => {
  const list = render('<p>One</p><ul><li>x</li></ul><p>Two</p>');
  list.fields[2].props.onMerge(false);
  list.fields[0].props.onMerge(true);
  assert.deepEqual(changes, []);

  const adjacent = render('<p class="c">One</p><p>Two</p><ul><li>x</li></ul>');
  adjacent.fields[1].props.onMerge(false);
  assert.deepEqual(changes, ['<p class="c">OneTwo</p><ul><li>x</li></ul>']);
});

test('rendering never calls onChange and keeps the owner classes', () => {
  const { wrapper, fields } = render(VIRTUES);

  assert.deepEqual(changes, []);
  assert.deepEqual(globalThis.__selectionChanges, []);
  assert.equal(wrapper.props.className, 'owner p-1');
  assert.equal(fields.length, 10);
  assert.ok(fields.every((field) => field.props.tagName === 'p'));
  assert.ok(
    fields.every((field) => {
      const classes = field.props.className.split(' ');
      return (
        classes.includes('focus-visible:ring-2') &&
        classes.includes('focus-visible:ring-[color:var(--color-primary)]')
      );
    }),
    'each paragraph, the element that takes focus, carries the keyboard ring',
  );
  assert.equal(fields[0].props.placeholder, 'Write the body');
  assert.equal(fields[1].props.placeholder, undefined);
  assert.equal(fields[0].props['aria-label'], 'Body, paragraph 1');
  assert.equal(render('Plain').fields[0].props['aria-label'], 'Body');
});

test('editing one paragraph rewrites only that paragraph', () => {
  const { fields } = render('<p>One</p><p>Two</p>');

  fields[1].props.onChange('Two <strong>bold</strong>');

  assert.deepEqual(changes, ['<p>One</p><p>Two <strong>bold</strong></p>']);
});

test('editing a plain one-line value keeps it unwrapped', () => {
  const { fields } = render('Plain');

  fields[0].props.onChange('Plain text');

  assert.deepEqual(changes, ['Plain text']);
});

test('Enter splits the paragraph at the caret and moves the selection', () => {
  const { fields } = render('<p>Hello world</p><p>Tail</p>');
  globalThis.__selection = { offset: 5 };
  const event = enter();

  fields[0].props.onKeyDown(event);

  assert.equal(event.prevented, true);
  assert.deepEqual(changes, ['<p>Hello</p><p> world</p><p>Tail</p>']);
  assert.deepEqual(globalThis.__selectionChanges, [['block-1', 'f-1', 0, 0]]);
});

test('Enter in a plain value starts a second paragraph', () => {
  const { fields } = render('Hello world');
  globalThis.__selection = { offset: 5 };

  fields[0].props.onKeyDown(enter());

  assert.deepEqual(changes, ['<p>Hello</p><p> world</p>']);
});

test('Shift+Enter is left to RichText', () => {
  const { fields } = render('<p>Hello</p>');
  const event = enter({ shiftKey: true });

  fields[0].props.onKeyDown(event);

  assert.equal(event.prevented, undefined);
  assert.deepEqual(changes, []);
});

test('Backspace at the start merges into the previous paragraph', () => {
  const { fields } = render('<p>One</p><p>Two</p><p>Three</p>');

  fields[1].props.onMerge(false);

  assert.deepEqual(changes, ['<p>OneTwo</p><p>Three</p>']);
  assert.deepEqual(globalThis.__selectionChanges, [['block-1', 'f-0', 3, 3]]);
});

test('an empty paragraph is removed by merging, even into an empty one', () => {
  const { fields } = render('<p></p><p></p><p>Three</p>');

  fields[1].props.onMerge(false);

  assert.deepEqual(changes, ['<p></p><p>Three</p>']);
});

test('merging backward from the first paragraph does nothing', () => {
  const { fields } = render('<p>One</p><p>Two</p>');

  fields[0].props.onMerge(false);

  assert.deepEqual(changes, []);
});

test('Delete at the end merges the next paragraph in', () => {
  const { fields } = render('<p>One</p><p>Two</p>');

  fields[0].props.onMerge(true);

  assert.deepEqual(changes, ['<p>OneTwo</p>']);
});

test('merging down to one empty paragraph stores an empty string', () => {
  const { fields } = render('<p></p><p></p>');

  fields[1].props.onMerge(false);

  assert.deepEqual(changes, ['']);
});

test('paragraphGap lands on each paragraph after the first, not the wrapper', () => {
  const { wrapper, fields } = render('<p>One</p><p>Two</p><p>Three</p>', {
    paragraphGap: '2.35rem',
  });

  assert.equal(wrapper.props.style, undefined);
  assert.equal(fields[0].props.style, undefined);
  assert.deepEqual(fields[1].props.style, { marginTop: '2.35rem' });
  assert.deepEqual(fields[2].props.style, { marginTop: '2.35rem' });
  assert.equal(render('<p>One</p><p>Two</p>').fields[1].props.style, undefined);
});

test('labelGap sets the margin under a strong-only paragraph', () => {
  const gap = { marginTop: '1.75rem' };
  const opts = { paragraphGap: '1.75rem', labelGap: '0' };

  const first = render('<p><strong>Head</strong></p><p>Body</p><p>Next</p>', opts).fields;
  assert.deepEqual(first.map((f) => f.props.style), [undefined, { marginTop: '0' }, gap]);

  const middle = render('<p>One</p><p> <strong>Head</strong> </p><p>Body</p>', opts).fields;
  assert.deepEqual(middle.map((f) => f.props.style), [undefined, gap, { marginTop: '0' }]);
});

test('labelGap still applies when a newline separates the label from its body', () => {
  const { fields } = render('<p><strong>Head</strong></p>\n<p>Body</p>', {
    paragraphGap: '1.75rem',
    labelGap: '0',
  });

  // fields[1] is the raw newline segment.
  assert.deepEqual(fields[2].props.style, { marginTop: '0' });
});

test('without labelGap a paragraph after a strong-only one keeps paragraphGap', () => {
  const gap = { marginTop: '1.75rem' };
  const { fields } = render('<p><strong>Head</strong></p><p>Body</p><p>Next</p>', {
    paragraphGap: '1.75rem',
  });

  assert.deepEqual(fields.map((f) => f.props.style), [undefined, gap, gap]);
});

const BULLETS = '<ul><li>One</li><li>Two</li></ul>';

const caretIn = (key, offset = 0) => {
  globalThis.__selection = { attributeKey: key, offset };
};

test('a flat list is editable and round-trips with its attributes and whitespace', () => {
  for (const value of [
    BULLETS,
    '<p>Intro</p>\n<ol class="steps">\n  <li class="a">One</li>\n  <li>Two</li>\n</ol>\n<p>Tail</p>',
    'Before<ul><li>One</li></ul>After',
  ]) {
    assert.equal(roundTrip(value), value);
  }

  const { fields } = render(BULLETS);
  assert.equal(fields.length, 1);
  assert.equal(fields[0].type, 'ul');
  assert.deepEqual(
    itemsOf(fields[0]).map((item) => [item.props.tagName, item.props.value]),
    [
      ['li', 'One'],
      ['li', 'Two'],
    ],
  );
  assert.equal(itemsOf(fields[0])[1].props['aria-label'], 'Body, list 1, item 2');
});

test('a nested list stays raw and survives an edit', () => {
  const value = '<p>Intro</p><ul><li>A<ul><li>B</li></ul></li></ul>';
  const { fields } = render(value);

  assert.equal(roundTrip(value), value);
  assert.equal(fields.length, 2);
  assert.equal(fields[1].props.children, '<ul><li>A<ul><li>B</li></ul></li></ul>');

  fields[0].props.onChange('Intro!');
  assert.deepEqual(changes, ['<p>Intro!</p><ul><li>A<ul><li>B</li></ul></li></ul>']);
});

test('editing a list item rewrites only that item', () => {
  const { fields } = render('<p>Intro</p><ul><li>One</li>\n<li class="x">Two</li></ul>');

  itemsOf(fields[1])[1].props.onChange('Two <em>now</em>');

  assert.deepEqual(changes, [
    '<p>Intro</p><ul><li>One</li>\n<li class="x">Two <em>now</em></li></ul>',
  ]);
});

test('the first editable field takes the placeholder, even when it is a list', () => {
  const { fields } = render('<ul><li>One</li></ul><p>Two</p>');

  assert.equal(itemsOf(fields[0])[0].props.placeholder, undefined);
  assert.equal(fields[1].props.placeholder, undefined);
});

test('paragraphGap also separates a list from the paragraph before it', () => {
  const { fields } = render('<p>One</p><ul><li>x</li></ul><p>Two</p>', {
    paragraphGap: '2rem',
  });

  assert.equal(fields[0].props.style, undefined);
  assert.deepEqual(fields[1].props.style, { marginTop: '2rem' });
  assert.deepEqual(fields[2].props.style, { marginTop: '2rem' });
});

test('the toolbar turns the paragraph holding the caret into a bulleted list', () => {
  const { buttons } = render('<p>One</p><p>Two</p>');
  caretIn('f-1', 2);

  buttons[0].props.onClick();

  assert.deepEqual(changes, ['<p>One</p><ul><li>Two</li></ul>']);
  assert.deepEqual(globalThis.__selectionChanges, [['block-1', 'f-1-0', 2, 2]]);
});

test('the toolbar makes a numbered list from a plain one-line value', () => {
  const { buttons } = render('Plain <em>text</em>');
  caretIn('f-0');

  buttons[1].props.onClick();

  assert.deepEqual(changes, ['<ol><li>Plain <em>text</em></li></ol>']);
});

test('the toolbar does nothing when the caret is outside the field', () => {
  const { buttons } = render('<p>One</p>');
  caretIn(undefined);
  buttons[0].props.onClick();
  caretIn('other-block-field');
  buttons[0].props.onClick();

  assert.deepEqual(changes, []);
});

test('the toolbar button for the current list type turns the list back into paragraphs', () => {
  const { buttons } = render('<p>Intro</p><ul><li>One</li><li>Two</li></ul>');
  caretIn('f-1-1', 1);

  buttons[0].props.onClick();

  assert.deepEqual(changes, ['<p>Intro</p><p>One</p><p>Two</p>']);
  assert.deepEqual(globalThis.__selectionChanges, [['block-1', 'f-2', 1, 1]]);
});

test('the other toolbar button switches the list type and keeps its attributes', () => {
  const { buttons } = render('<ul class="tight"><li>One</li></ul>');
  caretIn('f-0-0');

  buttons[1].props.onClick();

  assert.deepEqual(changes, ['<ol class="tight"><li>One</li></ol>']);
});

test('Enter in a list item splits it and moves the caret to the new item', () => {
  const { fields } = render('<ul><li>Hello world</li><li>Tail</li></ul>');
  caretIn('f-0-0', 5);
  const event = enter();

  itemsOf(fields[0])[0].props.onKeyDown(event);

  assert.equal(event.prevented, true);
  assert.deepEqual(changes, ['<ul><li>Hello</li><li> world</li><li>Tail</li></ul>']);
  assert.deepEqual(globalThis.__selectionChanges, [['block-1', 'f-0-1', 0, 0]]);
});

test('Enter on an empty last item leaves the list for a new paragraph', () => {
  const { fields } = render('<ul><li>One</li><li></li></ul>');

  itemsOf(fields[0])[1].props.onKeyDown(enter());

  assert.deepEqual(changes, ['<ul><li>One</li></ul><p></p>']);
  assert.deepEqual(globalThis.__selectionChanges, [['block-1', 'f-1', 0, 0]]);
});

test('Enter on the only, empty item drops the list', () => {
  const { fields } = render('<p>Intro</p><ul><li></li></ul>');

  itemsOf(fields[1])[0].props.onKeyDown(enter());

  assert.deepEqual(changes, ['<p>Intro</p><p></p>']);
});

test('Backspace merges a list item into the one before it', () => {
  const { fields } = render('<ul><li>One</li><li>Two</li><li>Three</li></ul>');

  itemsOf(fields[0])[1].props.onMerge(false);

  assert.deepEqual(changes, ['<ul><li>OneTwo</li><li>Three</li></ul>']);
  assert.deepEqual(globalThis.__selectionChanges, [['block-1', 'f-0-0', 3, 3]]);
});

test('Delete at the end of an item merges the next item in, and the last item does nothing', () => {
  const { fields } = render('<ul><li>One</li><li>Two</li></ul>');

  itemsOf(fields[0])[1].props.onMerge(true);
  assert.deepEqual(changes, []);

  itemsOf(fields[0])[0].props.onMerge(true);
  assert.deepEqual(changes, ['<ul><li>OneTwo</li></ul>']);
});

test('Backspace at the start of the first item lifts it out as a paragraph', () => {
  const { fields } = render('<ul><li>One</li><li>Two</li></ul>');

  itemsOf(fields[0])[0].props.onMerge(false);

  assert.deepEqual(changes, ['<p>One</p><ul><li>Two</li></ul>']);
  assert.deepEqual(globalThis.__selectionChanges, [['block-1', 'f-0', 0, 0]]);
});

test('lifting the only item out leaves just the paragraph', () => {
  const { fields } = render('<ul><li>One</li></ul>');

  itemsOf(fields[0])[0].props.onMerge(false);

  assert.deepEqual(changes, ['<p>One</p>']);
});

test('paragraphs and list items allow links, bold and italic', () => {
  const { fields } = render('<p>One</p><ul><li>Two</li></ul>');
  const allowed = ['core/bold', 'core/italic', 'core/link'];

  assert.deepEqual(fields[0].props.allowedFormats, allowed);
  assert.deepEqual(itemsOf(fields[1])[0].props.allowedFormats, allowed);
});

test('a link in a paragraph or list item is kept as typed', () => {
  const value =
    '<p>See <a href="https://example.com">this</a></p><ul><li><a href="/a">A</a></li></ul>';

  assert.equal(roundTrip(value), value);
});

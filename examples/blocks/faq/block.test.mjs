import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { renderBlock, registerDirective, callPhp, openingTag } from '../../../theme/scripts/render-harness.mjs';
import { executeBundle } from '../../../theme/scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../theme/scripts/wp-editor-stubs.mjs';
import { APP_AUTOLOAD } from '../../../theme/app/Blocks/test-support.mjs';
import { exampleEnv } from '../../test-support.mjs';

// The kit has no kit.config.json of its own, so the grounds the tests name
// come from a theme root written here.
const themeDir = mkdtempSync(join(tmpdir(), 'faq-theme-'));
writeFileSync(
  join(themeDir, 'kit.config.json'),
  JSON.stringify({
    grounds: [
      { name: 'paper', token: '--color-paper', light: true },
      { name: 'ink', token: '--color-ink-strong', light: false },
    ],
  }),
);
process.on('exit', () => rmSync(themeDir, { recursive: true, force: true }));

const env = exampleEnv({ templateDirectory: themeDir });

const directives = callPhp('__test_directives', [], {
  functions: [APP_AUTOLOAD, 'function __test_directives() { return \\App\\Providers\\BlockDirectivesServiceProvider::directives(); }'],
});
for (const [name, body] of Object.entries(directives)) registerDirective(name, body);

const items = [
  { heading: 'How long does delivery take?', body: '<p>Most orders arrive within <strong>three days</strong>.</p>' },
  { heading: 'Can I return an item?', body: '<p>Yes, within 30 days.</p><ul><li>Unused</li><li>In its box</li></ul>' },
];
const cta = { ctaText: 'Contact us', ctaLink: { url: 'https://example.test/contact', opensInNewTab: false } };
const render = (attributes) => renderBlock('faq', attributes, [], env);
const entranceIndex = (html, className) => openingTag(html, className)?.match(/--e-i: (\d+)/)?.[1] ?? null;

// --- Render half ---

test('an empty block renders nothing', () => {
  assert.equal(render({}).trim(), '');
});

test('a block with only empty and malformed entries renders nothing', () => {
  const html = render({ items: [null, 'text', { heading: '', body: '<p>No question</p>' }, { heading: 'No answer', body: '<p></p>' }, { heading: 'Blank', body: '' }] });
  assert.equal(html.trim(), '');
});

test('the block renders its root with the global padding default', () => {
  const tag = openingTag(render({ heading: 'Questions' }), 'faq');
  assert.ok(tag);
  assert.match(tag, /py-14/);
  assert.match(tag, /md:py-28/);
});

test('each entry renders as a details element with its question and answer', () => {
  const html = render({ items });
  assert.equal(html.match(/<details class="faq__item"/g).length, 2);
  assert.match(html, /<h3 class="faq__question heading-5">How long does delivery take\?<\/h3>/);
  assert.match(html, /<strong>three days<\/strong>/);
  assert.match(html, /<li>Unused<\/li>/);
  assert.doesNotMatch(html, /<details[^>]*\sopen/);
});

test('malformed and empty entries are dropped and the rest keep their order', () => {
  const html = render({ items: [null, 'text', items[0], { heading: '', body: '<p>x</p>' }, items[1]] });
  assert.equal(html.match(/<details/g).length, 2);
  assert.ok(html.indexOf('How long') < html.indexOf('Can I return'));
});

test('the heading and the introduction each render only when set', () => {
  const both = render({ heading: 'Questions', intro: '<p>Answers to what we hear most.</p>', items });
  assert.match(both, /<h2 class="faq__heading heading-2"/);
  assert.match(both, /faq__intro/);

  const neither = render({ items });
  assert.doesNotMatch(neither, /faq__heading/);
  assert.doesNotMatch(neither, /faq__intro/);
  assert.doesNotMatch(neither, /faq__head /);
});

test('with no entries the list does not render', () => {
  const html = render({ heading: 'Questions' });
  assert.match(html, /faq__heading/);
  assert.doesNotMatch(html, /faq__list/);
});

test('an unlabeled or unlinked button does not render, a complete one does', () => {
  assert.doesNotMatch(render({ items, ctaText: 'Contact us' }), /faq__cta/);
  assert.doesNotMatch(render({ items, ctaLink: cta.ctaLink }), /faq__cta/);
  const html = render({ items, ...cta });
  assert.match(html, /<a class="faq__cta btn btn-primary/);
  assert.match(html, /href="https:\/\/example\.test\/contact"/);
});

test('a new-tab button says so to screen readers', () => {
  const html = render({ items, ctaText: 'Contact us', ctaLink: { url: 'https://example.test/contact', opensInNewTab: true } });
  assert.match(html, /target="_blank"/);
  assert.match(html, /opens in a new tab/);
});

test('a new-tab link in an answer or the introduction says so to screen readers', () => {
  const link = '<a href="https://example.test" target="_blank">Read more</a>';
  const html = render({ intro: `<p>${link}</p>`, items: [{ heading: 'Q?', body: `<p>${link}</p>` }] });

  assert.equal(html.match(/opens in a new tab/g).length, 2);
});

test('a dark ground adds on-dark and the on-dark button, an unknown ground prints nothing', () => {
  const dark = render({ items, ...cta, ground: 'ink' });
  assert.match(openingTag(dark, 'faq'), /ground-ink on-dark/);
  assert.match(dark, /btn-on-dark/);

  const light = render({ items, ...cta, ground: 'paper' });
  assert.doesNotMatch(openingTag(light, 'faq'), /on-dark/);

  const unknown = openingTag(render({ items, ground: 'no-such-ground' }), 'faq');
  assert.doesNotMatch(unknown, /ground-/);
});

test('the divider values print the rule on the root', () => {
  assert.match(openingTag(render({ items, sectionDivider: 'above' }), 'faq'), /border-t-2/);
  assert.match(openingTag(render({ items, sectionDivider: 'below' }), 'faq'), /border-b-2/);
  assert.doesNotMatch(openingTag(render({ items, sectionDivider: 'sideways' }), 'faq'), /border-[tb]-2/);
});

test('hostile text and URLs are escaped or dropped', () => {
  const html = render({
    heading: '<script>alert(1)</script>"Q"&',
    intro: '<p>Intro</p><script>alert(2)</script>',
    items: [{ heading: '<b>"x"&</b>', body: '<p onclick="alert(3)">Answer</p><a href="javascript:alert(4)">bad</a><script>alert(5)</script>' }],
    ctaText: '<i>Go</i>',
    ctaLink: { url: 'javascript:alert(6)' },
  });
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /onclick/);
  assert.doesNotMatch(html, /<b>/);
  assert.doesNotMatch(html, /faq__cta/);
});

test('the entrance parts run in reading order with no gap for a missing part', () => {
  const full = render({ heading: 'Questions', intro: '<p>Intro</p>', items, ...cta });
  assert.equal(entranceIndex(full, 'faq__heading'), null);
  assert.equal(entranceIndex(full, 'faq__intro'), '1');
  assert.equal(entranceIndex(full, 'faq__list'), '2');
  assert.equal(entranceIndex(full, 'faq__cta'), '3');

  const short = render({ items, ...cta });
  assert.equal(entranceIndex(short, 'faq__list'), null);
  assert.equal(entranceIndex(short, 'faq__cta'), '1');
});

// --- Editor half ---

const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');

async function loadBlock(grounds = []) {
  resetWpEditorTest();
  const defaults = new Map(wpEditorStubs());
  const modules = wpEditorStubs({
    '@wordpress/block-editor': `${defaults.get('@wordpress/block-editor')}
export const store = 'core/block-editor';
export function useBlockEditContext() { return { clientId: 'test-1' }; }`,
  });
  await executeBundle(entry, [...modules, ['kit-config-stub', `export default { grounds: ${JSON.stringify(grounds)} };`]], 'FaqEditorTestBundle', {
    'kit.config.json': 'kit-config-stub',
  });
  return globalThis.__wpEditorTest.registrations[0].settings;
}

const saved = {
  heading: 'Questions',
  intro: '<p>Intro</p>',
  items,
  ground: '',
  sectionDivider: 'none',
  ...cta,
};

function draw(settings, attributes, { isSelected = false, setAttributes = () => {} } = {}) {
  return renderToStaticMarkup(React.createElement(settings.edit, { attributes, setAttributes, isSelected, clientId: 'test-1' }));
}

test('the block registers as a server-rendered block', async () => {
  const settings = await loadBlock();
  const { metadata } = globalThis.__wpEditorTest.registrations[0];
  assert.equal(metadata.name, '__BLOCK_NAMESPACE__/faq');
  assert.equal(settings.save(), null);
});

test('mounting and selecting the block writes no attribute', async () => {
  const settings = await loadBlock();
  for (const isSelected of [false, true]) {
    for (const attributes of [saved, { ...saved, items: [] }, {}]) {
      const writes = [];
      draw(settings, attributes, { isSelected, setAttributes: (patch) => writes.push(patch) });
      assert.deepEqual(writes, []);
    }
  }
});

test('the canvas shows every question and answer as a field at once', async () => {
  const settings = await loadBlock();
  const html = draw(settings, saved);
  assert.match(html, /aria-label="Question 1"[^>]*>How long does delivery take\?<\/textarea>/);
  assert.match(html, /aria-label="Question 2"[^>]*>Can I return an item\?<\/textarea>/);
  assert.match(html, /aria-label="Answer 1"/);
  assert.match(html, /aria-label="Answer 2"/);
  assert.equal(html.match(/data-entry-index=/g).length, 2);
  assert.doesNotMatch(html, /<details/);
  assert.doesNotMatch(html, /<a href/);
});

test('an empty canvas shows the heading field and points to the Questions panel', async () => {
  const settings = await loadBlock();
  const html = draw(settings, {});
  assert.match(html, /aria-label="Heading"/);
  assert.match(html, /Add questions in the Questions panel\./);
});

test('the inspector holds Questions and Section, all collapsed, then the entrance panel; the button is on the canvas', async () => {
  const settings = await loadBlock();
  draw(settings, saved);
  const { panels } = globalThis.__wpEditorTest;
  const own = panels.filter((panel) => ['Questions', 'Section', 'Button'].includes(panel.title));
  assert.deepEqual(own.map((panel) => panel.title), ['Questions', 'Section']);
  assert.ok(panels.every((panel) => panel.initialOpen === false));
  assert.ok(panels.some((panel) => /entrance/i.test(panel.title)));
});

test('adding, moving and removing a question write only the items', async () => {
  const settings = await loadBlock();
  const writes = [];
  draw(settings, saved, { setAttributes: (patch) => writes.push(patch) });
  const list = globalThis.__wpEditorTest.panels.find((panel) => panel.title === 'Questions').children.props;

  list.onAdd();
  list.onMove(0, 1);
  list.onRemove(0);

  assert.deepEqual(writes, [
    { items: [...items, { heading: '', body: '' }] },
    { items: [items[1], items[0]] },
    { items: [items[1]] },
  ]);
  assert.equal(list.minItems, 0);
});

test('editing an answer keeps the question and every other key on the entry', async () => {
  const settings = await loadBlock();
  const writes = [];
  const withKey = [{ ...items[0], key: 'a' }, items[1]];
  draw(settings, { ...saved, items: withKey }, { setAttributes: (patch) => writes.push(patch) });
  const answer = globalThis.__wpEditorTest.richTexts.find((props) => props['aria-label'] === 'Answer 1');

  answer.onChange('Changed');

  assert.deepEqual(writes, [{ items: [{ ...withKey[0], body: '<p>Changed</p>' }, items[1]] }]);
});

test('the button preview is a span and never a components-button', async () => {
  const settings = await loadBlock();
  const html = draw(settings, saved);
  assert.match(html, /<span[^>]*class="[^"]*btn btn-primary/);
  assert.doesNotMatch(html, /components-button[^"]*btn/);
});

test('the canvas reflects a dark ground', async () => {
  const settings = await loadBlock([{ name: 'ink', token: '--color-ink', light: false }]);
  const html = draw(settings, { ...saved, ground: 'ink' });
  assert.match(html, /faq-editor[^"]*ground-ink on-dark/);
  assert.match(html, /btn-on-dark/);
  // Attribute order is the renderer's; find the field's tag, then read its class.
  const field = /<textarea[^>]*aria-label="Question 1"[^>]*>/.exec(html)?.[0] ?? '';
  assert.match(field, /class="[^"]*text-\[color:var\(--color-light\)\]/);
});

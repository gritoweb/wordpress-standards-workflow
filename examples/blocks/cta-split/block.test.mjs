import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { renderBlock, registerDirective, callPhp, openingTag } from '../../../theme/scripts/render-harness.mjs';
import { executeBundle } from '../../../theme/scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../theme/scripts/wp-editor-stubs.mjs';
import { APP_AUTOLOAD } from '../../../theme/app/Blocks/test-support.mjs';
import { exampleEnv } from '../../test-support.mjs';

const env = exampleEnv();

const directives = callPhp('__test_directives', [], {
  functions: [
    APP_AUTOLOAD,
    "function __test_directives() { return \\App\\Providers\\BlockDirectivesServiceProvider::directives(); }",
  ],
});
for (const [name, body] of Object.entries(directives)) {
  registerDirective(name, body);
}

// --- Render half ---

test('renders with no ground and no divider when the attribute is absent', () => {
  const html = renderBlock('cta-split', { heading: 'Hello', body: '<p>World</p>' }, [], env);
  const tag = openingTag(html, 'cta-split');
  assert.ok(tag);
  assert.doesNotMatch(tag, /ground-/);
  assert.doesNotMatch(tag, /border-t-2|border-b-2/);
});

test("the block.json default of 'below' prints the shared border rule", () => {
  const tag = openingTag(renderBlock('cta-split', { heading: 'Hello', sectionDivider: 'below' }, [], env), 'cta-split');
  assert.match(tag, /border-b-2 border-\[color:var\(--color-primary\)\]/);
});

test('the divider can be turned off', () => {
  const tag = openingTag(renderBlock('cta-split', { heading: 'Hello', sectionDivider: 'none' }, [], env), 'cta-split');
  assert.doesNotMatch(tag, /border-t-2|border-b-2/);
});

test('a configured dark ground adds on-dark and switches the CTA button family', () => {
  const root = mkdtempSync(join(tmpdir(), 'cta-split-ground-'));
  writeFileSync(
    join(root, 'kit.config.json'),
    JSON.stringify({ grounds: [{ name: 'ink', token: '--color-ink', light: false }] }),
  );
  const darkEnv = exampleEnv({ templateDirectory: root });

  const html = renderBlock(
    'cta-split',
    { heading: 'Hello', ground: 'ink', ctaText: 'Go', ctaLink: { url: 'https://example.com' } },
    [],
    darkEnv,
  );
  assert.match(html, /ground-ink on-dark/);
  assert.match(html, /class="cta-split__cta btn btn-on-dark/);

  rmSync(root, { recursive: true, force: true });
});

test('an unconfigured ground prints no ground class', () => {
  const html = renderBlock('cta-split', { heading: 'Hello', ground: 'not-configured' }, [], env);
  assert.doesNotMatch(html, /ground-not-configured/);
});

test('no body and no CTA renders no panel', () => {
  const html = renderBlock('cta-split', { heading: 'Hello' }, [], env);
  assert.doesNotMatch(html, /cta-split__panel/);
});

test('the CTA link is escaped and opens in a new tab only when saved', () => {
  const html = renderBlock('cta-split', {
    heading: 'Hello',
    ctaText: 'Talk to us',
    ctaLink: { url: 'https://example.com/contact', opensInNewTab: true },
  }, [], env);
  assert.match(html, /href="https:\/\/example\.com\/contact"/);
  assert.match(html, /target="_blank"/);
});

test('a missing CTA link renders no button even with text set', () => {
  const html = renderBlock('cta-split', { heading: 'Hello', ctaText: 'Talk to us' }, [], env);
  assert.doesNotMatch(html, /cta-split__cta/);
});

// M5: plain "Hello"/example.com URLs never exercise escaping — hostile input does.
test('a hostile heading and CTA URL are escaped, never breaking the markup', () => {
  const html = renderBlock(
    'cta-split',
    { heading: '<b>"x"&</b>', ctaText: 'Talk to us', ctaLink: { url: 'https://x.test/?a=1&b=2"' } },
    [],
    env,
  );
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /<h2 class="cta-split__heading heading-1[^"]*"[^>]*>&quot;x&quot;&amp;<\/h2>/);
  assert.match(html, /href="https:\/\/x\.test\/\?a=1&#038;b=2"/);
});

test('padding falls back to the block default (112/56) when unset', () => {
  const tag = openingTag(renderBlock('cta-split', { heading: 'Hello' }, [], env), 'cta-split');
  assert.match(tag, /\bpy-14\b/);
  assert.match(tag, /\bmd:py-28\b/);
});

test('entrance parts are numbered across heading and the panel', () => {
  const html = renderBlock('cta-split', {
    heading: 'Hello',
    body: '<p>World</p>',
    ctaText: 'Go',
    ctaLink: { url: 'https://example.com' },
  }, [], env);
  assert.match(html, /<h2[^>]*data-entrance-part\s*>/);
  assert.match(html, /cta-split__panel[^"]*"\s+data-entrance-part style="--e-i: 1"/);
});

test('an empty block renders nothing', () => {
  assert.equal(renderBlock('cta-split', {}, [], env).trim(), '');
  assert.equal(renderBlock('cta-split', { ctaText: 'Go' }, [], env).trim(), '');
});

test('the divider defaults to none, so a block with no saved rule draws none', () => {
  const tag = openingTag(renderBlock('cta-split', { heading: 'Hello' }, [], env), 'cta-split');
  assert.doesNotMatch(tag, /border-[tb]-2/);
});

test('a button that opens in a new tab tells screen readers', () => {
  const html = renderBlock('cta-split', { heading: 'Hello', ctaText: 'Go', ctaLink: { url: 'https://example.com', opensInNewTab: true } }, [], env);
  assert.match(html, /target="_blank"/);
  assert.match(html, /<span class="sr-only"> \(opens in a new tab\)<\/span><\/a>/);
});

// --- Editor half ---

const defaults = new Map(wpEditorStubs());

const OVERRIDES = {
  '@wordpress/element': `${defaults.get('@wordpress/element')}
export function RawHTML(props) { return props.children ?? null; }
let __idCounter = 0;
export function useId() { return 'test-id-' + __idCounter++; }
`,
  '@wordpress/i18n': `
export function __(value) { return value; }
export function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%s/g, () => args[i++]);
}
`,
  '@wordpress/block-editor': `${defaults.get('@wordpress/block-editor')}
export function LinkControl() { return null; }
export const store = 'core/block-editor';
export function useBlockEditContext() { return { clientId: 'test-1' }; }
`,
  '@wordpress/components': `${defaults.get('@wordpress/components')}
export function Popover(props) { return React.createElement('div', null, props.children); }
`,
  '@wordpress/data': `
export function useSelect() {
  return {
    getSelectionStart: () => globalThis.__selection ?? { offset: 0 },
    getSelectionEnd: () => globalThis.__selection ?? { offset: 0 },
  };
}
export function useDispatch() {
  return { selectionChange: () => {} };
}
`,
  '@wordpress/rich-text': `
export function create({ html }) { return { html, text: (html || '').replace(/<[^>]*>/g, ''), start: 0, end: 0 }; }
export function split(value) { return [{ html: value.html.slice(0, value.start) }, { html: value.html.slice(value.end) }]; }
export function toHTMLString({ value }) { return value.html; }
`,
};

globalThis.window = { HTMLElement: class {} };

const GROUND_ALIAS = { 'kit.config.json': 'kit-config-stub' };
const GROUND_STUB = ['kit-config-stub', 'export default { grounds: [] };'];

test('the editor bundle registers the block, and mounting/selecting writes no attribute', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, [...wpEditorStubs(OVERRIDES), GROUND_STUB], 'CtaSplitEditorTestBundle', GROUND_ALIAS);

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  assert.equal(typeof settings.edit, 'function');

  const writes = [];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Hello', body: '<p>World</p>', ground: '', sectionDivider: 'below', ctaText: '', ctaLink: { url: '', opensInNewTab: false } },
      setAttributes: (patch) => writes.push(patch),
      isSelected: false,
      clientId: 'test-1',
    }),
  );

  assert.deepEqual(writes, []);
  assert.match(markup, /Hello/);
});

// The canvas must match the Blade view (editor contract): a dark ground's
// CTA switches to the on-dark button family there too, not just server-side.
test('a dark ground switches the canvas CTA preview to the on-dark button family', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  const darkGroundStub = ['kit-config-stub', "export default { grounds: [{ name: 'ink', token: '--color-ink', light: false }] };"];
  await executeBundle(entry, [...wpEditorStubs(OVERRIDES), darkGroundStub], 'CtaSplitEditorTestBundleDark', GROUND_ALIAS);

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Hello', body: '', ground: 'ink', sectionDivider: 'none', ctaText: 'Go', ctaLink: { url: 'https://example.com', opensInNewTab: false } },
      setAttributes() {},
      isSelected: false,
      clientId: 'test-dark',
    }),
  );

  assert.match(markup, /btn btn-on-dark/);
});

test('the entrance panel and divider control are present in the inspector', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, [...wpEditorStubs(OVERRIDES), GROUND_STUB], 'CtaSplitEditorTestBundle2', GROUND_ALIAS);

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Hello', body: '', ground: '', sectionDivider: 'below', ctaText: '', ctaLink: { url: '', opensInNewTab: false } },
      setAttributes: () => {},
      isSelected: false,
      clientId: 'test-1',
    }),
  );

  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Entrance animation'), true);
  assert.equal(globalThis.__wpEditorTest.selects.some((s) => s.label === 'Divider'), true);
});

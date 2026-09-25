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

// BlockAttributes::grounds() reads <get_template_directory()>/kit.config.json
// and degrades to [] when it's missing, which is the case for the theme here
// (no kit.config.json in the kit repo itself) — see grounds-parity.test.mjs
// for the configured case exercised below.
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

test('renders with the default attributes: centered, standard scale, no ground', () => {
  const html = renderBlock('section-intro', { heading: 'Hello', body: '<p>World</p>' }, [], env);
  const tag = openingTag(html, 'section-intro');
  assert.ok(tag);
  assert.doesNotMatch(tag, /ground-/);
  assert.match(html, /items-center text-center/);
});

test('left alignment renders the left-aligned stack class', () => {
  const html = renderBlock('section-intro', { heading: 'Hello', align: 'left' }, [], env);
  assert.match(html, /items-start text-left/);
});

test('an unconfigured ground prints no ground class (see grounds-parity.test.mjs for a configured one)', () => {
  const html = renderBlock('section-intro', { heading: 'Hello', ground: 'not-configured' }, [], env);
  assert.doesNotMatch(html, /ground-not-configured/);
});

test('a configured dark ground adds on-dark and switches the CTA button family', () => {
  const root = mkdtempSync(join(tmpdir(), 'section-intro-ground-'));
  writeFileSync(
    join(root, 'kit.config.json'),
    JSON.stringify({ grounds: [{ name: 'ink', token: '--color-ink', light: false }] }),
  );
  const darkEnv = exampleEnv({ templateDirectory: root });

  const html = renderBlock(
    'section-intro',
    { heading: 'Hello', ground: 'ink', ctaText: 'Go', ctaLink: { url: 'https://example.com' } },
    [],
    darkEnv,
  );
  assert.match(html, /ground-ink on-dark/);
  assert.match(html, /class="section-intro__cta btn btn-on-dark/);

  rmSync(root, { recursive: true, force: true });
});

test('the statement body scale uses its own fixed measure regardless of the measure attribute', () => {
  const html = renderBlock('section-intro', { heading: 'Hello', body: '<p>World</p>', bodyScale: 'statement', measure: 'wide' }, [], env);
  assert.match(html, /section-intro__body[^"]*max-w-\[65\.25rem\]/);
});

test('the wide measure widens a standard-scale body and uncaps the heading', () => {
  const html = renderBlock('section-intro', { heading: 'Hello', body: '<p>World</p>', measure: 'wide' }, [], env);
  assert.match(html, /section-intro__heading[^"]*max-w-full/);
  assert.match(html, /section-intro__body[^"]*max-w-\[min\(68\.625rem,100%\)\]/);
});

test('the divider helper rejects an unknown value back to none', () => {
  const html = renderBlock('section-intro', { heading: 'Hello', sectionDivider: 'sideways' }, [], env);
  const tag = openingTag(html, 'section-intro');
  assert.doesNotMatch(tag, /border-t-2|border-b-2/);
});

test('above/below print the shared border rule', () => {
  const above = openingTag(renderBlock('section-intro', { heading: 'Hello', sectionDivider: 'above' }, [], env), 'section-intro');
  assert.match(above, /border-t-2 border-\[color:var\(--color-primary\)\]/);

  const below = openingTag(renderBlock('section-intro', { heading: 'Hello', sectionDivider: 'below' }, [], env), 'section-intro');
  assert.match(below, /border-b-2 border-\[color:var\(--color-primary\)\]/);
});

test('an empty block renders nothing', () => {
  assert.equal(renderBlock('section-intro', {}, [], env).trim(), '');
  assert.equal(renderBlock('section-intro', { ctaText: 'Go' }, [], env).trim(), '');
});

test('the CTA link is escaped and opens in a new tab only when saved', () => {
  const html = renderBlock('section-intro', {
    heading: 'Hello',
    ctaText: 'Learn more',
    ctaLink: { url: 'https://example.com/page', opensInNewTab: true },
  }, [], env);
  assert.match(html, /href="https:\/\/example\.com\/page"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /<span class="sr-only"> \(opens in a new tab\)<\/span><\/a>/);
});

test('a button that stays in this tab has no new-tab hint', () => {
  const html = renderBlock('section-intro', { heading: 'Hello', ctaText: 'Go', ctaLink: { url: 'https://example.com' } }, [], env);
  assert.doesNotMatch(html, /opens in a new tab/);
});

test('a missing CTA link renders no button even with text set', () => {
  const html = renderBlock('section-intro', { heading: 'Hello', ctaText: 'Learn more' }, [], env);
  assert.doesNotMatch(html, /section-intro__cta/);
});

// M5: plain "Hello"/example.com URLs never exercise escaping — hostile input does.
test('a hostile heading and CTA URL are escaped, never breaking the markup', () => {
  const html = renderBlock(
    'section-intro',
    { heading: '<b>"x"&</b>', ctaText: 'Learn more', ctaLink: { url: 'https://x.test/?a=1&b=2"' } },
    [],
    env,
  );
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /<h2 class="section-intro__heading heading-2[^"]*"[^>]*>&quot;x&quot;&amp;<\/h2>/);
  assert.match(html, /href="https:\/\/x\.test\/\?a=1&#038;b=2"/);
});

test('padding falls back to the block default (112/56) when unset', () => {
  const tag = openingTag(renderBlock('section-intro', { heading: 'Hello' }, [], env), 'section-intro');
  assert.match(tag, /\bpy-14\b/);
  assert.match(tag, /\bmd:py-28\b/);
});

test('entrance parts are numbered across heading, body and cta in order', () => {
  const html = renderBlock('section-intro', {
    heading: 'Hello',
    body: '<p>World</p>',
    ctaText: 'Go',
    ctaLink: { url: 'https://example.com' },
  }, [], env);
  assert.match(html, /<h2[^>]*data-entrance-part\s*>/);
  assert.match(html, /section-intro__body[^"]*"\s+data-entrance-part style="--e-i: 1"/);
  assert.match(html, /section-intro__cta[^"]*"\s+href="[^"]*"\s+data-entrance-part style="--e-i: 2"/);
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
  await executeBundle(entry, [...wpEditorStubs(OVERRIDES), GROUND_STUB], 'SectionIntroEditorTestBundle', GROUND_ALIAS);

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  assert.equal(typeof settings.edit, 'function');

  const writes = [];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Hello', body: '<p>World</p>', align: 'center', measure: 'default', bodyScale: 'standard', ground: '', sectionDivider: 'none', ctaText: '', ctaLink: { url: '', opensInNewTab: false } },
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
  await executeBundle(entry, [...wpEditorStubs(OVERRIDES), darkGroundStub], 'SectionIntroEditorTestBundleDark', GROUND_ALIAS);

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Hello', body: '', align: 'center', measure: 'default', bodyScale: 'standard', ground: 'ink', sectionDivider: 'none', ctaText: 'Go', ctaLink: { url: 'https://example.com', opensInNewTab: false } },
      setAttributes() {},
      isSelected: false,
      clientId: 'test-dark',
    }),
  );

  assert.match(markup, /btn btn-on-dark[^"]*section-intro__cta/);
});

test('the entrance panel and divider control are present in the inspector', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, [...wpEditorStubs(OVERRIDES), GROUND_STUB], 'SectionIntroEditorTestBundle2', GROUND_ALIAS);

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Hello', body: '', align: 'center', measure: 'default', bodyScale: 'standard', ground: '', sectionDivider: 'none', ctaText: '', ctaLink: { url: '', opensInNewTab: false } },
      setAttributes: () => {},
      isSelected: false,
      clientId: 'test-1',
    }),
  );

  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Entrance animation'), true);
  assert.equal(globalThis.__wpEditorTest.selects.some((s) => s.label === 'Divider'), true);
});

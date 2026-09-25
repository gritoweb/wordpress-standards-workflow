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

test('with no photo, a dark tone falls back to a surface panel', () => {
  const tag = openingTag(renderBlock('cta-banner', { heading: 'Hello' }, [], env), 'cta-banner');
  assert.match(tag, /bg-\[color:var\(--color-surface\)\]/);
});

test('with no photo, a light tone falls back to an ink panel', () => {
  const tag = openingTag(renderBlock('cta-banner', { heading: 'Hello', textTone: 'light' }, [], env), 'cta-banner');
  assert.match(tag, /bg-\[color:var\(--color-ink\)\]/);
});

test('a configured ground wins over the tone fallback when there is no photo', () => {
  const root = mkdtempSync(join(tmpdir(), 'cta-banner-ground-'));
  writeFileSync(
    join(root, 'kit.config.json'),
    JSON.stringify({ grounds: [{ name: 'ink', token: '--color-ink', light: false }] }),
  );
  const darkEnv = exampleEnv({ templateDirectory: root });

  const tag = openingTag(renderBlock('cta-banner', { heading: 'Hello', ground: 'ink' }, [], darkEnv), 'cta-banner');
  assert.match(tag, /ground-ink on-dark/);
  assert.doesNotMatch(tag, /bg-\[color:var\(--color-surface\)\]/);

  rmSync(root, { recursive: true, force: true });
});

test('a background image suppresses the tone fallback panel class', () => {
  const tag = openingTag(renderBlock('cta-banner', { heading: 'Hello', bgImageUrl: 'https://example.com/photo.jpg' }, [], env), 'cta-banner');
  assert.doesNotMatch(tag, /bg-\[color:var/);
});

test('an attachment id renders through wp_get_attachment_image with the focal point', () => {
  const html = renderBlock('cta-banner', { heading: 'Hello', bgImageId: 5, bgImagePosition: 'top-left' }, [], env);
  assert.match(html, /src="\/uploads\/attachment-5\.jpg"/);
  assert.match(html, /object-position: left top/);
});

test('a raw URL image is escaped and rendered when no attachment id is set', () => {
  const html = renderBlock('cta-banner', { heading: 'Hello', bgImageUrl: 'https://example.com/photo.jpg' }, [], env);
  assert.match(html, /src="https:\/\/example\.com\/photo\.jpg"/);
});

test('the scrim only renders when enabled, using ground tokens not earth tokens', () => {
  const off = renderBlock('cta-banner', { heading: 'Hello' }, [], env);
  assert.doesNotMatch(off, /cta-banner__scrim/);

  const on = renderBlock('cta-banner', { heading: 'Hello', scrim: true, textTone: 'light' }, [], env);
  assert.match(on, /cta-banner__scrim/);
  assert.match(on, /var\(--color-ink\)/);
  assert.doesNotMatch(on, /earth/);
});

test('a panel layout gets the tall min-height and bottom anchor', () => {
  const tag = openingTag(renderBlock('cta-banner', { heading: 'Hello', layout: 'panel' }, [], env), 'cta-banner');
  assert.match(tag, /min-h-\[40\.5rem\]/);
  assert.match(tag, /justify-end/);
});

test('the CTA button switches family with text tone: dark tone stays primary, light tone goes on-dark', () => {
  const dark = renderBlock('cta-banner', { heading: 'Hello', ctaText: 'Go', ctaLink: { url: 'https://example.com' } }, [], env);
  assert.match(dark, /class="cta-banner__cta btn btn-primary/);

  const light = renderBlock('cta-banner', { heading: 'Hello', textTone: 'light', ctaText: 'Go', ctaLink: { url: 'https://example.com' } }, [], env);
  assert.match(light, /class="cta-banner__cta btn btn-on-dark/);
});

test('a missing CTA link renders no button even with text set', () => {
  const html = renderBlock('cta-banner', { heading: 'Hello', ctaText: 'Go' }, [], env);
  assert.doesNotMatch(html, /cta-banner__cta/);
});

// M5: a plain heading/URL never exercises escaping — hostile input does.
test('a hostile heading and CTA URL are escaped, never breaking the markup', () => {
  const html = renderBlock(
    'cta-banner',
    { heading: '<b>"x"&</b>', ctaText: 'Go', ctaLink: { url: 'https://x.test/?a=1&b=2"' } },
    [],
    env,
  );
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /<h2 class="cta-banner__heading heading-2 mt-0"[^>]*>&quot;x&quot;&amp;<\/h2>/);
  // esc_url() strips the trailing " (not a valid URL character) and
  // HTML-encodes "&" to "&#038;" — printed with {!! !!} so it reaches the
  // page as one entity, not the double-encoded "&amp;#038;".
  assert.match(html, /href="https:\/\/x\.test\/\?a=1&#038;b=2"/);
});

test('padding falls back to the block default (112/56) when unset', () => {
  const tag = openingTag(renderBlock('cta-banner', { heading: 'Hello' }, [], env), 'cta-banner');
  assert.match(tag, /\bpy-14\b/);
  assert.match(tag, /\bmd:py-28\b/);
});

test('entrance parts are numbered across heading, subtitle and cta', () => {
  const html = renderBlock('cta-banner', {
    heading: 'Hello',
    subtitle: 'World',
    ctaText: 'Go',
    ctaLink: { url: 'https://example.com' },
  }, [], env);
  assert.match(html, /<h2[^>]*data-entrance-part\s*>/);
  assert.match(html, /cta-banner__subtitle[^"]*"\s+data-entrance-part style="--e-i: 1"/);
  assert.match(html, /cta-banner__cta[^"]*"\s+href="[^"]*"\s+data-entrance-part style="--e-i: 2"/);
});

test('an empty block renders nothing, but a photo alone still draws the band', () => {
  assert.equal(renderBlock('cta-banner', {}, [], env).trim(), '');
  assert.equal(renderBlock('cta-banner', { ctaText: 'Go' }, [], env).trim(), '');
  assert.match(renderBlock('cta-banner', { bgImageId: 5 }, [], env), /attachment-5\.jpg/);
});

test('the padding classes come from the block.json default, 112 and 56', () => {
  const tag = openingTag(renderBlock('cta-banner', { heading: 'Hello' }, [], env), 'cta-banner');
  assert.match(tag, /\bpy-14\b/);
  assert.match(tag, /\bmd:py-28\b/);
});

test('over a photo the text tone owns the tone, so the section prints no ground class', () => {
  const root = mkdtempSync(join(tmpdir(), 'cta-banner-photo-ground-'));
  writeFileSync(join(root, 'kit.config.json'), JSON.stringify({ grounds: [{ name: 'ink', token: '--color-ink', light: false }] }));
  const tag = openingTag(
    renderBlock('cta-banner', { heading: 'Hello', ground: 'ink', bgImageId: 5 }, [], exampleEnv({ templateDirectory: root })),
    'cta-banner',
  );
  rmSync(root, { recursive: true, force: true });

  assert.doesNotMatch(tag, /ground-ink|on-dark/);
  assert.doesNotMatch(tag, /bg-\[color:var/);
});

test('a photo with a dark ground and a dark text tone gets no on-dark, and the button follows the tone', () => {
  const root = mkdtempSync(join(tmpdir(), 'cta-banner-photo-tone-'));
  writeFileSync(join(root, 'kit.config.json'), JSON.stringify({ grounds: [{ name: 'ink', token: '--color-ink', light: false }] }));
  const html = renderBlock(
    'cta-banner',
    { heading: 'Hello', ground: 'ink', textTone: 'dark', bgImageId: 5, ctaText: 'Go', ctaLink: { url: 'https://example.com' } },
    [],
    exampleEnv({ templateDirectory: root }),
  );
  rmSync(root, { recursive: true, force: true });

  assert.doesNotMatch(html, /on-dark/);
  assert.match(html, /cta-banner__cta btn btn-primary/);
});

test('with no photo a configured ground is still printed', () => {
  const root = mkdtempSync(join(tmpdir(), 'cta-banner-no-photo-'));
  writeFileSync(join(root, 'kit.config.json'), JSON.stringify({ grounds: [{ name: 'ink', token: '--color-ink', light: false }] }));
  const tag = openingTag(renderBlock('cta-banner', { heading: 'Hello', ground: 'ink' }, [], exampleEnv({ templateDirectory: root })), 'cta-banner');
  rmSync(root, { recursive: true, force: true });

  assert.match(tag, /ground-ink on-dark/);
});

test('a button that opens in a new tab tells screen readers', () => {
  const html = renderBlock('cta-banner', { heading: 'Hello', ctaText: 'Go', ctaLink: { url: 'https://example.com', opensInNewTab: true } }, [], env);
  assert.match(html, /<span class="sr-only"> \(opens in a new tab\)<\/span><\/a>/);
});

// --- Editor half ---

const defaults = new Map(wpEditorStubs());

const DATA_STUB = `
export function useSelect(mapSelect) {
  return mapSelect((store) => store === 'core' ? {
    getMedia: (id) => globalThis.__coreMedia?.[id],
    isResolving: (_selector, [id]) => Boolean(globalThis.__coreResolving?.[id]),
  } : {});
}
`;

const componentsWithSpinner = `${defaults.get('@wordpress/components')}
export function Spinner() { return React.createElement('span', { role: 'status' }); }
export function Popover(props) { return React.createElement('div', null, props.children); }
`;

const OVERRIDES = {
  '@wordpress/element': `${defaults.get('@wordpress/element')}
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
`,
  '@wordpress/components': componentsWithSpinner,
  '@wordpress/data': DATA_STUB,
};

globalThis.window = { HTMLElement: class {} };

const GROUND_ALIAS = { 'kit.config.json': 'kit-config-stub' };
const GROUND_STUB = ['kit-config-stub', 'export default { grounds: [] };'];

const baseAttributes = {
  heading: 'Hello',
  subtitle: '',
  ground: '',
  bgImageId: 0,
  bgImageUrl: '',
  bgImagePosition: 'center',
  layout: 'band',
  textTone: 'dark',
  scrim: false,
  ctaText: '',
  ctaLink: { url: '', opensInNewTab: false },
};

test('the editor bundle registers the block, and mounting/selecting writes no attribute', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  globalThis.__coreResolving = {};
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, [...wpEditorStubs(OVERRIDES), GROUND_STUB], 'CtaBannerEditorTestBundle', GROUND_ALIAS);

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  assert.equal(typeof settings.edit, 'function');

  const writes = [];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: baseAttributes,
      setAttributes: (patch) => writes.push(patch),
      isSelected: false,
      clientId: 'test-1',
    }),
  );

  assert.deepEqual(writes, []);
  assert.match(markup, /Hello/);
});

test('the entrance panel, tone select and divider-free layout panel are present', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  globalThis.__coreResolving = {};
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, [...wpEditorStubs(OVERRIDES), GROUND_STUB], 'CtaBannerEditorTestBundle2', GROUND_ALIAS);

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: baseAttributes,
      setAttributes: () => {},
      isSelected: false,
      clientId: 'test-1',
    }),
  );

  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Entrance animation'), true);
  assert.equal(globalThis.__wpEditorTest.selects.some((s) => s.label === 'Text tone'), true);
  assert.equal(globalThis.__wpEditorTest.toggles.some((t) => t.label === 'Lower-edge wash'), true);
});

test('the canvas mirrors the front end: the ground shows with no photo and steps aside for one', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  globalThis.__coreResolving = {};
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  const grounds = ['kit-config-stub', "export default { grounds: [{ name: 'ink', token: '--color-ink', light: false }] };"];
  await executeBundle(entry, [...wpEditorStubs(OVERRIDES), grounds], 'CtaBannerEditorTestBundle3', GROUND_ALIAS);

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const draw = (attributes) =>
    renderToStaticMarkup(
      React.createElement(settings.edit, { attributes: { ...baseAttributes, ground: 'ink', ...attributes }, setAttributes: () => {}, isSelected: false, clientId: 'test-1' }),
    );

  assert.match(draw({}), /ground-ink/);
  assert.doesNotMatch(draw({ bgImageUrl: 'https://example.com/photo.jpg' }), /ground-ink/);
});

// The kit's editor rule: the background is picked in the sidebar, the button is edited on the canvas.
test('the background image is edited in the sidebar and the button on the canvas', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  globalThis.__coreResolving = {};
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, [...wpEditorStubs(OVERRIDES), GROUND_STUB], 'CtaBannerEditorTestBundle4', GROUND_ALIAS);

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, { attributes: baseAttributes, setAttributes: () => {}, isSelected: true, clientId: 'test-1' }),
  );
  const [sidebar, canvas] = [markup.slice(0, markup.lastIndexOf('</aside>')), markup.slice(markup.lastIndexOf('</aside>'))];

  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Background Media'), true);
  assert.match(sidebar, /aria-label="Background image/);
  assert.doesNotMatch(canvas, /aria-label="Background image/);
  assert.doesNotMatch(sidebar, /Button destination/);
  assert.match(canvas, /Button destination/);
});

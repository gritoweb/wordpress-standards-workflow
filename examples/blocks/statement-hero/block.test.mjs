import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { renderBlock, registerDirective, callPhp, openingTag } from '../../../theme/scripts/render-harness.mjs';
import { executeBundle } from '../../../theme/scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../theme/scripts/wp-editor-stubs.mjs';
import { APP_AUTOLOAD } from '../../../theme/app/Blocks/test-support.mjs';
import { exampleEnv } from '../../test-support.mjs';

const metadata = JSON.parse(readFileSync(new URL('./block.json', import.meta.url), 'utf8'));
const env = exampleEnv({ attachments: { 10: { alt: 'A dusk skyline' } } });

const directives = callPhp(
  '__test_directives',
  [],
  {
    functions: [
      APP_AUTOLOAD,
      "function __test_directives() { return \\App\\Providers\\BlockDirectivesServiceProvider::directives(); }",
    ],
  },
);
for (const [name, body] of Object.entries(directives)) {
  registerDirective(name, body);
}

// --- Render half ---

test('media "logo" draws the kit’s own placeholder wordmark, never a client SVG', () => {
  const html = renderBlock('statement-hero', { heading: 'We build brands', media: 'logo' }, [], env);
  assert.match(html, /statement-hero__logo/);
  assert.doesNotMatch(html, /logo-white-summers/);
});

test('the logo is an explicit choice: the block.json default draws no media', () => {
  assert.equal(metadata.attributes.media.default, 'none');
  const html = renderBlock('statement-hero', { heading: 'We build brands' }, [], env);
  assert.doesNotMatch(html, /statement-hero__logo|statement-hero__media/);
});

test('media "none" renders neither the logo nor an image', () => {
  const html = renderBlock('statement-hero', { heading: 'We build brands', media: 'none' }, [], env);
  assert.doesNotMatch(html, /statement-hero__logo/);
  assert.doesNotMatch(html, /statement-hero__media/);
});

test('media "image" with a chosen attachment renders it with its own alt text', () => {
  const html = renderBlock('statement-hero', { heading: 'We build brands', media: 'image', imageId: 10 }, [], env);
  assert.match(html, /statement-hero__media/);
  assert.match(html, /alt="A dusk skyline"/);
  assert.doesNotMatch(html, /statement-hero__logo/);
});

test('media "image" with nothing chosen yet renders no media panel at all', () => {
  const html = renderBlock('statement-hero', { heading: 'We build brands', media: 'image' }, [], env);
  assert.doesNotMatch(html, /statement-hero__media/);
});

test('a multi-paragraph heading collapses to one run of text, never a stray closing/opening tag pair', () => {
  const html = renderBlock(
    'statement-hero',
    { heading: '<p>First line</p><p>Second line</p>' },
    [],
    env,
  );
  assert.doesNotMatch(html, /<\/p><p>/);
  assert.match(html, /First lineSecond line/);
});

test('the heading allow-list keeps inline emphasis and strips anything else, including a script tag', () => {
  const html = renderBlock(
    'statement-hero',
    { heading: '<script>alert(1)</script><strong>Bold</strong> <em>Emphasis</em><br><span class="x">Span</span>' },
    [],
    env,
  );
  // kses drops the <script> tags themselves (its text survives as inert
  // plain text, the same as any other disallowed tag) — the point is that
  // no executable <script> element reaches the page.
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<em>Emphasis<\/em>/);
  assert.match(html, /<br/);
  assert.match(html, /<span class="x">Span<\/span>/);
});

test('an unknown ground prints no ground class', () => {
  const html = renderBlock('statement-hero', { heading: 'Hello', ground: 'not-configured' }, [], env);
  assert.doesNotMatch(html, /ground-not-configured/);
});

test('the anchor id lands on the section', () => {
  const html = renderBlock('statement-hero', { heading: 'Hello', anchor: 'top' }, [], env);
  const tag = openingTag(html, 'statement-hero');
  assert.match(tag, /id="top"/);
});

test('the block’s own zero padding default applies when WordPress has filled every padding key', () => {
  const html = renderBlock(
    'statement-hero',
    { heading: 'Hello', paddingVertMobile: 0, paddingVertDesktop: 0, paddingXMobile: false, paddingXDesktop: false },
    [],
    env,
  );
  const tag = openingTag(html, 'statement-hero');
  assert.match(tag, /\bpy-0\b/);
  assert.match(tag, /\bmd:py-0\b/);
  assert.match(tag, /\bpx-0\b/);
  assert.match(tag, /lg:px-0/);
});

test('the scroll cue carries the header selector as a data attribute, not a hard-coded selector list in a script', () => {
  const html = renderBlock('statement-hero', { heading: 'Hello', showScrollCue: true }, [], env);
  assert.match(html, /data-scroll-cue/);
  assert.match(html, /data-scroll-header-selector="\.header"/);
  assert.match(html, /hidden/);
});

test('no scroll cue by default', () => {
  const html = renderBlock('statement-hero', { heading: 'Hello' }, [], env);
  assert.doesNotMatch(html, /data-scroll-cue/);
});

test('the falls-through entrance prints the global default, with no numbers of its own', () => {
  const html = renderBlock('statement-hero', { heading: 'Hello' }, [], env);
  const tag = openingTag(html, 'statement-hero');
  assert.match(tag, /data-entrance="fade-slide" data-entrance-dir="up"/);
  assert.doesNotMatch(tag, / style="/);
});

test('an empty block renders nothing, a logo alone is content, and a scroll cue alone is not', () => {
  assert.equal(renderBlock('statement-hero', {}, [], env).trim(), '');
  assert.equal(renderBlock('statement-hero', { showScrollCue: true }, [], env).trim(), '');
  for (const showScrollCue of [false, true]) {
    assert.match(renderBlock('statement-hero', { media: 'logo', showScrollCue }, [], env), /statement-hero__logo/);
  }
  assert.match(renderBlock('statement-hero', { media: 'image', imageId: 10 }, [], env), /attachment-10\.jpg/);
});

test('a hostile statement is escaped down to the inline allow-list', () => {
  const html = renderBlock('statement-hero', { heading: 'We <script>alert(1)</script><strong>build</strong> <a href="javascript:x">brands</a>' }, [], env);
  assert.doesNotMatch(html, /<script|<a /);
  assert.match(html, /<strong>build<\/strong>/);
});

test('the parts are numbered in reading order with no gap when the media is off', () => {
  const html = renderBlock('statement-hero', { heading: 'Hello', media: 'none', showScrollCue: true }, [], env);
  assert.match(html, /statement-hero__heading[^>]*data-entrance-part(?! style)/);
  assert.match(html, /data-scroll-cue[^>]*data-entrance-part style="--e-i: 1"/);
});

// --- Editor half ---

test('the editor bundle mounts EntranceControl on real attributes and writes nothing on mount or selection', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  const modules = wpEditorStubs({
    '@wordpress/data': `export function useSelect(mapSelect) {
      return mapSelect(() => ({ getMedia: () => null, isResolving: () => false }));
    }`,
  });
  modules.push(['kit-config-stub', "export default { grounds: [{ name: 'primary', token: '--color-primary', light: true }] };"]);
  await executeBundle(entry, modules, 'StatementHeroEditorTestBundle', { 'kit.config.json': 'kit-config-stub' });

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  assert.equal(typeof settings.edit, 'function');

  const writes = [];
  renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: {
        heading: 'Preview',
        ground: '',
        media: 'logo',
        imageId: 0,
        imageUrl: '',
        showScrollCue: false,
        entrance: {},
      },
      setAttributes: (patch) => writes.push(patch),
      clientId: 'statement-hero-1',
    }),
  );

  assert.deepEqual(writes, []);
  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Entrance animation'), true);
  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Media'), true);
  assert.equal(globalThis.__wpEditorTest.selects.some((s) => s.label === 'Media'), true);
  assert.equal(globalThis.__wpEditorTest.selects.some((s) => s.label === 'Ground'), true);
});

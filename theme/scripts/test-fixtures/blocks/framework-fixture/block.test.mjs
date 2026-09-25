// End-to-end fixture: proves the framework works as a whole, not just each
// piece in isolation — a real block.json + block.php + Blade view render
// (BlockPadding, BlockEntrance, BlockAttributes, the three directives), and a
// real block.jsx editor bundle (EntranceControl, DividerControl).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderBlock, registerDirective, callPhp, openingTag } from '../../../render-harness.mjs';
import { executeBundle } from '../../../editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../wp-editor-stubs.mjs';
import { APP_AUTOLOAD } from '../../../../app/Blocks/test-support.mjs';

const fixturesRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// BlockAttributes::grounds() reads <get_template_directory()>/kit.config.json
// and degrades to [] when it's missing — this fixture has no config, so any
// path works; it only proves an unconfigured ground prints no class (see
// grounds-parity.test.mjs for the configured case).
const GET_TEMPLATE_DIRECTORY = `function get_template_directory() { return ${JSON.stringify(fixturesRoot)}; }`;
const env = { root: fixturesRoot, functions: [APP_AUTOLOAD, GET_TEMPLATE_DIRECTORY] };

// Register the exact directives BlockDirectivesServiceProvider::boot() wires
// (via its exported directives() list), instead of a second hard-coded copy.
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

test('padding falls back to the global default (112/56/true/true) when the block declares none', () => {
  const html = renderBlock('framework-fixture', { heading: 'Hello' }, [], env);
  const tag = openingTag(html, 'framework-fixture');
  assert.match(tag, /\bpy-28\b/);
  assert.match(tag, /\bmd:py-28\b/);
  assert.match(tag, /\bpx-5\b/);
  assert.match(tag, /lg:px-\[6rem\]/);
});

test('a saved padding override reaches the rendered classes', () => {
  const html = renderBlock(
    'framework-fixture',
    { heading: 'Hello', paddingVertMobile: 96, paddingVertDesktop: 56, paddingXMobile: false, paddingXDesktop: false },
    [],
    env,
  );
  const tag = openingTag(html, 'framework-fixture');
  assert.match(tag, /\bpy-24\b/);
  assert.match(tag, /\bmd:py-14\b/);
  assert.match(tag, /\bpx-0\b/);
  assert.match(tag, /lg:px-0/);
});

test('the global entrance default has no numbers, so the section prints no style attribute', () => {
  const html = renderBlock('framework-fixture', { heading: 'Hello' }, [], env);
  const tag = openingTag(html, 'framework-fixture');
  assert.match(tag, /data-entrance="fade-slide" data-entrance-dir="up"/);
  assert.doesNotMatch(tag, / style="/);
});

test('a saved entrance override prints its numbers as inline custom properties', () => {
  const html = renderBlock(
    'framework-fixture',
    { heading: 'Hello', entrance: { type: 'slide', direction: 'left', distance: 40, duration: 500 } },
    [],
    env,
  );
  const tag = openingTag(html, 'framework-fixture');
  assert.match(tag, /data-entrance="slide" data-entrance-dir="left"/);
  assert.match(tag, /--e-distance: 40px/);
  assert.match(tag, /--e-duration: 500ms/);
});

test('an unknown ground prints no ground class; a configured one would (see grounds-parity.test.mjs)', () => {
  const html = renderBlock('framework-fixture', { heading: 'Hello', ground: 'not-configured' }, [], env);
  assert.doesNotMatch(html, /ground-not-configured/);
});

test('entrance parts are numbered by @entrancePart, index 0 carries no style', () => {
  const html = renderBlock(
    'framework-fixture',
    { heading: 'Hello', items: [{ label: 'One' }, { label: 'Two' }] },
    [],
    env,
  );
  // The heading is part 0 (no style); the fixture's items start at part 1,
  // one past the heading, so "One" (item index 0) is part 1 and "Two" is 2.
  assert.match(html, /<h2[^>]*data-entrance-part>/);
  assert.match(html, /<li data-entrance-part style="--e-i: 1">One<\/li>/);
  assert.match(html, /<li data-entrance-part style="--e-i: 2">Two<\/li>/);
});

test('the cta helper resolves text, url, target and the icon class together', () => {
  const html = renderBlock(
    'framework-fixture',
    {
      heading: 'Hello',
      ctaText: 'Learn more',
      ctaLink: { url: 'https://example.com', opensInNewTab: true },
      ctaIcon: 'arrow',
      ctaIconPosition: 'before',
    },
    [],
    env,
  );
  assert.match(html, /class="framework-fixture__cta btn btn-icon-arrow btn-icon-before"/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /target="_blank"/);
});

test('the divider helper rejects an unknown value back to none', () => {
  const html = renderBlock('framework-fixture', { heading: 'Hello', sectionDivider: 'sideways' }, [], env);
  const tag = openingTag(html, 'framework-fixture');
  assert.doesNotMatch(tag, /border-t-2|border-b-2/);
});

// --- Editor half: the same block's block.jsx, bundled and registered. ---

test('the editor bundle registers the block and mounts EntranceControl + DividerControl on real attributes', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, wpEditorStubs(), 'FrameworkFixtureEditorBundle');

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  assert.equal(typeof settings.edit, 'function');

  const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server');
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Preview', sectionDivider: 'above', entrance: { type: 'fade' } },
      setAttributes() {},
      clientId: 'fixture-1',
    }),
  );

  assert.match(markup, /Preview/);
  assert.equal(globalThis.__wpEditorTest.selects.some((s) => s.label === 'Divider'), true);
  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Entrance animation'), true);

  // M1: replayEntrance() (EntranceControl's Preview button) looks for a
  // [data-entrance] canvas root — without it, Preview does nothing and the
  // canvas ignores per-block duration/distance overrides.
  assert.match(markup, /data-entrance="fade"/);
});

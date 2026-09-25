// The reference test shape (TEST-1 to TEST-3): a render half through the real
// Blade compiler and an editor half through the real bundle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { renderBlock, registerDirective, callPhp, openingTag } from '../../../../../../render-harness.mjs';
import { executeBundle } from '../../../../../../editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../../../../wp-editor-stubs.mjs';
import { APP_AUTOLOAD } from '../../../../../../../app/Blocks/test-support.mjs';

const themeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const env = {
  root: resolve(themeRoot, 'resources'),
  functions: [APP_AUTOLOAD, `function get_template_directory() { return ${JSON.stringify(themeRoot)}; }`],
};

const directives = callPhp('__test_directives', [], {
  functions: [APP_AUTOLOAD, 'function __test_directives() { return \\App\\Providers\\BlockDirectivesServiceProvider::directives(); }'],
});
for (const [name, body] of Object.entries(directives)) registerDirective(name, body);

// --- Render half ---

test('an empty block renders nothing', () => {
  assert.equal(renderBlock('conformance-pass', {}, [], env).trim(), '');
});

test('a hostile heading and CTA URL stay escaped', () => {
  const html = renderBlock(
    'conformance-pass',
    { heading: '<b>"x"&</b>', ctaText: 'Go', ctaLink: { url: 'https://x.test/?a=1&b=2"' } },
    [],
    env,
  );
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&quot;x&quot;&amp;/);
  assert.match(html, /href="https:\/\/x\.test\/\?a=1&#038;b=2"/);
});

test('a new-tab link opens in a new tab and says so', () => {
  const html = renderBlock(
    'conformance-pass',
    { ctaText: 'Go', ctaLink: { url: 'https://example.com', opensInNewTab: true } },
    [],
    env,
  );
  assert.match(html, /target="_blank"/);
  assert.match(html, /sr-only/);
});

test('parts that render take consecutive entrance indexes', () => {
  const html = renderBlock('conformance-pass', { heading: 'Hello', ctaText: 'Go', ctaLink: { url: 'https://example.com' } }, [], env);
  assert.ok(openingTag(html, 'conformance-pass'));
  assert.match(html, /<h2[^>]*data-entrance-part\s*>/);
  assert.match(html, /conformance-pass__cta[^>]*data-entrance-part style="--e-i: 1"/);
});

// --- Editor half ---

test('the editor bundle registers the block, and mounting writes nothing', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  const defaults = new Map(wpEditorStubs());
  const overrides = {
    '@wordpress/block-editor': `${defaults.get('@wordpress/block-editor')}
export const store = 'core/block-editor';
export function useBlockEditContext() { return { clientId: 'test-1' }; }`,
  };
  await executeBundle(
    entry,
    [...wpEditorStubs(overrides), ['kit-config-stub', 'export default { grounds: [] };']],
    'ConformancePassBundle',
    { 'kit.config.json': 'kit-config-stub' },
  );

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const writes = [];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Hello', ground: '', sectionDivider: 'none', ctaText: '', ctaLink: { url: '', opensInNewTab: false }, items: [] },
      setAttributes: (patch) => writes.push(patch),
      isSelected: false,
      clientId: 'test-1',
    }),
  );

  assert.deepEqual(writes, []);
  assert.match(markup, /conformance-pass-editor/);
});

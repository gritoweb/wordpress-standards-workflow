import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { executeBundle } from './editor-test-bundle.mjs';
import { resetWpEditorTest, wpEditorStubs } from './wp-editor-stubs.mjs';

const blockEntry = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'test-fixtures/blocks/fixture-block/block.jsx',
);

test('bundles a fixture block.jsx and renders its edit() with the default stubs', async () => {
  resetWpEditorTest();

  await executeBundle(
    blockEntry,
    wpEditorStubs(),
    'FixtureEditorTestBundle',
  );

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Hello from the fixture' },
      setAttributes() {},
    }),
  );

  assert.match(markup, /Hello from the fixture/);
  assert.match(markup, /wp-block-test/);
});

test('an override replaces one module while the rest of the defaults still apply', async () => {
  resetWpEditorTest();

  await executeBundle(
    blockEntry,
    wpEditorStubs({
      '@wordpress/i18n': `export function __(value) { return value.toUpperCase(); }`,
    }),
    'FixtureEditorTestBundleOverride',
  );

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: '' },
      setAttributes() {},
    }),
  );

  assert.match(markup, /data-placeholder="HEADING"/);
});

test('bundled components keep their names, so a test can find one by name', async () => {
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), '../resources/blocks/components/backend/InfoPanel.jsx');
  const { InfoPanel } = await executeBundle(entry, wpEditorStubs(), 'InfoPanelNameBundle');

  assert.equal(InfoPanel.name, 'InfoPanel');
});

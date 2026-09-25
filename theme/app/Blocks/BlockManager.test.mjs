import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, symlinkSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { callPhp } from '../../scripts/render-harness.mjs';
import { APP_AUTOLOAD } from './test-support.mjs';

// BlockManager's isThemeBlock() guard checks metadata.file against
// get_template_directory() . '/resources/blocks/', so these fixture helpers
// return a fake get_template_directory() bound to a real temp folder.
function makeFixture() {
  // realpathSync: on macOS the system temp dir is itself reached through a
  // symlink (/var -> /private/var), so an un-resolved root would silently
  // exercise the symlink path here on every test, not only the one that
  // means to.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'block-manager-')));
  const blockDir = join(root, 'resources', 'blocks', 'fixture');
  mkdirSync(blockDir, { recursive: true });
  const blockJson = join(blockDir, 'block.json');
  writeFileSync(blockJson, JSON.stringify({ name: 'kit/fixture' }));
  return { root, blockDir, blockJson };
}

function functionsFor(root) {
  return [
    APP_AUTOLOAD,
    `function get_template_directory() { return ${JSON.stringify(root)}; }`,
    `function wp_normalize_path($path) { return str_replace(chr(92), '/', $path); }`,
    `function __test_add_global_attributes($metadata) { return (new App\\Blocks\\BlockManager())->addGlobalAttributes($metadata); }`,
    `function __test_stamp_asset_version($metadata) { return (new App\\Blocks\\BlockManager())->stampAssetVersion($metadata); }`,
  ];
}

test('addGlobalAttributes merges the shared padding and entrance attributes into a theme block', () => {
  const { root, blockJson } = makeFixture();
  const result = callPhp('__test_add_global_attributes', [{ file: blockJson, attributes: {} }], {
    functions: functionsFor(root),
  });

  assert.equal(result.attributes.paddingVertDesktop.default, 112);
  assert.equal(result.attributes.paddingVertMobile.default, 56);
  assert.equal(result.attributes.paddingXDesktop.default, true);
  assert.equal(result.attributes.entrance.default.type, 'fade-slide');
  rmSync(root, { recursive: true, force: true });
});

test('the global entrance default leaves distance/duration/delay/stagger null so Site Settings > Motion wins', () => {
  const { root, blockJson } = makeFixture();
  const result = callPhp('__test_add_global_attributes', [{ file: blockJson, attributes: {} }], {
    functions: functionsFor(root),
  });

  const entrance = result.attributes.entrance.default;
  assert.equal(entrance.distance, null);
  assert.equal(entrance.duration, null);
  assert.equal(entrance.delay, null);
  assert.equal(entrance.stagger, null);
  assert.equal(entrance.trigger, 'section');
  rmSync(root, { recursive: true, force: true });
});

test("addGlobalAttributes lets a block's own attribute declaration win", () => {
  const { root, blockJson } = makeFixture();
  const result = callPhp(
    '__test_add_global_attributes',
    [{ file: blockJson, attributes: { paddingVertDesktop: { type: 'number', default: 0 } } }],
    { functions: functionsFor(root) },
  );

  assert.equal(result.attributes.paddingVertDesktop.default, 0);
  rmSync(root, { recursive: true, force: true });
});

test('addGlobalAttributes leaves a non-theme block untouched (plugin blocks outside resources/blocks/)', () => {
  const { root } = makeFixture();
  const outside = join(root, 'somewhere-else', 'block.json');
  const result = callPhp('__test_add_global_attributes', [{ file: outside, attributes: {} }], {
    functions: functionsFor(root),
  });

  assert.deepEqual(result.attributes, []);
  rmSync(root, { recursive: true, force: true });
});

// L1: WordPress passes metadata.file through realpath() before the filter
// runs, but get_template_directory() is never resolved the same way — a
// symlinked theme folder made every block look like it came from outside
// resources/blocks/.
test('addGlobalAttributes still recognizes a theme block when the theme folder is a symlink', () => {
  const real = realpathSync(mkdtempSync(join(tmpdir(), 'block-manager-real-')));
  const blockDir = join(real, 'resources', 'blocks', 'fixture');
  mkdirSync(blockDir, { recursive: true });
  const blockJson = join(blockDir, 'block.json');
  writeFileSync(blockJson, JSON.stringify({ name: 'kit/fixture' }));

  const parent = mkdtempSync(join(tmpdir(), 'block-manager-link-'));
  const linkedRoot = join(parent, 'theme-symlink');
  symlinkSync(real, linkedRoot);

  const result = callPhp('__test_add_global_attributes', [{ file: blockJson, attributes: {} }], {
    functions: functionsFor(linkedRoot),
  });

  assert.equal(result.attributes.paddingVertDesktop.default, 112);
  rmSync(real, { recursive: true, force: true });
  rmSync(parent, { recursive: true, force: true });
});

test('stampAssetVersion stamps the block folder’s newest mtime for a theme block with no declared version', () => {
  const { root, blockJson } = makeFixture();
  const future = new Date('2030-01-01T00:00:00Z');
  utimesSync(blockJson, future, future);

  const result = callPhp('__test_stamp_asset_version', [{ file: blockJson, attributes: {} }], {
    functions: functionsFor(root),
  });

  assert.equal(result.version, String(Math.floor(future.getTime() / 1000)));
  rmSync(root, { recursive: true, force: true });
});

test('stampAssetVersion leaves a declared version alone', () => {
  const { root, blockJson } = makeFixture();
  const result = callPhp('__test_stamp_asset_version', [{ file: blockJson, version: '1.2.3', attributes: {} }], {
    functions: functionsFor(root),
  });

  assert.equal(result.version, '1.2.3');
  rmSync(root, { recursive: true, force: true });
});

test('getNamespace returns the namespace placeholder unsubstituted (kit-setup.mjs fills it in per project)', () => {
  const namespace = callPhp(
    '__test_get_namespace',
    [],
    { functions: [APP_AUTOLOAD, 'function __test_get_namespace() { return (new App\\Blocks\\BlockManager())->getNamespace(); }'] },
  );

  assert.equal(namespace, '__BLOCK_NAMESPACE__');
});

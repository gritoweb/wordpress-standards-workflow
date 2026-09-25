import { test } from 'node:test';
import assert from 'node:assert/strict';

import { callPhp, themeRoot } from '../scripts/render-harness.mjs';
import { APP_AUTOLOAD } from './Blocks/test-support.mjs';

// blocks.php runs top-level code (BlockCategories::register(), two
// add_action('init', ...) calls) the moment it's required, so this fakes
// add_action/add_filter to capture those callbacks and wp_register_* to
// capture their arguments, then requires the real file — no reimplementation
// of its logic.
const FAKES = `
$GLOBALS['__actions'] = [];
$GLOBALS['__registered'] = [];
function add_action($hook, $callback, $priority = 10) { $GLOBALS['__actions'][$hook][] = $callback; }
function add_filter($hook, $callback, $priority = 10) {}
function get_template_directory() { return ${JSON.stringify(themeRoot)}; }
function get_template_directory_uri() { return 'https://example.test/wp-content/themes/kit'; }
function wp_register_script($handle, $src, $deps, $ver, $footer) {
    $GLOBALS['__registered'][] = ['type' => 'script', 'handle' => $handle, 'src' => $src, 'ver' => $ver, 'footer' => $footer];
}
function wp_register_style($handle, $src, $deps, $ver) {
    $GLOBALS['__registered'][] = ['type' => 'style', 'handle' => $handle, 'src' => $src, 'ver' => $ver];
}
// BlockManager::register() globs real blocks under resources/blocks/*/block.json
// (now that some exist) and calls this for each one; this test only cares
// about the two add_action('init', ...) registrations blocks.php itself
// makes, not block registration, so it's a no-op.
function register_block_type($file) {}
function __test_load_blocks_php() {
    require ${JSON.stringify(themeRoot)} . '/app/blocks.php';
    foreach ($GLOBALS['__actions']['init'] ?? [] as $callback) {
        $callback();
    }
    return $GLOBALS['__registered'];
}
`;

test('blocks.php registers one collection-paging script and style handle, referenced by name (not file:)', () => {
  const registered = callPhp('__test_load_blocks_php', [], { functions: [APP_AUTOLOAD, FAKES] });

  const script = registered.find((r) => r.type === 'script' && r.handle === '__PREFIX__-collection-paging');
  const style = registered.find((r) => r.type === 'style' && r.handle === '__PREFIX__-collection-paging');

  assert.ok(script, 'expected the collection-paging script to be registered');
  assert.ok(style, 'expected the collection-paging style to be registered');
  assert.match(script.src, /collection-paging\.js$/);
  assert.match(style.src, /collection-paging\.css$/);
  assert.ok(script.footer, 'the script should load in the footer, like a viewScript');
  assert.ok(script.ver, 'the version should be stamped from the file mtime, not left empty');
});

test('registration happens only once, even though multiple blocks may reference the same handle', () => {
  const registered = callPhp('__test_load_blocks_php', [], { functions: [APP_AUTOLOAD, FAKES] });

  const scriptHandles = registered.filter((r) => r.type === 'script' && r.handle === '__PREFIX__-collection-paging');
  assert.equal(scriptHandles.length, 1);
});

test('blocks.php registers the shared scroll cue once, by handle, in the footer', () => {
  const registered = callPhp('__test_load_blocks_php', [], { functions: [APP_AUTOLOAD, FAKES] });
  const cues = registered.filter((r) => r.type === 'script' && r.handle === '__PREFIX__-scroll-cue');

  assert.equal(cues.length, 1);
  assert.match(cues[0].src, /components\/frontend\/scroll-cue\.js$/);
  assert.ok(cues[0].footer);
  assert.ok(cues[0].ver, 'the version should be stamped from the file mtime');
});

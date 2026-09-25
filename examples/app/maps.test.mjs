import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { appRoot, callKitPhp } from '../../theme/app/test-support.mjs';
import { examplesApp } from '../test-support.mjs';

const BOOTSTRAP = resolve(examplesApp, 'maps.php');

// maps.php only registers one closure on init; the test captures it and runs
// it, so MapsSettings and the registration are the real ones.
const stubs = (key) => [
  "function add_action($hook, $cb, $priority = 10) { $GLOBALS['__hooks'][$hook][] = $cb; }",
  "function wp_json_encode($value) { return json_encode($value); }",
  "function wp_register_script($handle, $src, $deps, $ver, $args) { $GLOBALS['__registered'][] = ['handle' => $handle, 'src' => $src, 'args' => $args]; }",
  "function wp_add_inline_script($handle, $data, $position) { $GLOBALS['__inline'][] = ['handle' => $handle, 'data' => $data, 'position' => $position]; }",
  `function __test_maps() {
    $GLOBALS['__hooks'] = [];
    $GLOBALS['__registered'] = [];
    $GLOBALS['__inline'] = [];
    require '${resolve(appRoot, 'Settings/SiteSettings.php')}';
    require '${resolve(examplesApp, 'Settings/MapsSettings.php')}';
    require '${BOOTSTRAP}';

    foreach ($GLOBALS['__hooks']['init'] ?? [] as $cb) {
      $cb();
    }

    $registered = $GLOBALS['__registered'];
    $inline = $GLOBALS['__inline'];
    $GLOBALS['__inline'] = [];

    foreach ($GLOBALS['__hooks']['enqueue_block_editor_assets'] ?? [] as $cb) {
      $cb();
    }

    return ['registered' => $registered, 'inline' => $inline, 'editor' => $GLOBALS['__inline']];
  }`,
];

const run = (acf) => callKitPhp('__test_maps', [], { functions: stubs(), acf });

test('with no Maps API key, the google-maps script is never registered', () => {
  assert.deepEqual(run(null).registered, []);
  assert.deepEqual(run({ maps_api_key: '   ' }).registered, []);
});

test('with a key, the google-maps script is registered deferred in the footer, with the key and callback in its src', () => {
  const [script] = run({ maps_api_key: 'abc123' }).registered;

  assert.equal(script.handle, '__PREFIX__-google-maps');
  assert.match(script.src, /key=abc123/);
  assert.match(script.src, /callback=__PREFIX__LocationReady/);
  assert.deepEqual(script.args, { strategy: 'defer', in_footer: true });
});

test('the library gets a ready stub and the site-wide map settings before it loads', () => {
  const { inline } = run({ maps_api_key: 'abc123', maps_style: 'branded', maps_hide_business: false });

  assert.ok(inline.every((entry) => entry.handle === '__PREFIX__-google-maps' && entry.position === 'before'));
  assert.match(inline[0].data, /__PREFIX__LocationReady/);
  assert.match(inline[1].data, /window\.__PREFIX__MapSettings = \{"style":"branded","hideBusiness":"0"\};/);
});

test('the editor gets the library address, not the library: nothing loads until Locate asks', () => {
  const { editor } = run({ maps_api_key: 'abc123' });

  assert.equal(editor.length, 1);
  assert.equal(editor[0].handle, 'editor');
  assert.equal(editor[0].position, 'before');
  const src = JSON.parse(editor[0].data.match(/window\.__PREFIX__MapsEditor = (\{.*\});/)[1]).src;
  assert.match(src, /^https:\/\/maps\.googleapis\.com\/maps\/api\/js\?/);
  assert.match(src, /key=abc123/);
  assert.match(src, /loading=async/);
  assert.doesNotMatch(src, /callback=/);
});

test('with no key the editor gets nothing', () => {
  assert.deepEqual(run(null).editor, []);
});


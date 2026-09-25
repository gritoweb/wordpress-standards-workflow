import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { cascade } from '../scripts/css-cascade.mjs';
import { appRoot, callKitPhp } from './test-support.mjs';

const SITE_PHP = resolve(appRoot, 'site.php');

// site.php's top-level add_filter()/add_action() calls only ever register
// closures; the callable a test needs is captured here and invoked
// directly, so the class its `use` imports names (SiteSettings)
// never have to exist unless a captured closure actually reads them.
const STUBS = [
  'class GFForms {}',
  `namespace App\\Settings {
    class SiteSettings {
      public static function motion() {
        return ['duration' => 300, 'delay' => 0, 'stagger' => 80, 'distance' => 1, 'unit' => 'rem', 'ease' => 'ease-out'];
      }
      public static function hover() {
        return ['duration' => 150, 'button' => 'lift', 'link' => 'underline'];
      }
    }
  }`,
  "function add_filter($hook, $cb, $priority = 10, $args = 1) { $GLOBALS['__hooks'][$hook][] = $cb; }",
  "function add_action($hook, $cb, $priority = 10, $args = 1) { $GLOBALS['__hooks'][$hook][] = $cb; $GLOBALS['__priorities'][$hook][] = $priority; }",
  'function apply_filters($tag, $value, ...$args) { return $value; }',
  "function get_theme_file_path($p) { return '/nonexistent'; }",
  'function get_theme_file_uri($p) { return $p; }',
  "function sanitize_key($v) { return strtolower(preg_replace('/[^a-z0-9_-]/', '', (string) $v)); }",
  `function __test_form_button($tone) {
    $_POST['__PREFIX___form_button'] = $tone;
    $GLOBALS['__hooks'] = [];
    require '${SITE_PHP}';
    $cb = $GLOBALS['__hooks']['gform_submit_button'][0];
    return $cb('', ['id' => 1, 'button' => ['text' => 'Submit']]);
  }`,
  `function __test_site_setup() {
    $GLOBALS['__hooks'] = [];
    require '${SITE_PHP}';

    $editorSettings = ['styles' => []];
    foreach ($GLOBALS['__hooks']['block_editor_settings_all'] ?? [] as $cb) {
      $editorSettings = $cb($editorSettings);
    }

    return [
      'editorStyles' => array_column($editorSettings['styles'], 'css'),
    ];
  }`,
  `function __test_wp_head() {
    $GLOBALS['__hooks'] = [];
    $GLOBALS['__priorities'] = [];
    require '${SITE_PHP}';

    $order = array_keys($GLOBALS['__hooks']['wp_head'] ?? []);
    usort($order, fn($a, $b) => [$GLOBALS['__priorities']['wp_head'][$a], $a] <=> [$GLOBALS['__priorities']['wp_head'][$b], $b]);

    ob_start();
    foreach ($order as $i) {
      $GLOBALS['__hooks']['wp_head'][$i]();
    }
    return ob_get_clean();
  }`,
  "function wp_add_inline_script(\$handle, \$data, \$position = 'after') { \$GLOBALS['__inline_scripts'][] = [\$handle, \$data, \$position]; }",
  "function wp_json_encode(\$data) { return json_encode(\$data); }",
  `function __test_editor_inline_script() {
    $GLOBALS['__hooks'] = [];
    $GLOBALS['__inline_scripts'] = [];
    require '${SITE_PHP}';

    foreach ($GLOBALS['__hooks']['enqueue_block_editor_assets'] ?? [] as $cb) {
      $cb();
    }

    return $GLOBALS['__inline_scripts'];
  }`,
];

const submitButton = (tone) => callKitPhp('__test_form_button', [tone], { functions: STUBS });
const siteSetup = () => callKitPhp('__test_site_setup', [], { functions: STUBS });
const wpHeadOutput = () => callKitPhp('__test_wp_head', [], { functions: STUBS });
const editorInlineScripts = () => callKitPhp('__test_editor_inline_script', [], { functions: STUBS });

// A real add_filter/apply_filters pair (STUBS's own apply_filters is a no-op
// that ignores registered callbacks — fine for the $_POST-fallback tests
// above, useless for proving the block's own filter reaches the button),
// so contact-form/block.php's add_filter('__PREFIX__/form_button_tone', ...)
// call and site.php's gform_submit_button consumer actually compose, the
// same as they do wired together in WordPress.
const GF_FILTER_STUBS = [
  'class GFForms {}',
  "function sanitize_key($v) { return strtolower(preg_replace('/[^a-z0-9_-]/', '', (string) $v)); }",
  "function add_filter($tag, $cb, $priority = 10, $args = 1) { $GLOBALS['__hooks'][$tag][] = $cb; }",
  "function add_action($tag, $cb, $priority = 10, $args = 1) { $GLOBALS['__hooks'][$tag][] = $cb; }",
  `function remove_filter($tag, $cb) {
    $i = array_search($cb, $GLOBALS['__hooks'][$tag] ?? [], true);
    if ($i !== false) { array_splice($GLOBALS['__hooks'][$tag], $i, 1); }
  }`,
  `function apply_filters($tag, $value, ...$args) {
    foreach ($GLOBALS['__hooks'][$tag] ?? [] as $cb) { $value = $cb($value, ...$args); }
    return $value;
  }`,
  `function __test_form_button_from_block_filter($tone) {
    $GLOBALS['__hooks'] = [];
    require '${SITE_PHP}';
    $nameTone = fn() => $tone;
    add_filter('__PREFIX__/form_button_tone', $nameTone);
    $html = apply_filters('gform_submit_button', '', ['id' => 1, 'button' => ['text' => 'Submit']]);
    remove_filter('__PREFIX__/form_button_tone', $nameTone);
    return $html;
  }`,
];

const submitButtonFromBlockFilter = (tone) =>
  callKitPhp('__test_form_button_from_block_filter', [tone], { functions: GF_FILTER_STUBS });

// H4: 'on-dark' used to map to .btn-inverted — an ink fill with an ink
// border and an ink hover label, which disappears on an actual dark ground.
test('the on-dark form button tone uses the on-dark button role, not the ink-fill inverted one', () => {
  const html = submitButton('on-dark');

  assert.match(html, /class="btn btn-on-dark max-xl:w-full gform_button"/);
  assert.doesNotMatch(html, /btn-inverted/);
});

test('the on-light tone still uses the primary button role', () => {
  const html = submitButton('on-light');

  assert.match(html, /class="btn btn-primary max-xl:w-full gform_button"/);
});

// contact-form/block.php sets the tone via this same filter, for the
// button's FIRST render; Gravity Forms' admin-ajax re-render (after a
// validation failure) never runs the block again, so the tone has to also
// travel as a hidden input the $_POST-fallback tests above read back. A
// tone the block passes that isn't a real FORM_BUTTON_TONES key (the
// contact-form block used to send 'primary', not 'on-light') resets $tone
// to '', which skips the hidden input entirely — the button silently loses
// its tone on the very first ajax resubmission.
test('a tone set through the block filter prints the hidden input site.php reads back after an ajax resubmit', () => {
  const html = submitButtonFromBlockFilter('on-light');

  assert.match(html, /class="btn btn-primary max-xl:w-full gform_button"/);
  assert.match(html, /<input type="hidden" name="__PREFIX___form_button" value="on-light">/);
});

test('an invalid tone from the block filter prints no hidden input', () => {
  const html = submitButtonFromBlockFilter('primary');

  assert.doesNotMatch(html, /<input type="hidden" name="__PREFIX___form_button"/);
});

test('an unrecognized tone falls back to the plain primary button', () => {
  const html = submitButton('bogus');

  assert.match(html, /class="btn btn-primary gform_button"/);
});

// M6: Sage's own stock app/setup.php already injects editor.css into the
// block editor canvas — site.php injecting it again is dead duplication (the
// second injection loads the whole editor bundle twice).
test('the block editor canvas filter adds the layer order and the motion custom properties, not a second editor.css', () => {
  const { editorStyles } = siteSetup();

  assert.equal(editorStyles.length, 2);
  assert.match(editorStyles[1], /^:root\{/);
  assert.ok(!editorStyles.some((css) => css.includes('@import')));
});

// WordPress prints a block's viewStyle before app.css, so the first @layer
// statement on the page decides the order of every layer. block.css is plain
// CSS with no @layer, and the page states the order before either sheet.
const APP_CSS = '@layer base { .link { color: base; } } @layer components { .link { color: components; } }';

const firstStyle = (html) => html.match(/<style[^>]*>([\s\S]*?)<\/style>/)[1];

test('wp_head prints the layer order before every other style, ahead of a block stylesheet that opens its own layer', () => {
  const head = firstStyle(wpHeadOutput());
  const blockCss = '@layer components { .link { color: block; } }';

  assert.equal(cascade(`${head}\n${blockCss}\n${APP_CSS}`).winner('.link', 'color').value, 'components');
  assert.equal(cascade(`${blockCss}\n${APP_CSS}`).winner('.link', 'color').value, 'base');
});

test('the block editor canvas puts the layer order ahead of every other canvas style', () => {
  const [first] = siteSetup().editorStyles;
  const blockCss = '@layer components { .link { color: block; } }';

  assert.equal(cascade(`${first}\n${blockCss}\n${APP_CSS}`).winner('.link', 'color').value, 'components');
});

// H1: without this, html.entrance never appears and every hidden-state rule
// in entrance.css, and every Site Settings > Motion value, has no effect.
test('wp_head prints the script that adds html.entrance and bails after 5 seconds without data-entrance-ready', () => {
  const html = wpHeadOutput();

  assert.match(html, /<script>/);
  assert.match(html, /document\.documentElement\.classList\.add\(\s*'entrance'\s*\)/);
  assert.match(html, /5000/);
  assert.match(html, /data-entrance-ready/);
  assert.match(html, /document\.documentElement\.classList\.remove\(\s*'entrance'\s*\)/);
});

// H2: EntranceControl.jsx reads globalThis.__PREFIX__EntranceDefaults as its
// siteDefaults fallback; without this, the inspector always shows the
// hard-coded 32/600/0/120 placeholders instead of the Site Settings values.
test('enqueue_block_editor_assets prints window.__PREFIX__EntranceDefaults from SiteSettings::motion()', () => {
  const scripts = editorInlineScripts();
  const [handle, data, position] = scripts.find(([, d]) => d.includes('__PREFIX__EntranceDefaults'));

  assert.equal(handle, 'editor');
  assert.equal(position, 'before');
  assert.match(data, /window\.__PREFIX__EntranceDefaults\s*=\s*\{[^}]*"distance":1[^}]*\}/);
  assert.match(data, /"duration":300/);
  assert.match(data, /"delay":0/);
  assert.match(data, /"stagger":80/);
});

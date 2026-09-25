// Proves the conformance checks themselves. One block under
// test-fixtures/conformance/passing passes every rule, and each case below
// breaks exactly one rule in a temporary copy of it and expects that rule to
// fail. A check that never fails would pass everything, so this is what keeps
// the rules honest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { callPhp } from './render-harness.mjs';
import { APP_AUTOLOAD } from '../app/Blocks/test-support.mjs';
import { RULES, RULE_IDS, WARN_RULES, checkBlock, checkProject, formatFailure } from './conformance.mjs';
import { GLOBAL_ATTRIBUTES } from './conformance-runtime.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const themeRoot = resolve(here, '..');
const fixtures = join(here, 'test-fixtures', 'conformance');
const passing = join(fixtures, 'passing');
const BLOCK = 'resources/blocks/conformance-pass';
const VIEW = 'resources/views/blocks/conformance-pass.blade.php';

// A copy of the passing fixture. It sits inside the repo so the block's
// imports of react resolve, and the shared components and partials are
// linked, as they are in a real theme.
function copyFixture() {
  const dir = mkdtempSync(join(fixtures, '.run-'));
  cpSync(passing, dir, {
    recursive: true,
    filter: (source) => !/resources[\\/](blocks[\\/]components|views[\\/]partials)$/.test(source),
  });
  symlinkSync(join(themeRoot, 'resources/blocks/components'), join(dir, 'resources/blocks/components'));
  symlinkSync(join(themeRoot, 'resources/views/partials'), join(dir, 'resources/views/partials'));

  return dir;
}

const read = (dir, file) => readFileSync(join(dir, file), 'utf8');
const write = (dir, file, text) => writeFileSync(join(dir, file), text);

// Replaces one exact string, and fails the test if it isn't there exactly
// once, so a fixture edit can't silently stop matching.
function replaceOnce(dir, file, from, to) {
  const source = read(dir, file);
  assert.equal(source.split(from).length - 1, 1, `expected exactly one match of ${JSON.stringify(from)} in ${file}`);
  write(dir, file, source.replace(from, () => to));
}

function editJson(dir, file, edit) {
  const json = JSON.parse(read(dir, file));
  edit(json);
  write(dir, file, `${JSON.stringify(json, null, 4)}\n`);
}

const run = (dir, only) => checkBlock({ themeRoot: dir, blockDir: join(dir, BLOCK), only });

test('the passing fixture meets every rule', async () => {
  const { failures, skipped } = await checkBlock({ themeRoot: passing, blockDir: join(passing, BLOCK) });

  assert.deepEqual(failures.map(formatFailure), []);
  assert.deepEqual(skipped, []);
});

test('every numbered rule in the doc has a check', () => {
  const numbers = RULES.filter((rule) => typeof rule.n === 'number').map((rule) => rule.n);
  // 4 (React import) and 44 (no padding control) contradict this kit's decisions: docs/merge-decisions.md.
  const removed = [4, 44];
  assert.deepEqual([...new Set(numbers)].sort((a, b) => a - b), Array.from({ length: 60 }, (_, index) => index + 1).filter((n) => !removed.includes(n)));
});

test('GLOBAL_ATTRIBUTES mirrors BlockManager::globalAttributes()', () => {
  const php = callPhp('__global_attributes', [], {
    functions: [
      APP_AUTOLOAD,
      'function __global_attributes() { return (new class extends \\App\\Blocks\\BlockManager { public function read() { return $this->globalAttributes(); } })->read(); }',
    ],
  });

  assert.deepEqual(GLOBAL_ATTRIBUTES, php);
});

// [rule number or ID, what breaks, edit(dir)]
const BREAKS = [
  [1, 'the block has no view', (dir) => rmSync(join(dir, VIEW))],
  [58, 'the block has no test file', (dir) => rmSync(join(dir, BLOCK, 'block.test.mjs'))],
  [2, 'viewScript names a file that does not exist', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { json.viewScript = 'file:./missing.js'; })],
  [2, 'block.css exists but is not declared', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { delete json.viewStyle; })],
  [3, 'block.css uses @apply', (dir) => write(dir, `${BLOCK}/block.css`, '.a { @apply p-4; }\n')],
  [3, 'block.css opens an @layer', (dir) => write(dir, `${BLOCK}/block.css`, '@layer components { .a { color: red; } }\n')],
  [3, 'block.js uses import', (dir) => write(dir, `${BLOCK}/block.js`, "import x from './x.js';\n")],
  [6, 'apiVersion is 2', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { json.apiVersion = 2; })],
  [7, 'anchor support is off', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { delete json.supports; })],
  [8, 'the inserter example is missing', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { delete json.example; })],
  [9, 'an attribute has no default', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { delete json.attributes.heading.default; })],
  [10, 'a link attribute defaults to an empty object', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { json.attributes.ctaLink.default = {}; })],
  [11, 'only one padding key is declared', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { json.attributes.paddingVertDesktop = { type: 'number', default: 96 }; })],
  [12, 'an entrance preset leaves out keys', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { json.attributes.entrance = { type: 'object', default: { type: 'fade' } }; })],
  [13, 'an attribute uses a legacy name', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { json.attributes.background = { type: 'string', default: '' }; })],
  [14, 'a Url attribute has no Id sibling', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { delete json.attributes.imageId; })],
  [15, 'a variant is named for a page', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { json.attributes.layoutVariant = { type: 'string', default: 'home' }; })],
  [16, 'a script reaches into components/', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { json.viewScript = 'file:../components/frontend/slider.js'; })],
  [17, 'ground defaults to a name', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { json.attributes.ground.default = 'ink'; })],
  [18, 'the divider defaults to a rule', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { json.attributes.sectionDivider.default = 'below'; })],
  [19, 'ctaIcon has no position', (dir) => editJson(dir, `${BLOCK}/block.json`, (json) => { delete json.attributes.ctaIconPosition; })],
  [20, 'block.php has no ABSPATH guard', (dir) => replaceOnce(dir, `${BLOCK}/block.php`, "if (!defined('ABSPATH')) {\n    exit;\n}\n", '')],
  [21, 'block.php builds the entrance by hand', (dir) => replaceOnce(dir, `${BLOCK}/block.php`, 'BlockEntrance::fromBlock($attributes, __DIR__)', "BlockEntrance::sanitize($attributes['entrance'] ?? [])")],
  [22, 'block.php skips the anchor', (dir) => replaceOnce(dir, `${BLOCK}/block.php`, "    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),\n", '')],
  [23, 'block.php falls back to padding block.json does not declare', (dir) => replaceOnce(dir, `${BLOCK}/block.php`, 'BlockPadding::fromAttributes($attributes)', "BlockPadding::fromAttributes($attributes + ['paddingVertMobile' => 96])")],
  [24, 'block.php resolves the ground by hand', (dir) => replaceOnce(dir, `${BLOCK}/block.php`, 'BlockAttributes::groundClass($ground)', "'ground-' . $ground")],
  [25, 'block.php builds the CTA by hand', (dir) => replaceOnce(dir, `${BLOCK}/block.php`, '    ...BlockAttributes::cta($attributes),\n', '')],
  [26, 'block.php reads the divider by hand', (dir) => replaceOnce(dir, `${BLOCK}/block.php`, 'BlockAttributes::divider($attributes)', "$attributes['sectionDivider'] ?? 'none'")],
  [27, 'block.php trusts array entries', (dir) => replaceOnce(dir, `${BLOCK}/block.php`, "array_filter($attributes['items'] ?? [], 'is_array')", "($attributes['items'] ?? [])")],
  [28, 'an image has no size', (dir) => replaceOnce(dir, VIEW, "wp_get_attachment_image($imageId, 'large', false, ['class' => 'h-full w-full object-cover', 'loading' => 'lazy', 'decoding' => 'async'])", 'wp_get_attachment_image($imageId)')],
  [30, 'the view root is a div', (dir) => replaceOnce(dir, VIEW, '<section @if ($anchor)', '<div @if ($anchor)')],
  [31, 'the anchor id prints twice', (dir) => replaceOnce(dir, VIEW, '<div class="conformance-pass__inner container">', '<div id="{{ $anchor }}" class="conformance-pass__inner container">')],
  [32, 'the inner container is missing', (dir) => replaceOnce(dir, VIEW, 'conformance-pass__inner container', 'conformance-pass__wrap container')],
  [33, 'the view has an h1', (dir) => replaceOnce(dir, VIEW, '<h2 class="conformance-pass__heading heading-2"', '<h1 class="conformance-pass__heading heading-2"')],
  [34, 'an entrance part has a second style', (dir) => replaceOnce(dir, VIEW, '<h2 class="conformance-pass__heading heading-2" @entrancePart', '<h2 style="color: red" class="conformance-pass__heading heading-2" @entrancePart')],
  [35, 'a palette step', (dir) => replaceOnce(dir, VIEW, 'conformance-pass__figure !m-0', 'conformance-pass__figure !m-0 bg-earth-900')],
  [35, 'a hex value', (dir) => replaceOnce(dir, VIEW, 'conformance-pass__figure !m-0', 'conformance-pass__figure !m-0 text-[#123456]')],
  [35, 'a named color', (dir) => replaceOnce(dir, VIEW, 'conformance-pass__figure !m-0', 'conformance-pass__figure !m-0 text-white')],
  [36, 'a form action printed without esc_url', (dir) => replaceOnce(dir, VIEW, '<div class="conformance-pass__inner container">', '<div class="conformance-pass__inner container"><form action="{{ $ctaUrl }}"></form>')],
  [36, 'a srcset printed raw', (dir) => replaceOnce(dir, VIEW, '<div class="conformance-pass__inner container">', '<div class="conformance-pass__inner container"><img alt="" srcset="{!! $ctaUrl !!} 2x">')],
  [36, 'a css url() printed without esc_url', (dir) => replaceOnce(dir, VIEW, '<div class="conformance-pass__inner container">', '<div class="conformance-pass__inner container"><i style="background-image: url({{ $ctaUrl }})"></i>')],
  [36, 'a URL printed through {{ }}', (dir) => replaceOnce(dir, VIEW, 'href="{!! esc_url($ctaUrl) !!}"', 'href="{{ $ctaUrl }}"')],
  [37, 'a hard-coded rel', (dir) => replaceOnce(dir, VIEW, 'href="{!! esc_url($ctaUrl) !!}"', 'href="{!! esc_url($ctaUrl) !!}" rel="noopener noreferrer"')],
  [38, 'target=_blank with no flag', (dir) => replaceOnce(dir, VIEW, '@if ($ctaNew) target="_blank" @endif', 'target="_blank"')],
  [38, 'target is printed from an expression', (dir) => replaceOnce(dir, VIEW, '@if ($ctaNew) target="_blank" @endif', 'target="{{ $ctaNew ? \'_blank\' : \'_self\' }}"')],
  [39, 'the view never prints the ground class', (dir) => replaceOnce(dir, VIEW, '{{ $groundClass }} ', '')],
  [40, 'save renders markup', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, 'save: () => null', 'save: () => <div />')],
  [41, 'EntranceControl is not mounted', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, '<EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />', '')],
  [42, 'the preset is read without ?.', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, 'metadata.attributes.entrance?.default', 'metadata.attributes.entrance.default')],
  [43, 'a panel opens by default', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, "<PanelBody title={__('Items', '__TEXT_DOMAIN__')} initialOpen={false}>", "<PanelBody title={__('Items', '__TEXT_DOMAIN__')}>")],
  [45, 'the ground select has no Default', (dir) => {
    replaceOnce(dir, `${BLOCK}/block.jsx`, "import { PanelBody } from '@wordpress/components';", "import { PanelBody, SelectControl } from '@wordpress/components';\nimport { GROUND_OPTIONS } from '../components/backend/ground.js';");
    replaceOnce(dir, `${BLOCK}/block.jsx`, '<GroundSelect value={ground} onChange={(value) => setAttributes({ ground: value })} />', "<SelectControl label={__('Ground', '__TEXT_DOMAIN__')} value={ground} options={GROUND_OPTIONS} onChange={(value) => setAttributes({ ground: value })} />");
  }],
  [46, 'the canvas root has no shared outline', (dir) => {
    replaceOnce(dir, `${BLOCK}/block.jsx`, '<EditorSection slug="conformance-pass" ground={ground} sectionDivider={sectionDivider} entrance={entrance}>', '<section className="conformance-pass-editor">');
    replaceOnce(dir, `${BLOCK}/block.jsx`, '</EditorSection>', '</section>');
  }],
  [47, 'mounting writes an attribute', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, 'const entrance = resolveEntrance', 'if (!attributes.marker) setAttributes({ marker: 1 });\n    const entrance = resolveEntrance')],
  [48, 'the canvas has a navigating anchor', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, '<CtaPreview', '<a href="https://example.com">x</a><CtaPreview')],
  [49, 'the canvas draws a btn as a components-button', (dir) => {
    replaceOnce(dir, `${BLOCK}/block.jsx`, "import { PanelBody } from '@wordpress/components';", "import { Button, PanelBody } from '@wordpress/components';");
    replaceOnce(dir, `${BLOCK}/block.jsx`, '<CtaPreview', '<Button className="btn btn-primary">x</Button><CtaPreview');
  }],
  [50, 'a role=button span has no keyboard handler', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, '<CtaPreview', '<span role="button">x</span><CtaPreview')],
  [51, 'a heading field has no type tier', (dir) => {
    replaceOnce(dir, `${BLOCK}/block.jsx`, '<InlineHeading', '<InlineField');
    replaceOnce(dir, `${BLOCK}/block.jsx`, 'tier="section"', 'className="heading-2"');
    replaceOnce(dir, `${BLOCK}/block.jsx`, 'headingClass="heading-2"', '');
  }],
  [52, 'a repeated field has no name', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, "label={__('Item heading', '__TEXT_DOMAIN__')}", '')],
  [53, 'an image selection stores a URL', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, "setAttributes({ imageId: Number(media.id) || 0, imageUrl: '' })", 'setAttributes({ imageUrl: media.url })')],
  [54, 'the canvas uses MediaUpload directly', (dir) => {
    replaceOnce(dir, `${BLOCK}/block.jsx`, "import { InspectorControls, useBlockProps } from '@wordpress/block-editor';", "import { InspectorControls, MediaUpload, useBlockProps } from '@wordpress/block-editor';");
    replaceOnce(dir, `${BLOCK}/block.jsx`, '<CtaPreview', '<MediaUpload onSelect={() => {}} render={() => <span>x</span>} /><CtaPreview');
  }],
  [55, 'the inspector uses a Tailwind class', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, '<GroundSelect', '<div className="flex gap-4">x</div><GroundSelect')],
  [56, 'a string uses another text domain', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, "__('Heading', '__TEXT_DOMAIN__')", "__('Heading', 'sage')")],
  [56, 'an inspector title is a bare string', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, "title={__('Items', '__TEXT_DOMAIN__')}", 'title="Items"')],
  [56, 'an _e call uses another text domain', (dir) => replaceOnce(dir, VIEW, '<div class="conformance-pass__inner container">', "<div class=\"conformance-pass__inner container\"><p>{{ esc_html_e('Hi', 'sage') }}</p>")],
  [57, 'a placeholder is sample copy', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, "__('Write a heading', '__TEXT_DOMAIN__')", "__('Your heading', '__TEXT_DOMAIN__')")],
  [58, 'the test never renders the block', (dir) => replaceOnce(dir, `${BLOCK}/block.test.mjs`, "import { renderBlock, registerDirective, callPhp, openingTag } from '../../../../../../render-harness.mjs';", '')],
  [59, 'no test names hostile input', (dir) => replaceOnce(dir, `${BLOCK}/block.test.mjs`, 'a hostile heading and CTA URL stay escaped', 'a heading and CTA URL')],
  [60, 'the test asserts on block.php text', (dir) => replaceOnce(dir, `${BLOCK}/block.test.mjs`, '// --- Render half ---', "// --- Render half ---\nimport { readFileSync } from 'node:fs';\nreadFileSync(new URL('./block.php', import.meta.url), 'utf8');")],
  ['VIEW-4-empty', 'an empty block renders a section', (dir) => {
    replaceOnce(dir, VIEW, '@if ($hasContent)\n<section', '<section');
    replaceOnce(dir, VIEW, '</section>\n@endif', '</section>');
  }],
  ['PHP-2-hostile', 'the heading is passed through unsanitized and printed raw', (dir) => {
    replaceOnce(dir, `${BLOCK}/block.php`, "'heading' => sanitize_text_field($attributes['heading'] ?? '')", "'heading' => $attributes['heading'] ?? ''");
    replaceOnce(dir, VIEW, '{{ $heading }}', '{!! $heading !!}');
  }],
  ['PHP-2-hostile', 'the CTA url is neither sanitized nor escaped', (dir) => {
    replaceOnce(dir, `${BLOCK}/block.php`, '    ...BlockAttributes::cta($attributes),\n', "    'ctaText' => sanitize_text_field($attributes['ctaText'] ?? ''),\n    'ctaUrl' => $attributes['ctaLink']['url'] ?? '',\n    'ctaNew' => false,\n    'ctaIconClass' => '',\n");
    replaceOnce(dir, VIEW, 'href="{!! esc_url($ctaUrl) !!}"', 'href="{!! $ctaUrl !!}"');
  }],
  ['PHP-2-hostile', 'a repeater entry is printed raw', (dir) => {
    replaceOnce(dir, `${BLOCK}/block.php`, "fn (array $item) => ['heading' => sanitize_text_field($item['heading'] ?? '')],", "fn (array $item) => ['heading' => $item['heading'] ?? ''],");
    replaceOnce(dir, VIEW, "{{ $item['heading'] }}", "{!! $item['heading'] !!}");
  }],
  ['PHP-10', 'an entrance part is a fixed number', (dir) => replaceOnce(dir, VIEW, "@entrancePart($parts['heading'])", '@entrancePart(0)')],
  ['GROUND-4', 'the root hard-codes a background class', (dir) => replaceOnce(dir, VIEW, 'class="conformance-pass {{ $groundClass }}', 'class="conformance-pass bg-surface {{ $groundClass }}')],
  ['A11Y-6', 'rich copy is printed without the new-tab helper', (dir) => replaceOnce(dir, `${BLOCK}/block.php`, "BlockAttributes::newTabHints(wp_kses_post($attributes['body'] ?? ''))", "wp_kses_post($attributes['body'] ?? '')")],
  ['A11Y-6', 'a new-tab link has no hint', (dir) => replaceOnce(dir, VIEW, "@include('partials.new-tab-hint', ['new' => $ctaNew])", '')],
  ['A11Y-6', 'a second new-tab link shares the first one\'s hint', (dir) => replaceOnce(dir, VIEW, '    @endif\n  </div>\n</section>', '      <a class="conformance-pass__more" href="{!! esc_url($ctaUrl) !!}" @if ($ctaNew) target="_blank" @endif>{{ $ctaText }}</a>\n    @endif\n  </div>\n</section>')],
  ['EDITOR-RENDER', 'block.jsx imports a package the bundler cannot find', (dir) => replaceOnce(dir, `${BLOCK}/block.jsx`, "import { registerBlockType } from '@wordpress/blocks';", "import { registerBlockType } from '@wordpress/blocks';\nimport missing from '@wordpress/not-a-package';")],
];

for (const [rule, what, edit] of BREAKS) {
  test(`${rule} fails when ${what}`, async () => {
    const dir = copyFixture();
    try {
      edit(dir);
      const { failures } = await run(dir, [rule]);
      assert.ok(failures.some((failure) => failure.n === rule), `expected rule ${rule} to fail, got: ${failures.map(formatFailure).join(' | ') || 'no failures'}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('every rule with a check has a case that breaks it (the project rules have their own below)', () => {
  const covered = new Set(BREAKS.map(([rule]) => rule));
  const missing = RULES.filter((rule) => rule.scope === 'block' && !covered.has(rule.n)).map((rule) => rule.n);

  assert.deepEqual(missing, []);
});

test('23 names the sample keys when the block draws nothing from sample content', async () => {
  const dir = copyFixture();
  try {
    replaceOnce(dir, VIEW, '@if ($hasContent)\n<section', '@if (false)\n<section');
    const { failures } = await run(dir, [23]);
    const message = failures.find((failure) => failure.n === 23)?.message ?? '';

    assert.match(message, /no \.conformance-pass root/);
    assert.match(message, /The sample content fills heading, subtitle, eyebrow, body, name, label, title, text, caption, linkText, link, imageId/);
    assert.match(message, /question/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a block.json that is not JSON fails rule 6 instead of crashing the run', async () => {
  const dir = copyFixture();
  try {
    write(dir, `${BLOCK}/block.json`, '{ nope');
    const { failures } = await run(dir, [6, 9, 27]);
    assert.ok(failures.some((failure) => failure.n === 6 && /not valid JSON/.test(failure.message)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Project-wide rules ────────────────────────────────────────────────────

async function withTheme(files, check) {
  const dir = mkdtempSync(join(fixtures, '.run-'));
  try {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, file)), { recursive: true });
      writeFileSync(join(dir, file), text);
    }

    return await check(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('5 fails for a test file inside resources/images or resources/fonts', () =>
  withTheme({ 'resources/images/icon.test.mjs': '', 'resources/fonts/font.test.mjs': '' }, async (dir) => {
    const failures = await checkProject({ themeRoot: dir });
    assert.equal(failures.filter((failure) => failure.n === 5).length, 2);
  }));

test('29 fails for a vendor enqueue outside block.php, and allows the theme handles, block.php and admin-only hooks', () =>
  withTheme(
    {
      'app/Bad.php': "<?php\nwp_enqueue_script('swiper', 'x.js');\nwp_enqueue_style(\n  'swiper-css', 'x.css');\n",
      'app/Good.php': "<?php\nwp_enqueue_script('app', 'app.js');\nwp_enqueue_style('editor', 'editor.css');\n",
      'app/Admin.php': "<?php\nadd_action('admin_head', function () {\n  foreach ($deps as $dep) { wp_enqueue_script($dep); }\n});\nadd_action('admin_enqueue_scripts', fn () => wp_enqueue_style('a', 'a.css'));\nadd_action('enqueue_block_editor_assets', function () { wp_enqueue_script('b', 'b.js'); });\n",
      'app/Front.php': "<?php\nadd_action('wp_enqueue_scripts', function () { wp_enqueue_script('c', 'c.js'); });\nadd_action('admin_head', function () { echo 1; });\nwp_enqueue_script('d', 'd.js');\n",
      'app/Editor.php': "<?php\nwp_enqueue_style('acme-editor-admin', 'admin.css');\n",
      'resources/blocks/a/block.php': "<?php\nwp_enqueue_script('swiper', 'x.js');\n",
    },
    async (dir) => {
      const failures = (await checkProject({ themeRoot: dir })).filter((failure) => failure.n === 29);
      const files = failures.map((failure) => failure.message.match(/app[\\/](\w+)\.php/)[1]).sort();
      // Admin-only hooks stay out of the rule; the front-end hook, a bare call
      // after an admin callback, and the retired *-editor-admin handle don't.
      assert.deepEqual(files, ['Bad', 'Bad', 'Editor', 'Front', 'Front']);
    },
  ));

test('a clean theme passes the project rules', () =>
  withTheme({ 'resources/blocks/components/backend/Good.jsx': "import React from 'react';\n", 'app/Good.php': "<?php\nwp_enqueue_script('app', 'a.js');\n" }, async (dir) => {
    assert.deepEqual(await checkProject({ themeRoot: dir }), []);
  }));

// ── Opting out ────────────────────────────────────────────────────────────

test('a skip with a reason silences its rule and is listed', async () => {
  const dir = copyFixture();
  try {
    replaceOnce(dir, `${BLOCK}/block.php`, 'BlockAttributes::divider($attributes)', "$attributes['sectionDivider'] ?? 'none'");
    editJson(dir, `${BLOCK}/block.json`, (json) => { json.__conformance = { skip: { 'PHP-8': 'a bespoke divider, see the ticket' } }; });
    const { failures, skipped } = await run(dir, [26]);

    assert.deepEqual(failures, []);
    assert.deepEqual(skipped, [{ rule: 'PHP-8', reason: 'a bespoke divider, see the ticket' }]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a skip without a reason fails, and does not silence the rule', async () => {
  const dir = copyFixture();
  try {
    replaceOnce(dir, `${BLOCK}/block.php`, 'BlockAttributes::divider($attributes)', "$attributes['sectionDivider'] ?? 'none'");
    editJson(dir, `${BLOCK}/block.json`, (json) => { json.__conformance = { skip: { 'PHP-8': '  ', 'JSON-1': 42 } }; });
    const { failures, skipped } = await run(dir, [26]);

    assert.deepEqual(skipped, []);
    assert.equal(failures.filter((failure) => failure.rule === 'CONFORMANCE-SKIP').length, 2);
    assert.ok(failures.some((failure) => failure.n === 26));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a skip that names no rule fails, so a typo cannot hide a problem', async () => {
  const dir = copyFixture();
  try {
    editJson(dir, `${BLOCK}/block.json`, (json) => { json.__conformance = { skip: { 'PHP-88': 'typo' } }; });
    const { failures } = await run(dir, [26]);

    assert.ok(failures.some((failure) => failure.rule === 'CONFORMANCE-SKIP' && /PHP-88/.test(failure.message)));
    assert.ok(RULE_IDS.has('PHP-8') && !RULE_IDS.has('PHP-88'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the fixture copy leaves nothing behind', () => {
  assert.equal(existsSync(join(fixtures, '.run-')), false);
});

test('a warning rule reports at level warn, and an error rule at level error', async () => {
  const dir = copyFixture();
  try {
    // PHP-10 is a warning rule, FILE-2 an error rule.
    replaceOnce(dir, VIEW, "@entrancePart($parts['heading'])", '@entrancePart(0)');
    const warned = await run(dir);
    assert.ok(warned.failures.some((f) => f.rule === 'PHP-10' && f.level === 'warn'));
    rmSync(join(dir, BLOCK, 'block.jsx'));
    const { failures } = await run(dir);
    assert.ok(failures.some((f) => f.rule === 'FILE-2' && f.level === 'error'));
    assert.ok(failures.every((f) => f.level === (WARN_RULES.has(f.rule) ? 'warn' : 'error')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

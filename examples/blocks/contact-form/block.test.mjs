import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { renderBlock, registerDirective, callPhp, openingTag } from '../../../theme/scripts/render-harness.mjs';
import { executeBundle } from '../../../theme/scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../theme/scripts/wp-editor-stubs.mjs';
import { APP_AUTOLOAD } from '../../../theme/app/Blocks/test-support.mjs';
import { exampleEnv, SAMPLE_CONTENT_TYPES } from '../../test-support.mjs';

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

// No WordPress hook system in the harness; block.php's own add_filter/
// apply_filters/remove_filter calls need one only for the Gravity Forms test.
const HOOKS = `
function add_filter($tag, $cb) { $GLOBALS['__filters'][$tag][] = $cb; }
function remove_filter($tag, $cb) { array_pop($GLOBALS['__filters'][$tag]); }
function apply_filters($tag, $value, ...$args) {
    foreach ($GLOBALS['__filters'][$tag] ?? [] as $cb) { $value = $cb($value, ...$args); }
    return $value;
}
`;
const GRAVITY_FORMS = `
class GFForms {}
function gravity_form($id) {
    $tone = apply_filters('__PREFIX__/form_button_tone', 'none');
    return '<div class="gform_wrapper" data-tone="' . $tone . '">Form ' . (int) $id . '</div>';
}
`;
const DO_SHORTCODE = `function do_shortcode($s) { return '<div class="shortcode-output">' . esc_html($s) . '</div>'; }`;

// BlockAttributes::grounds() always calls get_template_directory(), even for
// an empty ground, so every render needs it defined. A directory with no
// kit.config.json degrades to [] (no configured grounds), the same as
// BlockAttributes.php itself does.
const env = exampleEnv({ functions: [DO_SHORTCODE] });

function withGrounds(grounds, extraFunctions = []) {
  const root = mkdtempSync(join(tmpdir(), 'contact-form-grounds-'));
  writeFileSync(join(root, 'kit.config.json'), JSON.stringify({ grounds }));

  return {
    env: exampleEnv({ templateDirectory: root, functions: [DO_SHORTCODE, ...extraFunctions] }),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test('an empty block renders nothing', () => {
  assert.equal(renderBlock('contact-form', {}, [], env).trim(), '');
});

test('a heading alone renders the section with no form, no image, no ground class', () => {
  const html = renderBlock('contact-form', { heading: 'Hello' }, [], env);
  const tag = openingTag(html, 'contact-form');
  assert.ok(tag);
  assert.doesNotMatch(tag, /ground-/);
  assert.doesNotMatch(html, /contact-form__form/);
  assert.doesNotMatch(html, /contact-form__media/);
});

test('the padding default (112/56, no horizontal) resolves to py-14/md:py-28/px-0', () => {
  const html = renderBlock('contact-form', { heading: 'Hello' }, [], env);
  const tag = openingTag(html, 'contact-form');
  assert.match(tag, /\bpy-14\b/);
  assert.match(tag, /\bmd:py-28\b/);
  assert.match(tag, /\bpx-0\b/);
  assert.match(tag, /lg:px-0/);
});

test('a heading and intro render, intro allows trusted HTML', () => {
  const html = renderBlock('contact-form', { heading: 'Hello', intro: '<strong>Hi</strong>' }, [], env);
  assert.match(html, /<h2 class="contact-form__heading heading-1"[^>]*>Hello<\/h2>/);
  assert.match(html, /<strong>Hi<\/strong>/);
});

// M5: a plain "Hello" heading would still pass if sanitize_text_field()/{{ }}
// were dropped — hostile input is the only input that actually exercises escaping.
test('a hostile heading strips its tag and escapes the rest, never breaking the markup', () => {
  const html = renderBlock('contact-form', { heading: '<b>"x"&</b>' }, [], env);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /<h2 class="contact-form__heading heading-1"[^>]*>&quot;x&quot;&amp;<\/h2>/);
});

test('an image ID renders through wp_get_attachment_image with the focal point as inline style', () => {
  const html = renderBlock('contact-form', { imageId: 5, imagePosition: 'top-left' }, [], env);
  assert.match(html, /contact-form__media/);
  assert.match(html, /object-position: left top/);
});

test('an image URL fallback (no ID) renders a plain, escaped <img>', () => {
  const html = renderBlock('contact-form', { imageUrl: 'https://example.com/a.jpg' }, [], env);
  assert.match(html, /<img class="contact-form__img" src="https:\/\/example\.com\/a\.jpg"/);
});

test('mediaPosition left adds the modifier class, and an unknown side falls back to right', () => {
  const left = renderBlock('contact-form', { imageUrl: 'https://example.com/a.jpg', mediaPosition: 'left' }, [], env);
  assert.match(openingTag(left, 'contact-form'), /contact-form--media-left/);

  const odd = renderBlock('contact-form', { imageUrl: 'https://example.com/a.jpg', mediaPosition: 'sideways' }, [], env);
  assert.doesNotMatch(openingTag(odd, 'contact-form'), /contact-form--media-left/);
});

test('an unconfigured ground prints no ground class', () => {
  const html = renderBlock('contact-form', { heading: 'Hello', ground: 'not-configured' }, [], env);
  assert.doesNotMatch(html, /ground-not-configured/);
});

test('a configured ground prints its class, and a dark ground adds on-dark', () => {
  const { env: groundEnv, cleanup } = withGrounds([{ name: 'ink', token: '--color-ink', light: false }]);

  const html = renderBlock('contact-form', { heading: 'Hello', ground: 'ink' }, [], groundEnv);
  const tag = openingTag(html, 'contact-form');
  assert.match(tag, /\bground-ink\b/);
  assert.match(tag, /\bon-dark\b/);

  cleanup();
});

test('with no Gravity Forms and no shortcode, no form section renders', () => {
  const html = renderBlock('contact-form', { formId: 5 }, [], env);
  assert.doesNotMatch(html, /contact-form__form/);
});

test('a fallback shortcode renders when Gravity Forms is unavailable', () => {
  const html = renderBlock('contact-form', { formShortcode: '[contact-form-7]' }, [], env);
  assert.match(html, /contact-form__form/);
  assert.match(html, /shortcode-output/);
});

test('a form ID with Gravity Forms active renders the form, and an unconfigured ground defaults to the on-light tone', () => {
  // BlockAttributes::isLightGround() reads true for any ground that isn't in
  // kit.config.json's grounds array, including '' — no grounds configured
  // (this test's fixture-root env) means every ground reads as the normal,
  // light page (H2: only a ground actually configured light: false is dark).
  const gfEnv = { ...env, functions: [...env.functions, HOOKS, GRAVITY_FORMS] };

  const html = renderBlock('contact-form', { formId: 7, ground: '' }, [], gfEnv);
  assert.match(html, /data-tone="on-light"/);
  assert.match(html, />Form 7</);
});

test('a light ground renders the form with the on-light tone', () => {
  const { env: gfEnv, cleanup } = withGrounds([{ name: 'paper', token: '--color-surface', light: true }], [
    HOOKS,
    GRAVITY_FORMS,
  ]);

  const html = renderBlock('contact-form', { formId: 7, ground: 'paper' }, [], gfEnv);
  assert.match(html, /data-tone="on-light"/);

  cleanup();
});

test('a dark ground renders the form with the on-dark tone', () => {
  const { env: gfEnv, cleanup } = withGrounds([{ name: 'ink', token: '--color-ink', light: false }], [
    HOOKS,
    GRAVITY_FORMS,
  ]);

  const html = renderBlock('contact-form', { formId: 7, ground: 'ink' }, [], gfEnv);
  assert.match(html, /data-tone="on-dark"/);

  cleanup();
});

test('a form ID takes priority over the fallback shortcode when Gravity Forms is active', () => {
  const gfEnv = { ...env, functions: [...env.functions, HOOKS, GRAVITY_FORMS] };
  const html = renderBlock('contact-form', { formId: 7, formShortcode: '[contact-form-7]' }, [], gfEnv);
  assert.match(html, />Form 7</);
  assert.doesNotMatch(html, /shortcode-output/);
});

test('entrance parts are numbered across heading, intro, form and media in that order', () => {
  const html = renderBlock(
    'contact-form',
    { heading: 'Hi', intro: 'Copy', imageUrl: 'https://example.com/a.jpg', formShortcode: '[x]' },
    [],
    env,
  );
  assert.match(html, /<h2[^>]*data-entrance-part>Hi<\/h2>/);
  assert.match(html, /class="contact-form__intro" data-entrance-part style="--e-i: 1"/);
  assert.match(html, /class="contact-form__form" data-entrance-part style="--e-i: 2"/);
  assert.match(html, /class="contact-form__media" data-entrance-part style="--e-i: 3"/);
});

// --- Editor half ---

// block.jsx imports ground.js, which imports kit.config.json directly; this
// kit repo ships no such file (a real project's kit-setup.mjs writes it), so
// the bundle needs the same stub ground.test.mjs uses. The canvas also renders
// AttachmentImageControl, ParagraphsField and the form list hook, which need
// the media store, the selection store, rich-text helpers and api-fetch.
const KIT_CONFIG_STUB = `export default { grounds: [] };`;
const defaults = new Map(wpEditorStubs());
const EDITOR_OVERRIDES = {
  '@wordpress/element': `${defaults.get('@wordpress/element')}`,
  '@wordpress/i18n': `
export function __(value) { return value; }
export function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%d|%s/g, () => args[i++]);
}
`,
  '@wordpress/block-editor': `${defaults.get('@wordpress/block-editor')}
export function LinkControl() { return null; }
export const store = 'core/block-editor';
export function useBlockEditContext() { return { clientId: 'test-1' }; }
`,
  '@wordpress/components': `${defaults.get('@wordpress/components')}
export function Popover(props) { return React.createElement('div', null, props.children); }
export function Spinner() { return React.createElement('span', { role: 'status' }); }
`,
  '@wordpress/data': `
export function useSelect(mapSelect) {
  const selectors = {
    getMedia: (id) => globalThis.__coreMedia?.[id],
    isResolving: (_selector, [id]) => Boolean(globalThis.__coreResolving?.[id]),
    getSelectionStart: () => ({ offset: 0 }),
    getSelectionEnd: () => ({ offset: 0 }),
  };

  return typeof mapSelect === 'function' ? mapSelect(() => selectors) : selectors;
}
export function useDispatch() { return { selectionChange: () => {} }; }
`,
  '@wordpress/rich-text': `
export function create({ html }) { return { html, text: (html || '').replace(/<[^>]*>/g, ''), start: 0, end: 0 }; }
export function split(value) { return [{ html: value.html.slice(0, value.start) }, { html: value.html.slice(value.end) }]; }
export function toHTMLString({ value }) { return value.html; }
`,
};
const EXTRA = [
  ['@wordpress/api-fetch', 'export default function apiFetch() { return Promise.resolve(null); }'],
  ['kit-config-stub', KIT_CONFIG_STUB],
];

test('the editor bundle registers the block and mounts EntranceControl on real attributes', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  globalThis.__coreResolving = {};
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, [...wpEditorStubs(EDITOR_OVERRIDES), ...EXTRA], 'ContactFormEditorBundle', {
    'kit.config.json': 'kit-config-stub',
  });

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  assert.equal(typeof settings.edit, 'function');

  const writes = [];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Preview', intro: 'Copy', entrance: { type: 'fade' } },
      setAttributes: (patch) => writes.push(patch),
      clientId: 'contact-form-1',
    }),
  );

  assert.deepEqual(writes, []);
  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Entrance animation'), true);

  // M1: EntranceControl's Preview button looks for a [data-entrance] canvas
  // root — without it, Preview does nothing on this block's canvas.
  assert.match(markup, /data-entrance="fade"/);
});

test('the Form panel offers the shortcode while no Gravity form is chosen, and the image can be removed', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  globalThis.__coreResolving = {};
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, [...wpEditorStubs(EDITOR_OVERRIDES), ...EXTRA], 'ContactFormEditorBundleForm', {
    'kit.config.json': 'kit-config-stub',
  });

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const render = (attributes) =>
    renderToStaticMarkup(
      React.createElement(settings.edit, { attributes: { entrance: {}, ...attributes }, setAttributes() {}, isSelected: false, clientId: 'contact-form-2' }),
    );

  const noForm = render({ heading: 'Hi', imageId: 9 });
  assert.match(noForm, /Form shortcode/);
  assert.match(noForm, /aria-label="Remove image"/);
  assert.match(noForm, /Choose a form in the Form panel\./);

  assert.doesNotMatch(render({ heading: 'Hi', formId: 5 }), /Form shortcode/);
  assert.match(render({ heading: 'Hi', formShortcode: '[cf7 id="1"]' }), /Shortcode form loads here/);
});

// The saved form can't be listed (the Gravity Forms REST API is off, or this
// role can't edit forms), so the select is hidden. The editor must still be
// able to let go of the saved form.
test('when the form list is unavailable, a saved form can be replaced by a shortcode', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  globalThis.__coreResolving = {};
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  const unavailable = ['forms-unavailable-stub', "export function useGravityForms() { return { status: 'unavailable', forms: [], fields: null }; }"];
  await executeBundle(entry, [...wpEditorStubs(EDITOR_OVERRIDES), ...EXTRA, unavailable], 'ContactFormEditorBundleUnavailable', {
    'kit.config.json': 'kit-config-stub',
    'useGravityForms.js': 'forms-unavailable-stub',
  });

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const writes = [];
  const render = (attributes) => {
    globalThis.__wpEditorTest.buttons.length = 0;
    writes.length = 0;

    return renderToStaticMarkup(
      React.createElement(settings.edit, { attributes: { entrance: {}, ...attributes }, setAttributes: (patch) => writes.push(patch), isSelected: false, clientId: 'contact-form-3' }),
    );
  };
  const useShortcode = () => globalThis.__wpEditorTest.buttons.find((button) => /Use a shortcode instead/.test(String(button.children)));

  assert.match(render({ heading: 'Hi', formId: 5 }), /Gravity Forms REST API/);
  assert.equal(typeof useShortcode()?.onClick, 'function');
  useShortcode().onClick();
  assert.deepEqual(writes, [{ formId: 0 }]);

  render({ heading: 'Hi', formId: 0 });
  assert.equal(useShortcode(), undefined, 'with no saved form there is nothing to let go of');
});


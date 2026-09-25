import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

// sanitize_email isn't in the shared harness's WP_ESCAPING; a real address
// (no angle brackets, one @) round-trips through it unchanged, which is all
// these tests need.
const SANITIZE_EMAIL = `function sanitize_email($v) { return trim((string) $v); }`;

// wp_script_is/wp_enqueue_script aren't in the shared harness; the block
// reads the registered handle (not just a key) to decide whether to draw a
// map, so every test controls it explicitly.
const scriptRegistry = (registered) => `
$GLOBALS['__enqueued'] = [];
function wp_script_is($handle, $list = 'registered') { return in_array($handle, ${JSON.stringify(registered)}, true); }
function wp_enqueue_script($handle) { $GLOBALS['__enqueued'][] = $handle; }
`;

const noMapEnv = exampleEnv({ functions: [SANITIZE_EMAIL, scriptRegistry([])] });
const withMapEnv = exampleEnv({ functions: [SANITIZE_EMAIL, scriptRegistry(['__PREFIX__-google-maps'])] });

test('an empty block renders nothing, with or without a map key', () => {
  assert.equal(renderBlock('location', {}, [], noMapEnv).trim(), '');
  assert.equal(renderBlock('location', {}, [], withMapEnv).trim(), '');
});

test('a block with only a city renders no groups, no map, no ground class', () => {
  const html = renderBlock('location', { city: 'Columbus' }, [], noMapEnv);
  const tag = openingTag(html, 'location');
  assert.ok(tag);
  assert.doesNotMatch(tag, /ground-/);
  assert.match(html, /location__city/);
  assert.doesNotMatch(html, /location__group/);
  assert.doesNotMatch(html, /location__media/);
});

test('the padding default (112/56, no horizontal) resolves to py-14/md:py-28/px-0', () => {
  const html = renderBlock('location', { city: 'Columbus' }, [], noMapEnv);
  const tag = openingTag(html, 'location');
  assert.match(tag, /\bpy-14\b/);
  assert.match(tag, /\bmd:py-28\b/);
  assert.match(tag, /\bpx-0\b/);
  assert.match(tag, /lg:px-0/);
});

test('office and contact details render with their icons', () => {
  const html = renderBlock(
    'location',
    {
      city: 'Columbus',
      officeLabel: 'HQ',
      addressLine1: '123 Main St',
      addressLine2: 'Suite 400',
      phone: '555-0100',
      fax: '555-0101',
      contactName: 'Jamie Rivera',
      contactRole: 'Office Manager',
      contactPhone: '555-0102',
      email: 'jamie@example.com',
    },
    [],
    noMapEnv,
  );

  assert.match(html, /<h2 class="location__city heading-2"[^>]*>Columbus<\/h2>/);
  assert.match(html, /location__icon--location-marker/);
  assert.match(html, /123 Main St/);
  assert.match(html, /location__line--indent[^"]*"[^>]*>Suite 400/);
  assert.match(html, /location__icon--phone/);
  assert.match(html, /location__icon--newspaper/);
  assert.match(html, /location__icon--user-circle/);
  assert.match(html, /location__icon--mail/);
  assert.match(html, /href="mailto:jamie@example\.com"/);
});

test('a directions link falls back to a Google Maps search built from the address', () => {
  const html = renderBlock(
    'location',
    { ctaText: 'Get Directions', addressLine1: '123 Main St', addressLine2: 'Columbus, OH' },
    [],
    noMapEnv,
  );
  assert.match(html, /location__cta btn btn-primary/);
  // esc_url() HTML-encodes "&" to "&#038;"; printed with {!! !!} so Blade's
  // own {{ }} doesn't re-encode it into "&amp;#038;" (see blade-standards).
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/dir\/\?api=1&#038;destination=123%20Main%20St%20Columbus%2C%20OH"/);
});

test('an explicit CTA link wins over the address fallback', () => {
  const html = renderBlock(
    'location',
    {
      ctaText: 'Get Directions',
      addressLine1: '123 Main St',
      ctaLink: { url: 'https://example.com/directions', opensInNewTab: true },
    },
    [],
    noMapEnv,
  );
  assert.match(html, /href="https:\/\/example\.com\/directions"/);
  assert.match(html, /target="_blank"/);
});

// M5: plain "Columbus"/example.com URLs never exercise escaping — hostile input does.
test('a hostile city heading and CTA URL are escaped, never breaking the markup', () => {
  const html = renderBlock(
    'location',
    { city: '<b>"x"&</b>', ctaText: 'Get Directions', ctaLink: { url: 'https://x.test/?a=1&b=2"' } },
    [],
    noMapEnv,
  );
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /<h2 class="location__city heading-2"[^>]*>&quot;x&quot;&amp;<\/h2>/);
  assert.match(html, /href="https:\/\/x\.test\/\?a=1&#038;b=2"/);
});

test('with no coordinates, no map renders even when the script is registered', () => {
  const html = renderBlock('location', {}, [], withMapEnv);
  assert.doesNotMatch(html, /location__media/);
});

test('with coordinates but no registered script, no map renders', () => {
  const html = renderBlock('location', { latitude: '40.0', longitude: '-83.0' }, [], noMapEnv);
  assert.doesNotMatch(html, /location__media/);
});

test('with coordinates and a registered script, the map renders and is enqueued', () => {
  const html = renderBlock(
    'location',
    { city: 'Columbus', addressLine1: '123 Main St', latitude: '40.0', longitude: '-83.0', zoom: 12 },
    [],
    withMapEnv,
  );
  assert.match(html, /location__media/);
  assert.match(html, /data-lat="40"/);
  assert.match(html, /data-lng="-83"/);
  assert.match(html, /data-zoom="12"/);
  assert.match(html, /Map of 123 Main St/);
});

test('out-of-range coordinates are dropped, so no map renders', () => {
  const html = renderBlock('location', { latitude: '999', longitude: '-83.0' }, [], withMapEnv);
  assert.doesNotMatch(html, /location__media/);
});

test('with no address, the map label falls back to the city', () => {
  const html = renderBlock('location', { city: 'Columbus', latitude: '40.0', longitude: '-83.0' }, [], withMapEnv);
  assert.match(html, /Map of Columbus/);
});

test('with no city or address, the label reads as a generic office map', () => {
  const html = renderBlock('location', { latitude: '40.0', longitude: '-83.0' }, [], withMapEnv);
  assert.match(html, /Office location map/);
});

test('sectionDivider prints the above/below border and rejects an unknown value', () => {
  const above = renderBlock('location', { city: 'Columbus', sectionDivider: 'above' }, [], noMapEnv);
  assert.match(openingTag(above, 'location'), /border-t-2/);

  const below = renderBlock('location', { city: 'Columbus', sectionDivider: 'below' }, [], noMapEnv);
  assert.match(openingTag(below, 'location'), /border-b-2/);

  const bad = renderBlock('location', { city: 'Columbus', sectionDivider: 'sideways' }, [], noMapEnv);
  assert.doesNotMatch(openingTag(bad, 'location'), /border-t-2|border-b-2/);
});

test('an unconfigured ground prints no ground class', () => {
  const html = renderBlock('location', { city: 'Columbus', ground: 'not-configured' }, [], noMapEnv);
  assert.doesNotMatch(html, /ground-not-configured/);
});

test('a configured dark ground prints its class and on-dark', () => {
  const root = mkdtempSync(join(tmpdir(), 'location-grounds-'));
  writeFileSync(join(root, 'kit.config.json'), JSON.stringify({ grounds: [{ name: 'ink', token: '--color-ink', light: false }] }));
  const env = exampleEnv({ templateDirectory: root, functions: [SANITIZE_EMAIL, scriptRegistry([])] });

  const html = renderBlock('location', { city: 'Columbus', ground: 'ink' }, [], env);
  const tag = openingTag(html, 'location');
  assert.match(tag, /\bground-ink\b/);
  assert.match(tag, /\bon-dark\b/);

  rmSync(root, { recursive: true, force: true });
});

test('entrance parts are numbered across the office group, contact group, CTA and map, in that order', () => {
  const html = renderBlock(
    'location',
    {
      addressLine1: '123 Main St',
      contactName: 'Jamie Rivera',
      ctaText: 'Get Directions',
      ctaLink: { url: 'https://example.com' },
      latitude: '40.0',
      longitude: '-83.0',
    },
    [],
    withMapEnv,
  );
  assert.match(html, /class="location__group" data-entrance-part>/);
  assert.match(html, /class="location__group" data-entrance-part style="--e-i: 1">/);
  assert.match(html, /location__cta btn btn-primary[^"]*"\s+href="[^"]*"\s+data-entrance-part style="--e-i: 2"/);
  assert.match(html, /class="location__media[^"]*" data-entrance-part style="--e-i: 3">/);
});

// --- Editor half ---

const KIT_CONFIG_STUB = `export default { grounds: [] };`;

// block.jsx renders ActionEditor, which renders the real LinkPicker.jsx —
// both need the same @wordpress/element (useId), @wordpress/i18n (sprintf)
// and @wordpress/block-editor (LinkControl) surface LinkPicker.test.mjs and
// ActionEditor.test.mjs stub, on top of the default block-editor exports
// block.jsx's own InspectorControls/useBlockProps rely on.
const defaultElement = new Map(wpEditorStubs()).get('@wordpress/element');
const defaultBlockEditor = new Map(wpEditorStubs()).get('@wordpress/block-editor');
const defaultComponents = new Map(wpEditorStubs()).get('@wordpress/components');
const EDITOR_OVERRIDES = {
  '@wordpress/element': `${defaultElement}\nlet __idCounter = 0;\nexport function useId() { return 'test-id-' + __idCounter++; }\n`,
  '@wordpress/i18n': `
export function __(value) { return value; }
export function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%s/g, () => args[i++]);
}
`,
  '@wordpress/block-editor': `${defaultBlockEditor}\nexport function LinkControl() { return null; }`,
  '@wordpress/components': `${defaultComponents}\nexport function Popover(props) { return React.createElement('div', null, props.children); }`,
};

test('the editor bundle registers the block, mounts EntranceControl and DividerControl, and writes no attribute', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(
    entry,
    [...wpEditorStubs(EDITOR_OVERRIDES), ['kit-config-stub', KIT_CONFIG_STUB]],
    'LocationEditorBundle',
    { 'kit.config.json': 'kit-config-stub' },
  );

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  assert.equal(typeof settings.edit, 'function');

  const writes = [];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { city: 'Columbus', latitude: '', longitude: '', zoom: 15, entrance: { type: 'fade' } },
      setAttributes: (patch) => writes.push(patch),
      clientId: 'location-1',
    }),
  );

  assert.deepEqual(writes, []);
  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Entrance animation'), true);
  assert.equal(globalThis.__wpEditorTest.selects.some((s) => s.label === 'Divider'), true);

  // M1: EntranceControl's Preview button looks for a [data-entrance] canvas
  // root — without it, Preview does nothing on this block's canvas.
  assert.match(markup, /data-entrance="fade"/);
});

// L5: the canvas only checked that lat/lng were non-empty strings, so it
// promised a map for coordinates block.php's own range check (-90..90,
// -180..180) drops — matching that check here keeps the two honest.
test('out-of-range coordinates tell the canvas to add valid ones, the same as empty ones', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(
    entry,
    [...wpEditorStubs(EDITOR_OVERRIDES), ['kit-config-stub', KIT_CONFIG_STUB]],
    'LocationEditorBundleOutOfRange',
    { 'kit.config.json': 'kit-config-stub' },
  );
  const { settings } = globalThis.__wpEditorTest.registrations[0];

  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { city: 'Columbus', latitude: '999', longitude: '40', zoom: 15, entrance: {} },
      setAttributes() {},
      isSelected: true,
      clientId: 'location-2',
    }),
  );

  assert.match(markup, /data-map-state="needs-coordinates"/);
  assert.match(markup, /Add coordinates in the Map panel/);
  assert.doesNotMatch(markup, /A map draws here/);
});

// L5: the front end reverses the row with xl:flex-row-reverse when
// mediaPosition is 'left' (location.blade.php); the canvas ignored it.
test('mediaPosition left reverses the canvas row, matching the front end', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(
    entry,
    [...wpEditorStubs(EDITOR_OVERRIDES), ['kit-config-stub', KIT_CONFIG_STUB]],
    'LocationEditorBundleMediaLeft',
    { 'kit.config.json': 'kit-config-stub' },
  );
  const { settings } = globalThis.__wpEditorTest.registrations[0];

  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { city: 'Columbus', latitude: '', longitude: '', zoom: 15, mediaPosition: 'left', entrance: {} },
      setAttributes() {},
      clientId: 'location-3',
    }),
  );

  assert.match(markup, /xl:flex-row-reverse/);
});

test('the Map panel has an explicit Locate button with a polite status line, and selecting writes nothing', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, [...wpEditorStubs(EDITOR_OVERRIDES), ['kit-config-stub', KIT_CONFIG_STUB]], 'LocationEditorBundleLocate', {
    'kit.config.json': 'kit-config-stub',
  });
  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const writes = [];

  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { city: 'Columbus', addressLine1: '1 Main St', entrance: {} },
      setAttributes: (patch) => writes.push(patch),
      isSelected: true,
      clientId: 'location-3',
    }),
  );

  assert.deepEqual(writes, []);
  assert.match(markup, />Locate</);
  assert.match(markup, /role="status" aria-live="polite"/);
  assert.equal(globalThis.__wpEditorTest.panels.some((panel) => panel.title === 'Map'), true);
  // The directions button is edited on the canvas (the kit's no-content-in-the-sidebar rule).
  assert.equal(globalThis.__wpEditorTest.panels.some((panel) => panel.title === 'Button'), false);
  assert.match(markup, /Button destination/);
});

test('an empty group shows its Add prompt only while the block is selected', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, [...wpEditorStubs(EDITOR_OVERRIDES), ['kit-config-stub', KIT_CONFIG_STUB]], 'LocationEditorBundlePrompt', {
    'kit.config.json': 'kit-config-stub',
  });
  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const render = (isSelected) =>
    renderToStaticMarkup(
      React.createElement(settings.edit, { attributes: { city: 'Columbus', entrance: {} }, setAttributes() {}, isSelected, clientId: 'location-4' }),
    );

  assert.match(render(true), /Add office details/);
  assert.doesNotMatch(render(false), /Add office details/);
  assert.doesNotMatch(render(false), /aria-label="Phone"/);
});

test('the block never loads the Maps library on every editor screen: Locate loads it on demand', () => {
  const metadata = JSON.parse(readFileSync(new URL('./block.json', import.meta.url), 'utf8'));

  assert.equal('editorScript' in metadata, false);
});


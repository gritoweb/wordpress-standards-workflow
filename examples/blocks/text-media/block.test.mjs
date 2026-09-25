import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { renderBlock, registerDirective, callPhp, openingTag } from '../../../theme/scripts/render-harness.mjs';
import { executeBundle } from '../../../theme/scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../theme/scripts/wp-editor-stubs.mjs';
import { APP_AUTOLOAD } from '../../../theme/app/Blocks/test-support.mjs';
import { exampleEnv } from '../../test-support.mjs';

const GROUNDS = [{ name: 'earth', token: '--color-ink', light: false }];
const configRoot = mkdtempSync(join(tmpdir(), 'text-media-config-'));
writeFileSync(join(configRoot, 'kit.config.json'), JSON.stringify({ grounds: GROUNDS }));

// BlockLogos::size() calls get_post_mime_type() whenever mediaType is
// 'logos' (allowSvgUpscale is always true for this block); the harness
// doesn't fake it, so every test needs one.
const RASTER_MIME = "function get_post_mime_type($id) { return 'image/png'; }";

const env = () => exampleEnv({ templateDirectory: configRoot, functions: [RASTER_MIME] });

const directives = callPhp('__test_directives', [], {
  functions: [
    APP_AUTOLOAD,
    "function __test_directives() { return \\App\\Providers\\BlockDirectivesServiceProvider::directives(); }",
  ],
});
for (const [name, body] of Object.entries(directives)) {
  registerDirective(name, body);
}

test.after(() => rmSync(configRoot, { recursive: true, force: true }));

// --- Render half ---

test('padding falls back to 112/56 when the block declares none', () => {
  const html = renderBlock('text-media', { heading: 'Hello' }, [], env());
  const tag = openingTag(html, 'text-media');
  assert.match(tag, /\bpy-14\b/);
  assert.match(tag, /\bmd:py-28\b/);
});

test('with no media and no CTA, only the copy column renders', () => {
  const html = renderBlock('text-media', { heading: 'Hello', body: '<p>Copy</p>' }, [], env());
  assert.doesNotMatch(html, /text-media__media/);
});

test('an image media type renders the attachment through wp_get_attachment_image', () => {
  const html = renderBlock('text-media', { heading: 'Hello', imageId: 42 }, [], env());
  assert.match(html, /text-media__figure/);
  assert.match(html, /src="\/uploads\/attachment-42\.jpg"/);
});

test('a legacy imageUrl fallback is escaped at output', () => {
  const html = renderBlock('text-media', { heading: 'Hello', imageUrl: 'https://example.com/x.jpg?a=1&b=2' }, [], env());
  assert.match(html, /src="https:\/\/example\.com\/x\.jpg\?a=1&#038;b=2"/);
});

test('a logos media type with no populated logo renders no media at all', () => {
  const html = renderBlock('text-media', { heading: 'Hello', mediaType: 'logos', logos: [{ imageId: 0 }] }, [], env());
  assert.doesNotMatch(html, /text-media__media/);
});

// L9: a null/scalar repeater entry (hand-edited markup, a failed migration)
// threw a TypeError against the closures' `array $logo`/`array $item` type
// hints and took the whole page down. hero already guards this with is_array.
test('a malformed logo entry (null, not an array) is dropped instead of fataling', () => {
  const html = renderBlock(
    'text-media',
    { heading: 'Hello', mediaType: 'logos', logos: [null, { imageId: 5, name: 'Acme' }] },
    [],
    env(),
  );
  assert.match(html, /text-media__media/);
});

test('a malformed item entry (a string, not an array) is dropped instead of fataling', () => {
  const html = renderBlock(
    'text-media',
    { heading: 'Hello', items: ['not-an-array', { heading: 'Real item' }] },
    [],
    env(),
  );
  assert.match(html, /Real item/);
});

test('a logos panel takes its ground class from the shared ground helper', () => {
  const html = renderBlock(
    'text-media',
    { heading: 'Hello', mediaType: 'logos', ground: 'earth', logos: [{ imageId: 5, name: 'Acme' }] },
    [],
    env(),
  );
  assert.match(html, /text-media__panel[^"]*ground-earth on-dark/);
});

test('a linked logo in the panel has no hard-coded rel, only target when opening a new tab', () => {
  const html = renderBlock(
    'text-media',
    {
      mediaType: 'logos',
      logos: [{ imageId: 5, name: 'Acme', link: { url: 'https://acme.test', opensInNewTab: true } }],
    },
    [],
    env(),
  );
  assert.match(html, /href="https:\/\/acme\.test"/);
  assert.match(html, /target="_blank"/);
  assert.doesNotMatch(html, / rel=/);
});

// H3: an empty name overrides the attachment's own alt, leaving a linked
// logo with no accessible name (WCAG 2.4.4/4.1.2) — BlockLogos::alt() falls
// back to the attachment's own alt, then the link host (mirrors logo-wall's
// "an unnamed but linked logo falls back to the link host" test).
test('an unnamed but linked logo in the panel falls back to the link host for its alt text', () => {
  const html = renderBlock(
    'text-media',
    {
      mediaType: 'logos',
      logos: [{ imageId: 5, name: '', link: { url: 'https://acme.test/about' } }],
    },
    [],
    env(),
  );
  assert.match(html, /alt="acme\.test"/);
});

test('one or two logos draw at the taller 90px cap; three or more at 70px', () => {
  const one = renderBlock('text-media', { mediaType: 'logos', logos: [{ imageId: 5, name: 'A' }] }, [], env());
  const three = renderBlock(
    'text-media',
    { mediaType: 'logos', logos: [{ imageId: 5, name: 'A' }, { imageId: 6, name: 'B' }, { imageId: 7, name: 'C' }] },
    [],
    env(),
  );
  // The harness's attachment fixture is 640x900 for any id, taller than
  // either cap, so height always lands on the cap itself.
  assert.match(one, /height: 90px/);
  assert.match(three, /height: 70px/);
});

test('an item needs a heading or body to render; an empty one is dropped', () => {
  const html = renderBlock('text-media', { items: [{ heading: '', body: '' }, { heading: 'Kept', body: '' }] }, [], env());
  assert.equal((html.match(/text-media__item /g) || []).length, 1);
  assert.match(html, /Kept/);
});

test("an item's read-more link gets a translatable, sprintf-built accessible name", () => {
  const html = renderBlock(
    'text-media',
    { items: [{ heading: 'Scale', body: '', linkText: 'Read More', link: { url: 'https://example.com' } }] },
    [],
    env(),
  );
  assert.match(html, /<span class="sr-only"> about Scale<\/span>/);
});

test('an item link URL is escaped at output', () => {
  const html = renderBlock(
    'text-media',
    { items: [{ heading: 'X', linkText: 'Go', link: { url: 'https://example.com/?a=1&b=2' } }] },
    [],
    env(),
  );
  assert.match(html, /href="https:\/\/example\.com\/\?a=1&#038;b=2"/);
});

test('the cta helper resolves text, url, target and the icon class together', () => {
  const html = renderBlock(
    'text-media',
    {
      heading: 'Hello',
      ctaText: 'Learn more',
      ctaLink: { url: 'https://example.com', opensInNewTab: true },
      ctaIcon: 'arrow',
      ctaIconPosition: 'before',
    },
    [],
    env(),
  );
  // btn-yellow doesn't exist as a CSS class (a White Summers leftover, see
  // AGENTS.md leftover sweep) — an unconfigured ground reads as light (H2),
  // the same fallback every other CTA block uses (BlockAttributes::ctaButtonClass()).
  assert.match(html, /class="text-media__cta btn btn-primary btn-icon-arrow btn-icon-before/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /target="_blank"/);
});

// M5: plain "Hello"/example.com URLs never exercise escaping — hostile input does.
test('a hostile heading and CTA URL are escaped, never breaking the markup', () => {
  const html = renderBlock(
    'text-media',
    { heading: '<b>"x"&</b>', ctaText: 'Learn more', ctaLink: { url: 'https://x.test/?a=1&b=2"' } },
    [],
    env(),
  );
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&quot;x&quot;&amp;<\/h2>/);
  assert.match(html, /href="https:\/\/x\.test\/\?a=1&#038;b=2"/);
});

test('a configured dark ground also gets the on-dark button family, never the phantom btn-yellow class', () => {
  const html = renderBlock(
    'text-media',
    {
      heading: 'Hello',
      ground: 'earth',
      ctaText: 'Learn more',
      ctaLink: { url: 'https://example.com', opensInNewTab: false },
    },
    [],
    env(),
  );
  assert.match(html, /class="text-media__cta btn btn-on-dark/);
  assert.doesNotMatch(html, /btn-yellow/);
});

test('the divider helper rejects an unknown value back to none', () => {
  const html = renderBlock('text-media', { heading: 'Hello', sectionDivider: 'sideways' }, [], env());
  const tag = openingTag(html, 'text-media');
  assert.doesNotMatch(tag, /border-t-2|border-b-2/);
});

test('entrance parts run in DOM order: heading, body, items, cta, then media', () => {
  const html = renderBlock(
    'text-media',
    {
      heading: 'H',
      body: '<p>B</p>',
      items: [{ heading: 'I1' }],
      ctaText: 'Go',
      ctaLink: { url: 'https://example.com' },
      imageId: 1,
      entrance: { type: 'fade' },
    },
    [],
    env(),
  );
  const marks = [...html.matchAll(/data-entrance-part(?: style="--e-i: (\d+)")?/g)].map((m) => (m[1] ? Number(m[1]) : 0));
  assert.deepEqual(marks, [0, 1, 2, 3, 4]);
});

test('an empty block renders nothing, and a lone photo still draws the split', () => {
  assert.equal(renderBlock('text-media', {}, [], env()).trim(), '');
  assert.equal(renderBlock('text-media', { ctaText: 'Go' }, [], env()).trim(), '');
  assert.match(renderBlock('text-media', { imageId: 42 }, [], env()), /attachment-42\.jpg/);
});

test('a single-color logo is tinted for its ground, and a full-color one is left alone', () => {
  const logos = [{ imageId: 5, name: 'Mono', singleColor: true }, { imageId: 6, name: 'Colour' }];
  const onLight = renderBlock('text-media', { mediaType: 'logos', logos, ground: '' }, [], env());
  const onDark = renderBlock('text-media', { mediaType: 'logos', logos, ground: 'earth' }, [], env());

  assert.match(onLight, /class="text-media__logo-img logo-tint-dark"/);
  assert.match(onDark, /class="text-media__logo-img logo-tint-light"/);
  assert.match(onLight, /class="text-media__logo-img"/);
});

test('every link that opens in a new tab tells screen readers', () => {
  const html = renderBlock(
    'text-media',
    {
      heading: 'Hello',
      ctaText: 'Go',
      ctaLink: { url: 'https://example.com', opensInNewTab: true },
      items: [{ heading: 'One', linkText: 'Read more', link: { url: 'https://example.com/one', opensInNewTab: true } }],
    },
    [],
    env(),
  );

  assert.equal(html.match(/opens in a new tab/g).length, 2);
});

// --- Editor half ---

const elementStub = `
export function useState(initialValue) {
  const index = globalThis.__wpEditorTest.stateCursor++;
  if (!(index in globalThis.__wpEditorTest.state)) {
    globalThis.__wpEditorTest.state[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
  }
  return [globalThis.__wpEditorTest.state[index], (value) => {
    globalThis.__wpEditorTest.state[index] = typeof value === 'function' ? value(globalThis.__wpEditorTest.state[index]) : value;
  }];
}
export function useRef(initialValue) { return { current: initialValue }; }
export function useEffect() {}
export function useLayoutEffect() {}
export function RawHTML() { return null; }
let __idCounter = 0;
export function useId() { return 'test-id-' + __idCounter++; }
`;
const dataStub = `
// useSelect takes EITHER a (select) => ... callback (AttachmentImageControl)
// OR a store descriptor directly (ParagraphsField: useSelect(blockEditorStore)),
// matching the real @wordpress/data API's two call shapes.
function __select(store) {
  return store === 'core' ? {
    getMedia: (id) => globalThis.__coreMedia?.[id],
    isResolving: () => false,
  } : {
    getSelectionStart: () => globalThis.__selection ?? { offset: 0 },
    getSelectionEnd: () => globalThis.__selection ?? { offset: 0 },
  };
}
export function useSelect(mapSelectOrStore) {
  return typeof mapSelectOrStore === 'function' ? mapSelectOrStore(__select) : __select(mapSelectOrStore);
}
export function useDispatch() {
  return { selectionChange: () => {} };
}
`;
const blockEditorStub = `
export function LinkControl(props) {
  globalThis.__wpEditorTest.linkControls = globalThis.__wpEditorTest.linkControls ?? [];
  globalThis.__wpEditorTest.linkControls.push(props);
  return null;
}
export const store = 'core/block-editor';
export function useBlockEditContext() { return { clientId: 'block-1' }; }`;
const richTextStub = `
export function create({ html }) { return { html, text: (html || '').replace(/<[^>]*>/g, ''), start: 0, end: 0 }; }
export function split(value) { return [{ html: value.html.slice(0, value.start) }, { html: value.html.slice(value.end) }]; }
export function toHTMLString({ value }) { return value.html; }
`;
const overrides = {
  '@wordpress/element': elementStub,
  '@wordpress/data': dataStub,
  '@wordpress/block-editor': new Map(wpEditorStubs()).get('@wordpress/block-editor') + blockEditorStub,
  '@wordpress/rich-text': richTextStub,
  '@wordpress/components':
    new Map(wpEditorStubs()).get('@wordpress/components') +
    `\nexport function Popover(props) { return React.createElement('div', null, props.children); }` +
    `\nexport function Spinner() { return React.createElement('span', { role: 'status' }); }`,
  '@wordpress/i18n': `
export function __(value) { return value; }
export function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%s/g, () => args[i++]);
}
`,
};

const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
const KIT_CONFIG_STUB = `export default { grounds: ${JSON.stringify(GROUNDS)} };`;
const aliases = { 'kit.config.json': 'kit-config-stub' };
const bundle = (name) =>
  executeBundle(entry, [...wpEditorStubs(overrides), ['kit-config-stub', KIT_CONFIG_STUB]], name, aliases);

test('the editor bundle registers the block and mounts EntranceControl + the media Ground select', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  await bundle('TextMediaEditorBundle');

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  assert.equal(typeof settings.edit, 'function');

  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: {
        heading: 'A split section',
        mediaType: 'logos',
        ground: '',
        scale: 'feature',
        logos: [],
        items: [],
        entrance: { type: 'fade' },
      },
      setAttributes() {},
      isSelected: false,
      clientId: 'text-media-1',
    }),
  );

  assert.match(markup, /A split section/);
  assert.equal(globalThis.__wpEditorTest.selects.some((s) => s.label === 'Ground'), true);
  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Entrance animation'), true);
});

test('selecting the block writes no attributes', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  await bundle('TextMediaEditorBundle2');
  const { settings } = globalThis.__wpEditorTest.registrations[0];
  let written = false;

  renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: '', mediaType: 'image', logos: [], items: [], entrance: {} },
      setAttributes: () => {
        written = true;
      },
      isSelected: true,
      clientId: 'text-media-2',
    }),
  );

  assert.equal(written, false);
});

test('an optional section image offers Remove, and a logo in a repeater row does not', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  await bundle('TextMediaEditorBundleRemove');
  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const render = (attributes) =>
    renderToStaticMarkup(
      React.createElement(settings.edit, {
        attributes: { logos: [], items: [], entrance: {}, ...attributes },
        setAttributes() {},
        isSelected: false,
        clientId: 'text-media-remove',
      }),
    );

  assert.match(render({ mediaType: 'image', imageId: 9 }), /aria-label="Remove image"/);
  assert.doesNotMatch(render({ mediaType: 'image', imageId: 0 }), /aria-label="Remove image"/);
  assert.doesNotMatch(render({ mediaType: 'logos', logos: [{ imageId: 9, name: 'Acme' }] }), /aria-label="Remove image"/);
});

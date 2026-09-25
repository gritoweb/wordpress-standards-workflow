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

const GROUNDS = [
  { name: 'earth', token: '--color-ink', light: false },
  { name: 'cream', token: '--color-yellow-50', light: true },
];
const configRoot = mkdtempSync(join(tmpdir(), 'logo-wall-config-'));
writeFileSync(join(configRoot, 'kit.config.json'), JSON.stringify({ grounds: GROUNDS }));

const env = exampleEnv({ templateDirectory: configRoot });

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
  const html = renderBlock('logo-wall', { heading: 'Partners' }, [], env);
  const tag = openingTag(html, 'logo-wall');
  assert.match(tag, /\bpy-14\b/);
  assert.match(tag, /\bmd:py-28\b/);
});

// H2: an unconfigured ground is the normal, light page, not dark — a
// stale/no ground used to print accent-colored text and focus rings
// (logo-wall--dark) on a plain light background, likely failing contrast.
test('an unknown ground renders no ground class and falls back to the light treatment', () => {
  const html = renderBlock('logo-wall', { heading: 'Partners' }, [], env);
  const tag = openingTag(html, 'logo-wall');
  assert.doesNotMatch(tag, /ground-/);
  assert.match(tag, /logo-wall--light/);
});

test('a configured light ground prints its class and the light treatment', () => {
  const html = renderBlock('logo-wall', { heading: 'Partners', ground: 'cream' }, [], env);
  const tag = openingTag(html, 'logo-wall');
  assert.match(tag, /\bground-cream\b/);
  assert.doesNotMatch(tag, /on-dark/);
  assert.match(tag, /logo-wall--light/);
});

test('a dark ground prints its class and the dark treatment', () => {
  const html = renderBlock('logo-wall', { heading: 'Partners', ground: 'earth' }, [], env);
  const tag = openingTag(html, 'logo-wall');
  assert.match(tag, /ground-earth on-dark/);
  assert.match(tag, /logo-wall--dark/);
});

test('a logo with no attachment is dropped, never rendering an empty cell', () => {
  const html = renderBlock('logo-wall', { logos: [{ imageId: 0, name: 'Ghost' }] }, [], env);
  assert.doesNotMatch(html, /logo-wall__brand-row/);
});

// L9: a null/scalar repeater entry (hand-edited markup, a failed migration)
// threw a TypeError against the closures' `array $logo` type hint and took
// the whole page down. hero already guards this with is_array.
test('a malformed logo entry (null, not an array) is dropped instead of fataling', () => {
  const html = renderBlock('logo-wall', { logos: [null, { imageId: 5, name: 'Acme' }] }, [], env);
  assert.match(html, /logo-wall__brand-row/);
});

test('a linked logo gets an accessible name from its own client name', () => {
  const html = renderBlock(
    'logo-wall',
    { logos: [{ imageId: 5, name: 'Acme', link: { url: 'https://acme.test', opensInNewTab: true } }] },
    [],
    env,
  );
  assert.match(html, /href="https:\/\/acme\.test"/);
  assert.match(html, /target="_blank"/);
  assert.doesNotMatch(html, / rel=/);
  assert.match(html, /alt="Acme"/);
});

test('an unnamed but linked logo falls back to the link host for its alt text', () => {
  const html = renderBlock(
    'logo-wall',
    { logos: [{ imageId: 5, name: '', link: { url: 'https://acme.test/about' } }] },
    [],
    env,
  );
  assert.match(html, /alt="acme\.test"/);
});

test('an unlinked logo stays decorative (empty alt, no anchor)', () => {
  const html = renderBlock('logo-wall', { logos: [{ imageId: 5, name: '' }] }, [], env);
  assert.match(html, /alt=""/);
  assert.doesNotMatch(html, /<a /);
});

test('the same attachment used twice counts once, so it never duplicates a row', () => {
  const html = renderBlock(
    'logo-wall',
    { logos: [{ imageId: 5, name: 'One' }, { imageId: 5, name: 'Two' }] },
    [],
    env,
  );
  assert.equal((html.match(/logo-wall__brand-logo/g) || []).length, 1);
});

test('logos group into the row an editor authored, ordered within it', () => {
  const html = renderBlock(
    'logo-wall',
    {
      logos: [
        { imageId: 1, name: 'A', desktop: { row: 2, order: 2 } },
        { imageId: 2, name: 'B', desktop: { row: 1, order: 1 } },
        { imageId: 3, name: 'C', desktop: { row: 2, order: 1 } },
      ],
    },
    [],
    env,
  );
  const rows = html.match(/logo-wall__brand-row"[^]*?<\/ul>/g);
  assert.equal(rows.length, 2);
  // Row 1 (B) renders before row 2 (C, then A).
  const order = [...html.matchAll(/alt="([ABC])"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['B', 'C', 'A']);
});

test('entrance parts run in DOM order: the heading first, then every logo across every row', () => {
  const html = renderBlock(
    'logo-wall',
    {
      heading: 'Partners',
      logos: [{ imageId: 1, name: 'A' }, { imageId: 2, name: 'B' }],
      entrance: { type: 'fade' },
    },
    [],
    env,
  );
  assert.match(html, /<h2[^>]*data-entrance-part>/);
  // Each <li> carries its own --e-i ahead of the <img> it wraps, so the
  // index and the mark it belongs to are read from the same list item.
  const items = html.split('<li ').slice(1);
  assert.match(items[0], /--e-i: 1[^]*?alt="A"/);
  assert.match(items[1], /--e-i: 2[^]*?alt="B"/);

  // M1: each <li> also carries its own --brand-cell/--brand-height sizing.
  // HTML keeps only the FIRST style="" attribute on an element, so both
  // pieces of state must merge into ONE style attribute on the <li> itself,
  // or --e-i silently never reaches the browser and every logo animates at
  // index 0.
  for (const item of items) {
    const liTag = item.slice(0, item.indexOf('>') + 1);
    assert.equal((liTag.match(/ style="/g) || []).length, 1, liTag);
    assert.match(liTag, /style="--brand-cell:[^"]*--e-i: \d"/);
  }
});

test('the CTA label defaults to "Read More" and only renders once a URL is set', () => {
  const noCta = renderBlock('logo-wall', { heading: 'Partners' }, [], env);
  assert.doesNotMatch(noCta, /logo-wall__cta/);

  const withCta = renderBlock('logo-wall', { heading: 'Partners', ctaLink: { url: 'https://example.com' } }, [], env);
  assert.match(withCta, /logo-wall__cta[^>]*>Read More</);
});

// M5: plain "Read More"/example.com URLs never exercise escaping — hostile input does.
test('a hostile heading and CTA URL are escaped, never breaking the markup', () => {
  const html = renderBlock(
    'logo-wall',
    { heading: '<b>"x"&</b>', ctaLink: { url: 'https://x.test/?a=1&b=2"' }, ctaText: '<b>"x"&</b>' },
    [],
    env,
  );
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&quot;x&quot;&amp;<\/h2>/);
  assert.match(html, /href="https:\/\/x\.test\/\?a=1&#038;b=2"/);
});

test('the divider helper rejects an unknown value back to none', () => {
  const html = renderBlock('logo-wall', { heading: 'Partners', sectionDivider: 'sideways' }, [], env);
  const tag = openingTag(html, 'logo-wall');
  assert.doesNotMatch(tag, /border-t-2|border-b-2/);
});

test('an empty block renders nothing, even with a button set', () => {
  assert.equal(renderBlock('logo-wall', {}, [], env).trim(), '');
  assert.equal(renderBlock('logo-wall', { ctaLink: { url: 'https://example.com' } }, [], env).trim(), '');
});

test('a single-color logo is tinted for its ground, and a full-color one is left alone', () => {
  const logos = [{ imageId: 5, name: 'Mono', singleColor: true }, { imageId: 6, name: 'Colour' }];
  const onLight = renderBlock('logo-wall', { ground: 'cream', logos }, [], env);
  const onDark = renderBlock('logo-wall', { ground: 'earth', logos }, [], env);

  assert.match(onLight, /class="logo-wall__brand-img logo-tint-dark"/);
  assert.match(onDark, /class="logo-wall__brand-img logo-tint-light"/);
  assert.match(onLight, /class="logo-wall__brand-img"/);
});

test('the read more link says when it opens a new tab', () => {
  const html = renderBlock('logo-wall', { heading: 'Partners', ctaLink: { url: 'https://example.com', opensInNewTab: true } }, [], env);
  assert.match(html, /logo-wall__cta[^>]*target="_blank"[^>]*>Read More<span class="sr-only"> \(opens in a new tab\)<\/span><\/a>/);
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
let __idCounter = 0;
export function useId() { return 'test-id-' + __idCounter++; }
`;
const dataStub = `
export function useSelect(mapSelect) {
  return mapSelect((store) => store === 'core' ? {
    getMedia: (id) => globalThis.__coreMedia?.[id],
    isResolving: () => false,
  } : {});
}
`;
const blockEditorStub = `
export function LinkControl(props) {
  globalThis.__wpEditorTest.linkControls = globalThis.__wpEditorTest.linkControls ?? [];
  globalThis.__wpEditorTest.linkControls.push(props);
  return null;
}`;
const overrides = {
  '@wordpress/element': elementStub,
  '@wordpress/data': dataStub,
  '@wordpress/block-editor': new Map(wpEditorStubs()).get('@wordpress/block-editor') + blockEditorStub,
  '@wordpress/components':
    new Map(wpEditorStubs()).get('@wordpress/components') +
    `\nexport function Popover(props) { return React.createElement('div', null, props.children); }` +
    `\nexport function Spinner() { return React.createElement('span', { role: 'status' }); }`,
  // The default @wordpress/i18n only exports __; ActionEditor also needs
  // sprintf, a plain %s substitution is enough here.
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

test('the editor bundle registers the block and mounts EntranceControl + the Ground select on real attributes', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  await executeBundle(
    entry,
    [...wpEditorStubs(overrides), ['kit-config-stub', KIT_CONFIG_STUB]],
    'LogoWallEditorBundle',
    aliases,
  );

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  assert.equal(typeof settings.edit, 'function');

  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Our partners', ground: '', sectionDivider: 'above', logos: [], entrance: { type: 'fade' } },
      setAttributes() {},
      isSelected: false,
      clientId: 'logo-wall-1',
    }),
  );

  assert.match(markup, /Our partners/);
  assert.equal(globalThis.__wpEditorTest.selects.some((s) => s.label === 'Ground'), true);
  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Entrance animation'), true);
});

test('selecting the block with no logos writes nothing (mount/selection never writes attributes)', async () => {
  resetWpEditorTest();
  globalThis.__coreMedia = {};
  await executeBundle(
    entry,
    [...wpEditorStubs(overrides), ['kit-config-stub', KIT_CONFIG_STUB]],
    'LogoWallEditorBundle2',
    aliases,
  );
  const { settings } = globalThis.__wpEditorTest.registrations[0];
  let written = false;

  renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: '', logos: [], entrance: {} },
      setAttributes: () => {
        written = true;
      },
      isSelected: true,
      clientId: 'logo-wall-2',
    }),
  );

  assert.equal(written, false);
});

test('a logo link that opens in a new tab says so to screen readers', () => {
  const html = renderBlock('logo-wall', {
    logos: [{ imageId: 7, name: 'Acme', link: { url: 'https://example.com', opensInNewTab: true } }],
  }, [], env);
  assert.match(html, /target="_blank"[^>]*>[^<]*<img[^>]*><span class="sr-only"> \(opens in a new tab\)<\/span><\/a>/);
});

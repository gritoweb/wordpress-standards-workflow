import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { renderBlock, registerDirective, callPhp, openingTag } from '../../../theme/scripts/render-harness.mjs';
import { executeBundle } from '../../../theme/scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../theme/scripts/wp-editor-stubs.mjs';
import { APP_AUTOLOAD } from '../../../theme/app/Blocks/test-support.mjs';
import { exampleEnv } from '../../test-support.mjs';

const env = exampleEnv({
  attachments: {
    10: { alt: 'Team on stage' },
    20: { alt: 'Studio at dusk' },
  },
});

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

// --- Render half ---

test('renders the top-level copy as an implicit single slide with no chrome', () => {
  const html = renderBlock('hero', { heading: 'Welcome', eyebrow: 'Since 1990' }, [], env);
  const tag = openingTag(html, 'hero');
  assert.ok(tag);
  assert.match(html, /Welcome/);
  assert.match(html, /Since 1990/);
  assert.doesNotMatch(html, /data-hero-prev/);
  assert.doesNotMatch(html, /swiper-slide/);
});

test('the block’s own zero default applies when WordPress has filled every padding key from block.json', () => {
  const html = renderBlock(
    'hero',
    {
      heading: 'Welcome',
      paddingVertMobile: 0,
      paddingVertDesktop: 0,
      paddingXMobile: false,
      paddingXDesktop: false,
    },
    [],
    env,
  );
  const tag = openingTag(html, 'hero');
  assert.match(tag, /\bpy-0\b/);
  assert.match(tag, /\bmd:py-0\b/);
  assert.match(tag, /\bpx-0\b/);
  assert.match(tag, /lg:px-0/);
});

test('a saved padding override reaches the rendered classes', () => {
  const html = renderBlock(
    'hero',
    { heading: 'Welcome', paddingVertMobile: 96, paddingVertDesktop: 56, paddingXMobile: true, paddingXDesktop: true },
    [],
    env,
  );
  const tag = openingTag(html, 'hero');
  assert.match(tag, /\bpy-24\b/);
  assert.match(tag, /\bmd:py-14\b/);
  assert.match(tag, /\bpx-5\b/);
  assert.match(tag, /lg:px-\[6rem\]/);
});

test('the entrance preset’s own numbers print as inline custom properties, unless overridden', () => {
  const html = renderBlock('hero', { heading: 'Welcome' }, [], env);
  const tag = openingTag(html, 'hero');
  assert.match(tag, /data-entrance="fade-slide" data-entrance-dir="up"/);
  assert.match(tag, /--e-distance: 32px/);
  assert.match(tag, /--e-duration: 600ms/);
  assert.match(tag, /--e-stagger: 120ms/);
});

test('an unknown ground prints no ground class', () => {
  const html = renderBlock('hero', { heading: 'Welcome', ground: 'not-configured' }, [], env);
  assert.doesNotMatch(html, /ground-not-configured/);
});

test('the anchor id lands on the section, never on an inner element', () => {
  const html = renderBlock('hero', { heading: 'Welcome', anchor: 'our-story' }, [], env);
  const tag = openingTag(html, 'hero');
  assert.match(tag, /id="our-story"/);
});

test('a slide keeps the desktop image’s own alt text even when it also has a different mobile image', () => {
  const html = renderBlock(
    'hero',
    {
      slides: [
        { heading: 'One', slideImageId: 10, mobileImageId: 20 },
        { heading: 'Two', slideImageId: 20 },
      ],
    },
    [],
    env,
  );
  assert.match(html, /alt="Team on stage"/);
  assert.match(html, /alt="Studio at dusk"/);
});

test('a single saved slide renders with no chrome and no slider attributes', () => {
  const html = renderBlock('hero', { slides: [{ heading: 'Only one' }] }, [], env);
  assert.doesNotMatch(html, /data-hero-prev/);
  assert.doesNotMatch(html, /swiper-slide/);
});

test('two or more slides render Swiper markup and the chrome block.js drives', () => {
  const html = renderBlock(
    'hero',
    {
      slides: [
        { heading: 'One', slideImageId: 10 },
        { heading: 'Two', slideImageId: 20 },
      ],
    },
    [],
    env,
  );
  assert.match(html, /data-hero-slideshow/);
  assert.match(html, /class="hero__slides swiper /);
  assert.match(html, /<div class="swiper-wrapper">/);
  assert.equal(html.match(/class="hero__slide swiper-slide/g).length, 2);
  assert.match(html, /data-hero-prev/);
  assert.match(html, /data-hero-next/);
  assert.equal(html.match(/data-hero-copy/g).length, 2);
  assert.match(html, /data-hero-status/);
});

test('a single slide renders no Swiper markup and no chrome', () => {
  const html = renderBlock('hero', { slides: [{ heading: 'One', slideImageId: 10 }] }, [], env);
  assert.doesNotMatch(html, /swiper|data-hero-slideshow|data-hero-prev/);
});

// L7: hero used to splice --hero-transition-duration into
// BlockEntrance::root()'s output by hand (str_replace on ' style="'),
// instead of passing it as root()'s own $extraStyle argument like location
// does — a real render proves the merge still produces one style attribute.
test('the slider transition duration and the entrance style share one style attribute', () => {
  const html = renderBlock(
    'hero',
    {
      slides: [
        { heading: 'One', slideImageId: 10 },
        { heading: 'Two', slideImageId: 20 },
      ],
      entrance: { type: 'slide', direction: 'left', distance: 40, duration: 500 },
    },
    [],
    env,
  );
  const tag = openingTag(html, 'hero');
  assert.match(tag, /style="--hero-transition-duration: 500ms; --e-distance: 40px; --e-duration: 500ms;/);
});

test('a single slide (no chrome) carries no --hero-transition-duration', () => {
  const html = renderBlock('hero', { slides: [{ heading: 'One', slideImageId: 10 }] }, [], env);
  const tag = openingTag(html, 'hero');
  assert.doesNotMatch(tag, /--hero-transition-duration/);
});

test('autoplay adds the play/pause control; no autoplay omits it', () => {
  const withAutoplay = renderBlock(
    'hero',
    { slides: [{ heading: 'One' }, { heading: 'Two' }], autoplay: true },
    [],
    env,
  );
  assert.match(withAutoplay, /data-hero-play-pause/);

  const without = renderBlock('hero', { slides: [{ heading: 'One' }, { heading: 'Two' }] }, [], env);
  assert.doesNotMatch(without, /data-hero-play-pause/);
});

test('layout eyebrow-below reverses the reading order of eyebrow and heading', () => {
  const above = renderBlock('hero', { heading: 'Welcome', eyebrow: 'Since 1990', layout: 'eyebrow-above' }, [], env);
  const below = renderBlock('hero', { heading: 'Welcome', eyebrow: 'Since 1990', layout: 'eyebrow-below' }, [], env);
  assert.ok(above.indexOf('Since 1990') < above.indexOf('Welcome'));
  assert.ok(below.indexOf('Welcome') < below.indexOf('Since 1990'));
});

test('layout no-body hides body and caption even when both are set', () => {
  const html = renderBlock('hero', { heading: 'Welcome', body: '<p>Body copy</p>', caption: 'Caption', layout: 'no-body' }, [], env);
  assert.doesNotMatch(html, /Body copy/);
  assert.doesNotMatch(html, /Caption/);
});

test('a slide’s bare image URL is escaped at output, not printed raw', () => {
  const html = renderBlock(
    'hero',
    { slides: [{ heading: 'One', slideImageUrl: 'javascript:alert(1)' }] },
    [],
    env,
  );
  assert.doesNotMatch(html, /src="javascript:/);
});

// M5: plain "Welcome" never exercises escaping — hostile input does.
test('a hostile heading strips its tag and escapes the rest, never breaking the markup', () => {
  const html = renderBlock('hero', { heading: '<b>"x"&</b>' }, [], env);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&quot;x&quot;&amp;/);
});

test('an empty block renders nothing, and one slide with only a photo still draws', () => {
  assert.equal(renderBlock('hero', {}, [], env).trim(), '');
  assert.equal(renderBlock('hero', { slides: [{}] }, [], env).trim(), '');
  assert.match(renderBlock('hero', { slides: [{ slideImageId: 10 }] }, [], env), /attachment-10\.jpg/);
});

test('a null or string slide entry is dropped, so the typed slide closure never throws', () => {
  const html = renderBlock('hero', { slides: [null, 'text', { heading: 'Kept' }] }, [], env);
  assert.match(html, />Kept\s*</);
  assert.equal(html.match(/data-hero-copy/g).length, 1);
});

test('the opening slide image loads eagerly with high priority, and later slides stay lazy', () => {
  const html = renderBlock('hero', { slides: [{ heading: 'One', slideImageId: 10 }, { heading: 'Two', slideImageId: 20 }] }, [], env);
  assert.match(html, /attachment-10\.jpg"[^>]*loading="eager"[^>]*fetchpriority="high"/);
  assert.match(html, /attachment-20\.jpg"[^>]*loading="lazy"/);
  assert.equal(html.match(/fetchpriority/g).length, 1);
});

// --- Editor half ---

// The editor stubs a hero canvas needs: the media store for the slide image
// frame, and the selection store and rich-text helpers ParagraphsField reads.
function heroModules() {
  const defaults = new Map(wpEditorStubs());

  return wpEditorStubs({
    '@wordpress/element': `${defaults.get('@wordpress/element')}
export function RawHTML(props) { return props.children ?? null; }
let __idCounter = 0;
export function useId() { return 'test-id-' + __idCounter++; }`,
    '@wordpress/block-editor': `${defaults.get('@wordpress/block-editor')}
export function LinkControl() { return null; }
export const store = 'core/block-editor';
export function useBlockEditContext() { return { clientId: 'test-1' }; }`,
    '@wordpress/components': `${defaults.get('@wordpress/components')}
export function Popover(props) { return React.createElement('div', null, props.children); }
export function Spinner() { return React.createElement('span', { role: 'status' }); }`,
    '@wordpress/data': `export function useSelect(mapSelect) {
  return mapSelect(() => ({
    getMedia: () => null,
    isResolving: () => false,
    getSelectionStart: () => ({ offset: 0 }),
    getSelectionEnd: () => ({ offset: 0 }),
  }));
}
export function useDispatch() { return { selectionChange: () => {} }; }`,
    '@wordpress/rich-text': `export function create({ html }) { return { html, text: (html || '').replace(/<[^>]*>/g, ''), start: 0, end: 0 }; }
export function split(value) { return [{ html: value.html.slice(0, value.start) }, { html: value.html.slice(value.end) }]; }
export function toHTMLString({ value }) { return value.html; }`,
  });
}


test('the editor bundle mounts EntranceControl on real attributes and writes nothing on mount or selection', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  const modules = heroModules();
  modules.push(['kit-config-stub', "export default { grounds: [{ name: 'primary', token: '--color-primary', light: true }] };"]);
  await executeBundle(entry, modules, 'HeroEditorTestBundle', { 'kit.config.json': 'kit-config-stub' });

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  assert.equal(typeof settings.edit, 'function');

  const writes = [];
  renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: {
        heading: 'Preview',
        eyebrow: '',
        slides: [],
        layout: 'eyebrow-above',
        entrance: {},
      },
      setAttributes: (patch) => writes.push(patch),
      isSelected: false,
      clientId: 'hero-1',
    }),
  );

  assert.deepEqual(writes, []);
  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Entrance animation'), true);
  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Section'), true);
});

// L6: the canvas media placeholder used a small 16rem square thumbnail; the
// front end's own hero__slides panel is h-[22rem] xl:h-[36rem].
test('the media panel matches the front end’s own height classes, not a small square thumbnail', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  const modules = heroModules();
  modules.push(['kit-config-stub', "export default { grounds: [{ name: 'primary', token: '--color-primary', light: true }] };"]);
  await executeBundle(entry, modules, 'HeroEditorTestBundleMedia', { 'kit.config.json': 'kit-config-stub' });

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'Preview', eyebrow: '', slides: [{ heading: 'One' }], layout: 'eyebrow-above', entrance: {} },
      setAttributes() {},
      isSelected: false,
      clientId: 'hero-2',
    }),
  );

  assert.match(markup, /h-\[22rem\][^"]*lg:h-\[28rem\]/);
  assert.doesNotMatch(markup, /max-w-\[16rem\]/);
});

// L6: a part that doesn't render (no eyebrow here) takes no index — heading
// should get part 0, not the fixed 1 eyebrowFirst reserved for it.
test('a missing eyebrow does not leave a gap in the heading’s entrance part index', async () => {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  const modules = heroModules();
  modules.push(['kit-config-stub', "export default { grounds: [{ name: 'primary', token: '--color-primary', light: true }] };"]);
  await executeBundle(entry, modules, 'HeroEditorTestBundlePartIndex', { 'kit.config.json': 'kit-config-stub' });

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const markup = renderToStaticMarkup(
    React.createElement(settings.edit, {
      attributes: { heading: 'One', eyebrow: '', slides: [], layout: 'eyebrow-above', entrance: {} },
      setAttributes() {},
      isSelected: false,
      clientId: 'hero-3',
    }),
  );

  const heading = /<textarea[^>]*aria-label="Heading"[^>]*>/.exec(markup)?.[0] ?? '';
  assert.match(heading, /data-entrance-part=""/);
  // Index 0 prints no --e-i, so the heading's style is the field's own only.
  assert.doesNotMatch(heading, /--e-i/);
});

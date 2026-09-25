import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { renderBlock, registerDirective, callPhp, openingTag, post } from '../../../theme/scripts/render-harness.mjs';
import { executeBundle } from '../../../theme/scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../theme/scripts/wp-editor-stubs.mjs';
import { APP_AUTOLOAD } from '../../../theme/app/Blocks/test-support.mjs';
import { exampleEnv, SAMPLE_CONTENT_TYPES } from '../../test-support.mjs';

// BlockAttributes::grounds() reads <get_template_directory()>/kit.config.json
// and degrades to [] when it's missing — this kit repo has no per-project
// config, so any path works; it only proves an unconfigured ground prints no
// class.
const env = exampleEnv({ functions: SAMPLE_CONTENT_TYPES });

const CONTENT_TYPE = '__PREFIX___person';

// Register the exact directives BlockDirectivesServiceProvider::boot() wires
// (via its exported directives() list), instead of a second hard-coded copy.
const directives = callPhp('__test_directives', [], {
  functions: [
    APP_AUTOLOAD,
    "function __test_directives() { return \\App\\Providers\\BlockDirectivesServiceProvider::directives(); }",
  ],
});
for (const [name, body] of Object.entries(directives)) {
  registerDirective(name, body);
}

function person(title, over = {}) {
  return post(CONTENT_TYPE, title, over);
}

// --- Render half ---

test('an unconfigured content type, or a collection with no records, renders nothing', () => {
  assert.equal(renderBlock('post-grid', {}, [], env).trim(), '');
  assert.equal(renderBlock('post-grid', { contentType: CONTENT_TYPE }, [], env).trim(), '');
});

test('a card shows the title, meta, excerpt and an optional link', () => {
  const ada = person('Ada Lovelace', {
    meta: { role: 'Engineer', bio: 'Computes things.', link_url: 'https://example.com' },
    thumbnail: 501,
  });
  const html = renderBlock(
    'post-grid',
    { contentType: CONTENT_TYPE, linkText: 'Read more' },
    [ada],
    env,
  );

  assert.match(html, /<h3 class="post-card__title heading-4 mt-0">Ada Lovelace<\/h3>/);
  assert.match(html, /<p class="post-card__meta mt-0">Engineer<\/p>/);
  assert.match(html, /<p class="post-card__excerpt mt-0">Computes things\.<\/p>/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, />Read more</);
  assert.match(html, /src="\/uploads\/attachment-501\.jpg"/);
});

// M2: get_the_title() returns already texturized/entity-encoded text
// ("O&#8217;Brien"); Blade's {{ }} would encode it a second time, showing
// the literal text "O&#8217;Brien" on the page instead of "O'Brien".
test('an entity-encoded title (apostrophe and ampersand) is not double-encoded', () => {
  const ada = person("O&#8217;Brien &#038; Co", { meta: { link_url: 'https://example.com' } });
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE, linkText: 'Read more' }, [ada], env);

  assert.match(html, /<h3 class="post-card__title heading-4 mt-0">O’Brien &amp; Co<\/h3>/);
  assert.doesNotMatch(html, /&amp;amp;|&amp;#8217;|&amp;#038;/);
});

// M5: plain "Ada Lovelace"/example.com never exercise escaping — hostile input does.
test('a hostile title and CTA URL are escaped, never breaking the markup', () => {
  const record = person('<b>"x"&</b>', { meta: { link_url: 'https://x.test/?a=1&b=2"' } });
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE, linkText: 'Read more' }, [record], env);

  assert.doesNotMatch(html, /<h3[^>]*><b>/);
  assert.match(html, /<h3 class="post-card__title heading-4 mt-0">&lt;b&gt;&quot;x&quot;&amp;&lt;\/b&gt;<\/h3>/);
  assert.match(html, /href="https:\/\/x\.test\/\?a=1&#038;b=2"/);
});

test('no CTA text hides the link even when the record has one', () => {
  const ada = person('Ada Lovelace', { meta: { link_url: 'https://example.com' } });
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE, linkText: '' }, [ada], env);
  assert.doesNotMatch(html, /post-card__cta/);
});

test('no link on the record hides the CTA even when linkText is set', () => {
  const ada = person('Ada Lovelace');
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE, linkText: 'Read more' }, [ada], env);
  assert.doesNotMatch(html, /post-card__cta/);
});

test('under manual sort, the include list is the display order', () => {
  const ada = person('Ada Lovelace');
  const grace = person('Grace Hopper');
  const html = renderBlock(
    'post-grid',
    { contentType: CONTENT_TYPE, orderby: 'manual', includeIds: [grace.id, ada.id] },
    [ada, grace],
    env,
  );
  assert.ok(html.indexOf('Grace Hopper') < html.indexOf('Ada Lovelace'));
});

test('the exclude list always wins over the include list', () => {
  const ada = person('Ada Lovelace');
  const grace = person('Grace Hopper');
  const html = renderBlock(
    'post-grid',
    { contentType: CONTENT_TYPE, includeIds: [ada.id, grace.id], excludeIds: [ada.id] },
    [ada, grace],
    env,
  );
  assert.doesNotMatch(html, /Ada Lovelace/);
  assert.match(html, /Grace Hopper/);
});

test('title sort ignores the include order and reads alphabetically', () => {
  const ada = person('Ada Lovelace');
  const grace = person('Grace Hopper');
  const html = renderBlock(
    'post-grid',
    { contentType: CONTENT_TYPE, orderby: 'title', includeIds: [grace.id, ada.id] },
    [ada, grace],
    env,
  );
  assert.ok(html.indexOf('Ada Lovelace') < html.indexOf('Grace Hopper'));
});

test('date sort shows the newest record first', () => {
  const older = person('Ada Lovelace', { date: '2020-01-01 00:00:00' });
  const newer = person('Grace Hopper', { date: '2024-01-01 00:00:00' });
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE, orderby: 'date' }, [older, newer], env);
  assert.ok(html.indexOf('Grace Hopper') < html.indexOf('Ada Lovelace'));
});

test('load more paging links to the next page and carries the label', () => {
  const people = ['A', 'B', 'C'].map((name) => person(name));
  const html = renderBlock(
    'post-grid',
    { contentType: CONTENT_TYPE, postsPerPage: 2, pagination: 'loadMore', moreText: 'Show more' },
    people,
    env,
  );
  assert.match(html, /data-paging="post-grid-page"/);
  assert.match(html, /data-paging-more/);
  assert.match(html, />\s*Show more\s*</);
});

test('numbered paging marks the current page and links the others', () => {
  const people = ['A', 'B', 'C'].map((name) => person(name));
  const html = renderBlock(
    'post-grid',
    { contentType: CONTENT_TYPE, postsPerPage: 2, pagination: 'pager' },
    people,
    env,
  );
  assert.match(html, /<span class="collection-paging__page" aria-current="page">1<\/span>/);
  assert.match(html, /collection-paging__page" href="[^"]+"[^>]*>2</);
});

// L1: sm:grid-cols-2 was unconditional, so columns: 1 still opened a second
// column at the sm breakpoint — the control's minimum did nothing.
test('columns 1 stays a single column at every breakpoint', () => {
  const ada = person('Ada Lovelace');
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE, columns: 1 }, [ada], env);
  const grid = openingTag(html, 'post-grid__grid');
  assert.match(grid, /\bgrid-cols-1\b/);
  assert.match(grid, /\blg:grid-cols-1\b/);
  assert.doesNotMatch(grid, /sm:grid-cols-2/);
});

test('columns 2, 3 and 4 each print their own lg column count, with sm:grid-cols-2', () => {
  const ada = person('Ada Lovelace');
  for (const [columns, lgClass] of [[2, 'lg:grid-cols-2'], [3, 'lg:grid-cols-3'], [4, 'lg:grid-cols-4']]) {
    const html = renderBlock('post-grid', { contentType: CONTENT_TYPE, columns }, [ada], env);
    const grid = openingTag(html, 'post-grid__grid');
    assert.match(grid, /sm:grid-cols-2/, `columns: ${columns}`);
    assert.match(grid, new RegExp(`\\b${lgClass}\\b`), `columns: ${columns}`);
  }
});

test('padding falls back to the global default when the block declares none', () => {
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE }, [person('Ada Lovelace')], env);
  const tag = openingTag(html, 'post-grid');
  assert.match(tag, /\bpy-28\b/);
  assert.match(tag, /\bmd:py-28\b/);
  assert.match(tag, /\bpx-5\b/);
  assert.match(tag, /lg:px-\[6rem\]/);
});

test("the block's own entrance preset uses the item trigger with no numeric overrides", () => {
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE }, [person('Ada Lovelace')], env);
  const tag = openingTag(html, 'post-grid');
  assert.match(tag, /data-entrance="fade-slide" data-entrance-dir="up" data-entrance-trigger="item"/);
  assert.doesNotMatch(tag, / style="/);
});

test('an unconfigured ground prints no ground class', () => {
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE, ground: 'not-configured' }, [], env);
  assert.doesNotMatch(html, /ground-not-configured/);
});

test('the divider helper rejects an unknown value back to none', () => {
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE, sectionDivider: 'sideways' }, [person('Ada Lovelace')], env);
  const tag = openingTag(html, 'post-grid');
  assert.doesNotMatch(tag, /border-t-2|border-b-2/);
});

test('the divider prints the above/below border on the section root', () => {
  const above = openingTag(
    renderBlock('post-grid', { contentType: CONTENT_TYPE, sectionDivider: 'above' }, [person('Ada Lovelace')], env),
    'post-grid',
  );
  assert.match(above, /border-t-2/);

  const below = openingTag(
    renderBlock('post-grid', { contentType: CONTENT_TYPE, sectionDivider: 'below' }, [person('Ada Lovelace')], env),
    'post-grid',
  );
  assert.match(below, /border-b-2/);
});

test('the anchor id lands on the section root', () => {
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE, anchor: 'people' }, [person('Ada Lovelace')], env);
  assert.match(html, /<section\s+id="people"/);
});

test('entrance parts are numbered per card, the first carries no style', () => {
  const ada = person('Ada Lovelace');
  const grace = person('Grace Hopper');
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE }, [ada, grace], env);
  assert.match(html, /<li data-entrance-part>/);
  assert.match(html, /<li data-entrance-part style="--e-i: 1">/);
});

test('a long page caps the entrance part index at 8, so the last card never waits seconds', () => {
  const many = Array.from({ length: 12 }, (_unused, index) => person(`Person ${index + 1}`));
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE }, many, env);
  const indexes = [...html.matchAll(/<li data-entrance-part(?: style="--e-i: (\d+)")?>/g)].map((match) => Number(match[1] ?? 0));

  assert.equal(indexes.length, 12);
  assert.equal(Math.max(...indexes), 8);
});

test('a malformed include list reads as empty instead of failing', () => {
  const html = renderBlock('post-grid', { contentType: CONTENT_TYPE, includeIds: 'not a list', excludeIds: null }, [person('Ada Lovelace')], env);
  assert.match(html, /Ada Lovelace/);
});

// --- Editor half: the same block's block.jsx, bundled and registered. ---

const DATA_STUB = `
export function useSelect(mapSelect) {
  return mapSelect((store) => store === 'core' ? {
    getEntityRecords: () => globalThis.__records ?? null,
    hasResolutionFailed: () => globalThis.__queryFailed ?? false,
  } : {});
}
`;

const defaultElement = new Map(wpEditorStubs()).get('@wordpress/element');
const defaultComponents = new Map(wpEditorStubs()).get('@wordpress/components');
const OVERRIDES = {
  '@wordpress/data': DATA_STUB,
  '@wordpress/element': `${defaultElement}
export function useRef(initialValue) { return { current: initialValue }; }
export function useLayoutEffect() {}
export function useEffect() {}`,
  '@wordpress/components': `${defaultComponents}
export function Notice(props) { return React.createElement('div', { role: 'status' }, props.children); }`,
  '@wordpress/i18n': `
export function __(value) { return value; }
export function _n(single, plural, count) { return count === 1 ? single : plural; }
export function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%\\d\\$s|%s|%d/g, () => args[i++]);
}`,
  'grounds-stub': "export default { grounds: [{ name: 'ink', token: '--color-ink', light: false }] };",
};

// PostPicker's titleOf() decodes REST's rendered-HTML title through a real
// <textarea> in the browser; this stub does the same job for the entity this
// suite's fixture titles use, since Node has no DOM (see PostPicker.test.mjs).
function withFakeTextareaDocument(fn) {
  const realDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      set innerHTML(html) {
        this.value = html;
      },
    }),
  };
  try {
    return fn();
  } finally {
    globalThis.document = realDocument;
  }
}

async function mountEdit(attributes) {
  resetWpEditorTest();
  const entry = resolve(dirname(fileURLToPath(import.meta.url)), 'block.jsx');
  await executeBundle(entry, wpEditorStubs(OVERRIDES), 'PostGridEditorBundle', {
    'kit.config.json': 'grounds-stub',
  });

  const { settings } = globalThis.__wpEditorTest.registrations[0];
  const writes = [];
  const markup = withFakeTextareaDocument(() =>
    renderToStaticMarkup(
      React.createElement(settings.edit, {
        attributes,
        setAttributes: (patch) => writes.push(patch),
        clientId: 'post-grid-1',
      }),
    ),
  );

  return { markup, writes };
}

test('with no content type chosen, the canvas explains what to do and writes nothing', async () => {
  globalThis.__records = null;
  const { markup, writes } = await mountEdit({
    contentType: '',
    columns: 3,
    orderby: 'manual',
    linkText: '',
    sectionDivider: 'none',
    ground: '',
    postsPerPage: 0,
    pagination: 'loadMore',
    moreText: '',
    includeIds: [],
    excludeIds: [],
    entrance: {},
  });

  assert.match(markup, /Choose a content type/);
  assert.deepEqual(writes, []);
  assert.equal(globalThis.__wpEditorTest.selects.some((s) => s.label === 'Divider'), true);
  assert.equal(globalThis.__wpEditorTest.panels.some((p) => p.title === 'Entrance animation'), true);
});

test('with a content type chosen, the canvas counts the shown records honestly', async () => {
  globalThis.__records = [
    { id: 1, title: { rendered: 'Ada Lovelace' } },
    { id: 2, title: { rendered: 'Grace Hopper' } },
  ];
  globalThis.__queryFailed = false;
  const { markup, writes } = await mountEdit({
    contentType: '__PREFIX___person',
    columns: 3,
    orderby: 'manual',
    linkText: '',
    sectionDivider: 'none',
    ground: '',
    postsPerPage: 0,
    pagination: 'loadMore',
    moreText: '',
    includeIds: [1],
    excludeIds: [],
    entrance: {},
  });

  assert.match(markup, /1 shown,/);
  assert.deepEqual(writes, []);
});

// L2: the front end's own query (Person::card(), has_password => false)
// never shows a password-protected record — the canvas count has to agree,
// or the editor can promise "2 shown" for a grid that only renders 1 card.
test('a password-protected record counts as unavailable, not shown', async () => {
  globalThis.__records = [
    { id: 1, title: { rendered: 'Ada Lovelace' }, content: { protected: false } },
    { id: 2, title: { rendered: 'Grace Hopper' }, content: { protected: true } },
  ];
  globalThis.__queryFailed = false;
  const { markup } = await mountEdit({
    contentType: '__PREFIX___person',
    columns: 3,
    orderby: 'manual',
    linkText: '',
    sectionDivider: 'none',
    ground: '',
    postsPerPage: 0,
    pagination: 'loadMore',
    moreText: '',
    includeIds: [1, 2],
    excludeIds: [],
    entrance: {},
  });

  assert.match(markup, /1 shown,/);
  assert.match(markup, /1 chosen record is not published/);
});

// L3: the front end applies groundClass(ground) to the section; the canvas
// used to ignore it entirely, so choosing a ground had no visible effect.
test('a configured ground reaches the canvas root', async () => {
  globalThis.__records = [];
  globalThis.__queryFailed = false;
  const { markup } = await mountEdit({
    contentType: '__PREFIX___person',
    columns: 3,
    orderby: 'manual',
    linkText: '',
    sectionDivider: 'none',
    ground: 'ink',
    postsPerPage: 0,
    pagination: 'loadMore',
    moreText: '',
    includeIds: [],
    excludeIds: [],
    entrance: {},
  });

  assert.match(markup, /ground-ink/);
});

test('a query failure keeps the lists and reports the count as unknown, without writing', async () => {
  globalThis.__records = null;
  globalThis.__queryFailed = true;
  const { markup, writes } = await mountEdit({
    contentType: '__PREFIX___person',
    columns: 3,
    orderby: 'manual',
    linkText: '',
    sectionDivider: 'none',
    ground: '',
    postsPerPage: 0,
    pagination: 'loadMore',
    moreText: '',
    includeIds: [1, 2],
    excludeIds: [],
    entrance: {},
  });

  assert.match(markup, /count is unknown/);
  assert.deepEqual(writes, []);
});

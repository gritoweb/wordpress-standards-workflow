import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { exampleSlugs, exampleTheme } from './support/examples.mjs';
import { renderBlock } from './support/render-harness.mjs';

const SCRIPT = '<script>alert(1)</script><img src=x onerror=alert(1)>"\'';
const BAD_URL = 'javascript:alert(1)';

// Fills every string a block stores with hostile text and every URL with a bad scheme.
function hostile(value, key = '') {
  if (typeof value === 'string') return /url/i.test(key) ? BAD_URL : SCRIPT;
  if (Array.isArray(value)) return value.map((v) => hostile(v));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, hostile(v, k)]));
  }
  return value;
}

const defaults = (root, slug) => {
  const { attributes } = JSON.parse(readFileSync(join(root, 'resources/blocks', slug, 'block.json'), 'utf8'));
  return Object.fromEntries(Object.entries(attributes).map(([k, a]) => [k, a.default]));
};

test('every reference block renders', async (t) => {
  const root = exampleTheme(t);
  for (const slug of exampleSlugs) {
    await t.test(`${slug}: no attributes`, () => {
      assert.doesNotThrow(() => renderBlock(root, slug, {}));
    });
    await t.test(`${slug}: defaults print the padding and the entrance`, () => {
      const html = renderBlock(root, slug, defaults(root, slug));
      assert.match(html, /<section/);
      assert.match(html, /data-entrance/);
      assert.doesNotMatch(html, /@(paddingClasses|entrance|entrancePart)\(|<x-/);
    });
    await t.test(`${slug}: hostile input stays inert`, () => {
      const attrs = hostile(defaults(root, slug));
      attrs.anchor = '"><script>alert(1)</script>';
      const html = renderBlock(root, slug, attrs);
      assert.doesNotMatch(html, /<script/i);
      assert.doesNotMatch(html, /javascript:/i);
      assert.doesNotMatch(html, /<[^>]*\son\w+=/i);
    });
  }
});

test('a URL with a query string prints once-encoded, as <x-button-link> must', (t) => {
  const root = exampleTheme(t);
  const html = renderBlock(root, 'section-intro', {
    ctaText: 'Go',
    ctaLink: { url: 'https://acme.test/?a=1&b=2', opensInNewTab: true },
  });
  assert.match(html, /href="https:\/\/acme\.test\/\?a=1&#038;b=2"/);
  assert.match(html, /target="_blank"/);
});

test('a link with a bad scheme prints no button', (t) => {
  const root = exampleTheme(t);
  const html = renderBlock(root, 'section-intro', { ctaText: 'Go', ctaLink: { url: BAD_URL } });
  assert.doesNotMatch(html, /class="btn/);
});

test('post-grid prints real cards and escapes what an author typed', (t) => {
  const root = exampleTheme(t);
  const html = renderBlock(root, 'post-grid', { ...defaults(root, 'post-grid'), testTitle: SCRIPT, testUrl: BAD_URL });
  assert.equal((html.match(/<article class="card/g) ?? []).length, 3);
  assert.doesNotMatch(html, /<script|javascript:/i);
  // Inside a quoted attribute the text is inert, so only what's outside the quotes counts.
  assert.doesNotMatch(html.replace(/"[^"]*"/g, '""'), /<[^>]*\son\w+=/i);
  assert.match(html, /alt="&lt;script&gt;/);
});

test('post-grid pages past its limit and shows nothing without an adapter', (t) => {
  const root = exampleTheme(t);
  const paged = renderBlock(root, 'post-grid', { ...defaults(root, 'post-grid'), postsPerPage: 2 });
  assert.equal((paged.match(/<article class="card/g) ?? []).length, 2);
  assert.match(paged, /post-grid-page=2/);
  assert.equal(renderBlock(root, 'post-grid', { contentType: 'nope' }).trim(), '');
});

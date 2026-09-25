import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  callPhp,
  clearDirectives,
  openingTag,
  post,
  registerDirective,
  renderBlock,
  renderView,
  resolveAutoload,
  themeRoot,
} from './render-harness.mjs';

const fixtures = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'test-fixtures',
);

test.afterEach(() => clearDirectives());

/* -------------------------------------------------------------------- *
 * Generic escaping fakes, ported from White Summers (they name no theme
 * class or content type, so they hold for any project).
 * -------------------------------------------------------------------- */

test('esc_url rejects a scheme outside the allowed list and keeps the rest', () => {
  for (const bad of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java\nscript:alert(1)',
    ' data:text/html;base64,AAAA',
    'vbscript:msgbox(1)',
  ]) {
    assert.equal(callPhp('esc_url', [bad]), '', bad);
    assert.equal(callPhp('esc_url_raw', [bad]), '', bad);
  }

  for (const good of [
    'https://example.com/a',
    'mailto:a@example.com',
    'tel:+15551234',
    '/example/',
    '#top',
  ]) {
    assert.equal(callPhp('esc_url', [good]), good);
  }

  assert.equal(callPhp('esc_url', ['example.com']), 'http://example.com');
  assert.equal(callPhp('esc_url', ['/a?b=1&c=2']), '/a?b=1&#038;c=2');
  assert.equal(callPhp('esc_url_raw', ['/a?b=1&c=2']), '/a?b=1&c=2');
});

test('wp_kses_post removes script, on* attributes and javascript: URLs', () => {
  const dirty =
    '<p onclick="x()">Hi <script>alert(1)</script><a href="javascript:alert(1)" onmouseover="y()">go</a> <strong>bold</strong><img src=x onerror=z()></p>';
  const clean = callPhp('wp_kses_post', [dirty]);

  assert.doesNotMatch(clean, /<script/i);
  assert.doesNotMatch(clean, /\bon\w+\s*=/i);
  assert.doesNotMatch(clean, /javascript:/i);
  assert.match(clean, /<strong>bold<\/strong>/);
  assert.match(clean, /<a href="alert\(1\)">go<\/a>/);
});

test('esc_attr and esc_html encode the five entities without double-encoding', () => {
  assert.equal(
    callPhp('esc_attr', [`<a href="x" title='y'>&</a>`]),
    '&lt;a href=&quot;x&quot; title=&#039;y&#039;&gt;&amp;&lt;/a&gt;',
  );
  assert.equal(callPhp('esc_html', ['Tom &amp; Jerry']), 'Tom &amp; Jerry');
});

test('sanitize_text_field strips tags, script content and octets, and collapses whitespace', () => {
  assert.equal(
    callPhp('sanitize_text_field', [
      '  <b>Hello</b>\n\t  world<script>alert(1)</script> %0Aend  ',
    ]),
    'Hello world end',
  );
});

/* -------------------------------------------------------------------- *
 * New tests for each fix (see docs/plans/audit/tests-blocks.md, section 3).
 * -------------------------------------------------------------------- */

test('get_bloginfo reads env.blogName, with a neutral default', () => {
  assert.equal(callPhp('get_bloginfo', ['name']), 'Test Site');
  assert.equal(
    callPhp('get_bloginfo', ['name'], { blogName: 'Acme Co' }),
    'Acme Co',
  );
});

test('wp_get_attachment_image has the same default arguments as core, and a caller may pass fewer', () => {
  assert.match(callPhp('wp_get_attachment_image', [42]), /attachment-42\.jpg/);
});

test('a registered directive reaches Blade view rendering, with no directive hard-coded', () => {
  registerDirective('shout', 'strtoupper($e)');

  const markup = renderView('directive-fixture', {}, { root: fixtures });

  assert.match(markup, /HELLO/);
});

test('env.functions defines a WordPress function this harness does not fake', () => {
  const result = callPhp('is_page', ['about'], {
    functions: ['function is_page($slug) { return $slug === "about"; }'],
  });

  assert.equal(result, true);
  assert.equal(callPhp('is_page', ['contact'], {
    functions: ['function is_page($slug) { return $slug === "about"; }'],
  }), false);
});

test('post() builds a generic fixture post, not a theme-specific content type', () => {
  const a = post('project', 'Alpha');
  const b = post('project', 'Bravo', { meta: { client: 'X' }, status: 'draft' });

  assert.equal(a.type, 'project');
  assert.equal(a.title, 'Alpha');
  assert.deepEqual(a.meta, {});
  assert.notEqual(a.id, b.id);
  assert.equal(b.status, 'draft');
  assert.deepEqual(b.meta, { client: 'X' });
});

test('openingTag matches the exact class, not a hyphenated neighbour', () => {
  const html =
    '<div class="home-fixture-block"><div class="fixture-block"><span class="fixture-block-icon"></span></div></div>';

  assert.equal(
    openingTag(html, 'fixture-block'),
    '<div class="fixture-block">',
  );
  assert.equal(openingTag(html, 'fixture'), null);
});

test('renderBlock reads a fixture folder instead of the theme resources, via env.root', () => {
  const markup = renderBlock(
    'fixture-block',
    { heading: 'Hi there', body: 'Body copy' },
    [],
    { root: fixtures },
  );

  assert.equal(openingTag(markup, 'fixture-block'), '<div class="fixture-block">');
  assert.equal(openingTag(markup, 'home-fixture-block')?.replace(/\s+/g, ' '), '<div class="home-fixture-block">');
  assert.match(markup, /Hi there/);
  assert.match(markup, /Body copy/);
  assert.match(markup, /Test Site/);
});

test('resolveAutoload throws a clear error when nothing is found', () => {
  const empty = resolve(fixtures, 'no-such-folder');

  assert.throws(() => resolveAutoload(empty), /No Composer autoload found/);
});

test('resolveAutoload finds the kit root vendor when the theme has none of its own', () => {
  // themeRoot (theme/) ships no vendor/ of its own; this must fall back to
  // the kit root's, which `npm run`/`composer install` set up for the suite.
  assert.match(resolveAutoload(themeRoot), /vendor\/autoload\.php$/);
});

test('get_post_meta returns an array when $single is false, matching WordPress', () => {
  const alpha = post('project', 'Alpha', { meta: { color: 'red' } });

  assert.deepEqual(callPhp('get_post_meta', [alpha.id, 'color'], { posts: [alpha] }), ['red']);
  assert.equal(callPhp('get_post_meta', [alpha.id, 'color', true], { posts: [alpha] }), 'red');
  assert.deepEqual(callPhp('get_post_meta', [alpha.id, 'missing'], { posts: [alpha] }), []);
  assert.equal(callPhp('get_post_meta', [alpha.id, 'missing', true], { posts: [alpha] }), '');
});

test('a directive body containing $env is not corrupted by the $e placeholder substitution', () => {
  registerDirective('shout', "'$env-' . strtoupper($e)");

  const markup = renderView('directive-fixture', {}, { root: fixtures });

  assert.match(markup, /\$env-HELLO/);
});

test('a PHP warning during rendering does not corrupt the JSON callPhp expects on stdout', () => {
  const result = callPhp('noisy', [], {
    functions: ['function noisy() { $x = $undefined_var_triggers_a_warning; return 42; }'],
  });

  assert.equal(result, 42);
});

test('ABSPATH is defined before the Composer autoload runs, for a package that guards on it', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'abspath-guard-'));
  const autoload = resolve(dir, 'autoload.php');
  writeFileSync(
    autoload,
    '<?php\n' +
      'if (!defined("ABSPATH")) { fwrite(STDERR, "ABSPATH not yet defined"); exit(1); }\n' +
      `require ${JSON.stringify(resolveAutoload())};\n`,
  );

  const prevAutoload = process.env.KIT_AUTOLOAD;
  process.env.KIT_AUTOLOAD = autoload;
  try {
    assert.equal(callPhp('absint', [5]), 5);
  } finally {
    if (prevAutoload === undefined) delete process.env.KIT_AUTOLOAD;
    else process.env.KIT_AUTOLOAD = prevAutoload;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a quiet call still reports a PHP fatal in the thrown error', () => {
  assert.throws(
    () => callPhp('__boom', [], { quiet: true, functions: ["function __boom() { throw new Exception('kaboom'); }"] }),
    /kaboom/,
  );
});

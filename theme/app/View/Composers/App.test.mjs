import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { appRoot, callKitPhp } from '../../test-support.mjs';

const ACORN_COMPOSER_STUB = "namespace Roots\\Acorn\\View; class Composer {}";

const REQUIRES = [resolve(appRoot, 'View/Composers/App.php')];

const mainUnderHeader = ({ filterReturns = [], singular = true } = {}) =>
  callKitPhp('__test_main_under_header', [], {
    requires: REQUIRES,
    functions: [
      ACORN_COMPOSER_STUB,
      `function apply_filters($tag, $value) { return ${JSON.stringify(filterReturns)}; }`,
      `function is_singular($postTypes) { return ${singular ? 'true' : 'false'}; }`,
      'function __test_main_under_header() { return (new \\App\\View\\Composers\\App())->mainUnderHeader(); }',
    ],
  });

// H1: WP_Query::is_singular() treats an empty $post_types array as "any
// singular view", not "none" — the documented default must not reach it.
test('the documented default (no post types) never puts main--under-header on a singular page', () => {
  assert.equal(mainUnderHeader({ filterReturns: [], singular: true }), false);
});

test('a project-added post type on a matching singular page does get main--under-header', () => {
  assert.equal(mainUnderHeader({ filterReturns: ['project'], singular: true }), true);
});

test('a project-added post type on a non-matching page does not get main--under-header', () => {
  assert.equal(mainUnderHeader({ filterReturns: ['project'], singular: false }), false);
});

// H6: get_bloginfo('name', 'display') already HTML-encodes; Blade's {{ }}
// encodes a second time on print, so "Smith & Co" would render
// "Smith &#038; Co" without the decode here.
test('siteName() decodes the display-filtered bloginfo so Blade only encodes once', () => {
  const result = callKitPhp('__test_site_name', [], {
    requires: [resolve(appRoot, 'View/Composers/App.php')],
    blogName: 'Smith &#038; Co',
    functions: [
      ACORN_COMPOSER_STUB,
      'function __test_site_name() { return (new \\App\\View\\Composers\\App())->siteName(); }',
    ],
  });

  assert.equal(result, 'Smith & Co');
});

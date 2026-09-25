import { test } from 'node:test';
import assert from 'node:assert/strict';

import { callPhp } from '../../scripts/render-harness.mjs';
import { APP_AUTOLOAD } from './test-support.mjs';

// register() only calls add_filter(); this fakes it to capture the callback
// and run it against a category list, the way block_categories_all would.
const FAKE_ADD_FILTER = `
$GLOBALS['__filters'] = [];
function add_filter($hook, $callback, $priority = 10) {
    $GLOBALS['__filters'][$hook][] = $callback;
}
function __test_register_categories($initial) {
    App\\Blocks\\BlockCategories::register();
    foreach ($GLOBALS['__filters']['block_categories_all'] as $callback) {
        $initial = $callback($initial);
    }
    return $initial;
}
`;

test('register prepends the configured category', () => {
  const result = callPhp(
    '__test_register_categories',
    [[{ slug: 'core', title: 'Core', icon: null }]],
    { functions: [APP_AUTOLOAD, FAKE_ADD_FILTER] },
  );

  assert.deepEqual(result[0], { slug: '__BLOCK_CATEGORY_SLUG__', title: '__BLOCK_CATEGORY_TITLE__', icon: null });
  assert.deepEqual(result[1], { slug: 'core', title: 'Core', icon: null });
});

test('register drops a stale duplicate of its own slug instead of listing it twice', () => {
  const result = callPhp(
    '__test_register_categories',
    [[{ slug: '__BLOCK_CATEGORY_SLUG__', title: 'Old Title', icon: null }, { slug: 'core', title: 'Core', icon: null }]],
    { functions: [APP_AUTOLOAD, FAKE_ADD_FILTER] },
  );

  assert.equal(result.filter((c) => c.slug === '__BLOCK_CATEGORY_SLUG__').length, 1);
  assert.equal(result[0].title, '__BLOCK_CATEGORY_TITLE__');
});

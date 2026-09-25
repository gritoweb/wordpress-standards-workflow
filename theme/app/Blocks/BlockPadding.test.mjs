import { test } from 'node:test';
import assert from 'node:assert/strict';

import { callPhp } from '../../scripts/render-harness.mjs';
import { APP_AUTOLOAD } from './test-support.mjs';

const env = { functions: [APP_AUTOLOAD] };

const fromAttributes = (attrs, ...rest) =>
  callPhp('App\\Blocks\\BlockPadding::fromAttributes', [attrs, ...rest], env);

const resolve = (vm, vd, xm, xd) =>
  callPhp('App\\Blocks\\BlockPadding::resolve', [vm, vd, xm, xd], env);

test('fromAttributes falls back to the caller defaults when unset', () => {
  assert.deepEqual(fromAttributes({}, 218, 96, false), {
    paddingVertDesktop: 218,
    paddingVertMobile: 96,
    paddingXDesktop: false,
    paddingXMobile: false,
  });
});

test("fromAttributes's own defaults match BlockManager::globalAttributes()", () => {
  // block.json is the only source of a block's padding default — the PHP
  // default (112/56/true/true) only matters to a caller, such as a test,
  // that builds $attributes by hand and passes no override arguments.
  assert.deepEqual(fromAttributes({}), {
    paddingVertDesktop: 112,
    paddingVertMobile: 56,
    paddingXDesktop: true,
    paddingXMobile: true,
  });
});

test('fromAttributes reads saved values with absint and a bool cast', () => {
  assert.deepEqual(
    fromAttributes(
      { paddingVertDesktop: '218', paddingVertMobile: -96, paddingXDesktop: 0, paddingXMobile: 1 },
    ),
    { paddingVertDesktop: 218, paddingVertMobile: 96, paddingXDesktop: false, paddingXMobile: true },
  );
});

test('resolve maps every preset step to its class', () => {
  assert.equal(resolve(96, 218, true, true), 'py-24 md:py-[13.625rem] px-5 lg:px-[6rem]');
  assert.equal(resolve(56, 112, true, false), 'py-14 md:py-28 px-5 lg:px-0');
  assert.equal(resolve(0, 0, false, false), 'py-0 md:py-0 px-0 lg:px-0');
});

test('resolve falls back to the default 56/112 step for an unmapped value, not the nearest one below it', () => {
  assert.equal(resolve(9999, 9999, true, true), 'py-14 md:py-28 px-5 lg:px-[6rem]');
});

// The canvas prints the same classes (padding-presets.js), so the editor adapts to its width like the page.
test('resolve and editorPaddingClasses agree on every preset', async () => {
  const { editorPaddingClasses, PADDING_PRESETS } = await import('../../resources/blocks/components/backend/padding-presets.js');
  for (const { px: vm } of PADDING_PRESETS.vertical.mobile) {
    for (const { px: vd } of PADDING_PRESETS.vertical.desktop) {
      for (const x of [true, false]) {
        const attrs = { paddingVertMobile: vm, paddingVertDesktop: vd, paddingXMobile: x, paddingXDesktop: x };
        assert.equal(resolve(vm, vd, x, x), editorPaddingClasses(attrs));
      }
    }
  }
});

test('resolve falls back to lg:px-0, not md:px-0, for an unmapped horizontal-desktop value', () => {
  // A boolean only has two states, so this path is unreachable through normal
  // callers — it exists so a future non-boolean caller doesn't get a
  // fallback class at the wrong breakpoint.
  assert.match(resolve(0, 0, false, false), /\blg:px-0\b/);
});

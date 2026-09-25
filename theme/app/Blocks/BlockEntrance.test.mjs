import { test } from 'node:test';
import assert from 'node:assert/strict';

import { callPhp } from '../../scripts/render-harness.mjs';
import { APP_AUTOLOAD } from './test-support.mjs';

const env = { functions: [APP_AUTOLOAD] };

const sanitize = (raw) => callPhp('App\\Blocks\\BlockEntrance::sanitize', [raw], env);
const root = (entrance, extraStyle) =>
  callPhp('App\\Blocks\\BlockEntrance::root', extraStyle === undefined ? [entrance] : [entrance, extraStyle], env);
const part = (index, extraStyle) =>
  callPhp(
    'App\\Blocks\\BlockEntrance::part',
    index === undefined ? [] : extraStyle === undefined ? [index] : [index, extraStyle],
    env,
  );
const clamp = (value, min, max) => callPhp('App\\Blocks\\BlockEntrance::clamp', [value, min, max], env);

test('sanitize fills unset numbers with null (site default), not zero', () => {
  assert.deepEqual(sanitize({}), {
    type: 'fade-slide',
    direction: 'up',
    distance: null,
    unit: 'px',
    duration: null,
    delay: null,
    stagger: null,
    trigger: 'section',
  });
});

test('sanitize clamps numbers into their limits', () => {
  assert.deepEqual(sanitize({ distance: 99999, duration: -50, delay: 10, stagger: 40 }), {
    type: 'fade-slide',
    direction: 'up',
    distance: 2000,
    unit: 'px',
    duration: 0,
    delay: 10,
    stagger: 40,
    trigger: 'section',
  });
});

test('sanitize rejects an unlisted enum value', () => {
  assert.equal(sanitize({ type: 'spin' }).type, 'fade-slide');
  assert.equal(sanitize({ trigger: 'row' }).trigger, 'section');
});

test('root prints no style attribute when every number is null (site default)', () => {
  assert.equal(root({ type: 'fade' }), 'data-entrance="fade" data-entrance-dir="up"');
});

test('root prints only the numbers that were set', () => {
  assert.equal(
    root({ type: 'slide', direction: 'left', distance: 40, duration: 500 }),
    'data-entrance="slide" data-entrance-dir="left" style="--e-distance: 40px; --e-duration: 500ms"',
  );
});

test('root omits the attribute set entirely for "none"', () => {
  assert.equal(root({ type: 'none' }), '');
});

test('root returns "" for a non-array entrance', () => {
  assert.equal(root(null), '');
});

test('root adds data-entrance-trigger only for "item"', () => {
  assert.match(root({ type: 'fade', trigger: 'item' }), /data-entrance-trigger="item"/);
  assert.doesNotMatch(root({ type: 'fade', trigger: 'section' }), /data-entrance-trigger/);
});

test('root merges extraStyle into the same style attribute, ahead of the entrance overrides', () => {
  assert.equal(
    root({ type: 'fade', distance: 10 }, '--x: 1'),
    'data-entrance="fade" data-entrance-dir="up" style="--x: 1; --e-distance: 10px"',
  );
});

test('root prints extraStyle alone when there is no entrance', () => {
  assert.equal(root(null, '--x: 1'), 'style="--x: 1"');
  assert.equal(root({ type: 'none' }, '--x: 1'), 'style="--x: 1"');
});

// M3: Blade compiles a bare @entrance() to BlockEntrance::root() with no
// arguments; without a default this is a fatal ArgumentCountError.
test('root with no arguments at all is the same as no entrance', () => {
  assert.equal(callPhp('App\\Blocks\\BlockEntrance::root', [], env), '');
});

// M2: $extraStyle is caller text (blade-standards' @entrance($entrance,
// $extraStyle) argument), never a whitelisted literal, so it must be
// escaped like any other attribute value.
test('root escapes extraStyle so it cannot break out of the style attribute', () => {
  assert.equal(
    root(null, 'x" onmouseover="y'),
    'style="x&quot; onmouseover=&quot;y"',
  );
  assert.equal(
    root({ type: 'fade', distance: 10 }, 'x" onmouseover="y'),
    'data-entrance="fade" data-entrance-dir="up" style="x&quot; onmouseover=&quot;y; --e-distance: 10px"',
  );
});

test('part omits the style for index 0 and includes it above 0', () => {
  assert.equal(part(0), 'data-entrance-part');
  assert.equal(part(), 'data-entrance-part');
  assert.equal(part(3), 'data-entrance-part style="--e-i: 3"');
});

// M1: a caller with its own per-part inline style (logo-wall's per-logo
// cell sizing) must not print a second style="" — HTML keeps only the
// first one an element carries, silently dropping --e-i.
test('part merges an extra style into the same attribute instead of a second style=', () => {
  assert.equal(part(0, '--brand-cell: 64px'), 'data-entrance-part style="--brand-cell: 64px"');
  assert.equal(part(2, '--brand-cell: 64px'), 'data-entrance-part style="--brand-cell: 64px; --e-i: 2"');
  assert.equal(part(2, ''), 'data-entrance-part style="--e-i: 2"');
  assert.equal(
    part(2, 'x" onmouseover="y'),
    'data-entrance-part style="x&quot; onmouseover=&quot;y; --e-i: 2"',
  );
});

test('clamp returns null for a non-numeric value', () => {
  assert.equal(clamp('abc', 0, 10), null);
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(50, 0, 10), 10);
});

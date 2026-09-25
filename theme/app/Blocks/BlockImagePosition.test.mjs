import { test } from 'node:test';
import assert from 'node:assert/strict';

import { callPhp } from '../../scripts/render-harness.mjs';
import { APP_AUTOLOAD } from './test-support.mjs';

const env = { functions: [APP_AUTOLOAD] };
const positions = () => callPhp('App\\Blocks\\BlockImagePosition::positions', [], env);
const cssValue = (position) => callPhp('App\\Blocks\\BlockImagePosition::cssValue', [position], env);

test('positions lists all nine grid points', () => {
  assert.deepEqual(positions(), [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'center', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right',
  ]);
});

test('cssValue maps every position to an object-position pair', () => {
  assert.equal(cssValue('top-left'), 'left top');
  assert.equal(cssValue('center'), 'center center');
  assert.equal(cssValue('bottom-right'), 'right bottom');
});

test('cssValue falls back to "center center" for an unknown position', () => {
  assert.equal(cssValue('nowhere'), 'center center');
});

// The entrance number limits (distance/duration/delay/stagger) are declared
// three times: BlockEntrance::LIMITS (server clamp), entranceCanvas.js LIMITS
// (editor preview clamp), and the Site Settings > Motion ACF fields (the
// editor UI's own min/max). This is the one test that proves all three agree,
// instead of a fourth hand-kept copy drifting from the rest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { callPhp } from '../../scripts/render-harness.mjs';
import { executeBundle } from '../../scripts/editor-test-bundle.mjs';
import { APP_AUTOLOAD } from './test-support.mjs';

const canvasEntry = fileURLToPath(
  new URL('../../resources/blocks/components/backend/entranceCanvas.js', import.meta.url),
);

// group___PREFIX___site_settings.json — the Site Settings ACF group is a
// different worker's file (Site Settings/PR 3) and isn't guaranteed to exist
// in this branch yet. Skip that one assertion with a message, as the brief
// asks; the integrator re-runs this once it lands.
const acfPath = fileURLToPath(
  new URL('../../acf-json/group___PREFIX___site_settings.json', import.meta.url),
);

function findLimits(node, name, limits = {}) {
  if (Array.isArray(node)) {
    for (const item of node) findLimits(item, name, limits);
  } else if (node && typeof node === 'object') {
    if (node.name === name && ('min' in node || 'max' in node)) {
      limits.min = node.min;
      limits.max = node.max;
    }
    for (const value of Object.values(node)) findLimits(value, name, limits);
  }
  return limits;
}

const GET_LIMITS = 'function __test_entrance_limits() { return \\App\\Blocks\\BlockEntrance::LIMITS; }';

test('BlockEntrance::LIMITS and entranceCanvas.js LIMITS agree', async () => {
  const phpLimits = callPhp('__test_entrance_limits', [], { functions: [APP_AUTOLOAD, GET_LIMITS] });
  const { LIMITS: jsLimits } = await executeBundle(canvasEntry, [], 'EntranceCanvasLimits');

  assert.deepEqual(phpLimits, jsLimits);
});

test('the ACF Motion fields agree with BlockEntrance::LIMITS, when the Site Settings group exists', (t) => {
  if (!existsSync(acfPath)) {
    t.skip('theme/acf-json/group___PREFIX___site_settings.json not present');
    return;
  }

  const phpLimits = callPhp('__test_entrance_limits', [], { functions: [APP_AUTOLOAD, GET_LIMITS] });
  const group = JSON.parse(readFileSync(acfPath, 'utf8'));

  for (const [key, [min, max]] of Object.entries(phpLimits)) {
    const acf = findLimits(group, `motion_${key}`);
    assert.equal(Number(acf.min), min, `ACF ${key} min should be ${min}`);
    assert.equal(Number(acf.max), max, `ACF ${key} max should be ${max}`);
  }
});

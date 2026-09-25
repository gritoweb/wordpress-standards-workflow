import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';

const entry = fileURLToPath(new URL('./ground.js', import.meta.url));

const CONFIG_STUB = `export default { grounds: [
  { name: 'primary', token: '--color-primary', light: true },
  { name: 'earth-dark', token: '--color-earth-950', light: false },
] };`;

const bundle = () =>
  executeBundle(entry, [['kit-config-stub', CONFIG_STUB]], 'GroundModule', {
    'kit.config.json': 'kit-config-stub',
  });

test('GROUNDS reads name/token/light straight from kit.config.json, no hard-coded names', async () => {
  const { GROUNDS } = await bundle();
  assert.deepEqual(GROUNDS, [
    { value: 'primary', label: 'Primary', background: 'var(--color-primary)', light: true },
    { value: 'earth-dark', label: 'Earth Dark', background: 'var(--color-earth-950)', light: false },
  ]);
});

test('GROUND_OPTIONS is a value/label pair for a SelectControl', async () => {
  const { GROUND_OPTIONS } = await bundle();
  assert.deepEqual(GROUND_OPTIONS, [
    { value: 'primary', label: 'Primary' },
    { value: 'earth-dark', label: 'Earth Dark' },
  ]);
});

test('groundClass and isLightGround match BlockAttributes.php for a known ground', async () => {
  const { groundClass, isLightGround } = await bundle();
  assert.equal(groundClass('primary'), 'ground-primary');
  assert.equal(isLightGround('primary'), true);
  assert.equal(isLightGround('earth-dark'), false);
});

test('groundClass and isLightGround degrade cleanly for an unknown/stale ground', async () => {
  const { groundClass, isLightGround } = await bundle();
  assert.equal(groundClass('gone'), '');
  assert.equal(isLightGround('gone'), true);
});

test('an empty grounds config (before the design system phase) yields no options', async () => {
  const { GROUNDS } = await executeBundle(entry, [['kit-config-stub', 'export default { grounds: [] };']], 'GroundModuleEmpty', {
    'kit.config.json': 'kit-config-stub',
  });
  assert.deepEqual(GROUNDS, []);
});

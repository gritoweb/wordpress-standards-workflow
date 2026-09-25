// Grounds are written once, in kit.config.json, and read independently by
// BlockAttributes.php (server render) and components/backend/ground.js (the
// editor). This is the one test that proves they agree, instead of a second
// hand-kept list drifting from the first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import { callPhp } from '../../scripts/render-harness.mjs';
import { executeBundle } from '../../scripts/editor-test-bundle.mjs';
import { APP_AUTOLOAD } from './test-support.mjs';

const groundEntry = fileURLToPath(new URL('../../resources/blocks/components/backend/ground.js', import.meta.url));

const GROUNDS = [
  { name: 'primary', token: '--color-primary', light: true },
  { name: 'ink', token: '--color-ink', light: false },
  { name: 'earth-dark', token: '--color-earth-950', light: false },
];

async function jsSide() {
  return executeBundle(
    groundEntry,
    [['kit-config-stub', `export default { grounds: ${JSON.stringify(GROUNDS)} };`]],
    'GroundsParityModule',
    { 'kit.config.json': 'kit-config-stub' },
  );
}

function phpSide(root) {
  const functions = [APP_AUTOLOAD, `function get_template_directory() { return ${JSON.stringify(root)}; }`];
  return {
    groundClass: (g) => callPhp('App\\Blocks\\BlockAttributes::groundClass', [g], { functions }),
    isLightGround: (g) => callPhp('App\\Blocks\\BlockAttributes::isLightGround', [g], { functions }),
    ctaButtonClass: (g, t) => callPhp('App\\Blocks\\BlockAttributes::ctaButtonClass', [g, t], { functions }),
  };
}

test('PHP groundClass/isLightGround and JS groundClass/isLightGround agree for every configured and unknown ground', async () => {
  const root = mkdtempSync(join(tmpdir(), 'grounds-parity-'));
  writeFileSync(join(root, 'kit.config.json'), JSON.stringify({ grounds: GROUNDS }));

  const php = phpSide(root);
  const js = await jsSide();

  for (const { name } of [...GROUNDS, { name: 'unknown-ground' }]) {
    assert.equal(js.groundClass(name), php.groundClass(name), `groundClass('${name}') should match`);
    assert.equal(js.isLightGround(name), php.isLightGround(name), `isLightGround('${name}') should match`);
  }

  rmSync(root, { recursive: true, force: true });
});

test('PHP ctaButtonClass and JS ctaButtonClass agree, both by ground and by an explicit tone override', async () => {
  const root = mkdtempSync(join(tmpdir(), 'grounds-parity-'));
  writeFileSync(join(root, 'kit.config.json'), JSON.stringify({ grounds: GROUNDS }));

  const php = phpSide(root);
  const js = await jsSide();

  for (const { name } of [...GROUNDS, { name: 'unknown-ground' }]) {
    assert.equal(js.ctaButtonClass(name), php.ctaButtonClass(name, null), `ctaButtonClass('${name}') should match`);
  }

  for (const tone of ['light', 'dark']) {
    assert.equal(js.ctaButtonClass('ignored', tone), php.ctaButtonClass('ignored', tone), `ctaButtonClass(tone: '${tone}') should match`);
  }

  rmSync(root, { recursive: true, force: true });
});

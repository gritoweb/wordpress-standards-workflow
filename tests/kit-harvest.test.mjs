// Kit-only: the kit-harvest conformance report over a passing theme and over a
// copy that breaks one rule and opts out of another.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { conformanceReport } from '../skills/kit-harvest/conformance-report.mjs';

const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = join(kitRoot, 'theme', 'scripts', 'test-fixtures', 'conformance');
const passing = join(fixtures, 'passing');
const block = 'resources/blocks/conformance-pass';

// Same setup as conformance-rules.test.mjs: inside the repo so react resolves,
// with the shared components and partials linked as a real theme has them.
function copyFixture() {
  const dir = mkdtempSync(join(fixtures, '.run-'));
  cpSync(passing, dir, { recursive: true, filter: (source) => !/resources[\\/](blocks[\\/]components|views[\\/]partials)$/.test(source) });
  symlinkSync(join(kitRoot, 'theme/resources/blocks/components'), join(dir, 'resources/blocks/components'));
  symlinkSync(join(kitRoot, 'theme/resources/views/partials'), join(dir, 'resources/views/partials'));

  return dir;
}

test('a passing theme reports no failures and no opt-outs', async () => {
  const report = await conformanceReport(passing);

  assert.match(report, /Checked 1 blocks: 1 pass, 0 fail\. Theme-wide failures: 0\./);
  assert.match(report, /No block opts out of a rule\./);
});

test('a failing theme lists the failing rule, its block, and every opt-out reason', async () => {
  const dir = copyFixture();
  try {
    const jsonPath = join(dir, block, 'block.json');
    const json = JSON.parse(readFileSync(jsonPath, 'utf8'));
    Object.assign(json, { name: 'acme/conformance-pass', category: 'acme', textdomain: 'acme' });
    delete json.supports.anchor;
    json.__conformance = { skip: { 'MEDIA-3': 'hand-rolled frame, ticket 123' } };
    writeFileSync(jsonPath, JSON.stringify(json, null, 4));

    const report = await conformanceReport(dir, { full: true });

    assert.match(report, /1 fail\./);
    assert.match(report, /\| `JSON-2` \|.*conformance-pass/);
    assert.doesNotMatch(report, /`JSON-1`/);
    assert.match(report, /- `conformance-pass` skips `MEDIA-3`: hand-rolled frame, ticket 123/);
    assert.match(report, /#### conformance-pass\n\n- .*JSON-2/);
    assert.match(report, /no `kit\.config\.json`.*namespace `acme`/s);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a theme with no kit.config.json still has its app/ folder checked', async () => {
  const dir = copyFixture();
  try {
    mkdirSync(join(dir, 'app'));
    writeFileSync(join(dir, 'app', 'setup.php'), "<?php\nwp_enqueue_script('swiper', 'x.js');\n");

    const report = await conformanceReport(dir);

    assert.match(report, /Theme-wide failures: 1\./);
    assert.match(report, /PHP-11/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a theme with no blocks says so', async () => {
  assert.match(await conformanceReport(join(kitRoot, 'skills')), /No blocks found/);
});

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { applyReplacements, findPlaceholders, validateConfig } from './kit-setup.mjs';

const config = { textDomain: 'acme', themeSlug: 'acme', blockNamespace: 'acme' };

function theme(t) {
  const root = mkdtempSync(join(tmpdir(), 'kit-setup-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'app'));
  mkdirSync(join(root, 'docs'));
  writeFileSync(join(root, 'style.css'), '/*\nText Domain: acme\n*/\n');
  writeFileSync(join(root, 'app/a.php'), "__('Hi', '__TEXT_DOMAIN__'); // __BLOCK_NAMESPACE__/x __BLOCK_TITLE__");
  writeFileSync(join(root, 'docs/a.md'), '__TEXT_DOMAIN__');
  return root;
}

test('fills the placeholders once, leaves per-block tokens and docs alone', (t) => {
  const root = theme(t);
  assert.equal(findPlaceholders(root).length, 2);
  assert.equal(applyReplacements(root, config), 1);
  assert.equal(applyReplacements(root, config), 0);
  assert.equal(readFileSync(join(root, 'app/a.php'), 'utf8'), "__('Hi', 'acme'); // acme/x __BLOCK_TITLE__");
  assert.equal(readFileSync(join(root, 'docs/a.md'), 'utf8'), '__TEXT_DOMAIN__');
  assert.deepEqual(findPlaceholders(root), []);
});

test("replaces Sage's own text domain", (t) => {
  const root = theme(t);
  writeFileSync(join(root, 'app/b.php'), "__('Primary', 'sage');");
  applyReplacements(root, config);
  assert.equal(readFileSync(join(root, 'app/b.php'), 'utf8'), "__('Primary', 'acme');");
});

test('refuses "sage" and a text domain that differs from style.css', (t) => {
  const root = theme(t);
  assert.doesNotThrow(() => validateConfig(config, root));
  assert.throws(() => validateConfig({ ...config, themeSlug: 'sage' }, root), /may not be "sage"/);
  assert.throws(() => validateConfig({ ...config, textDomain: 'other' }, root), /doesn't match style\.css/);
});

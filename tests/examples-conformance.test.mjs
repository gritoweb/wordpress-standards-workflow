import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { buildKitTheme, kit, materializeExamples } from './support.mjs';

test("_docs/examples.md's reference blocks pass conformance with no errors", () => {
  const root = buildKitTheme();
  try {
    execFileSync('node', ['scripts/kit-setup.mjs'], { cwd: root, stdio: 'pipe' });
    assert.ok(materializeExamples(root).length >= 3);
    let out;
    try {
      out = execFileSync('node', ['scripts/conformance.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, KIT_AUTOLOAD: join(kit, 'vendor/autoload.php') } });
    } catch (error) {
      assert.fail(`conformance exited ${error.status}:\n${error.stdout}`);
    }
    assert.match(out, / 0 error\(s\)/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// Regression test for the render harness leaking a `render-harness-*` temp
// folder per test run (docs/plans/audit.md finding 9). Runs a child process
// so it can observe the workspace before and after render-harness.mjs's own
// process exits, which this same process can't do to itself.
//
// `npm test` runs every *.test.mjs file as its own concurrent process, and
// render-harness.test.mjs is one of them — it makes (and, once fixed,
// removes) its own `render-harness-*` workspace at the same time this test
// runs. So this checks one specific directory name, not a count of
// everything matching the prefix in the shared tmpdir.

const modulePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'render-harness.mjs',
);

test('the render harness workspace is created lazily and removed when the process exits', (t) => {
  // A prefix that does NOT start with "render-harness-" — this scratch dir
  // must not be mistaken for the one under test.
  const scriptDir = mkdtempSync(resolve(tmpdir(), 'rh-cleanup-test-'));
  t.after(() => rmSync(scriptDir, { recursive: true, force: true }));
  const scriptPath = resolve(scriptDir, 'probe.mjs');
  writeFileSync(
    scriptPath,
    `
    import { readdirSync } from 'node:fs';
    import { tmpdir } from 'node:os';
    import { callPhp } from ${JSON.stringify(modulePath)};

    const list = () => new Set(readdirSync(tmpdir()).filter((n) => n.startsWith('render-harness-')));

    const before = list();
    callPhp('absint', [5]);
    const after = list();
    const created = [...after].filter((n) => !before.has(n));

    process.stdout.write(JSON.stringify(created) + '\\n');
    `,
  );

  // The child gets a private TMPDIR, so workspaces made by other test files
  // running in parallel can't be counted as its own.
  const privateTmp = resolve(scriptDir, 'tmp');
  mkdirSync(privateTmp);
  const created = JSON.parse(
    execFileSync('node', [scriptPath], { encoding: 'utf8', env: { ...process.env, TMPDIR: privateTmp } }).trim(),
  );

  assert.equal(created.length, 1, 'exactly one workspace appears after first use, none before');
  assert.equal(
    existsSync(resolve(privateTmp, created[0])),
    false,
    'the workspace is removed once the process that made it exits',
  );
});

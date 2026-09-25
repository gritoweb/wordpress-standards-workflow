// Runs the block conformance checks (conformance.mjs) over every block in
// <theme>/resources/blocks/, plus the theme-wide rules. The rules are the
// "Checkable rules" in _docs/block-conventions.md. A block that meets a rule
// only by exception opts out in its block.json, with a reason:
//   "__conformance": { "skip": { "MEDIA-3": "why" } }
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { themeRoot } from './render-harness.mjs';
import { checkBlock, checkProject, formatFailure, listBlocks } from './conformance.mjs';

const blocksDir = join(themeRoot, 'resources', 'blocks');
const slugs = listBlocks(blocksDir);

test('the theme-wide conformance rules hold', async () => {
  assert.deepEqual((await checkProject({ themeRoot })).filter((f) => f.level === 'error').map(formatFailure), []);
});

for (const slug of slugs) {
  test(`block ${slug} meets the conventions`, async (t) => {
    const { failures, skipped } = await checkBlock({ themeRoot, blockDir: join(blocksDir, slug) });

    for (const { rule, reason } of skipped) t.diagnostic(`${slug} skips ${rule}: ${reason}`);
    // Warnings report and never fail (conformance.mjs WARN_RULES).
    for (const failure of failures.filter((f) => f.level === 'warn')) t.diagnostic(`warn ${formatFailure(failure)}`);
    assert.deepEqual(failures.filter((f) => f.level === 'error').map(formatFailure), []);
  });
}

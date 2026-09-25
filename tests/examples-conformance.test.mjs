// Kit-only: runs the block conformance checks over examples/blocks/*, the
// tested examples the kit keeps for blocks a project builds for itself. The
// layout the examples follow is in examples/README.md; test-support.mjs there
// assembles the resources/ tree the PHP render reads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { checkBlock, formatFailure, listBlocks } from '../theme/scripts/conformance.mjs';
import { post } from '../theme/scripts/render-harness.mjs';
import { examplesApp, examplesRoot, exampleResources, SAMPLE_CONTENT_TYPES, themeRoot } from '../examples/test-support.mjs';

const blocksDir = join(examplesRoot, 'blocks');
const viewsDir = join(examplesRoot, 'views');

const slugs = listBlocks(blocksDir);

test('the examples folder holds blocks to check', () => {
  assert.notEqual(slugs.length, 0, 'examples/blocks has no blocks');
});

for (const slug of slugs) {
  test(`example ${slug} meets the conventions`, async (t) => {
    const viewFile = join(viewsDir, 'blocks', `${slug}.blade.php`);
    const { failures, skipped } = await checkBlock({
      themeRoot,
      blockDir: join(blocksDir, slug),
      resourcesRoot: exampleResources(),
      viewFile: existsSync(viewFile) ? viewFile : undefined,
      // One record, so a collection block has something to draw.
      phpEnv: { appRoots: [examplesApp], functions: SAMPLE_CONTENT_TYPES, posts: [post('__PREFIX___person', 'Ada Lovelace')] },
    });

    for (const { rule, reason } of skipped) t.diagnostic(`${slug} skips ${rule}: ${reason}`);
    for (const failure of failures.filter((f) => f.level === 'warn')) t.diagnostic(`warn ${formatFailure(failure)}`);
    assert.deepEqual(failures.filter((f) => f.level === 'error').map(formatFailure), []);
  });
}

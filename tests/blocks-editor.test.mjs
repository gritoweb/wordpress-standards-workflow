import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { exampleSlugs, exampleTheme } from './support/examples.mjs';
import { bundle, render } from './support/editor-harness.mjs';

test('every reference block mounts its editor without writing attributes', async (t) => {
  const root = exampleTheme(t);
  for (const slug of exampleSlugs) {
    await t.test(slug, async () => {
      const dir = join(root, 'resources/blocks', slug);
      await bundle(join(dir, 'block.jsx'));
      const { metadata, settings } = globalThis.__registered;
      assert.ok(metadata ?? settings);
      const { attributes: declared } = JSON.parse(readFileSync(join(dir, 'block.json'), 'utf8'));
      const attributes = Object.fromEntries(Object.entries(declared).map(([k, a]) => [k, a.default]));
      const writes = [];
      const Edit = settings.edit;
      for (const isSelected of [false, true]) {
        const tree = render(globalThis.__React.createElement(Edit, {
          attributes, isSelected, clientId: 'c1', setAttributes: (v) => writes.push(v),
        }));
        assert.ok(tree.toJSON());
        tree.unmount();
      }
      assert.deepEqual(writes, []);
      assert.equal(settings.save(), null);
    });
  }
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { check } from '../skills/create-block/templates/conformance.mjs';
import { bundle, render } from './support/editor-harness.mjs';
import { exampleTheme, writeBlock } from './support/examples.mjs';
import { kitRoot, renderBlock } from './support/render-harness.mjs';

const SKILL = readFileSync(resolve(kitRoot, 'skills/create-block/SKILL.md'), 'utf8');

// What create-block writes for a new block, from the Templates section of its own skill.
function scaffold(root) {
  const section = SKILL.slice(SKILL.indexOf('### Block files (Phase 2)'), SKILL.indexOf('### Infra bootstrap templates'));
  const source = section
    .replaceAll('<namespace>', 'acme').replaceAll('<text-domain>', 'acme').replaceAll('<category>', 'acme')
    .replaceAll('<slug>', 'sample').replaceAll('<Title>', 'Sample').replaceAll('<icon>', 'star')
    .replaceAll('<one-line description>', 'A sample')
    // The JSON template carries guidance comments the scaffolder drops.
    .replace(/^\s*\/\/ (Preset|Expand|"heading|"items).*\n/gm, '');
  writeBlock(root, 'sample', source);
}

test('the block create-block scaffolds passes conformance, renders and mounts', async (t) => {
  const root = exampleTheme(t);
  scaffold(root);

  const failures = check(root).sample.failures.filter((f) => f.id !== 'FILE-1').map((f) => `${f.id}: ${f.message}`);
  assert.deepEqual(failures, []);

  const { attributes } = JSON.parse(readFileSync(join(root, 'resources/blocks/sample/block.json'), 'utf8'));
  const defaults = Object.fromEntries(Object.entries(attributes).map(([k, a]) => [k, a.default]));
  assert.match(renderBlock(root, 'sample', defaults), /<section/);

  await bundle(join(root, 'resources/blocks/sample/block.jsx'));
  const writes = [];
  const Edit = globalThis.__registered.settings.edit;
  render(globalThis.__React.createElement(Edit, { attributes: defaults, isSelected: true, clientId: 'c', setAttributes: (v) => writes.push(v) }));
  assert.deepEqual(writes, []);
});

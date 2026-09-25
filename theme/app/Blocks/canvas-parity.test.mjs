// Helpers that exist once in PHP (the view) and once in JS (the canvas) and
// must print the same thing. One test keeps each pair honest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { callPhp } from '../../scripts/render-harness.mjs';
import { executeBundle } from '../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs } from '../../scripts/wp-editor-stubs.mjs';
import { APP_AUTOLOAD } from './test-support.mjs';
import { partIndexes } from '../../resources/blocks/components/backend/entranceCanvas.js';
import { logoTintClass } from '../../resources/blocks/components/backend/logoTint.js';

const env = { functions: [APP_AUTOLOAD] };
const php = (method, args) => callPhp(`App\\Blocks\\${method}`, args, env);

const dividerEntry = fileURLToPath(new URL('../../resources/blocks/components/backend/DividerControl.jsx', import.meta.url));
const { dividerClass } = await executeBundle(dividerEntry, wpEditorStubs(), 'CanvasParityDivider');

test('dividerClass agrees for every divider value and for a stale one', () => {
  for (const value of ['none', 'above', 'below', 'sideways', '']) {
    assert.equal(dividerClass(value), php('BlockAttributes::dividerClass', [value]), `dividerClass('${value}')`);
  }
});

test('logo tint agrees for every flag and ground brightness', () => {
  for (const singleColor of [true, false]) {
    for (const light of [true, false]) {
      assert.equal(
        logoTintClass(singleColor, light),
        php('BlockLogos::tintClass', [singleColor, light]),
        `tint(${singleColor}, ${light})`,
      );
    }
  }
});

test('entrance part indexes agree, including a part that does not render', () => {
  for (const present of [
    { heading: true, subtitle: false, body: true, cta: true },
    { heading: false, body: false },
    { heading: true },
  ]) {
    assert.deepEqual(partIndexes(present), php('BlockEntrance::partIndexes', [present]));
  }
});

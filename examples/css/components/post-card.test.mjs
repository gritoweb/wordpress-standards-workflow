import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { cascade } from '../../../theme/scripts/css-cascade.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, 'post-card.css'), 'utf8');
const css = cascade(source);

// Bare <ul>/<ol> get list-style: disc/decimal from global/base.css — a grid
// of cards must reset it itself, or every card shows a bullet.
test('the grid ul has no list bullet', () => {
  assert.equal(css.winner('.post-grid__grid', 'list-style')?.value, 'none');
});

// The card owns its own light surface and ink text regardless of the
// section's ground, so it never needs an `.on-dark` variant.
test('the card sets its own surface and text color, tokens only', () => {
  const background = css.winner('.post-card', 'background-color');
  const color = css.winner('.post-card', 'color');

  assert.match(background.value, /^var\(--color-/);
  assert.match(color.value, /^var\(--color-/);
});

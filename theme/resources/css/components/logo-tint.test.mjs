import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { cascade } from '../../../scripts/css-cascade.mjs';

const sheet = cascade(readFileSync(new URL('./logo-tint.css', import.meta.url), 'utf8'));
const token = (name) => Number(sheet.decls.find((decl) => decl.prop === name)?.value);

test('the light and dark tints read the mark tokens', () => {
  assert.match(sheet.winner('.logo-tint-dark', 'filter').value, /invert\(var\(--logo-mark-dark\)\)/);
  assert.match(sheet.winner('.logo-tint-light', 'filter').value, /invert\(var\(--logo-mark-light\)\)/);
});

test('both mark tokens are a level from 0 to 1, the dark one darker', () => {
  for (const name of ['--logo-mark-dark', '--logo-mark-light']) assert.ok(token(name) >= 0 && token(name) <= 1, name);
  assert.ok(token('--logo-mark-dark') < token('--logo-mark-light'));
});

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cascade, REDUCED } from '../../../scripts/css-cascade.mjs';
import { contrastRatio, opaque, parseColor, resolveTokens } from '../../../scripts/contrast.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const sheet = cascade(readFileSync(resolve(dir, 'selection.css'), 'utf8'));
const tokens = resolveTokens(
  readFileSync(resolve(dir, '../../../scripts/test-fixtures/variables.css'), 'utf8'),
);
const hex = (name) => tokens[`--${name}`];
const win = (element, prop, media) => sheet.winner(element, prop, { media })?.value;

test('the unchecked radio and checkbox border is ink, not the accent', () => {
  assert.equal(win('.sel-radio', 'border'), '2px solid var(--color-ink)');
  assert.equal(win('.sel-check', 'border'), '2px solid var(--color-ink)');
});

// A project checks its own values in contrast-pairs.json; this guards the wizard's example tokens.
test('the unchecked border clears 3:1 on the page', () => {
  const ink = hex('color-ink');
  assert.ok(contrastRatio(opaque(parseColor(ink)), opaque(parseColor(hex('color-light')))) >= 3);
});

test('hover and focus move the fill accent to ink, and never touch the border', () => {
  assert.equal(win('.sel-radio:hover', '--sel-accent'), 'var(--color-ink)');
  assert.equal(win('.sel-radio:focus-visible', '--sel-accent'), 'var(--color-ink)');
  assert.equal(win('.sel-radio:hover', 'border-color'), undefined);
  assert.equal(win('.sel-radio:focus-visible', 'border-color'), undefined);
});

test('the checked fill reads the accent variable, not a literal color', () => {
  assert.equal(win('.sel-check:checked', 'background-color'), 'var(--sel-accent)');
  assert.equal(win('.sel-radio:checked::after', 'background-color'), 'var(--sel-accent)');
});

test('the switch thumb transition is gated for reduced motion', () => {
  const prop = win('.sel-switch::after', 'transition');
  assert.ok(prop.includes('left'));
  assert.equal(win('.sel-switch::after', 'transition', [REDUCED]), 'none');
});

test('disabled sets its own greys last, winning over checked', () => {
  assert.equal(win('.sel-check:disabled', 'background-color'), 'color-mix(in srgb, var(--color-ink) 40%, var(--color-light))');
  assert.equal(win('.sel-check:disabled:checked', 'background-color'), 'color-mix(in srgb, var(--color-ink) 52%, var(--color-light))');
});

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cascade } from '../../../scripts/css-cascade.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFileSync(resolve(dir, file), 'utf8');
const forms = cascade(read('forms.css'));
const gravity = cascade(read('forms-gravity.css'));
const win = (sheet, element, prop) => sheet.winner(element, prop)?.value;

test('a field grows a hover border, distinct from rest and from focus', () => {
  const hovered = 'input[type="text"]:hover';
  assert.equal(win(forms, hovered, 'border-color'), 'color-mix(in srgb, var(--color-ink) 40%, var(--color-light))');
  assert.equal(win(forms, 'input[type="text"]', 'border'), '1px solid var(--color-ink)');
});

test('hover stands down once a field is focused', () => {
  assert.equal(
    win(forms, 'input[type="text"]:hover:focus-visible', 'border-color'),
    'var(--color-ink)',
  );
});

test('select draws a chevron without a wrapper element', () => {
  assert.equal(win(forms, 'select', 'appearance'), 'none');
  assert.ok(win(forms, 'select', 'background-image')?.startsWith('url('));
});

test('error color defaults to the on-light value; .on-dark switches it', () => {
  const el = '.gform_wrapper .validation_message';
  assert.equal(win(gravity, el, 'color'), 'var(--color-danger)');
  assert.equal(win(gravity, `.on-dark ${el}`, 'color'), 'color-mix(in srgb, var(--color-danger) 60%, var(--color-light))');
});

test('the error border follows the same on-light/on-dark contract', () => {
  const el = '.gform_wrapper .gfield_error input';
  assert.equal(win(gravity, el, 'border-color'), 'var(--color-danger)');
  assert.equal(win(gravity, `.on-dark ${el}`, 'border-color'), 'color-mix(in srgb, var(--color-danger) 60%, var(--color-light))');
});

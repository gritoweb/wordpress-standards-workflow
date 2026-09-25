import assert from 'node:assert/strict';
import { test } from 'node:test';
import { logoTintClass } from './logoTint.js';

test('a single-color mark is tinted dark on a light ground and light on a dark one', () => {
  assert.equal(logoTintClass(true, true), 'logo-tint-dark');
  assert.equal(logoTintClass(true, false), 'logo-tint-light');
});

test('a multi-color mark is never tinted', () => {
  assert.equal(logoTintClass(false, true), '');
  assert.equal(logoTintClass(false, false), '');
});

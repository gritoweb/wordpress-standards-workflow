import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { appRoot, callKitPhp } from '../test-support.mjs';

const SITE_SETTINGS = resolve(appRoot, 'Settings/SiteSettings.php');
const ACF_GROUP = resolve(appRoot, '../acf-json/group___PREFIX___site_settings.json');

const call = (method, args = [], acf = null) =>
  callKitPhp(`App\\Settings\\SiteSettings::${method}`, args, { requires: [SITE_SETTINGS], acf });

/* -------------------------------------------------------------------- *
 * Every getter falls back cleanly when ACF is missing (no fixture passed,
 * so function_exists('get_field') is false).
 * -------------------------------------------------------------------- */

test('motion falls back to its documented defaults with no ACF', () => {
  assert.deepEqual(call('motion'), {
    duration: 1000,
    delay: 250,
    stagger: 250,
    distance: 32,
    unit: 'px',
    ease: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  });
});

test('hover falls back to its documented defaults with no ACF', () => {
  assert.deepEqual(call('hover'), { button: 'fade', link: 'underline', duration: 250 });
});

/* -------------------------------------------------------------------- *
 * ACF active: a saved value flows through.
 * -------------------------------------------------------------------- */

test('motion clamps every number to its documented range and keeps a valid unit/ease', () => {
  const result = call('motion', [], {
    motion_duration: 99999,
    motion_delay: -50,
    motion_stagger: 500,
    motion_distance: 40,
    motion_distance_unit: 'vw',
    motion_ease: 'ease-in-out',
  });

  assert.deepEqual(result, {
    duration: 3000,
    delay: 0,
    stagger: 500,
    distance: 40,
    unit: 'vw',
    ease: 'ease-in-out',
  });
});

test('motion accepts a custom cubic-bezier and rejects anything else', () => {
  const valid = call('motion', [], { motion_ease: 'cubic-bezier(0.2, 0.6, 0.4, 1)' });
  assert.equal(valid.ease, 'cubic-bezier(0.2, 0.6, 0.4, 1)');

  const invalid = call('motion', [], { motion_ease: 'yoink' });
  assert.equal(invalid.ease, 'cubic-bezier(0.22, 0.61, 0.36, 1)');

  const named = call('motion', [], { motion_ease: 'ease-out' });
  // Literal, because Tailwind v4's own --ease-out shadowed var(--ease-out).
  assert.equal(named.ease, 'cubic-bezier(0.22, 0.61, 0.36, 1)');
});

test('hover only accepts its own whitelisted choices', () => {
  const result = call('hover', [], { hover_button: 'fade', hover_link: 'none', hover_duration: 5000 });

  assert.deepEqual(result, { button: 'fade', link: 'none', duration: 1000 });

  const invalid = call('hover', [], { hover_button: 'spin', hover_link: 'spin' });
  assert.deepEqual(invalid, { button: 'fade', link: 'underline', duration: 250 });
});

/* -------------------------------------------------------------------- *
 * LIMITS must equal the ACF group's own min/max, or a number could clamp
 * to a range the field itself doesn't allow (or vice versa).
 * -------------------------------------------------------------------- */

test('every LIMITS entry matches the ACF group field min/max/default_value', () => {
  const group = JSON.parse(readFileSync(ACF_GROUP, 'utf8'));
  const byName = Object.fromEntries(group.fields.map((field) => [field.name, field]));

  for (const name of ['motion_duration', 'motion_delay', 'motion_stagger', 'motion_distance', 'hover_duration']) {
    const [min, max, fallback] = call('limits', [name]);
    const field = byName[name];

    assert.ok(field, `${name} is declared in the ACF group`);
    assert.equal(min, field.min, `${name} min`);
    assert.equal(max, field.max, `${name} max`);
    assert.equal(fallback, field.default_value, `${name} default`);
  }
});

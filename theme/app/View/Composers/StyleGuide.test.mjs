import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { appRoot, callKitPhp } from '../../test-support.mjs';

const STYLE_GUIDE = resolve(appRoot, 'View/Composers/StyleGuide.php');
const FIXTURE_CSS = resolve(appRoot, 'View/Composers/test-fixtures/variables.css');

const call = (method, args = []) =>
  callKitPhp(`App\\View\\Composers\\StyleGuide::${method}`, args, {
    requires: [STYLE_GUIDE],
    functions: ["namespace Roots\\Acorn\\View; class Composer {}"],
  });

test('parseTokens reads every custom property, from both @theme and :root, as declared', () => {
  const tokens = call('parseTokens', [FIXTURE_CSS]);

  assert.equal(tokens['--color-yellow-500'], '#e8cb52');
  assert.equal(tokens['--text-h1--line-height'], '1');
  assert.equal(tokens['--color-primary'], 'var(--color-yellow-500)');
});

test('parseTokens returns an empty list for a missing file, rather than throwing', () => {
  assert.deepEqual(call('parseTokens', [resolve(appRoot, 'no-such-file.css')]), []);
});

test('colorGroups buckets a ramp step by its color family and everything else as semantic', () => {
  const tokens = call('parseTokens', [FIXTURE_CSS]);
  const groups = call('colorGroups', [tokens]);

  assert.deepEqual(groups.yellow, [
    { token: '--color-yellow-50', value: '#fdfaed' },
    { token: '--color-yellow-500', value: '#e8cb52' },
  ]);
  assert.deepEqual(groups.semantic, [
    { token: '--color-primary', value: 'var(--color-yellow-500)' },
    { token: '--color-ink', value: '#33342a' },
  ]);
});

test('typeSteps collapses a step\'s size/line-height/font-weight/letter-spacing siblings into one row', () => {
  const tokens = call('parseTokens', [FIXTURE_CSS]);
  const steps = call('typeSteps', [tokens]);

  assert.deepEqual(steps, [
    { step: 'body', token: '--text-body', size: '1rem', lineHeight: '1.3' },
    { step: 'h1', token: '--text-h1', size: '6rem', lineHeight: '1', fontWeight: '700' },
  ]);
});

test('tokensByPrefix keeps declaration order and only the requested families', () => {
  const tokens = {
    '--radius-card': '0.75rem',
    '--color-ink': '#33342a',
    '--radius-button': '0.25rem',
    '--shadow-100': '0 1px 2px black',
  };

  assert.deepEqual(call('tokensByPrefix', [tokens, ['--radius-']]), [
    { token: '--radius-card', value: '0.75rem' },
    { token: '--radius-button', value: '0.25rem' },
  ]);
  assert.deepEqual(call('tokensByPrefix', [tokens, ['--shadow-', '--radius-card']]), [
    { token: '--radius-card', value: '0.75rem' },
    { token: '--shadow-100', value: '0 1px 2px black' },
  ]);
  assert.deepEqual(call('tokensByPrefix', [tokens, ['--nope-']]), []);
});

test('the composer output for every color token matches variables.css exactly (drift test)', () => {
  const tokens = call('parseTokens', [FIXTURE_CSS]);
  const groups = call('colorGroups', [tokens]);
  const raw = readFileSync(FIXTURE_CSS, 'utf8');

  for (const group of Object.values(groups)) {
    for (const { token, value } of group) {
      assert.match(raw, new RegExp(escapeRegExp(`${token}: ${value};`)), `${token} matches its declared value`);
    }
  }
});

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('colorGroupsFromMap groups by the Figma board and sweeps unlisted tokens into semantic or other', () => {
  const tokens = {
    '--color-brand-navy': '#0f1f38',
    '--color-primary': 'var(--color-brand-navy)',
    '--color-loose': '#123456',
    '--color-gone': '#000',
  };
  const map = {
    groups: [
      {
        name: 'Brand Primary',
        swatches: [
          { token: '--color-brand-navy', name: 'Primary 300 (base)', figma: 'Brand/Primary/Primary 300' },
          { token: '--color-not-declared', name: 'Skipped' },
        ],
      },
    ],
  };
  const groups = call('colorGroupsFromMap', [tokens, map]);

  assert.deepEqual(Object.keys(groups), ['Brand Primary', 'Semantic aliases', 'Other']);
  assert.equal(groups['Brand Primary'].length, 1);
  assert.equal(groups['Brand Primary'][0].name, 'Primary 300 (base)');
  assert.equal(groups.Other.length, 2);
});

test('colorGroupsFromMap falls back to the ramp grouping when there is no map', () => {
  const tokens = { '--color-yellow-500': '#e8cb52', '--color-primary': 'var(--color-yellow-500)' };

  assert.deepEqual(call('colorGroupsFromMap', [tokens, []]), call('colorGroups', [tokens]));
});

test('typeGroups folds a mobile step into its desktop row and groups by kind of text', () => {
  const steps = [
    { step: 'h1', token: '--text-h1' },
    { step: 'h1-mobile', token: '--text-h1-mobile' },
    { step: 'lead', token: '--text-lead' },
    { step: 'button', token: '--text-button' },
    { step: 'mystery', token: '--text-mystery' },
  ];
  const groups = call('typeGroups', [steps]);

  assert.deepEqual(Object.keys(groups), ['Headings', 'Body text', 'Interactive', 'Other']);
  assert.equal(groups.Headings.length, 1);
  assert.equal(groups.Headings[0].level, 1);
  assert.equal(groups.Headings[0].mobile.step, 'h1-mobile');
});

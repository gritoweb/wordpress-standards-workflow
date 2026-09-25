import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// See 404.test.mjs: @extends can't render through render-harness.mjs's
// minimal view(). Source text, tolerant of whitespace.
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, 'template-styleguide.blade.php'), 'utf8');

test('registers as a WordPress page template', () => {
  assert.match(source, /Template Name:\s*Style Guide/);
});

test('no hand-kept palette or specimen array: colors and type come from the composer', () => {
  assert.match(source, /\$colorGroups/);
  assert.match(source, /\$typeGroups/);
  assert.doesNotMatch(source, /#[0-9a-f]{3,6}/i);
});

test('marked dev-only, per the launch checklist', () => {
  assert.match(source, /Dev-only/);
});

// Same six boards, same order, in every project (figma-design-system SKILL.md
// > Design system boards). Each phase appends its specimens inside the
// matching section, so a section id is what a phase looks for.
test('the style guide has one section per design system board, in the fixed order', () => {
  const ids = [...source.matchAll(/<section[^>]* id="([a-z]+)"/g)].map((match) => match[1]);

  assert.deepEqual(ids, ['typography', 'color', 'spacing', 'buttons', 'forms', 'components']);
});

test('spacing, radius and shadow specimens come from the composer, not a hand-kept list', () => {
  assert.match(source, /\$spacingTokens/);
  assert.match(source, /\$radiusTokens/);
  assert.match(source, /\$shadowTokens/);
});

test('every button role the kit ships has a specimen', () => {
  // The roles check-css-foundation requires in components/button.css.
  for (const role of ['btn-primary', 'btn-secondary', 'btn-on-dark', 'btn-link']) {
    assert.match(source, new RegExp(`\\b${role}\\b`), `${role} has no specimen`);
  }
});

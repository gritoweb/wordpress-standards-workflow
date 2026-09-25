import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { cascade } from '../../../scripts/css-cascade.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, 'social-icons.css'), 'utf8');
const css = cascade(source);

// M3: HeaderFooterSettings::socials() emits icon => 'other' for a network outside
// the fixed SOCIAL_NETWORKS set; with no mask-image rule, ::before's
// currentColor mask has nothing to mask and shows a solid block instead.
test('social-icon-other gets a mask-image, not a blank/solid ::before', () => {
  const winner = css.winner('.social-icon-other::before', 'mask-image');

  assert.ok(winner, 'expected a mask-image declaration for .social-icon-other::before');
  assert.match(winner.value, /link\.svg/);
});

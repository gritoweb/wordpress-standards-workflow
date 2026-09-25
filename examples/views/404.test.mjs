import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

// render-harness.mjs's view() has no $__env->startSection()/yieldContent(),
// so a view using @extends/@section can't render through it (see
// render-harness.mjs's TestLoopEnv — a loop stack only, not a section
// stack). Source text, tolerant of whitespace, is the fallback common.md
// allows for exactly this case.
const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '404.blade.php'), 'utf8');
const collapse = (text) => text.replace(/\s+/g, ' ').trim();

test('every user-facing string goes through __() with the kit text domain', () => {
  assert.match(source, /__\('Page Not Found', '__TEXT_DOMAIN__'\)/);
  assert.match(source, /__\('Return To Home', '__TEXT_DOMAIN__'\)/);
  assert.doesNotMatch(source, /'sage'/);
});

test('the CTA uses the primary button role, not a color name', () => {
  assert.match(collapse(source), /class="btn btn-primary/);
  assert.doesNotMatch(source, /btn-yellow|btn-earth/);
});

test('no @entrance directive used yet, only a commented seam for the block framework stage', () => {
  const withoutComments = source.replace(/\{\{--[\s\S]*?--\}\}/g, '');

  assert.doesNotMatch(withoutComments, /@entrance/);
  assert.match(source, /Seam for the block framework's entrance system/);
});

test('extends the shared layout so the header and footer render around it', () => {
  assert.match(source, /@extends\('layouts\.app'\)/);
});

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { gatePairs, resolveTokens } from './contrast.mjs';

// A project-level gate, not a kit test: it reads a project's own tokens and
// its own declared pairs, both relative to the theme this file was copied
// into. The kit repository has neither file, so it skips here instead of
// failing or silently passing on nothing.
const themeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const variablesPath = resolve(themeRoot, 'resources/css/global/variables.css');
const pairsPath = resolve(themeRoot, 'resources/css/contrast-pairs.json');

test('WCAG AA: every declared token pair clears its threshold', (t) => {
  const hasVariables = existsSync(variablesPath);
  const hasPairs = existsSync(pairsPath);

  if (!hasVariables && !hasPairs) {
    t.skip(
      'no resources/css/global/variables.css or resources/css/contrast-pairs.json in this theme; nothing to check',
    );
    return;
  }

  assert.ok(
    hasPairs,
    'resources/css/global/variables.css exists but resources/css/contrast-pairs.json does not. ' +
      'Add it (an array of { fg, bg, kind }, tokens by --name) so this gate can run.',
  );

  const tokens = resolveTokens(readFileSync(variablesPath, 'utf8'));
  const pairs = JSON.parse(readFileSync(pairsPath, 'utf8'));
  const { errors, asDrawn, stale } = gatePairs(tokens, pairs);

  for (const pair of asDrawn) {
    console.warn(
      `contrast (as drawn): ${pair.label ?? `${pair.fg} on ${pair.bg}`}: ${pair.ratio}:1, needs ${pair.required}:1`,
    );
  }

  assert.deepEqual(errors, []);
  assert.deepEqual(
    stale.map((pair) => pair.label ?? `${pair.fg} on ${pair.bg}`),
    [],
    'these pairs are marked asDrawn but now pass: remove the flag',
  );
});

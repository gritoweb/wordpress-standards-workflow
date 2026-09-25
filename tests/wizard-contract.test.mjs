import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { gatePairs, resolveTokens } from '../theme/scripts/contrast.mjs';

const wizard = readFileSync(new URL('../skills/css-foundation-wizard/SKILL.md', import.meta.url), 'utf8');
const check = readFileSync(new URL('../theme/scripts/check-css-foundation.mjs', import.meta.url), 'utf8');
const fixture = readFileSync(new URL('../theme/scripts/test-fixtures/variables.css', import.meta.url), 'utf8');

// The first fenced block of the given language after a heading.
function blockAfter(heading, lang) {
  const from = wizard.indexOf(heading);
  assert.ok(from >= 0, `wizard lacks "${heading}"`);
  const start = wizard.indexOf('```' + lang + '\n', from) + lang.length + 4;
  return wizard.slice(start, wizard.indexOf('```', start));
}

const variables = blockAfter('## Step 2 — `global/variables.css`', 'css');
const pairs = JSON.parse(blockAfter('Then write `resources/css/contrast-pairs.json`', 'json'));

test('the variables.css test fixture is the wizard example, verbatim', () => {
  assert.equal(fixture, variables);
});

test('the wizard example defines every color/shape token check-css-foundation requires', () => {
  const tokens = resolveTokens(variables);
  const list = check.slice(check.indexOf('const VARIABLE_TOKENS'), check.indexOf('const CONTAINER_TOKENS'));
  const required = [
    ...[...list.matchAll(/\[([^\]]+)\]\.map\(\(c\) => `color-\$\{c\}(-on-dark)?`\)/g)].flatMap(([, names, suffix]) =>
      names.match(/'([\w-]+)'/g).map((n) => `--color-${n.slice(1, -1)}${suffix ?? ''}`),
    ),
    ...[...list.matchAll(/^\s*'([\w-]+)',$/gm)].map(([, name]) => `--${name}`),
  ];
  assert.ok(required.length >= 20, `parsed only ${required.length} tokens from the check`);
  const missing = required.filter((name) => tokens[name] === undefined);
  assert.deepEqual(missing, []);
});

test('the wizard example passes its own base contrast pairs', () => {
  const { errors } = gatePairs(resolveTokens(variables), pairs);
  assert.deepEqual(errors.map((e) => `${e.label}: ${e.ratio}:1`), []);
});

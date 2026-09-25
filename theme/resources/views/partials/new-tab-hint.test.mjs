import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderTemplate } from '../../../app/test-support.mjs';

const render = (vars) => renderTemplate('partials.new-tab-hint', vars);

test('a link that opens in a new tab gets hidden text that says so', () => {
  assert.match(render({ new: true }), /<span class="sr-only"> \(opens in a new tab\)<\/span>/);
});

test('a link that stays in the tab, or has no flag, prints nothing', () => {
  assert.equal(render({ new: false }).trim(), '');
  assert.equal(render({}).trim(), '');
});

test('the hint prints as one bare span, so it sits flush against the link label', () => {
  assert.equal(render({ new: true }), '<span class="sr-only"> (opens in a new tab)</span>');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { callPhp } from '../../scripts/render-harness.mjs';
import { APP_AUTOLOAD } from '../Blocks/test-support.mjs';

const directives = () =>
  callPhp('App\\Providers\\BlockDirectivesServiceProvider::directives', [], { functions: [APP_AUTOLOAD] });

test('exports paddingClasses, entrance and entrancePart, one PHP expression each', () => {
  assert.deepEqual(directives(), {
    paddingClasses: '\\App\\Blocks\\BlockPadding::resolve($e)',
    entrance: '\\App\\Blocks\\BlockEntrance::root($e)',
    entrancePart: '\\App\\Blocks\\BlockEntrance::part($e)',
  });
});

test('every directive body is a call on a whitelisting/clamping class, never a bare echo of $e', () => {
  for (const body of Object.values(directives())) {
    assert.match(body, /^\\App\\Blocks\\Block(Padding|Entrance)::(resolve|root|part)\(\$e\)$/);
  }
});

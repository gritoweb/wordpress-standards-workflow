import assert from 'node:assert/strict';
import { test } from 'node:test';
import { entranceRootProps, partIndexes, resolveEntrance } from './entranceCanvas.js';

const preset = { type: 'fade-slide', direction: 'up', stagger: 100 };

test('resolveEntrance whitelists the trigger and falls back to section', () => {
  assert.equal(resolveEntrance({ trigger: 'item' }, preset).trigger, 'item');
  assert.equal(
    resolveEntrance({ trigger: 'bogus' }, preset).trigger,
    'section',
  );
  assert.equal(resolveEntrance({}, preset).trigger, 'section');
  assert.equal(resolveEntrance(undefined, preset).trigger, 'section');
});

test('a saved object without a trigger takes the preset trigger', () => {
  assert.equal(
    resolveEntrance({ type: 'fade' }, { ...preset, trigger: 'item' }).trigger,
    'item',
  );
  assert.equal(
    resolveEntrance({ trigger: 'section' }, { ...preset, trigger: 'item' })
      .trigger,
    'section',
  );
});

test('the root carries the trigger only for item, as the directive does', () => {
  const item = entranceRootProps(resolveEntrance({ trigger: 'item' }, preset));
  const section = entranceRootProps(resolveEntrance({}, preset));

  assert.equal(item['data-entrance-trigger'], 'item');
  assert.equal('data-entrance-trigger' in section, false);
});

test('none prints nothing, even with the item trigger', () => {
  assert.deepEqual(
    entranceRootProps(
      resolveEntrance({ type: 'none', trigger: 'item' }, preset),
    ),
    {},
  );
});

test('partIndexes numbers only the parts that draw, with no gap', () => {
  assert.deepEqual(
    partIndexes({ heading: true, subtitle: false, body: true, cta: true }),
    { heading: 0, subtitle: null, body: 1, cta: 2 },
  );
  assert.deepEqual(partIndexes({ heading: false }), { heading: null });
  assert.deepEqual(partIndexes({}), {});
});

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../../scripts/wp-editor-stubs.mjs';
import { LIMITS } from './entranceCanvas.js';

const entry = fileURLToPath(new URL('./EntranceControl.jsx', import.meta.url));

// wp-editor-stubs.mjs's TextControl doesn't capture its props (nothing in
// this framework needed that before EntranceControl did), so this override
// adds a capture array the same way its SelectControl/Button stubs already
// do, instead of a private, one-off harness.
const COMPONENTS_WITH_TEXT_CAPTURE = `
import React from 'react';
export function PanelBody(props) {
  globalThis.__wpEditorTest.panels.push(props);
  return React.createElement('section', { 'data-panel-title': props.title }, props.children);
}
export function SelectControl(props) {
  globalThis.__wpEditorTest.selects.push(props);
  return React.createElement('label', null, props.label);
}
export function TextControl(props) {
  globalThis.__wpEditorTest.texts.push(props);
  return React.createElement('label', null, props.label);
}
export function Button(props) {
  globalThis.__wpEditorTest.buttons.push(props);
  return React.createElement('button', { onClick: props.onClick }, props.children);
}
`;

async function bundle() {
  resetWpEditorTest();
  globalThis.__wpEditorTest.texts = [];
  return executeBundle(
    entry,
    wpEditorStubs({ '@wordpress/components': COMPONENTS_WITH_TEXT_CAPTURE }),
    'EntranceControlBundle',
  );
}

const base = {
  type: 'fade-slide',
  direction: 'up',
  distance: 32,
  unit: 'px',
  duration: 600,
  delay: 0,
  stagger: 120,
};

let writes;
let EntranceControl;
let replayEntrance;

// EntranceControl only builds React elements; nothing invokes PanelBody,
// SelectControl et al. (which is what fills the capture arrays below) until
// something actually walks the tree. renderToStaticMarkup is that walk — the
// same real-React approach editor-test-bundle.test.mjs uses.
function render(entrance = base, extra = {}) {
  writes = [];
  resetWpEditorTest({ resetState: false });
  globalThis.__wpEditorTest.texts = [];
  renderToStaticMarkup(
    React.createElement(EntranceControl, {
      attributes: { entrance },
      setAttributes: (patch) => writes.push(patch),
      clientId: 'block-1',
      ...extra,
    }),
  );
}

const select = (label) => globalThis.__wpEditorTest.selects.find((s) => s.label === label);
const text = (label) => globalThis.__wpEditorTest.texts.find((t) => t.label === label);
const button = (label) => globalThis.__wpEditorTest.buttons.find((b) => b.children === label);

test('load the bundle once', async () => {
  ({ EntranceControl, replayEntrance } = await bundle());
});

beforeEach(() => {
  writes = [];
});

test('mounting writes no attributes', () => {
  render();
  assert.deepEqual(writes, []);
});

test('the panel is a collapsed PanelBody titled Entrance animation', () => {
  render();
  const panel = globalThis.__wpEditorTest.panels[0];
  assert.equal(panel.title, 'Entrance animation');
  assert.equal(panel.initialOpen, false);
});

test('choosing a type writes only the type', () => {
  render();
  select('Type').onChange('fade');
  assert.deepEqual(writes, [{ entrance: { ...base, type: 'fade' } }]);
});

test('changing one control writes the existing object with only that key changed', () => {
  render({ ...base, direction: 'left', stagger: 90 });
  text('Duration (ms)').onChange('900');
  assert.deepEqual(writes, [{ entrance: { ...base, direction: 'left', stagger: 90, duration: 900 } }]);
});

test('an emptied number field writes null, meaning the site default', () => {
  render();
  text('Delay (ms)').onChange('');
  assert.deepEqual(writes, [{ entrance: { ...base, delay: null } }]);
});

test('typed numbers are clamped to the same limits as the server', () => {
  render();
  text('Duration (ms)').onChange('99999');
  text('Distance').onChange('-4');
  text('Stagger (ms)').onChange('abc');

  assert.deepEqual(
    writes.map((w) => w.entrance),
    [
      { ...base, duration: LIMITS.duration[1] },
      { ...base, distance: LIMITS.distance[0] },
      { ...base, stagger: null },
    ],
  );
});

test('the min/max on each number field match entranceCanvas LIMITS', () => {
  render();
  for (const key of ['duration', 'delay', 'stagger']) {
    const label = { duration: 'Duration (ms)', delay: 'Delay (ms)', stagger: 'Stagger (ms)' }[key];
    assert.equal(text(label).min, LIMITS[key][0]);
    assert.equal(text(label).max, LIMITS[key][1]);
  }
});

test('a null number shows the printed site default as the placeholder', () => {
  globalThis.__PREFIX__EntranceDefaults = { duration: 800, delay: 50, stagger: 90, distance: 40 };
  try {
    render({ ...base, duration: null, delay: null, stagger: null, distance: null });
    assert.equal(text('Duration (ms)').placeholder, '800');
    assert.equal(text('Delay (ms)').placeholder, '50');
    assert.equal(text('Stagger (ms)').placeholder, '90');
    assert.equal(text('Distance').placeholder, '40');
  } finally {
    delete globalThis.__PREFIX__EntranceDefaults;
  }
});

test('with no printed global, the fallback matches the entrance.css defaults (1000/250/250)', () => {
  render({ ...base, duration: null, delay: null, stagger: null });
  assert.equal(text('Duration (ms)').placeholder, '1000');
  assert.equal(text('Delay (ms)').placeholder, '250');
  assert.equal(text('Stagger (ms)').placeholder, '250');
});

test('an explicit siteDefaults prop overrides the printed global', () => {
  globalThis.__PREFIX__EntranceDefaults = { duration: 800 };
  try {
    render({ ...base, duration: null }, { siteDefaults: { duration: 999 } });
    assert.equal(text('Duration (ms)').placeholder, '999');
  } finally {
    delete globalThis.__PREFIX__EntranceDefaults;
  }
});

test('direction, distance and unit are hidden for none and fade', () => {
  for (const type of ['none', 'fade']) {
    render({ ...base, type });
    assert.equal(select('Direction'), undefined, type);
    assert.equal(text('Distance'), undefined, type);
    assert.equal(select('Unit'), undefined, type);
  }
});

test('direction, distance and unit show for slide and fade-slide', () => {
  for (const type of ['slide', 'fade-slide']) {
    render({ ...base, type });
    assert.ok(select('Direction'), type);
    assert.ok(text('Distance'), type);
    assert.ok(select('Unit'), type);
  }
});

test('stagger is hidden on a single-part block and for the item trigger', () => {
  render(base, { singlePart: true });
  assert.equal(text('Stagger (ms)'), undefined);

  render({ ...base, trigger: 'item' });
  assert.equal(text('Stagger (ms)'), undefined);

  render(base);
  assert.ok(text('Stagger (ms)'));
});

test('the Trigger select offers the two triggers and defaults to section', () => {
  render();
  assert.deepEqual(select('Trigger').options, [
    { label: 'All together, staggered', value: 'section' },
    { label: 'Each item as it scrolls in', value: 'item' },
  ]);
  assert.equal(select('Trigger').value, 'section');
});

test('the Trigger select is hidden when the type is none', () => {
  render({ ...base, type: 'none' });
  assert.equal(select('Trigger'), undefined);
});

test('Preview calls the replay hook it is given and writes nothing', () => {
  let called = 0;
  render(base, { onPreview: () => called++ });
  button('Preview').onClick();
  assert.equal(called, 1);
  assert.deepEqual(writes, []);
});

test('Preview is absent for type none', () => {
  render({ ...base, type: 'none' });
  assert.equal(button('Preview'), undefined);
});

test('a partial saved object resolves against a passed preset', () => {
  const preset = { type: 'fade-slide', direction: 'right', trigger: 'item', distance: 40, stagger: 100 };
  render({ type: 'fade-slide' }, { preset });

  assert.equal(select('Trigger').value, 'item');
  assert.equal(select('Direction').value, 'right');
  assert.equal(text('Distance').value, 40);
  assert.deepEqual(writes, []);
});

// --- replayEntrance: a fake canvas records every write the replay makes. ---

function el(name, attrs = {}, style = {}, timeline = []) {
  const props = { ...style };
  const note = (entry) => timeline.push(`${name} ${entry}`);
  return {
    attrs: { ...attrs },
    props,
    getAttribute(n) {
      return n in this.attrs ? this.attrs[n] : null;
    },
    removeAttribute(n) {
      note(`remove ${n}`);
      delete this.attrs[n];
    },
    setAttribute(n, v) {
      note(`set ${n}`);
      this.attrs[n] = v;
    },
    style: {
      getPropertyValue: (n) => props[n] ?? '',
      setProperty(n, v) {
        note(`prop ${n}=${v}`);
        props[n] = v;
      },
      removeProperty(n) {
        note(`unprop ${n}`);
        delete props[n];
      },
    },
  };
}

function canvas({ trigger = null, indexes = [] } = {}) {
  const events = [];
  const root = el('root', { 'data-entrance': 'fade-slide', 'data-entered': '', ...(trigger && { 'data-entrance-trigger': trigger }) }, {}, events);
  const parts = indexes.map((i, n) => el(`part${n}`, { 'data-entered': '' }, i ? { '--e-i': String(i) } : {}, events));
  Object.defineProperty(root, 'offsetWidth', { get: () => (events.push('reflow'), 0) });
  root.querySelectorAll = () => parts;
  const doc = { querySelector: (sel) => (events.push(`query ${sel}`), root) };
  return { doc, root, parts, events };
}

const timers = () => {
  const queue = [];
  return { win: { setTimeout: (fn) => queue.push(fn) }, flush: () => queue.forEach((fn) => fn()) };
};

test('replay removes data-entered, forces a reflow, then re-adds it', () => {
  const { doc, root, events } = canvas({ indexes: [0, 1] });
  const { win } = timers();
  replayEntrance(doc, 'block-1', win);

  assert.deepEqual(
    events.filter((l) => l === 'reflow' || l.includes('data-entered')),
    ['root remove data-entered', 'reflow', 'root set data-entered'],
  );
  assert.ok(events[0].includes('data-block="block-1"'));
});

test('replay cleans up after the timer fires', () => {
  const { doc, root } = canvas({ indexes: [0, 1] });
  const { win, flush } = timers();
  replayEntrance(doc, 'block-1', win);

  assert.equal(root.attrs['data-entrance-replay'], '');
  flush();
  assert.equal('data-entrance-replay' in root.attrs, false);
  assert.equal(root.attrs['data-entered'], '');
});

test('with the item trigger, every part starts together and indexes are restored after cleanup', () => {
  const { doc, root, parts } = canvas({ trigger: 'item', indexes: [0, 3, 8] });
  const { win, flush } = timers();
  replayEntrance(doc, 'block-1', win);

  for (const part of parts) assert.equal(part.props['--e-i'], '0');
  assert.equal('data-entered' in root.attrs, false);

  flush();
  assert.deepEqual(parts.map((p) => p.props['--e-i']), [undefined, '3', '8']);
});

test('two replays inside the cleanup window leave the printed indexes intact', () => {
  const { doc, root, parts } = canvas({ trigger: 'item', indexes: [0, 2, 5] });
  const { win, flush } = timers();
  replayEntrance(doc, 'block-1', win);
  replayEntrance(doc, 'block-1', win);
  flush();

  assert.deepEqual(parts.map((p) => p.props['--e-i']), [undefined, '2', '5']);
  assert.equal('data-entrance-replay' in root.attrs, false);
});

test('replay is a no-op when the block is not on the canvas', () => {
  const doc = { querySelector: () => null };
  assert.doesNotThrow(() => replayEntrance(doc, 'missing', { setTimeout: () => {} }));
});

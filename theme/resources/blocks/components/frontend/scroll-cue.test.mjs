import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'scroll-cue.js'), 'utf8');

// An element with just what scroll-cue.js touches.
function el({ height = 100, top = 0, attrs = {}, position = 'static' } = {}) {
  const node = {
    attrs: { ...attrs },
    hidden: true,
    removed: false,
    listeners: {},
    focused: null,
    position,
    parent: null,
    nextElementSibling: null,
    getBoundingClientRect: () => ({ height, top }),
    getAttribute: (name) => (name in node.attrs ? node.attrs[name] : null),
    setAttribute: (name, value) => { node.attrs[name] = String(value); },
    hasAttribute: (name) => name in node.attrs,
    closest: (selector) => (selector === 'section' ? node.parent : null),
    remove: () => { node.removed = true; },
    addEventListener: (type, handler) => { node.listeners[type] = handler; },
    focus: (options) => { node.focused = options; },
  };
  return node;
}

// A cue inside a section, followed by the given siblings.
function page({ siblings = [el()], header = null, adminBar = null, reduced = false, cueAttrs = {} } = {}) {
  const section = el();
  const cue = el({ attrs: cueAttrs });
  cue.parent = section;
  let previous = section;
  for (const sibling of siblings) {
    previous.nextElementSibling = sibling;
    previous = sibling;
  }

  const scrolls = [];
  const selectors = [];
  globalThis.window = {
    __PREFIX__TestHooks: {},
    pageYOffset: 500,
    matchMedia: () => ({ matches: reduced }),
    getComputedStyle: (node) => ({ position: node.position }),
    scrollTo: (options) => scrolls.push(options),
  };
  globalThis.document = {
    readyState: 'complete',
    getElementById: (id) => (id === 'wpadminbar' ? adminBar : null),
    querySelector: (selector) => { selectors.push(selector); return header; },
    querySelectorAll: () => [],
    addEventListener() {},
  };
  new Function(source)();
  const hooks = globalThis.window.__PREFIX__TestHooks.scrollCue;
  return { cue, section, siblings, scrolls, selectors, bind: () => hooks.bindCue(cue), hooks };
}

test('a cue with a section below is revealed', () => {
  const p = page();
  p.bind();
  assert.equal(p.cue.hidden, false);
  assert.equal(p.cue.removed, false);
});

test('a cue with nothing below it is removed, never shown', () => {
  const p = page({ siblings: [] });
  p.bind();
  assert.equal(p.cue.removed, true);
  assert.equal(p.cue.hidden, true);
});

test('the target skips siblings with no box of their own', () => {
  const empty = el({ height: 0 });
  const real = el({ top: 300 });
  const p = page({ siblings: [empty, real] });
  assert.equal(p.hooks.findTarget(p.section), real);
});

test('a cue with only zero-height siblings below it is removed', () => {
  const p = page({ siblings: [el({ height: 0 })] });
  p.bind();
  assert.equal(p.cue.removed, true);
});

test('click glides to the target, offset by the admin bar and a sticky header', () => {
  const target = el({ top: 300 });
  const p = page({
    siblings: [target],
    adminBar: el({ height: 32 }),
    header: el({ height: 80, position: 'sticky' }),
  });
  p.bind();
  p.cue.listeners.click();
  assert.deepEqual(p.scrolls, [{ top: 300 + 500 - 32 - 80, behavior: 'smooth' }]);
});

test('a header that is not fixed or sticky adds no offset', () => {
  const p = page({ siblings: [el({ top: 300 })], header: el({ height: 80, position: 'static' }) });
  p.bind();
  p.cue.listeners.click();
  assert.equal(p.scrolls[0].top, 800);
});

test('the header selector comes from the data attribute, defaulting to .header', () => {
  const custom = page({ cueAttrs: { 'data-scroll-header-selector': '#masthead' } });
  custom.bind();
  custom.cue.listeners.click();
  assert.deepEqual(custom.selectors, ['#masthead']);

  const fallback = page();
  fallback.bind();
  fallback.cue.listeners.click();
  assert.deepEqual(fallback.selectors, ['.header']);
});

test('reduced motion turns the glide into a jump', () => {
  const p = page({ reduced: true });
  p.bind();
  p.cue.listeners.click();
  assert.equal(p.scrolls[0].behavior, 'auto');
});

test('focus follows the viewport to the target without scrolling again', () => {
  const target = el();
  const p = page({ siblings: [target] });
  p.bind();
  p.cue.listeners.click();
  assert.equal(target.attrs.tabindex, '-1');
  assert.deepEqual(target.focused, { preventScroll: true });
});

test('a target that already has a tabindex keeps it', () => {
  const target = el({ attrs: { tabindex: '0' } });
  const p = page({ siblings: [target] });
  p.bind();
  p.cue.listeners.click();
  assert.equal(target.attrs.tabindex, '0');
});

test('the script loads once: a second load does not rebind', () => {
  const p = page();
  const before = globalThis.window.__PREFIX__TestHooks.scrollCue;
  delete globalThis.window.__PREFIX__TestHooks.scrollCue;
  new Function(source)();
  assert.equal(globalThis.window.__PREFIX__TestHooks.scrollCue, undefined);
  assert.ok(before);
  p.bind();
});

test('a page leaves only the load-once flag on window, no test hooks', () => {
  page();
  delete globalThis.window.__PREFIX__TestHooks;
  delete globalThis.window.__PREFIX__ScrollCue;
  const before = Object.keys(globalThis.window);
  new Function(source)();

  assert.deepEqual(Object.keys(globalThis.window).filter((key) => !before.includes(key)), ['__PREFIX__ScrollCue']);
});

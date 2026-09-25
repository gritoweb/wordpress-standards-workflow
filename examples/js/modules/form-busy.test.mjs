import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initFormBusy } from './form-busy.js';

// Ported from White Summers' form-busy.test.mjs verbatim — form-busy.js
// itself is an unchanged port (no fix, no Figma or decision reference in
// scope).

function setup() {
  const listeners = {};
  const button = {
    attrs: {},
    removeAttribute(name) {
      delete this.attrs[name];
    },
  };
  globalThis.document = { querySelectorAll: () => [button] };
  globalThis.window = {
    addEventListener: (type, fn) => (listeners[type] = fn),
  };
  initFormBusy();

  return { listeners, button };
}

test('a page restored from cache clears the busy state', () => {
  const { listeners, button } = setup();
  button.attrs['aria-busy'] = 'true';
  listeners.pageshow({ persisted: true });

  assert.equal(button.attrs['aria-busy'], undefined);
});

test('a normal page show leaves the busy state alone', () => {
  const { listeners, button } = setup();
  button.attrs['aria-busy'] = 'true';
  listeners.pageshow({ persisted: false });

  assert.equal(button.attrs['aria-busy'], 'true');
});

test('a rendered form focuses its own container and disarms the others', async () => {
  let handler;
  const mk = () => ({
    attrs: { 'data-js': 'x', autofocus: '' },
    focused: false,
    removeAttribute(n) {
      delete this.attrs[n];
    },
    focus() {
      this.focused = true;
    },
  });
  const contact = mk();
  const footer = mk();
  globalThis.document = {
    querySelector: (sel) => (sel.includes('gform_wrapper_1 ') ? footer : contact),
    querySelectorAll: () => [contact, footer],
  };
  const { initValidationFocus } = await import('./form-busy.js');
  initValidationFocus(() => ({ on: (_, fn) => (handler = fn) }));
  handler({}, 1);
  await new Promise((r) => setTimeout(r, 5));

  assert.equal(footer.focused, true);
  assert.equal(footer.attrs['data-js'], 'x');
  assert.equal(contact.focused, false);
  assert.equal(contact.attrs['data-js'], undefined);
  assert.equal(contact.attrs.autofocus, undefined);
});

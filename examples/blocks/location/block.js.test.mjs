import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'block.js'), 'utf8');

// M4: loading=async's callback fires once google.maps.Map truly exists, but
// window.google.maps can be assigned earlier in the same load — booting on
// that alone can call `new google.maps.Map` before it's a function. The
// callback stub (app/maps.php) sets __PREFIX__MapsReady only once it's
// actually run, so that's the flag to self-boot on, not window.google.maps.
function load(mapsReady) {
  let queried = false;
  globalThis.window = { google: { maps: {} }, __PREFIX__MapsReady: mapsReady };
  globalThis.document = {
    querySelectorAll() {
      queried = true;
      return [];
    },
  };
  new Function(source)();
  const readyCallback = globalThis.window.__PREFIX__LocationReady;
  delete globalThis.window;
  delete globalThis.document;
  return { queried, readyCallback };
}

test('google.maps present but the callback never having fired does not self-boot', () => {
  const { queried } = load(undefined);
  assert.equal(queried, false);
});

test('__PREFIX__MapsReady set (the stub already ran) self-boots and looks for panels', () => {
  const { queried } = load(true);
  assert.equal(queried, true);
});

test('window.__PREFIX__LocationReady is reassigned to the real boot function either way', () => {
  const { readyCallback } = load(false);
  assert.equal(typeof readyCallback, 'function');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createMapsLoader } from './editor-maps.js';

// A window with just enough document to append a script to, and a google
// global the test fills in when it lets the script "load".
function fakeWindow() {
  const scripts = [];
  const win = {
    google: undefined,
    document: {
      createElement: () => ({ removed: false, remove() { this.removed = true; } }),
      head: { appendChild: (script) => scripts.push(script) },
    },
  };

  return { win, scripts };
}

test('the first Locate adds one script tag, and concurrent calls share it', async () => {
  const { win, scripts } = fakeWindow();
  const load = createMapsLoader(win);

  const first = load('https://maps.example/api?key=k');
  const second = load('https://maps.example/api?key=k');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://maps.example/api?key=k');
  assert.equal(scripts[0].async, true);

  win.google = { maps: {} };
  scripts[0].onload();

  assert.equal(await first, win.google);
  assert.equal(await second, win.google);
});

test('a library already on the page is used without adding a tag', async () => {
  const { win, scripts } = fakeWindow();
  win.google = { maps: { Geocoder: class {} } };

  assert.equal(await createMapsLoader(win)('https://maps.example/api'), win.google);
  assert.equal(scripts.length, 0);
});

test('with the async loader, the geocoding library is imported before the promise resolves', async () => {
  const { win, scripts } = fakeWindow();
  const imported = [];
  const load = createMapsLoader(win);

  const promise = load('https://maps.example/api');
  win.google = { maps: { importLibrary: async (name) => { imported.push(name); } } };
  scripts[0].onload();

  assert.equal(await promise, win.google);
  assert.deepEqual(imported, ['geocoding']);
});

test('no source means nothing to load', async () => {
  const { win, scripts } = fakeWindow();

  assert.equal(await createMapsLoader(win)(undefined), undefined);
  assert.equal(scripts.length, 0);
});

test('a script that fails to load resolves to nothing, is removed, and can be tried again', async () => {
  const { win, scripts } = fakeWindow();
  const load = createMapsLoader(win);

  const failed = load('https://maps.example/api');
  scripts[0].onerror();
  assert.equal(await failed, undefined);
  assert.equal(scripts[0].removed, true);

  const retry = load('https://maps.example/api');
  assert.equal(scripts.length, 2);
  win.google = { maps: {} };
  scripts[1].onload();
  assert.equal(await retry, win.google);
});

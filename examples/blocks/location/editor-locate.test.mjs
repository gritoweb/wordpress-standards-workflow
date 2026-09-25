import assert from 'node:assert/strict';
import { test } from 'node:test';

import { executeBundle } from '../../../theme/scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../theme/scripts/wp-editor-stubs.mjs';

resetWpEditorTest();
const { createLocator } = await executeBundle(
  new URL('./editor-locate.js', import.meta.url).pathname,
  wpEditorStubs({
    '@wordpress/i18n': `export function __(value) { return value; }
      export function sprintf(format, ...args) { let i = 0; return format.replace(/%s/g, () => args[i++]); }`,
  }),
  'EditorLocateBundle',
);

// A geocoder whose answers a test releases by hand, in any order.
function fakeGoogle() {
  const pending = [];
  const google = {
    maps: {
      Geocoder: class {
        geocode(request, callback) {
          pending.push({ request, callback });
        }
      },
    },
  };
  const point = (lat, lng) => ({ geometry: { location: { lat: () => lat, lng: () => lng } } });

  return { google, pending, point };
}

function setup({ address = '1 Main St', google, loadGoogle } = {}) {
  const state = { address, found: [], status: [] };
  const locator = createLocator({
    getGoogle: () => google,
    loadGoogle,
    getAddress: () => state.address,
    onFound: (coordinates) => state.found.push(coordinates),
    onStatus: (line) => state.status.push(line),
  });

  return { state, locator };
}

test('Locate with no address asks for one, and never calls the geocoder', () => {
  const { google, pending } = fakeGoogle();
  const { state, locator } = setup({ address: '', google });

  locator.locate();

  assert.deepEqual(state.status, ['Enter an address first.']);
  assert.equal(pending.length, 0);
});

test('Locate without the Maps library says how to load it', () => {
  const { state, locator } = setup({ google: undefined });

  locator.locate();

  assert.match(state.status.at(-1), /Maps library is not loaded/);
});

test('a found address stores its coordinates as strings and reports it', () => {
  const { google, pending, point } = fakeGoogle();
  const { state, locator } = setup({ google });

  locator.locate();
  assert.deepEqual(state.status, ['Locating…']);
  assert.deepEqual(pending[0].request, { address: '1 Main St' });

  pending[0].callback([point(40.5, -83.25)], 'OK');

  assert.deepEqual(state.found, [{ latitude: '40.5', longitude: '-83.25' }]);
  assert.equal(state.status.at(-1), 'Found it.');
});

test('a failed lookup reports no match and stores nothing', () => {
  const { google, pending } = fakeGoogle();
  const { state, locator } = setup({ google });

  locator.locate();
  pending[0].callback([], 'ZERO_RESULTS');

  assert.deepEqual(state.found, []);
  assert.match(state.status.at(-1), /No match/);
});

test('a result for an address that was edited since the click is ignored', () => {
  const { google, pending, point } = fakeGoogle();
  const { state, locator } = setup({ google });

  locator.locate();
  state.address = '2 Elm St';
  pending[0].callback([point(1, 2)], 'OK');

  assert.deepEqual(state.found, []);
});

test('a newer Locate click wins over an older result that arrives late', () => {
  const { google, pending, point } = fakeGoogle();
  const { state, locator } = setup({ google });

  locator.locate();
  locator.locate();
  pending[0].callback([point(1, 1)], 'OK');
  pending[1].callback([point(2, 2)], 'OK');

  assert.deepEqual(state.found, [{ latitude: '2', longitude: '2' }]);
});

test('a coordinate typed by hand outranks a result still on its way', () => {
  const { google, pending, point } = fakeGoogle();
  const { state, locator } = setup({ google });

  locator.locate();
  locator.invalidate();
  pending[0].callback([point(1, 1)], 'OK');

  assert.deepEqual(state.found, []);
});

test('an address edited while the request is out clears the "Locating…" line', () => {
  const { google, pending, point } = fakeGoogle();
  const { state, locator } = setup({ google });

  locator.locate();
  state.address = '2 Elm St';
  pending[0].callback([point(1, 2)], 'OK');

  assert.equal(state.status.at(-1), '');
});

test('a refused request names the API key, and any other failure says the lookup failed, not that nothing matched', () => {
  const { google, pending } = fakeGoogle();
  const { state, locator } = setup({ google });

  locator.locate();
  pending[0].callback([], 'REQUEST_DENIED');
  assert.match(state.status.at(-1), /Geocoding API/);
  assert.doesNotMatch(state.status.at(-1), /No match/);

  locator.locate();
  pending[1].callback([], 'OVER_QUERY_LIMIT');
  assert.match(state.status.at(-1), /OVER_QUERY_LIMIT/);
  assert.doesNotMatch(state.status.at(-1), /No match/);
  assert.deepEqual(state.found, []);
});

test('with the library not yet loaded, Locate loads it, says so, and then geocodes', async () => {
  const { google, pending, point } = fakeGoogle();
  const { state, locator } = setup({ loadGoogle: () => Promise.resolve(google) });

  locator.locate();
  assert.deepEqual(state.status, ['Loading the Maps library…']);

  await Promise.resolve();
  assert.deepEqual(pending[0].request, { address: '1 Main St' });
  pending[0].callback([point(3, 4)], 'OK');

  assert.deepEqual(state.found, [{ latitude: '3', longitude: '4' }]);
});

test('a library that will not load says how to fix it, and geocodes nothing', async () => {
  const { state, locator } = setup({ loadGoogle: () => Promise.resolve(undefined) });

  locator.locate();
  await Promise.resolve();

  assert.match(state.status.at(-1), /Maps library is not loaded/);
});

test('an address edited while the library loads clears the status and never geocodes', async () => {
  const { google, pending } = fakeGoogle();
  const { state, locator } = setup({ loadGoogle: () => Promise.resolve(google) });

  locator.locate();
  state.address = '2 Elm St';
  await Promise.resolve();

  assert.equal(state.status.at(-1), '');
  assert.equal(pending.length, 0);
});


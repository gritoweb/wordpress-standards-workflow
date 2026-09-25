import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { appRoot, callKitPhp } from '../../../theme/app/test-support.mjs';
import { examplesApp } from '../../test-support.mjs';

const REQUIRES = [resolve(appRoot, 'Settings/SiteSettings.php'), resolve(examplesApp, 'Settings/MapsSettings.php')];

const call = (method, args = [], acf = null) =>
  callKitPhp(`App\\Settings\\MapsSettings::${method}`, args, { requires: REQUIRES, acf });

test('mapsApiKey falls back to an empty string with no ACF', () => {
  assert.equal(call('mapsApiKey'), '');
});

test('mapsStyle falls back to google with no ACF', () => {
  assert.equal(call('mapsStyle'), 'google');
});

test('mapsHideBusiness falls back to true (on) with no ACF', () => {
  assert.equal(call('mapsHideBusiness'), true);
});

test('mapsApiKey trims a saved key', () => {
  assert.equal(call('mapsApiKey', [], { maps_api_key: '  abc123  ' }), 'abc123');
});

test('mapsStyle only accepts branded, anything else (including a typo) falls back to google', () => {
  assert.equal(call('mapsStyle', [], { maps_style: 'branded' }), 'branded');
  assert.equal(call('mapsStyle', [], { maps_style: 'sideways' }), 'google');
});

test('mapsHideBusiness is off only when explicitly false, "0", or 0', () => {
  assert.equal(call('mapsHideBusiness', [], { maps_hide_business: false }), false);
  assert.equal(call('mapsHideBusiness', [], { maps_hide_business: '0' }), false);
  assert.equal(call('mapsHideBusiness', [], { maps_hide_business: true }), true);
});

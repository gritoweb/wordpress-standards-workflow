import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wpEditorStubs } from './wp-editor-stubs.mjs';

test('an override that re-declares a default export replaces it instead of duplicating it', () => {
  const defaults = new Map(wpEditorStubs());
  const modules = new Map(wpEditorStubs({
    '@wordpress/components': defaults.get('@wordpress/components') +
      "\nexport function Spinner() { return 'override'; }\n",
  }));
  const source = modules.get('@wordpress/components');
  assert.equal(source.match(/export function Spinner\b/g).length, 1);
  assert.match(source, /return 'override'/);
});

test('the default sprintf handles both %s and %1$s', async () => {
  const src = new Map(wpEditorStubs()).get('@wordpress/i18n');
  const mod = await import('data:text/javascript,' + encodeURIComponent(src));
  assert.equal(mod.sprintf('%s and %s', 'a', 'b'), 'a and b');
  assert.equal(mod.sprintf('%1$s then %2$s', 'a', 'b'), 'a then b');
});

test('the default stubs cover the packages the shared components import', async () => {
  const stubs = new Map(wpEditorStubs());
  for (const id of ['@wordpress/data', '@wordpress/rich-text']) assert.ok(stubs.has(id), `${id} has a default stub`);
  assert.match(stubs.get('@wordpress/element'), /export function useId\b/);
  assert.match(stubs.get('@wordpress/block-editor'), /export function LinkControl\b/);
  assert.match(stubs.get('@wordpress/components'), /export function Popover\b/);

  const data = await import('data:text/javascript,' + encodeURIComponent(stubs.get('@wordpress/data')));
  const seen = data.useSelect((select) => ({ records: select('core').getEntityRecords(), media: select('core').getMedia(7) }));
  assert.deepEqual(seen, { records: null, media: undefined });
});

test('the default sprintf also handles %d', async () => {
  const mod = await import('data:text/javascript,' + encodeURIComponent(new Map(wpEditorStubs()).get('@wordpress/i18n')));
  assert.equal(mod.sprintf('%d per page', 12), '12 per page');
  assert.equal(mod.sprintf('%1$d of %2$d', 1, 5), '1 of 5');
});

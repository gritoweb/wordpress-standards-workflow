import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./PostPicker.jsx', import.meta.url));

const DATA_STUB = `
export function useSelect(mapSelect) {
  return mapSelect((store) => store === 'core' ? {
    getEntityRecords: () => globalThis.__records ?? null,
  } : {});
}
`;

// PostPicker renders the real ItemList.jsx, which needs sprintf's %d support
// — wp-editor-stubs.mjs's default @wordpress/i18n only handles the %1$s
// positional form EntranceControl/ItemList use, not PostPicker's own %d.
const defaultComponents = new Map(wpEditorStubs()).get('@wordpress/components');
const OVERRIDES = {
  '@wordpress/data': DATA_STUB,
  '@wordpress/components': `${defaultComponents}
export function Notice(props) { return React.createElement('div', { role: 'status' }, props.children); }`,
  '@wordpress/i18n': `
export function __(value) { return value; }
export function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%\\d\\$s|%s|%d/g, () => args[i++]);
}`,
};

const { PostPicker, postPickerQuery } = await executeBundle(entry, wpEditorStubs(OVERRIDES), 'PostPickerBundle');

// titleOf() decodes REST's rendered-HTML title via a real <textarea> in the
// browser; this stub does the same job for the handful of entities these
// tests use, since Node has no DOM.
function withFakeTextareaDocument(fn) {
  const realDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      set innerHTML(html) {
        this.value = html.replace(/&#8217;/g, '’').replace(/&amp;/g, '&');
      },
    }),
  };
  try {
    return fn();
  } finally {
    globalThis.document = realDocument;
  }
}

function render(props, records) {
  resetWpEditorTest();
  globalThis.__records = records;
  return withFakeTextareaDocument(() =>
    renderToStaticMarkup(
      React.createElement(PostPicker, { postType: 'post', value: [], onChange: () => {}, ...props }),
    ),
  );
}

test('postPickerQuery fetches every published record with the embedded featured image', () => {
  assert.deepEqual(postPickerQuery, {
    per_page: -1,
    status: 'publish',
    orderby: 'title',
    order: 'asc',
    _embed: 'wp:featuredmedia',
  });
});

test('shows a loading state while records is null', () => {
  const markup = render({}, null);
  assert.match(markup, /Loading…/);
});

test('shows the empty notice when nothing is chosen and one is given', () => {
  const markup = render({ emptyNotice: 'Nothing chosen yet' }, []);
  assert.match(markup, /Nothing chosen yet/);
});

test('decodes the REST rendered title and offers unchosen records in the add dropdown', () => {
  render({}, [
    { id: 1, title: { rendered: 'A&#8217;s Picks' } },
    { id: 2, title: { rendered: 'Second' } },
  ]);
  const options = globalThis.__wpEditorTest.selects[0].options.map((o) => o.label);
  assert.deepEqual(options, ['Choose one…', 'A’s Picks', 'Second']);
});

test('a chosen id shows even when its record is gone, with a "not published" note', () => {
  const markup = render({ value: [99] }, [{ id: 1, title: { rendered: 'Alive' } }]);
  assert.match(markup, /Missing \(ID 99\)/);
  assert.match(markup, /Not published/);
});

// M10: while records is still null, every chosen id looks up to nothing —
// not because it is actually missing, but because nothing has loaded yet.
// Labelling it "Missing" while loading invites the editor to delete a
// perfectly valid row.
test('a chosen id does not show as "Missing" while records are still loading', () => {
  const markup = render({ value: [1] }, null);
  assert.match(markup, /Loading…/);
  assert.doesNotMatch(markup, /Missing \(ID 1\)/);
  assert.doesNotMatch(markup, /Not published/);
});

test('"nothing else to add" shows once every record is chosen', () => {
  const markup = render({ value: [1] }, [{ id: 1, title: { rendered: 'Only one' } }]);
  assert.match(markup, /Nothing else to add\./);
});

test('a warning shows when nothing is published at all', () => {
  const markup = render({}, []);
  assert.match(markup, /Nothing is published to choose from yet\./);
});

test('clearLabel only renders once something is chosen', () => {
  assert.doesNotMatch(render({ clearLabel: 'Clear all' }, []), /Clear all/);
  assert.match(
    render({ value: [1], clearLabel: 'Clear all' }, [{ id: 1, title: { rendered: 'One' } }]),
    /Clear all/,
  );
});

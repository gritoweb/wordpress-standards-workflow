import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';
import { wpEditorStubs, resetWpEditorTest } from '../../../../scripts/wp-editor-stubs.mjs';

const entry = fileURLToPath(new URL('./AttachmentImageControl.jsx', import.meta.url));

// No default @wordpress/data stub exists yet (nothing in the framework
// needed useSelect before this control); `globalThis.__coreMedia` and
// `__coreResolving` let each test drive what core.getMedia()/isResolving()
// return, the way a real @wordpress/data store would after fetching.
const DATA_STUB = `
export function useSelect(mapSelect) {
  return mapSelect((store) => store === 'core' ? {
    getMedia: (id) => globalThis.__coreMedia?.[id],
    isResolving: (_selector, [id]) => Boolean(globalThis.__coreResolving?.[id]),
  } : {});
}
`;

const { AttachmentImageControl } = await executeBundle(
  entry,
  wpEditorStubs({ '@wordpress/data': DATA_STUB }),
  'AttachmentImageControlBundle',
);

function render(props, { media = {}, resolving = {} } = {}) {
  resetWpEditorTest();
  globalThis.__coreMedia = media;
  globalThis.__coreResolving = resolving;
  return renderToStaticMarkup(React.createElement(AttachmentImageControl, { onSelect: () => {}, ...props }));
}

test('an unset image shows the empty state', () => {
  const markup = render({ imageId: 0 });
  assert.match(markup, /data-attachment-state="empty"/);
  // The empty frame shows core's image icon (34fb4ba); the button names the action.
  assert.match(markup, /<svg/);
  assert.match(markup, /aria-label="Add image"/);
});

test('a resolving image shows the loading state', () => {
  const markup = render({ imageId: 5 }, { resolving: { 5: true } });
  assert.match(markup, /data-attachment-state="loading"/);
});

test('a resolved image with no source_url (deleted attachment) shows unavailable', () => {
  const markup = render({ imageId: 5 });
  assert.match(markup, /data-attachment-state="unavailable"/);
  assert.match(markup, /Image preview unavailable/);
});

test('an image with a resolved source_url is ready and rendered', () => {
  const markup = render({ imageId: 5 }, { media: { 5: { source_url: '/uploads/photo.jpg' } } });
  assert.match(markup, /data-attachment-state="ready"/);
  assert.match(markup, /src="\/uploads\/photo\.jpg"/);
});

test('imageUrl is used as a fallback preview before the attachment resolves', () => {
  const markup = render({ imageId: 5, imageUrl: '/uploads/fallback.jpg' });
  assert.match(markup, /src="\/uploads\/fallback\.jpg"/);
});

test('the background has no hard-coded fallback hex; it reads the surface token', () => {
  const markup = render({ imageId: 0 });
  assert.match(markup, /background:\s*var\(--color-surface\)/);
  assert.doesNotMatch(markup, /#f4f1e8/);
});

test('the remove button only shows once there is a reference and an onRemove handler', () => {
  assert.doesNotMatch(render({ imageId: 0 }), /Remove image/);
  assert.doesNotMatch(render({ imageId: 5 }), /Remove image/);
  assert.match(render({ imageId: 5, onRemove: () => {} }), /Remove image/);
});

test('the group has an accessible label', () => {
  assert.match(render({ imageId: 0, label: 'Background image' }), /aria-label="Background image"/);
});

test('imageClassName lands on the preview img and nowhere else', () => {
  const markup = render({ imageId: 5, imageClassName: 'logo-tint-dark' }, { media: { 5: { source_url: 'https://example.com/a.png' } } });

  assert.match(markup, /<img[^>]*class="logo-tint-dark"/);
  assert.equal(markup.match(/logo-tint-dark/g).length, 1);
});

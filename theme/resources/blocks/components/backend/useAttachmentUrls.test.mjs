import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';

const entry = fileURLToPath(new URL('./useAttachmentUrls.js', import.meta.url));

function stub(media) {
  return executeBundle(
    entry,
    [[
      '@wordpress/data',
      `const MEDIA = ${JSON.stringify(media)};
      export function useSelect(mapSelect) {
        return mapSelect((store) => store === 'core' ? {
          getMedia: (id) => MEDIA[id],
        } : {});
      }`,
    ]],
    'UseAttachmentUrlsBundle',
  );
}

test('resolves a source_url per id, deduped and coerced to numbers', async () => {
  const { useAttachmentUrls } = await stub({ 5: { source_url: '/a.jpg' }, 6: { source_url: '/b.jpg' } });
  assert.deepEqual(useAttachmentUrls(['5', 5, 6]), { 5: '/a.jpg', 6: '/b.jpg' });
});

test('drops non-positive ids and defaults an unresolved one to an empty string', async () => {
  const { useAttachmentUrls } = await stub({});
  assert.deepEqual(useAttachmentUrls([0, -1, 5]), { 5: '' });
});

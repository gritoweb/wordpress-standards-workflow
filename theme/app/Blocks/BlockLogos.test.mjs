import { test } from 'node:test';
import assert from 'node:assert/strict';

import { callPhp } from '../../scripts/render-harness.mjs';
import { APP_AUTOLOAD } from './test-support.mjs';

// The harness's own wp_get_attachment_image_src() fake always answers
// 640x900, regardless of the id passed in — real enough to exercise the
// height-cap math without needing a configurable fixture.
const RASTER_MIME = "function get_post_mime_type($id) { return 'image/png'; }";
const SVG_MIME = "function get_post_mime_type($id) { return 'image/svg+xml'; }";

const size = (imageId, maxHeight, fallbackWidth, allowSvgUpscale, mime = RASTER_MIME) =>
  callPhp('App\\Blocks\\BlockLogos::size', [imageId, maxHeight, fallbackWidth, allowSvgUpscale], {
    functions: [APP_AUTOLOAD, mime],
  });

test('no attachment draws at the fallback width and the height cap', () => {
  assert.deepEqual(size(0, 70, 120, false), { width: 120, height: 70 });
});

test('a raster mark shrinks to the cap and keeps its own aspect ratio', () => {
  // 640x900 capped to height 70 -> width round(640 * 70/900) = 50.
  assert.deepEqual(size(5, 70, 120, false), { width: 50, height: 70 });
});

test('a raster mark never upscales past its own natural height, even under a taller cap', () => {
  assert.deepEqual(size(5, 2000, 120, false), { width: 640, height: 900 });
});

test('an SVG mark upscales to the cap where a raster mark would not', () => {
  // Same fixture (640x900) and the same taller cap as the raster test above,
  // but allowSvgUpscale draws AT the cap instead of stopping at the natural
  // height.
  assert.deepEqual(size(5, 2000, 120, true, SVG_MIME), { width: 1422, height: 2000 });
});

// The harness's own get_post_meta() reads an attachment's alt from
// env.attachments (see render-harness.mjs), the same fixture wp_get_attachment_image() uses.
const alt = (imageId, name, linkUrl) =>
  callPhp('App\\Blocks\\BlockLogos::alt', [imageId, name, linkUrl], {
    functions: [APP_AUTOLOAD],
    attachments: { 5: { alt: 'Attachment alt text' } },
  });

test('a named logo keeps its own name regardless of link state', () => {
  assert.equal(alt(5, 'Acme', ''), 'Acme');
  assert.equal(alt(5, 'Acme', 'https://acme.test'), 'Acme');
});

test('an unnamed, unlinked logo stays decorative (empty alt)', () => {
  assert.equal(alt(5, '', ''), '');
});

test('an unnamed but linked logo falls back to the attachment alt, then the link host', () => {
  assert.equal(alt(5, '', 'https://acme.test/about'), 'Attachment alt text');
  assert.equal(alt(0, '', 'https://acme.test/about'), 'acme.test');
});

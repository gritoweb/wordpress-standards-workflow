import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderTemplate } from '../../../app/test-support.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const render = (vars) =>
  renderTemplate('partials.page-header', vars, {
    root: resolve(here, '../../../resources'),
  });

// H6: get_the_title() is already texturized/HTML-encoded (an apostrophe
// arrives as the entity "&#8217;"). {{ }} (e()) on top of that encodes the
// entity's own "&" a second time, into "&amp;#8217;" — a browser then shows
// the literal text "&#8217;" instead of decoding to an apostrophe. The
// {!! wp_kses() !!} pattern here prints the already-correct single entity
// unescaped, so both branches must use it, not {{ }}.
test('a title apostrophe stays a single HTML entity, not a double-encoded one', () => {
  const html = render({ visibleTitle: true, subtitle: '', title: "Chris&#8217;s Page" });

  assert.match(html, /Chris&#8217;s Page/);
  assert.doesNotMatch(html, /&amp;#8217;/);
});

test('the sr-only title (non-visible branch) also single-encodes, not double-encodes', () => {
  const html = render({ visibleTitle: false, subtitle: '', title: "Chris&#8217;s Page" });

  assert.match(html, /<h1 class="sr-only">Chris&#8217;s Page<\/h1>/);
  assert.doesNotMatch(html, /&amp;#8217;/);
});

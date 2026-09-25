import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { callPhp } from '../../scripts/render-harness.mjs';
import { APP_AUTOLOAD } from './test-support.mjs';
import { renderTemplate } from '../test-support.mjs';

const env = { functions: [APP_AUTOLOAD] };

function withGrounds(grounds) {
  const root = mkdtempSync(join(tmpdir(), 'block-attributes-'));
  writeFileSync(join(root, 'kit.config.json'), JSON.stringify({ grounds }));
  return {
    root,
    functions: [APP_AUTOLOAD, `function get_template_directory() { return ${JSON.stringify(root)}; }`],
  };
}

test('enum falls back when the value is missing or not in the allow-list', () => {
  const enumOf = (attrs, key, allowed, fallback) =>
    callPhp('App\\Blocks\\BlockAttributes::enum', [attrs, key, allowed, fallback], env);

  assert.equal(enumOf({ align: 'center' }, 'align', ['left', 'center'], 'left'), 'center');
  assert.equal(enumOf({ align: 'diagonal' }, 'align', ['left', 'center'], 'left'), 'left');
  assert.equal(enumOf({}, 'align', ['left', 'center'], 'left'), 'left');
});

test('groundClass and isLightGround read the grounds kit.config.json declares, no hard-coded names', () => {
  const { root, functions } = withGrounds([
    { name: 'primary', token: '--color-primary', light: true },
    { name: 'ink', token: '--color-ink', light: false },
  ]);

  const groundClass = (g) => callPhp('App\\Blocks\\BlockAttributes::groundClass', [g], { functions });
  const isLight = (g) => callPhp('App\\Blocks\\BlockAttributes::isLightGround', [g], { functions });

  assert.equal(groundClass('primary'), 'ground-primary');
  assert.equal(groundClass('ink'), 'ground-ink on-dark');
  assert.equal(isLight('primary'), true);
  assert.equal(isLight('ink'), false);
  rmSync(root, { recursive: true, force: true });
});

test('an unknown ground name (a stale saved value) prints no class and reads as light', () => {
  const { root, functions } = withGrounds([{ name: 'primary', token: '--color-primary', light: true }]);

  assert.equal(callPhp('App\\Blocks\\BlockAttributes::groundClass', ['gone'], { functions }), '');
  assert.equal(callPhp('App\\Blocks\\BlockAttributes::isLightGround', ['gone'], { functions }), true);
  rmSync(root, { recursive: true, force: true });
});

test('grounds default to empty before the design system phase fills kit.config.json in', () => {
  const { root, functions } = withGrounds([]);

  assert.deepEqual(callPhp('App\\Blocks\\BlockAttributes::grounds', [], { functions }), []);
  rmSync(root, { recursive: true, force: true });
});

test('cta reads text, url, target and the icon class from an attributes array', () => {
  const cta = (attrs) => callPhp('App\\Blocks\\BlockAttributes::cta', [attrs], env);

  assert.deepEqual(
    cta({
      ctaText: 'Learn more',
      ctaLink: { url: 'https://example.com', opensInNewTab: true },
      ctaIcon: 'arrow',
      ctaIconPosition: 'before',
    }),
    {
      ctaText: 'Learn more',
      ctaUrl: 'https://example.com',
      ctaNew: true,
      ctaIconClass: 'btn-icon-arrow btn-icon-before',
    },
  );
});

test('cta prints no icon class for an unset or unknown icon', () => {
  const cta = (attrs) => callPhp('App\\Blocks\\BlockAttributes::cta', [attrs], env);

  assert.equal(cta({}).ctaIconClass, '');
  assert.equal(cta({ ctaIcon: 'sparkle' }).ctaIconClass, '');
});

test('divider is one of none/above/below, defaulting to none', () => {
  const divider = (attrs) => callPhp('App\\Blocks\\BlockAttributes::divider', [attrs], env);

  assert.equal(divider({ sectionDivider: 'above' }), 'above');
  assert.equal(divider({ sectionDivider: 'sideways' }), 'none');
  assert.equal(divider({}), 'none');
});

const HINT = '<span class="sr-only"> (opens in a new tab)</span>';
const hints = (html) => callPhp('App\\Blocks\\BlockAttributes::newTabHints', [html], env);

test('newTabHints adds the hidden new-tab text to every target="_blank" link, and only those', () => {
  const html =
    '<p>See <a href="/a" target="_blank" rel="noopener">one</a>, <a href="/b">two</a> and ' +
    "<a class=\"x\" target='_blank' href=\"/c\">three <em>bold</em></a>. <a href=\"/d\" target=\"_self\">four</a></p>";

  assert.equal(
    hints(html),
    '<p>See <a href="/a" target="_blank" rel="noopener">one' + HINT + '</a>, <a href="/b">two</a> and ' +
      "<a class=\"x\" target='_blank' href=\"/c\">three <em>bold</em>" + HINT + '</a>. <a href="/d" target="_self">four</a></p>',
  );
});

test('newTabHints leaves copy without a new-tab link exactly as it was', () => {
  for (const html of ['', 'Plain text', '<p>One <a href="/a">link</a></p>', '<p>target="_blank" in text</p>']) {
    assert.equal(hints(html), html);
  }
});

test('newTabHints is not fooled by a > in an attribute or a data-target attribute', () => {
  assert.equal(
    hints('<a title="a > b" target="_blank" href="/a">x</a>'),
    '<a title="a > b" target="_blank" href="/a">x' + HINT + '</a>',
  );
  assert.equal(hints('<a data-target="_blank" href="/a">x</a>'), '<a data-target="_blank" href="/a">x</a>');
});

test('newTabHints adds the hint once, however many times the copy passes through it', () => {
  const once = hints('<a href="/a" target="_blank">x</a>');

  assert.equal(hints(once), once);
});

test('newTabHints prints the same hint as the new-tab-hint partial', () => {
  assert.equal(renderTemplate('partials.new-tab-hint', { new: true }), HINT);
  assert.equal(hints('<a target="_blank">x</a>'), `<a target="_blank">x${HINT}</a>`);
});

import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check } from './conformance.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXAMPLES = resolve(HERE, '../../../docs/examples');
const SKIP = new Set(['README.md', 'home.md']);
const FENCE = { json: 'block.json', php: 'block.php', jsx: 'block.jsx', css: 'block.css', js: 'block.js' };

// The reference blocks are the kit's proof: each is unpacked into a real theme layout.
function theme(t) {
  const root = mkdtempSync(join(tmpdir(), 'conformance-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'resources/views/blocks'), { recursive: true });
  mkdirSync(join(root, 'app/Blocks'), { recursive: true });
  const slugs = [];
  for (const file of readdirSync(EXAMPLES).filter((f) => f.endsWith('.md') && !SKIP.has(f))) {
    const slug = file.slice(0, -3);
    const dir = join(root, 'resources/blocks', slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'preview.svg'), '<svg/>');
    const source = readFileSync(join(EXAMPLES, file), 'utf8').replaceAll('<namespace>', 'acme').replaceAll('<text-domain>', 'acme').replaceAll('<category>', 'acme');
    // First fence of each language: later ones are notes, such as the vendor registration.
    const seen = new Set();
    for (const [, lang, code] of source.matchAll(/^```(\w+)\n([\s\S]*?)^```/gm)) {
      if (seen.has(lang)) continue;
      seen.add(lang);
      if (lang === 'blade') writeFileSync(join(root, 'resources/views/blocks', `${slug}.blade.php`), code);
      else if (FENCE[lang]) writeFileSync(join(dir, FENCE[lang]), code);
    }
    slugs.push(slug);
  }
  writeFileSync(join(root, 'app/Blocks/BlockManager.php'), slugs.map((s) => `'${s}',`).join('\n'));
  cpSync(join(HERE, 'BlockEntrance.php'), join(root, 'app/Blocks/BlockEntrance.php'));
  return { root, slugs };
}

const failed = (root, slug) => check(root)[slug].failures.map((f) => f.id);

test('every reference block passes', (t) => {
  const { root } = theme(t);
  const failures = Object.entries(check(root)).flatMap(([name, r]) => r.failures.map((f) => `${name}: ${f.id} ${f.message}`));
  assert.deepEqual(failures, []);
});

const edit = (root, path, from, to) => {
  const file = join(root, path);
  const source = readFileSync(file, 'utf8');
  assert.ok(from instanceof RegExp ? from.test(source) : source.includes(from), `fixture lacks ${from}`);
  writeFileSync(file, source.replace(from, to));
};

const BREAKS = [
  ['FILE-1', 'app/Blocks/BlockManager.php', "'section-intro',", ''],
  ['FILE-3', 'resources/blocks/section-intro/block.json', '"render"', '"viewStyle": "file:./block.css", "render"'],
  ['JSON-1', 'resources/blocks/section-intro/block.json', '"apiVersion": 3', '"apiVersion": 2'],
  ['JSON-2', 'resources/blocks/section-intro/block.json', '"anchor": true', '"anchor": false'],
  ['JSON-3', 'resources/blocks/section-intro/block.json', /"isPreview": true/, '"isPreview": false'],
  ['JSON-4', 'resources/blocks/section-intro/block.json', '"opensInNewTab": false', '"x": false'],
  ['ENT-8', 'resources/blocks/section-intro/block.json', '"unit": "px",', '"unit": "px", "bounce": true,'],
  ['PHP-1', 'resources/blocks/section-intro/block.php', "view('blocks.section-intro'", "view('blocks.other'"],
  ['PHP-3', 'resources/blocks/section-intro/block.php', "sanitize_html_class($attributes['anchor'] ?? '')", "''"],
  ['PHP-4', 'resources/blocks/section-intro/block.php', 'BlockEntrance::fromBlock($attributes, __DIR__)', '[]'],
  ['PHP-5', 'resources/blocks/section-intro/block.php', 'BlockPadding::fromAttributes($attributes)', '[]'],
  ['VIEW-1', 'resources/views/blocks/section-intro.blade.php', '<section', '<div'],
  ['VIEW-2', 'resources/views/blocks/section-intro.blade.php', 'class="container"', 'class="wrap"'],
  ['VIEW-5', 'resources/views/blocks/section-intro.blade.php', '<h2 @entrancePart(0)', '<h2 @entrancePart(0) style="color:red"'],
  ['VIEW-6', 'resources/views/blocks/section-intro.blade.php', 'text-muted', 'text-slate-500'],
  ['ESC-1', 'resources/views/blocks/section-intro.blade.php', '<h2 ', '<a href="{{ $ctaUrl }}"></a><h2 '],
  ['CTA-6', 'resources/views/blocks/section-intro.blade.php', '<div class="container">', '<div class="container">\n\n<a target="_blank" href="#"></a>'],
  ['PHP-1', 'resources/blocks/section-intro/block.jsx', /save:\s*\(\)\s*=>\s*null/, 'save: () => 1'],
  ['CANVAS-4', 'resources/blocks/section-intro/block.jsx', 'EDITOR_BLOCK_FRAME }', 'EDITOR_BLOCK_FRAME, EDITOR_TYPE.x }'],
  ['CTA-8', 'resources/blocks/section-intro/block.jsx', '</InspectorControls>', '</InspectorControls><a href="/x">x</a>'],
  ['INSP-4', 'resources/blocks/section-intro/block.jsx', '</InspectorControls>', '<ActionEditor /></InspectorControls>'],
  ['I18N-1', 'resources/blocks/section-intro/block.jsx', "__('", "__('Oops', 'other') + __('"],
];

for (const [id, path, from, to] of BREAKS) {
  test(`${id} catches: ${String(from)}`, (t) => {
    const { root } = theme(t);
    edit(root, path, from, to);
    assert.ok(failed(root, 'section-intro').includes(id), failed(root, 'section-intro').join() || 'no failure');
  });
}

test('a vendor lib enqueued from app/ fails, the theme bundle does not', (t) => {
  const { root } = theme(t);
  writeFileSync(join(root, 'app/x.php'), "<?php wp_enqueue_script('app'); wp_enqueue_script('splide');");
  assert.deepEqual(check(root).theme.failures.map((f) => f.message), ['app/x.php enqueues splide']);
});

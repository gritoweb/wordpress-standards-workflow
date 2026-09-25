import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Every `url('@images/...')` a project's own CSS writes has to resolve to a
// real file — `@images` is the Vite alias for resources/images/. Walks
// resources/css for .css files (never blocks/, which is served from source
// and out of this kit's ownership) and checks each reference against
// resources/images/ on disk.
const resourcesRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cssRoot = resolve(resourcesRoot, 'css');
const imagesRoot = resolve(resourcesRoot, 'images');
// The kit's own examples keep their CSS in examples/css, and their own logos
// and icons in examples/images, next to the theme's. A project has no
// examples/ folder.
const examplesCssRoot = resolve(resourcesRoot, '../../examples/css');
const examplesImagesRoot = resolve(resourcesRoot, '../../examples/images');

function findCssFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) files.push(...findCssFiles(full));
    else if (extname(full) === '.css') files.push(full);
  }
  return files;
}

function imageReferences(cssPath) {
  const source = readFileSync(cssPath, 'utf8');
  const matches = source.matchAll(/url\(\s*['"]?(@images\/[^'")\s]+)['"]?\s*\)/g);
  return [...matches].map((m) => m[1]);
}

test('every @images/ url in resources/css resolves to a file', () => {
  const missing = [];

  for (const cssPath of [...findCssFiles(cssRoot), ...findCssFiles(examplesCssRoot)]) {
    for (const ref of imageReferences(cssPath)) {
      const file = ref.replace(/^@images\//, '');
      if (!existsSync(resolve(imagesRoot, file)) && !existsSync(resolve(examplesImagesRoot, file))) {
        missing.push(`${ref} (referenced in ${cssPath})`);
      }
    }
  }

  assert.deepEqual(missing, []);
});

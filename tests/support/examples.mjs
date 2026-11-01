import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { kitRoot } from './render-harness.mjs';

const EXAMPLES = resolve(kitRoot, 'docs/examples');
const TEMPLATES = resolve(kitRoot, 'skills/create-block/templates');
const FENCE = { json: 'block.json', php: 'block.php', jsx: 'block.jsx', css: 'block.css', js: 'block.js' };

export const exampleSlugs = readdirSync(EXAMPLES)
  .filter((f) => f.endsWith('.md') && !['README.md', 'home.md'].includes(f))
  .map((f) => f.slice(0, -3));

// The first fence of each language is the file; later ones are notes.
export function writeBlock(root, slug, markdown) {
  const dir = join(root, 'resources/blocks', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'preview.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  const seen = new Set();
  for (const [, lang, code] of markdown.matchAll(/^```(\w+)\n([\s\S]*?)^```/gm)) {
    if (seen.has(lang)) continue;
    seen.add(lang);
    if (lang === 'blade') writeFileSync(join(root, 'resources/views/blocks', `${slug}.blade.php`), code);
    else if (FENCE[lang]) writeFileSync(join(dir, FENCE[lang]), code);
  }
}

// A temp theme holding every reference block, the shared components and x-button-link.
export function exampleTheme(t) {
  const root = mkdtempSync(join(tmpdir(), 'kit-theme-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'resources/views/blocks'), { recursive: true });
  mkdirSync(join(root, 'resources/views/components'), { recursive: true });
  cpSync(join(TEMPLATES, 'components'), join(root, 'resources/blocks/components'), { recursive: true });
  cpSync(join(TEMPLATES, 'collection/resources/blocks/components'), join(root, 'resources/blocks/components'), { recursive: true });
  cpSync(join(TEMPLATES, 'collection/resources/views/partials'), join(root, 'resources/views/partials'), { recursive: true });
  cpSync(join(TEMPLATES, 'button-link.blade.php'), join(root, 'resources/views/components/button-link.blade.php'));
  for (const slug of exampleSlugs) {
    const source = readFileSync(join(EXAMPLES, `${slug}.md`), 'utf8')
      .replaceAll('<namespace>', 'acme').replaceAll('<text-domain>', 'acme').replaceAll('<category>', 'acme');
    writeBlock(root, slug, source);
  }
  return root;
}

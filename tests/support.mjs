import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const kit = join(dirname(fileURLToPath(import.meta.url)), '..');
const wizard = readFileSync(join(kit, 'skills/css-foundation-wizard/SKILL.md'), 'utf8');

// Every fenced block of `lang` under a heading of the css-foundation-wizard skill, in order.
export function wizardBlocks(heading, lang) {
  const from = wizard.indexOf(heading);
  assert.ok(from >= 0, `wizard lacks "${heading}"`);
  const next = wizard.indexOf('\n#', from + heading.length);
  const section = wizard.slice(from, next === -1 ? undefined : next);
  return [...section.matchAll(new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'g'))].map((m) => m[1]);
}

// A fresh theme in a temp dir: the kit's theme/, a style.css and kit.config.json, and the kit's node_modules.
export function buildKitTheme({ grounds = [] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'kit-theme-'));
  cpSync(join(kit, 'theme'), root, { recursive: true });
  // A Sage theme has postcss through Vite; the kit's node_modules stands in for it.
  symlinkSync(join(kit, 'node_modules'), join(root, 'node_modules'));
  writeFileSync(join(root, 'style.css'), '/*\nTheme Name: Acme\nText Domain: acme-2026\n*/\n');
  writeFileSync(join(root, 'vite.config.js'), 'export default {};\n');
  writeFileSync(
    join(root, 'kit.config.json'),
    JSON.stringify({ prefix: 'acme', textDomain: 'acme-2026', themeSlug: 'acme-2026', blockNamespace: 'acme-2026', blockCategory: { slug: 'acme-2026', title: 'Acme Blocks' }, grounds }),
  );
  return root;
}

// Writes every `### \`resources/...\`` file of _docs/examples.md into the theme, placeholders filled; returns the block slugs.
export function materializeExamples(root) {
  const md = readFileSync(join(kit, '_docs/examples.md'), 'utf8');
  const slugs = new Set();
  const section = /^### `(resources\/[^`]+)`[^\n]*\n[\s\S]*?```\w*\n([\s\S]*?)```/gm;
  for (const [, path, body] of md.matchAll(section)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body.replaceAll('<namespace>', 'acme-2026').replaceAll('<text-domain>', 'acme-2026').replaceAll('<category>', 'acme-2026'));
    const block = /^resources\/blocks\/([^/]+)\//.exec(path);
    if (block) slugs.add(block[1]);
  }
  const preview = readFileSync(join(kit, 'skills/create-block/templates/preview.svg'), 'utf8');
  for (const slug of slugs) writeFileSync(join(root, 'resources/blocks', slug, 'preview.svg'), preview.replaceAll('__BLOCK_TITLE__', slug));
  return [...slugs];
}

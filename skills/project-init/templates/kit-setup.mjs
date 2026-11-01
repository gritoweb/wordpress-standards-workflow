#!/usr/bin/env node
// Fills the kit's placeholders in a Sage theme from kit.config.json, so templates
// copied at any time get the same values. Idempotent: rerun after copying more.
//
//   node scripts/kit-setup.mjs           fill the placeholders
//   node scripts/kit-setup.mjs --check   exit 1 if any is left

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// docs/ and the skills keep the placeholders on purpose: they are templates.
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'public', '.git', '.claude', '.agents', 'docs']);
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot']);
// This script holds the tokens as literal strings; rewriting itself would break it.
const SKIP_FILES = new Set(['kit.config.json', 'scripts/kit-setup.mjs', 'scripts/kit-setup.test.mjs']);
const SLUG_RE = /^[a-z][a-z0-9-]*$/;

const PLACEHOLDERS = {
  __TEXT_DOMAIN__: 'textDomain',
  __THEME_SLUG__: 'themeSlug',
  __BLOCK_NAMESPACE__: 'blockNamespace',
};

export function validateConfig(config, themeRoot) {
  const errors = [];

  for (const key of Object.values(PLACEHOLDERS)) {
    if (!SLUG_RE.test(config[key] ?? '')) {
      errors.push(`${key} must be a lowercase slug (got ${JSON.stringify(config[key])})`);
    } else if (config[key] === 'sage') {
      errors.push(`${key} may not be "sage"`);
    }
  }

  const styleCss = readFileSync(join(themeRoot, 'style.css'), 'utf8');
  const styleDomain = styleCss.match(/^\s*Text Domain:\s*(\S+)/m)?.[1];
  if (config.textDomain !== styleDomain) {
    errors.push(`textDomain "${config.textDomain}" doesn't match style.css Text Domain "${styleDomain ?? '(missing)'}"`);
  }

  if (errors.length) throw new Error(errors.join('\n'));
}

function walk(dir, root = dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, root));
    else if (
      !BINARY_EXT.has(entry.name.slice(entry.name.lastIndexOf('.'))) &&
      !SKIP_FILES.has(relative(root, full).split(sep).join('/'))
    ) files.push(full);
  }
  return files;
}

export function findPlaceholders(themeRoot) {
  const hits = [];
  for (const file of walk(themeRoot)) {
    const text = readFileSync(file, 'utf8');
    for (const token of Object.keys(PLACEHOLDERS)) {
      if (text.includes(token)) hits.push({ file, token });
    }
  }
  return hits;
}

export function applyReplacements(themeRoot, config) {
  let changed = 0;
  for (const file of walk(themeRoot)) {
    const text = readFileSync(file, 'utf8');
    let next = text;
    for (const [token, key] of Object.entries(PLACEHOLDERS)) next = next.split(token).join(config[key]);
    // Sage's own files carry its text domain as a literal.
    if (file.endsWith('.php')) next = next.split(", 'sage')").join(`, '${config.textDomain}')`);
    if (next !== text) {
      writeFileSync(file, next);
      changed++;
    }
  }
  return changed;
}

function main() {
  const themeRoot = process.cwd();
  const config = JSON.parse(readFileSync(join(themeRoot, 'kit.config.json'), 'utf8'));
  validateConfig(config, themeRoot);

  if (process.argv.includes('--check')) {
    const hits = findPlaceholders(themeRoot);
    for (const { file, token } of hits) console.error(`${file}: leftover ${token}`);
    if (hits.length) process.exit(1);
    console.log('kit-setup --check: no leftover placeholders');
    return;
  }

  console.log(`kit-setup: updated ${applyReplacements(themeRoot, config)} file(s)`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

#!/usr/bin/env node
// Fills the kit's placeholder tokens in a Sage theme from kit.config.json.
// Run from the theme root: `node scripts/kit-setup.mjs` (or `--check`).
// Plain Node, no dependencies, idempotent.

import { readFileSync, writeFileSync, readdirSync, renameSync, mkdirSync } from 'node:fs';
import { join, relative, sep, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

// .claude/.agents are the kit's own skill docs, not theme source — matters
// when the theme root is also the project root, since they'd otherwise sit
// right inside the walk.
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'public', '.git', '.claude', '.agents']);
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
  '.woff', '.woff2', '.ttf', '.eot',
]);
// This script's own source contains the placeholder tokens as literal
// strings (the PLACEHOLDERS keys below), so walking itself would find and
// rewrite them. Skip it, its test, and the config by their fixed theme-root-
// relative path.
const SKIP_FILES = new Set(['kit.config.json', 'scripts/kit-setup.mjs', 'scripts/kit-setup.test.mjs']);
const SLUG_RE = /^[a-z][a-z0-9-]*$/;
const PREFIX_RE = /^[a-z][a-z0-9_]*$/;

const PLACEHOLDERS = {
  __PREFIX__: 'prefix',
  __TEXT_DOMAIN__: 'textDomain',
  __THEME_SLUG__: 'themeSlug',
  __BLOCK_NAMESPACE__: 'blockNamespace',
  __BLOCK_CATEGORY_SLUG__: 'blockCategory.slug',
  __BLOCK_CATEGORY_TITLE__: 'blockCategory.title',
};

function get(config, path) {
  return path.split('.').reduce((value, key) => value?.[key], config);
}

export function loadConfig(themeRoot) {
  return JSON.parse(readFileSync(join(themeRoot, 'kit.config.json'), 'utf8'));
}

function checkSlug(errors, key, value) {
  if (!SLUG_RE.test(value ?? '')) {
    errors.push(`${key} must be a lowercase slug (got ${JSON.stringify(value)})`);
  } else if (value === 'sage') {
    errors.push(`${key} may not be "sage"`);
  }
}

export function validateConfig(config, themeRoot) {
  const errors = [];

  // prefix is used as a PHP/JS identifier (ACF keys, hook names, JS
  // globals), so no hyphens — unlike the other, purely slug-shaped keys.
  if (!PREFIX_RE.test(config.prefix ?? '')) {
    errors.push(
      `prefix must be a lowercase identifier, letters/digits/underscore only, starting with a letter (got ${JSON.stringify(config.prefix)})`,
    );
  } else if (config.prefix === 'sage') {
    errors.push('prefix may not be "sage"');
  }

  for (const key of ['themeSlug', 'blockNamespace']) {
    checkSlug(errors, key, config[key]);
  }
  checkSlug(errors, 'blockCategory.slug', config.blockCategory?.slug);
  checkSlug(errors, 'textDomain', config.textDomain);

  const title = config.blockCategory?.title;
  if (!title || /['"\\\n\r]/.test(title)) {
    errors.push(
      `blockCategory.title must be non-empty and may not contain a quote, backslash, or newline (got ${JSON.stringify(title)})`,
    );
  }

  // Where the kit checkout lives, so a project's docs can point at its
  // examples/. Optional, because nothing in the theme depends on it.
  if ('kitPath' in config && !(typeof config.kitPath === 'string' && config.kitPath.trim() !== '')) {
    errors.push(`kitPath must be the path to the kit checkout (got ${JSON.stringify(config.kitPath)})`);
  }

  const styleCss = readFileSync(join(themeRoot, 'style.css'), 'utf8');
  const styleDomain = styleCss.match(/^\s*Text Domain:\s*(\S+)/m)?.[1];
  if (config.textDomain !== styleDomain) {
    errors.push(
      `textDomain "${config.textDomain}" doesn't match style.css Text Domain "${styleDomain ?? '(missing)'}"`,
    );
  }

  if (errors.length) throw new Error(errors.join('\n'));
}

// A symlink is never followed or rewritten: a linked folder (the conformance
// fixtures link to the shared components) is not a file to read, and its
// target is walked at its own path.
function walk(dir, root = dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full, root));
      continue;
    }
    if (BINARY_EXT.has(entry.name.slice(entry.name.lastIndexOf('.')))) continue;
    if (SKIP_FILES.has(relative(root, full).split(sep).join('/'))) continue;
    files.push(full);
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
  // A file or folder NAME can carry a placeholder too
  // (acf-json/group___PREFIX___site_settings.json) — applyReplacements only
  // ever rewrites contents, so this has to check names on its own.
  for (const full of walkPaths(themeRoot)) {
    const name = basename(full);
    for (const token of Object.keys(PLACEHOLDERS)) {
      if (name.includes(token)) hits.push({ file: full, token });
    }
  }
  return hits;
}

// Post-order: a directory's children are listed before the directory itself,
// so renamePlaceholders can rename a child while its parent's path is still
// the original (unrenamed) one.
function walkPaths(dir, root = dir) {
  const paths = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      paths.push(...walkPaths(full, root));
      paths.push(full);
      continue;
    }
    if (SKIP_FILES.has(relative(root, full).split(sep).join('/'))) continue;
    paths.push(full);
  }
  return paths;
}

function renamedBasename(name, config) {
  let next = name;
  for (const [token, path] of Object.entries(PLACEHOLDERS)) {
    const value = get(config, path);
    if (value != null) next = next.split(token).join(value);
  }
  return next;
}

// Renames every file and folder whose NAME contains a placeholder token
// (kit-setup.mjs's other job, applyReplacements, only ever rewrites
// contents). Post-order, so a directory is renamed only after everything
// inside it already has been.
export function renamePlaceholders(themeRoot, config) {
  let changed = 0;
  for (const full of walkPaths(themeRoot)) {
    const dir = dirname(full);
    const base = basename(full);
    const next = renamedBasename(base, config);
    if (next !== base) {
      renameSync(full, join(dir, next));
      changed++;
    }
  }
  return changed;
}

export function applyReplacements(themeRoot, config) {
  let changed = 0;
  for (const file of walk(themeRoot)) {
    const text = readFileSync(file, 'utf8');
    let next = text;
    for (const [token, path] of Object.entries(PLACEHOLDERS)) {
      const value = get(config, path);
      if (value != null) next = next.split(token).join(value);
    }
    if (next !== text) {
      writeFileSync(file, next);
      changed++;
    }
  }
  return changed;
}

const GROUND_NAME_RE = /^[a-z][a-z0-9-]*$/;
const GROUND_TOKEN_RE = /^--[a-z0-9-]+$/;

// The text-on-ground aliases a dark ground swaps for their `-on-dark` twin
// in variables.css. Custom properties resolve where they are declared, so
// redefining --color-ink on the ground never reaches --color-link (declared
// on :root as var(--color-ink)): each alias is redefined itself.
const DARK_FLIPS = {
  '--color-ink': '--color-light',
  '--color-muted': '--color-muted-on-dark',
  '--color-link': '--color-link-on-dark',
  '--color-link-hover': '--color-link-hover-on-dark',
  '--color-focus': '--color-focus-on-dark',
};

// One `.ground-<name>` class per kit.config.json `grounds` entry: a
// background from its token, and text colour by whether it's light — so a
// block never hard-codes a ground's colours (BlockAttributes::groundClass()
// and components/backend/ground.js both read the same config). Regenerated
// on every run; edit kit.config.json, not this file.
export function groundsCss(grounds) {
  const snapshots = [];
  const rules = grounds.map(({ name, token, light }, index) => {
    if (!GROUND_NAME_RE.test(name ?? '')) {
      throw new Error(`grounds[].name must be a lowercase slug (got ${JSON.stringify(name)})`);
    }
    if (!GROUND_TOKEN_RE.test(token ?? '')) {
      throw new Error(`grounds[${index}].token must be a custom property name starting with -- (got ${JSON.stringify(token)})`);
    }
    if (typeof light !== 'boolean') {
      throw new Error(`grounds[${index}].light must be a boolean (got ${JSON.stringify(light)})`);
    }
    // The background reads a snapshot taken on :root. A ground whose token
    // is an alias it also redefines (--color-ink) would otherwise read its
    // own flipped value and paint itself in the text colour.
    snapshots.push(`  --ground-${name}-bg: var(${token});`);
    const text = light ? 'var(--color-ink)' : 'var(--color-light)';
    // A light ground needs no override: the page's aliases already read
    // correctly on it.
    const flips = light ? [] : Object.entries(DARK_FLIPS).map(([alias, twin]) => `\n  ${alias}: var(${twin});`);
    return `.ground-${name} {\n  background-color: var(--ground-${name}-bg);\n  color: ${text};${flips.join('')}\n}`;
  });

  return (
    `/* Generated by \`node scripts/kit-setup.mjs\` from kit.config.json's ` +
    `"grounds" array. Edit that config and rerun the script instead of this ` +
    `file by hand. */\n` +
    (rules.length ? `\n:root {\n${snapshots.join('\n')}\n}\n\n${rules.join('\n\n')}\n` : '')
  );
}

export function generateGrounds(themeRoot, config) {
  const dir = join(themeRoot, 'resources', 'css', 'global');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'grounds.css'), groundsCss(config.grounds ?? []));
}

function main() {
  const themeRoot = process.cwd();
  const check = process.argv.includes('--check');
  const config = loadConfig(themeRoot);
  validateConfig(config, themeRoot);

  if (check) {
    const hits = findPlaceholders(themeRoot);
    for (const { file, token } of hits) console.error(`${file}: leftover ${token}`);

    const groundsPath = join(themeRoot, 'resources', 'css', 'global', 'grounds.css');
    let groundsStale = true;
    try {
      groundsStale = readFileSync(groundsPath, 'utf8') !== groundsCss(config.grounds ?? []);
    } catch {
      // File doesn't exist yet: also stale, reported below.
    }
    if (groundsStale) console.error(`${groundsPath}: out of date with kit.config.json's grounds — rerun kit-setup.mjs`);

    if (hits.length || groundsStale) process.exit(1);
    console.log('kit-setup --check: no leftover placeholders');
    return;
  }

  const changed = applyReplacements(themeRoot, config);
  const renamed = renamePlaceholders(themeRoot, config);
  generateGrounds(themeRoot, config);
  console.log(`kit-setup: updated ${changed} file(s), renamed ${renamed} path(s), wrote resources/css/global/grounds.css`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

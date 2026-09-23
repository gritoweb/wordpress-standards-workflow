#!/usr/bin/env node
/**
 * Fails when the theme's CSS foundation is missing or a site-facing file skips the style guide.
 *
 *   node scripts/check-css-foundation.mjs
 *
 * Checks, from the theme root: the foundation files exist; every contract token is defined in its one
 * owner file (color in variables.css, type in typography.css, container in container.css); the contract
 * classes exist; app.css and editor.css import the foundation; no CSS repeats a color or type value
 * outside its owner (raw hex/rgb, raw font size/family, var() fallback copies); and no Blade view or block
 * uses Tailwind's stock palette or type scale, a text-hN utility or an arbitrary size.
 * Exit 0 = clean, 1 = something to fix, 2 = not a theme root.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const CSS = 'resources/css';
const GLOBAL = ['variables', 'typography', 'layout', 'base', 'container'];
const HEADINGS = [1, 2, 3, 4, 5, 6];

const VARIABLE_TOKENS = [
  ...['ink', 'muted', 'light', 'surface', 'border', 'primary', 'primary-light', 'success', 'warning', 'danger'].map((c) => `color-${c}`),
  'radius-card',
  'radius-button',
  'shadow-card',
];
const CONTAINER_TOKENS = ['container-max-width', 'container-padding-x'];
const TYPE_TOKENS = [
  'font-display',
  'font-body',
  ...HEADINGS.flatMap((n) => [
    `text-h${n}`,
    `text-h${n}--line-height`,
    `text-h${n}--font-weight`,
    `text-h${n}-mobile`,
    `text-h${n}-mobile--line-height`,
  ]),
  ...['lead', 'body', 'small'].flatMap((t) => [`text-${t}`, `text-${t}--line-height`]),
];
const CLASSES = {
  [`${CSS}/global/typography.css`]: [...HEADINGS.map((n) => `heading-${n}`), 'font-eyebrow'],
  [`${CSS}/components/button.css`]: ['btn', 'btn-primary', 'btn-secondary'],
  [`${CSS}/components/card.css`]: ['card'],
};
// Two or more of these on one element is the card surface re-typed instead of `card`.
const CARD_PARTS = ['rounded-card', 'shadow-card', 'border-border'];

const HUES = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const PREFIX = '(?<![\\w-])(?:[\\w-]+:)*';
const END = '(?![\\w-])';
const OFF_GUIDE = new RegExp(
  [
    `${PREFIX}(?:text|bg|border(?:-[trblxy])?|ring|outline|fill|stroke|from|via|to|divide|decoration|placeholder|accent|caret)-(?:(?:${HUES})-\\d{2,3}|white|black)(?:\\/\\d+)?${END}`,
    `${PREFIX}text-(?:xs|sm|base|lg|xl|[2-9]xl)${END}`,
    `${PREFIX}text-h[1-6](?:-mobile)?${END}`,
    // Arbitrary numbers only: text-[length:var(--token)] reads the style guide and is fine.
    `${PREFIX}(?:text|leading|tracking)-\\[-?[\\d.]+(?:px|rem|em|%)?\\]`,
  ].join('|'),
  'g',
);

if (!existsSync('vite.config.js') || !existsSync(CSS)) {
  console.error('Run from the Sage theme root (vite.config.js and resources/css/ not found).');
  process.exit(2);
}

const problems = [];
const read = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');
const tokensIn = (path) => new Set([...read(path).matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]));

for (const path of [...GLOBAL.map((name) => `${CSS}/global/${name}.css`), ...Object.keys(CLASSES).filter((p) => p.includes('/components/'))]) {
  if (!existsSync(path)) problems.push(`${path} is missing — run the css-foundation-wizard skill`);
}

const expectTokens = (path, wanted, forbidden, label) => {
  if (!existsSync(path)) return;
  const defined = tokensIn(path);
  const missing = wanted.filter((token) => !defined.has(token));
  if (missing.length) problems.push(`${path} lacks contract tokens: ${missing.map((t) => `--${t}`).join(', ')}`);
  const misplaced = forbidden.filter((token) => defined.has(token));
  if (misplaced.length) problems.push(`${path} holds ${label} tokens that belong elsewhere: ${misplaced.map((t) => `--${t}`).join(', ')}`);
};
expectTokens(`${CSS}/global/variables.css`, VARIABLE_TOKENS, [...TYPE_TOKENS, ...CONTAINER_TOKENS], 'type/container');
expectTokens(`${CSS}/global/typography.css`, TYPE_TOKENS, [...VARIABLE_TOKENS, ...CONTAINER_TOKENS], 'color/shape/container');
expectTokens(`${CSS}/global/container.css`, CONTAINER_TOKENS, [...VARIABLE_TOKENS, ...TYPE_TOKENS], 'color/type');

for (const [path, classes] of Object.entries(CLASSES)) {
  const css = read(path);
  const missing = classes.filter((cls) => !new RegExp(`\\.${cls}(?![\\w-])`).test(css));
  if (css && missing.length) problems.push(`${path} lacks contract classes: ${missing.map((c) => `.${c}`).join(', ')}`);
}

const wiring = [...GLOBAL.map((name) => `global/${name}`), 'components/button', 'components/card'];
for (const entry of ['app', 'editor']) {
  const file = `${CSS}/${entry}.css`;
  const found = [...read(file).matchAll(/@import\s+["']\.\/([\w/-]+)\.css["']/g)].map((m) => m[1]);
  const missing = wiring.filter((name) => !found.includes(name));
  if (missing.length) problems.push(`${file} does not import ${missing.map((name) => `./${name}.css`).join(', ')}`);
}

// Editor-UI components under resources/blocks/components/ mimic wp-admin, not the site, so they are skipped.
const walk = (dir, test) =>
  !existsSync(dir)
    ? []
    : readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) return entry === 'vendor' || path === 'resources/blocks/components' ? [] : walk(path, test);
        return test.test(entry) ? [path] : [];
      });

const siteFiles = [
  ...walk('resources/views', /\.blade\.php$/),
  ...walk('resources/blocks', /\.(jsx?|css|php)$/),
  ...walk(`${CSS}/components`, /\.css$/),
  ...walk(`${CSS}/pages`, /\.css$/),
];

// A color or type value written outside its owner file is a second copy that drifts.
const OWNER_ONLY = [
  { re: /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(\s*[\d.]/i, owner: 'variables.css', what: 'a raw color' },
  { re: /font-(?:size|family)\s*:(?!\s*(?:var\(|inherit|initial|unset))/i, owner: 'typography.css', what: 'a raw font size/family' },
];
const ownCss = [
  ...walk(`${CSS}/global`, /\.css$/),
  ...walk(`${CSS}/components`, /\.css$/),
  ...walk(`${CSS}/pages`, /\.css$/),
  ...walk('resources/blocks', /\.css$/),
];
for (const file of ownCss) {
  read(file)
    .split('\n')
    .forEach((line, i) => {
      if (/^\s*(\/\*|\*)/.test(line)) return;
      const where = `${relative('.', file)}:${i + 1}`;
      for (const { re, owner, what } of OWNER_ONLY) {
        if (!file.endsWith(owner) && re.test(line)) problems.push(`${where} writes ${what} — define it once in ${owner} and use var(--…)`);
      }
      if (/var\(--(?:color|font|text|radius|shadow|container)-[\w-]*\s*,/.test(line)) problems.push(`${where} has a var() fallback — a second copy of a style guide value; use var(--token) alone`);
    });
}

for (const file of siteFiles) {
  read(file)
    .split('\n')
    .forEach((line, i) => {
      const hits = line.match(OFF_GUIDE);
      if (hits) problems.push(`${relative('.', file)}:${i + 1} uses ${[...new Set(hits)].join(' ')} — use the style guide (heading-N, text-body/lead/small, text-ink, bg-surface, btn-primary…)`);
      const cardParts = CARD_PARTS.filter((part) => new RegExp(`(?<![\\w-])${part}(?![\\w-])`).test(line));
      if (cardParts.length >= 2) problems.push(`${relative('.', file)}:${i + 1} re-types the card surface (${cardParts.join(' ')}) — use the \`card\` class from components/card.css`);
    });
}

if (problems.length) {
  console.error(`✗ CSS foundation: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
const classCount = Object.values(CLASSES).flat().length;
console.log(`✓ CSS foundation: ${VARIABLE_TOKENS.length + TYPE_TOKENS.length + CONTAINER_TOKENS.length} contract tokens, ${classCount} classes, ${siteFiles.length} site files on the style guide`);

#!/usr/bin/env node
// Fails a block that breaks a checkable rule in docs/block-conventions.md.
// Static: it only reads files, so it needs no PHP, WordPress or packages.
//
//   node scripts/conformance.mjs [theme root] [--json]
//
// Exit 0 = clean (warnings allowed), 1 = a rule failed, 2 = not a theme root.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const read = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');
const ENTRANCE_KEYS = ['delay', 'direction', 'distance', 'duration', 'stagger', 'trigger', 'type', 'unit'];
const PADDING_KEYS = ['paddingVertDesktop', 'paddingVertMobile', 'paddingXDesktop', 'paddingXMobile'];
const PLACEHOLDER_VERBS = /^(Write|Add|Enter|Choose|Type|Select|Paste|Describe|Name|Pick|Set|Search)\b/;
const STOCK = /(?<![\w-])(?:text|bg|border)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d|(?<![\w-])text-white\b|(?<![\w-])bg-black\b/;
const SIDEBAR_CONTENT = /<(ActionEditor|LinkPicker|LinkControl|RichText|AutoGrowingTextarea)\b/;

// Each rule returns a failure message, or nothing. `warn` rules never fail the run.
const RULES = [
  ['FILE-2', 'Required files', (b) => {
    const missing = ['block.json', 'block.php', 'block.jsx'].filter((f) => !b.files.includes(f));
    if (!b.files.some((f) => f.startsWith('preview.'))) missing.push('preview.*');
    if (!b.view) missing.push(`resources/views/blocks/${b.slug}.blade.php`);
    return missing.length && `missing ${missing.join(', ')}`;
  }],
  ['FILE-1', 'Listed in BlockManager', (b) => {
    if (!/^[a-z][a-z0-9-]*$/.test(b.slug)) return 'the slug is not lowercase with hyphens';
    return b.manager && !b.manager.includes(`'${b.slug}'`) && 'not in BlockManager::$blocks';
  }],
  ['FILE-3', 'Declared assets exist', (b) => {
    const declared = [b.json.viewScript, b.json.viewStyle].flat().filter((v) => v?.startsWith?.('file:./')).map((v) => v.slice(7));
    const missing = declared.filter((f) => !b.files.includes(f));
    const undeclared = ['block.css', 'block.js'].filter((f) => b.files.includes(f) && !declared.includes(f));
    return (missing.length || undeclared.length) && `declared but missing: ${missing}; present but undeclared: ${undeclared}`;
  }],
  ['FILE-3', 'Plain block assets', (b) =>
    (/@(apply|reference|import|layer)\b/.test(b.css) || /^\s*(import|export)\s/m.test(b.js)) &&
    'block.css and block.js are served from source: no @apply, @reference, @import, @layer, import or export'],

  ['JSON-1', 'Metadata', (b) => {
    const j = b.json;
    return (j.apiVersion !== 3 || !j.name?.endsWith(`/${b.slug}`) || !j.textdomain || j.render !== 'file:./block.php') &&
      'needs apiVersion 3, a name ending in the slug, textdomain, and render file:./block.php';
  }],
  ['JSON-2', 'Anchor support', (b) => (b.json.supports?.anchor !== true || b.attrs.anchor) && 'supports.anchor true, no anchor attribute'],
  ['JSON-3', 'Inserter preview', (b) =>
    (b.attrs.isPreview?.default !== false || b.json.example?.attributes?.isPreview !== true || !b.jsx.includes('isPreview')) &&
    'isPreview must default to false, be true in example.attributes, and be read in block.jsx'],
  ['JSON-4', 'Every attribute has a default', (b) => {
    const bad = Object.entries(b.attrs).filter(([, a]) => !a.type || !('default' in a)).map(([n]) => n);
    return bad.length && `no type or default: ${bad.join(', ')}`;
  }],
  ['JSON-4', 'Link objects are whole', (b) => {
    const bad = Object.entries(b.attrs).filter(([n, a]) =>
      /(^link|Link)$/.test(n) && !(a.default && 'url' in a.default && 'opensInNewTab' in a.default)).map(([n]) => n);
    return bad.length && `default must hold url and opensInNewTab: ${bad.join(', ')}`;
  }],
  ['JSON-5', 'Padding keys come as a set', (b) => {
    const count = PADDING_KEYS.filter((k) => k in b.attrs).length;
    return count && count < 4 && 'declare all four padding keys or none';
  }],
  ['ENT-8', 'Entrance presets', (b) => {
    const unknown = Object.keys(b.attrs.entrance?.default ?? {}).filter((k) => !ENTRANCE_KEYS.includes(k));
    return unknown.length && `unknown entrance keys: ${unknown.join(', ')}`;
  }],
  ['MEDIA-1', 'Image attributes store IDs', (b) => {
    const bad = Object.keys(b.attrs).filter((n) => /^(image|bg|photo).*Url$/i.test(n));
    return bad.length && `store the attachment ID: ${bad.join(', ')}`;
  }],
  ['JSON-9', 'No page-named variants', (b) => ('layoutVariant' in b.attrs || 'mobileVariant' in b.attrs) && 'no layoutVariant or mobileVariant'],

  ['PHP-1', 'Guard and shape', (b) =>
    (!b.php.includes('ABSPATH') || !b.php.includes(`view('blocks.${b.slug}'`)) && `needs the ABSPATH guard and view('blocks.${b.slug}'`],
  ['PHP-3', 'Anchor', (b) => !b.php.includes("sanitize_html_class($attributes['anchor']") && "pass sanitize_html_class($attributes['anchor'] ?? '')"],
  ['PHP-4', 'Entrance', (b) => !b.php.includes('BlockEntrance::fromBlock($attributes, __DIR__)') && 'call BlockEntrance::fromBlock($attributes, __DIR__)'],
  ['PHP-5', 'Padding', (b) => !b.php.includes('BlockPadding::fromAttributes(') && 'call BlockPadding::fromAttributes('],
  ['PHP-9', 'Malformed entries', (b) =>
    Object.values(b.attrs).some((a) => a.type === 'array') && !b.php.includes('is_array') && 'an array attribute needs is_array on its items'],
  ['PHP-13', 'Explicit image size', (b) => /wp_get_attachment_image\(\s*[^,()]+(\([^()]*\))?[^,()]*\)/.test(b.php + b.view) && 'wp_get_attachment_image needs a size'],

  ['VIEW-1', 'Root shape', (b) => {
    const first = b.view.replace(/\{\{--[\s\S]*?--\}\}/g, '').match(/<([a-z][\w-]*)[\s\S]*?>/);
    return (first?.[1] !== 'section' || !b.view.includes('@paddingClasses(') || !b.view.includes('@entrance(') || !/@if\s*\(\$anchor\)/.test(b.view)) &&
      'the root is a <section> with the anchor condition, @paddingClasses( in class, and @entrance(';
  }],
  ['VIEW-1', 'Anchor only on the root', (b) => (b.view.match(/id="\{\{ \$anchor \}\}"/g) ?? []).length !== 1 && 'id="{{ $anchor }}" appears once'],
  ['VIEW-2', 'Container', (b) => !/class="[^"]*\bcontainer\b/.test(b.view) && 'the view needs the container class'],
  ['VIEW-5', 'One style attribute', (b) => /<\w[^>]*@entrance(Part)?\([^>]*\sstyle=|<\w[^>]*\sstyle=[^>]*@entrance(Part)?\(/.test(b.view) && 'a tag with @entrance can have no literal style='],
  ['VIEW-6', 'Token colors', (b) => (/#[0-9a-f]{3,8}\b/i.test(b.view) || STOCK.test(b.view)) && 'use tokens: no hex or stock palette'],
  ['ESC-1', 'URL escaping', (b) => {
    if (/\{\{\s*esc_url\(/.test(b.view)) return 'print URLs with {!! esc_url() !!}: {{ }} double-encodes';
    const bad = [...b.view.matchAll(/\s(href|src|action|poster)="([^"]+)"/g)].filter(([, , v]) => v !== '#' && !v.includes('esc_url('));
    return bad.length && `not through esc_url: ${bad.map((m) => m[0].trim()).join(', ')}`;
  }],
  ['CTA-6', 'No hard-coded rel', (b) => b.view.includes('rel="noopener') && 'no rel="noopener"'],
  ['CTA-6', 'New-tab flag', (b) =>
    b.view.split('\n').some((line, i, all) => line.includes('target="_blank"') && !/@if/.test(line + all[i - 1])) && 'target="_blank" sits inside an @if'],

  ['PHP-1', 'Server-rendered', (b) => !/save:\s*\(\)\s*=>\s*null/.test(b.jsx) && 'save: () => null'],
  ['INSP-3', 'Entrance panel', (b) => {
    const tags = b.jsx.match(/<EntranceControl\b[^>]*>/g) ?? [];
    return (tags.length !== 1 || !tags[0].includes('clientId')) && '<EntranceControl clientId> appears once';
  }],
  ['INSP-3', 'Spacing panel', (b) => (b.jsx.match(/<PaddingControls\b/g) ?? []).length !== 1 && '<PaddingControls> appears once'],
  ['ENT-5', 'Safe preset read', (b) => /(?<!metadata\.)attributes\.entrance\.default/.test(b.jsx) && 'read the preset from metadata, not attributes.entrance.default'],
  ['CANVAS-2', 'Spacing on the canvas', (b) => !b.jsx.includes('editorPaddingClasses(') && 'use editorPaddingClasses('],
  ['CANVAS-1', 'Editor frame', (b) => !b.jsx.includes('EDITOR_BLOCK_FRAME') && 'use EDITOR_BLOCK_FRAME'],
  ['INSP-4', 'No content in the sidebar', (b) => {
    for (const [, panel] of b.jsx.matchAll(/<InspectorControls>([\s\S]*?)<\/InspectorControls>/g)) {
      const hit = panel.match(SIDEBAR_CONTENT)?.[1] ?? panel.match(/<TextControl\b(?![^>]*type="number")/)?.[0];
      if (hit) return `${hit} in the sidebar: content is edited on the canvas`;
    }
  }],
  ['CANVAS-4', 'No canvas tiers', (b) => b.jsx.includes('EDITOR_TYPE.') && 'use the same classes as the page'],
  ['CANVAS-13', 'No scaling', (b) => /\bscale\(/.test(b.jsx) && 'never shrink a block with a transform'],
  ['CTA-8', 'No navigating anchors', (b) => /<a\s[^>]*href/.test(b.jsx) && 'no <a href> on the canvas'],
  ['MEDIA-3', 'Media through the shared frame', (b) => /import\s*\{[^}]*\bMediaUpload\b/.test(b.jsx) && 'use AttachmentImageControl'],
  ['I18N-1', 'Text domain', (b) => {
    // shortcut: only __() is read, because _n and _x carry the domain in a later argument. Upgrade if a block needs them.
    const calls = [...(b.jsx + b.php + b.view).matchAll(/(?<![\w$])__\(\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*(?:,\s*['"]([\w-]+)['"])?/g)];
    const bad = calls.filter((m) => m[1] !== b.json.textdomain);
    return bad.length && `${bad.length} __() call(s) without the domain ${b.json.textdomain}`;
  }],
  ['CANVAS-7', 'Neutral placeholders', (b) => {
    const bad = [...b.jsx.matchAll(/placeholder=\{__\(\s*['"]([^'"]+)/g)].map((m) => m[1]).filter((t) => !PLACEHOLDER_VERBS.test(t));
    return bad.length && `doesn't start with a verb: ${bad.join(' | ')}`;
  }, 'warn'],
  ['REP-1', 'No order field', (b) => {
    const inDefaults = Object.values(b.attrs).some((a) => a.type === 'array' && /"(order|position)":/.test(JSON.stringify(a.default ?? [])));
    return (inDefaults || /\b(item|slide|card|entry)\.(order|position)\b/.test(b.jsx)) && 'array order is the only order';
  }],
];

function loadBlock(root, slug, manager) {
  const dir = join(root, 'resources/blocks', slug);
  const files = readdirSync(dir);
  let json = {};
  let jsonError;
  try {
    json = JSON.parse(read(join(dir, 'block.json')) || '{}');
  } catch (error) {
    jsonError = error.message;
  }
  return {
    slug, files, json, jsonError, manager,
    attrs: json.attributes ?? {},
    php: read(join(dir, 'block.php')),
    jsx: read(join(dir, 'block.jsx')),
    css: read(join(dir, 'block.css')),
    js: read(join(dir, 'block.js')),
    view: read(join(root, 'resources/views/blocks', `${slug}.blade.php`)),
  };
}

// Rule PHP-11: a vendor lib is enqueued per block, so nothing under app/ enqueues
// on the front end except the theme's own app and editor bundles.
function globalEnqueues(root) {
  const failures = [];
  const appDir = join(root, 'app');
  if (!existsSync(appDir)) return failures;
  for (const entry of readdirSync(appDir, { recursive: true })) {
    if (!entry.endsWith('.php')) continue;
    const source = read(join(appDir, entry));
    if (/admin_enqueue_scripts|enqueue_block_editor_assets/.test(source)) continue;
    for (const [, handle] of source.matchAll(/wp_enqueue_(?:script|style)\(\s*['"]([^'"]+)/g)) {
      if (!/^(app|editor)$/.test(handle)) failures.push({ id: 'PHP-11', title: 'No global vendor enqueue', message: `app/${entry} enqueues ${handle}` });
    }
  }
  return failures;
}

export function check(root) {
  const blocksDir = join(root, 'resources/blocks');
  const manager = read(join(root, 'app/Blocks/BlockManager.php'));
  const slugs = readdirSync(blocksDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'components').map((e) => e.name);

  const results = { theme: { failures: globalEnqueues(root), warnings: [] } };
  for (const slug of slugs) {
    const block = loadBlock(root, slug, manager);
    const entry = (results[slug] = { failures: [], warnings: [] });
    if (block.jsonError) {
      entry.failures.push({ id: 'JSON-1', title: 'Valid block.json', message: block.jsonError });
      continue;
    }
    for (const [id, title, rule, level] of RULES) {
      const message = rule(block);
      if (message) entry[level === 'warn' ? 'warnings' : 'failures'].push({ id, title, message });
    }
  }
  return results;
}

function main() {
  const args = process.argv.slice(2);
  const root = args.find((a) => !a.startsWith('--')) ?? process.cwd();
  if (!existsSync(join(root, 'resources/blocks'))) {
    console.error(`${root}: no resources/blocks, not a theme root`);
    process.exit(2);
  }
  const results = check(root);
  if (args.includes('--json')) console.log(JSON.stringify(results, null, 2));
  else {
    for (const [name, { failures, warnings }] of Object.entries(results)) {
      for (const f of failures) console.error(`${name}: ${f.id} ${f.title}: ${f.message}`);
      for (const w of warnings) console.log(`${name}: warning ${w.id} ${w.title}: ${w.message}`);
    }
  }
  const failed = Object.values(results).reduce((n, r) => n + r.failures.length, 0);
  if (!args.includes('--json')) console.log(`conformance: ${Object.keys(results).length - 1} block(s), ${failed} failure(s)`);
  if (failed) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();

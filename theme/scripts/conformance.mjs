// The block conformance checks: every rule in the "Checkable rules" section of
// _docs/block-conventions.md, plus VIEW-4-empty (an empty block renders
// nothing), PHP-2-hostile (hostile input renders inert), A11Y-6 (a new-tab
// link tells screen readers) and CANVAS-2 (the canvas inner container). conformance.test.mjs runs them over every block in
// a project. Nothing here names a specific block or project.
//
// A block opts out of one rule in its block.json, with a reason:
//   "__conformance": { "skip": { "MEDIA-3": "hand-rolled frame, ticket 123" } }
// A skip with no reason fails, and every skipped rule is printed.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { DIRECTIONS, TRIGGERS, TYPES, UNITS } from '../resources/blocks/components/backend/entranceCanvas.js';
import { EDITOR_BLOCK_FRAME, EDITOR_TYPE } from '../resources/blocks/components/backend/editorCanvas.js';
import { openingTag } from './render-harness.mjs';
import {
  ENTRANCE_KEYS,
  ENTRANCE_LIMITS,
  GLOBAL_ATTRIBUTES,
  PADDING_KEYS,
  classTokens,
  defaultAttributes,
  editorVariants,
  hostileAttributes,
  I18N_MARK,
  RICH_LINK_HREF,
  richLinkAttributes,
  loadEditor,
  mergedAttributes,
  phpRenderer,
  renderEdit,
  SAMPLE_ENTRY_KEYS,
  sampleAttributes,
  unmark,
} from './conformance-runtime.mjs';

// ── Text scanning ─────────────────────────────────────────────────────────

const stripJsComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const stripCssComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '');
const blank = (match) => match.replace(/[^\n]/g, ' ');

// Blade comments and @php blocks hold no markup, so blanking them (in place,
// so offsets hold) keeps `<` in a comparison from reading as a tag.
const bladeMarkup = (text) =>
  text.replace(/\{\{--[\s\S]*?--\}\}/g, blank).replace(/@php[\s\S]*?@endphp/g, blank);

// Each opening tag in a Blade view, as { name, text }. A `>` inside a quoted
// attribute or a directive's parentheses doesn't end the tag.
function bladeTags(text) {
  const source = bladeMarkup(text);
  const tags = [];
  const start = /<([a-zA-Z][a-zA-Z0-9-]*)/g;
  let found;

  while ((found = start.exec(source))) {
    let quote = null;
    let depth = 0;
    let i = found.index + found[0].length;

    for (; i < source.length; i++) {
      const c = source[i];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") quote = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === '>' && depth <= 0) break;
    }

    tags.push({ name: found[1], text: source.slice(found.index, i + 1) });
    start.lastIndex = i + 1;
  }

  return tags;
}

// The arguments of every `name(` call in a source file, split at top-level
// commas, respecting quotes and nesting.
function callArguments(source, name) {
  const pattern = new RegExp(`(?<![\\w$>.])${name}\\(`, 'g');
  const calls = [];
  let found;

  while ((found = pattern.exec(source))) {
    const args = [];
    let depth = 1;
    let quote = null;
    let current = '';
    let i = found.index + found[0].length;

    for (; i < source.length; i++) {
      const c = source[i];
      if (quote) {
        current += c;
        if (c === '\\') current += source[++i] ?? '';
        else if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') quote = c;
      else if ('([{'.includes(c)) depth++;
      else if (')]}'.includes(c)) depth--;

      if (depth === 0) break;
      if (c === ',' && depth === 1) {
        args.push(current.trim());
        current = '';
      } else current += c;
    }

    if (current.trim() !== '') args.push(current.trim());
    calls.push({ args, index: found.index, end: i });
  }

  return calls;
}

const lineOf = (source, index) => source.slice(0, index).split('\n').length;

function walkFiles(dir, accept, skip = new Set(['node_modules', 'vendor', '.git', 'public'])) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (skip.has(entry.name)) return [];
    const full = join(dir, entry.name);
    // A symlinked folder counts: the harvest report mirrors a theme as links.
    if (entry.isDirectory() || (entry.isSymbolicLink() && statSync(full, { throwIfNoEntry: false })?.isDirectory())) return walkFiles(full, accept, skip);
    return accept(full) ? [full] : [];
  });
}

// ── Context ───────────────────────────────────────────────────────────────

function expectedTokens(themeRoot) {
  const path = join(themeRoot, 'kit.config.json');
  const config = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const both = (placeholder, value) => (value ? [placeholder, value] : [placeholder]);

  return {
    namespace: both('__BLOCK_NAMESPACE__', config.blockNamespace),
    category: both('__BLOCK_CATEGORY_SLUG__', config.blockCategory?.slug),
    textDomain: both('__TEXT_DOMAIN__', config.textDomain),
  };
}

// Everything a rule reads about one block. Files are read once, and the two
// runtime halves (the editor bundle, the PHP render) run once, on first use.
export function createContext(options) {
  const themeRoot = resolve(options.themeRoot);
  const blockDir = resolve(options.blockDir);
  const resourcesRoot = resolve(options.resourcesRoot ?? join(themeRoot, 'resources'));
  const { viewFile } = options;
  const slug = basename(blockDir);
  const cache = new Map();
  const once = (key, make) => {
    if (!cache.has(key)) cache.set(key, make());
    return cache.get(key);
  };

  const ctx = {
    slug,
    themeRoot,
    blockDir,
    resourcesRoot,
    viewFile: viewFile ?? join(resourcesRoot, 'views', 'blocks', `${slug}.blade.php`),
    tokens: expectedTokens(themeRoot),
    path: (name) => join(blockDir, name),
    exists: (path) => existsSync(path),
    read: (path) => once(`read:${path}`, () => (existsSync(path) ? readFileSync(path, 'utf8') : '')),
  };

  ctx.json = once('json', () => {
    try {
      return JSON.parse(ctx.read(ctx.path('block.json')));
    } catch (error) {
      ctx.jsonError = error.message;
      return null;
    }
  });
  ctx.attributes = ctx.json ? mergedAttributes(ctx.json) : {};
  ctx.own = ctx.json?.attributes ?? {};
  ctx.php = ctx.read(ctx.path('block.php'));
  ctx.jsx = ctx.read(ctx.path('block.jsx'));
  ctx.view = ctx.read(ctx.viewFile);
  ctx.testSource = ctx.read(ctx.path('block.test.mjs'));

  // The editor half: the bundle plus one render per variant, selected or not.
  ctx.editor = () =>
    once('editor', async () => {
      try {
        const { settings, grounds } = await loadEditor({ blockDir, themeRoot });
        const renders = [];
        for (const variant of editorVariants(ctx.json, grounds.map((ground) => ground.name))) {
          for (const isSelected of [false, true]) {
            try {
              renders.push({ ...variant, isSelected, ...renderEdit(settings, { attributes: variant.attributes, isSelected }) });
            } catch (error) {
              return { error: `edit() threw for ${variant.label}${isSelected ? ' (selected)' : ''}: ${error.message}` };
            }
          }
        }
        const preview = renderEdit(settings, { attributes: { ...sampleAttributes(ctx.json), isPreview: true }, isSelected: false });

        return { settings, grounds, renders, preview, sample: renders.find((r) => r.label === 'sample content' && r.isSelected) };
      } catch (error) {
        return { error: `block.jsx could not be bundled or rendered: ${String(error.message).split('\n')[0]}` };
      }
    });

  // The PHP half: block.php through the real Blade compiler.
  ctx.render = () => once('render', () => phpRenderer({ themeRoot, resourcesRoot, slug, extra: options.phpEnv }));
  // `posts` overrides the fixture records the render was set up with, for a
  // check that needs a collection with nothing in it.
  ctx.tryRender = (attributes, posts) => {
    try {
      return { html: ctx.render()(attributes, posts) };
    } catch (error) {
      const lines = String(error.message).split('\n');
      const fatal = lines.find((line) => /^(PHP )?(Fatal error|Warning|Parse error)/.test(line));

      return { error: (fatal ?? lines.find((line) => line.trim()) ?? 'render failed').replace(/^PHP /, '').slice(0, 220) };
    }
  };

  return ctx;
}

const declared = (ctx, name) => Object.hasOwn(ctx.own, name);
const hasAttr = (ctx, name) => Object.hasOwn(ctx.attributes, name);
const assetList = (value) => (value === undefined ? [] : [].concat(value));
const noJson = (ctx) => !ctx.json;

// ── Rules ─────────────────────────────────────────────────────────────────

// [n, ids, title, check]. `n` is the item's number in the doc's "Checkable
// rules" list. `ids` are the rule IDs it enforces, and the first names the
// failure. A check returns its failure messages, or a promise of them.
export const RULES = [];
const rule = (n, ids, title, check, scope = 'block') => RULES.push({ n, ids: [].concat(ids), title, check, scope });

// Files
rule(1, 'FILE-2', 'Required files', (ctx) => {
  const required = ['block.json', 'block.php', 'block.jsx'].map((name) => [name, ctx.path(name)]);
  const missing = required.filter(([, path]) => !ctx.exists(path)).map(([name]) => name);
  if (!readdirSync(ctx.blockDir).some((name) => /^preview\./.test(name))) missing.push('preview.*');
  if (!ctx.exists(ctx.viewFile)) missing.push(`views/blocks/${ctx.slug}.blade.php`);

  return missing.map((name) => `${name} is missing`);
});

rule(2, 'FILE-3', 'Declared assets exist', (ctx) => {
  if (noJson(ctx)) return [];
  const messages = [];
  for (const field of ['viewScript', 'viewStyle']) {
    for (const value of assetList(ctx.json[field])) {
      if (String(value).startsWith('file:./') && !ctx.exists(ctx.path(value.slice(7)))) {
        messages.push(`${field} declares ${value}, which doesn't exist`);
      }
    }
  }
  const declaredIn = (field) => assetList(ctx.json[field]).map(String);
  if (ctx.exists(ctx.path('block.css')) && !declaredIn('viewStyle').includes('file:./block.css')) {
    messages.push('block.css exists but viewStyle does not declare file:./block.css');
  }
  if (ctx.exists(ctx.path('block.js')) && !declaredIn('viewScript').includes('file:./block.js')) {
    messages.push('block.js exists but viewScript does not declare file:./block.js');
  }

  return messages;
});

rule(3, 'FILE-3', 'Plain block assets', (ctx) => {
  const messages = [];
  const css = stripCssComments(ctx.read(ctx.path('block.css')));
  const js = stripJsComments(ctx.read(ctx.path('block.js')));
  for (const directive of css.match(/@(apply|reference|import)\b/g) ?? []) {
    messages.push(`block.css uses ${directive}, but it is served from source, so it must be plain CSS`);
  }
  for (const directive of css.match(/@layer\b/g) ?? []) {
    messages.push(`block.css uses ${directive}, but the page already states the layer order in wp_head, so block.css stays unlayered`);
  }
  if (/^\s*(import|export)\b/m.test(js)) messages.push('block.js uses import or export, but it is served from source, so it must be plain JavaScript');

  return messages;
});

rule(5, 'FILE-8', 'No tests in asset folders', (ctx) => {
  const tests = ['images', 'fonts'].flatMap((folder) => walkFiles(join(ctx.resourcesRoot, folder), (file) => /\.test\./.test(basename(file))));

  return tests.map((file) => `${relative(ctx.themeRoot, file)} is a test file inside an asset folder, and Vite ships it`);
}, 'project');

// block.json
rule(6, 'JSON-1', 'Metadata', (ctx) => {
  if (noJson(ctx)) return [`block.json is not valid JSON: ${ctx.jsonError ?? 'missing'}`];
  const { json, tokens } = ctx;
  const messages = [];
  if (json.apiVersion !== 3) messages.push('apiVersion must be 3');
  if (!tokens.namespace.some((namespace) => json.name === `${namespace}/${ctx.slug}`)) {
    messages.push(`name must be ${tokens.namespace[0]}/${ctx.slug} (got ${json.name})`);
  }
  if (!tokens.category.includes(json.category)) messages.push(`category must be ${tokens.category[0]} (got ${json.category})`);
  if (!tokens.textDomain.includes(json.textdomain)) messages.push(`textdomain must be ${tokens.textDomain[0]} (got ${json.textdomain})`);
  if (json.render !== 'file:./block.php') messages.push('render must be file:./block.php');

  return messages;
});

rule(7, 'JSON-2', 'Anchor support', (ctx) => {
  if (noJson(ctx)) return [];
  const messages = [];
  if (ctx.json.supports?.anchor !== true) messages.push('supports.anchor must be true');
  if (declared(ctx, 'anchor')) messages.push('the block declares its own anchor attribute');

  return messages;
});

rule(8, 'JSON-3', 'Inserter preview', async (ctx) => {
  if (noJson(ctx)) return [];
  const messages = [];
  const spec = ctx.own.isPreview;
  if (spec?.type !== 'boolean' || spec?.default !== false) messages.push('attributes.isPreview must be a boolean that defaults to false');
  if (ctx.json.example?.attributes?.isPreview !== true) messages.push('example.attributes.isPreview must be true');
  if (!/from\s+['"]\.\/preview\./.test(ctx.jsx)) messages.push("block.jsx does not import './preview.*'");

  const editor = await ctx.editor();
  if (!editor.error) {
    const images = editor.preview.nodes.filter((node) => node.host && node.name === 'img');
    const fields = editor.preview.nodes.filter((node) => node.host && ['textarea', 'input', 'section'].includes(node.name));
    if (images.length !== 1 || fields.length) messages.push('edit() with isPreview must return a single <img> and nothing else');
  }

  return messages;
});

rule(9, 'JSON-4', 'Every attribute has a default', (ctx) =>
  Object.entries(ctx.own).flatMap(([name, spec]) => [
    ...(spec.type === undefined ? [`attribute ${name} has no type`] : []),
    ...(Object.hasOwn(spec, 'default') ? [] : [`attribute ${name} has no default`]),
  ]));

rule(10, 'JSON-4', 'Link objects are whole', (ctx) =>
  Object.entries(ctx.own)
    .filter(([name]) => name === 'link' || name.endsWith('Link'))
    .filter(([, spec]) => !(spec.default && typeof spec.default === 'object' && 'url' in spec.default && 'opensInNewTab' in spec.default))
    .map(([name]) => `${name} must default to { "url": "", "opensInNewTab": false }`));

rule(11, 'JSON-5', 'Padding keys come as a set', (ctx) => {
  const present = PADDING_KEYS.filter((key) => declared(ctx, key));

  return present.length && present.length < PADDING_KEYS.length
    ? [`declares ${present.join(', ')} but not ${PADDING_KEYS.filter((key) => !present.includes(key)).join(', ')}`]
    : [];
});

rule(12, 'JSON-6', 'Entrance presets are complete', (ctx) => {
  const preset = ctx.own.entrance?.default;
  if (!preset) return [];
  const messages = ENTRANCE_KEYS.filter((key) => !(key in preset)).map((key) => `entrance.default has no ${key}`);
  const oneOf = (key, allowed) => key in preset && !allowed.includes(preset[key]) && messages.push(`entrance.default.${key} must be one of ${allowed.join(', ')}`);
  oneOf('type', TYPES);
  oneOf('direction', DIRECTIONS);
  oneOf('unit', UNITS);
  oneOf('trigger', TRIGGERS);
  for (const [key, [min, max]] of Object.entries(ENTRANCE_LIMITS)) {
    const value = preset[key];
    if (key in preset && value !== null && !(Number.isFinite(value) && value >= min && value <= max)) {
      messages.push(`entrance.default.${key} must be null or a number from ${min} to ${max}`);
    }
  }

  return messages;
});

const DENIED_NAMES = ['background', 'logosGround', 'ctaLinkText', 'imageSide', 'topRule', 'bottomRule', 'divider', 'ruleUnderBody', 'memberIds', 'clientIds'];
rule(13, 'JSON-7', 'Shared vocabulary', (ctx) =>
  DENIED_NAMES.filter((name) => declared(ctx, name)).map((name) => `attribute ${name} has a shared name in JSON-7`));

rule(14, ['JSON-7', 'MEDIA-1'], 'Image attributes store IDs', (ctx) =>
  Object.keys(ctx.own)
    .filter((name) => name.endsWith('Url'))
    .filter((name) => ctx.own[`${name.slice(0, -3)}Id`]?.type !== 'number')
    .map((name) => `${name} needs a sibling ${name.slice(0, -3)}Id of type number`));

rule(15, 'JSON-9', 'No page-named variants', (ctx) =>
  ['layoutVariant', 'mobileVariant'].filter((name) => declared(ctx, name)).map((name) => `attribute ${name} names a page or breakpoint board`));

rule(16, 'JSON-10', 'Shared scripts by handle', (ctx) => {
  if (noJson(ctx)) return [];

  return ['viewScript', 'viewStyle'].flatMap((field) =>
    assetList(ctx.json[field]).filter((value) => String(value).includes('../')).map((value) => `${field} ${value} reaches into components/; register a handle and name it`));
});

rule(17, 'GROUND-1', 'Ground default', (ctx) =>
  declared(ctx, 'ground') && !(ctx.own.ground.type === 'string' && ctx.own.ground.default === '') ? ['ground must be a string that defaults to ""'] : []);

rule(18, 'DIV-1', 'Divider shape', (ctx) =>
  declared(ctx, 'sectionDivider') && ctx.own.sectionDivider.default !== 'none' ? ['sectionDivider must default to "none"'] : []);

rule(19, 'CTA-1', 'CTA set', (ctx) => {
  const messages = [];
  if (hasAttr(ctx, 'ctaText') && !hasAttr(ctx, 'ctaLink')) messages.push('ctaText needs ctaLink');
  if (hasAttr(ctx, 'ctaIcon')) {
    if (!hasAttr(ctx, 'ctaIconPosition')) messages.push('ctaIcon needs ctaIconPosition');
    if (ctx.own.ctaIcon?.default !== 'none') messages.push('ctaIcon must default to "none"');
    if (ctx.own.ctaIconPosition && ctx.own.ctaIconPosition.default !== 'after') messages.push('ctaIconPosition must default to "after"');
  }

  return messages;
});

// block.php
rule(20, 'PHP-1', 'Guard and shape', (ctx) => {
  const messages = [];
  if (!/defined\(\s*['"]ABSPATH['"]\s*\)/.test(ctx.php)) messages.push('no ABSPATH guard');
  if (!ctx.php.includes('$attributes = $attributes ?? [];')) messages.push('no `$attributes = $attributes ?? [];`');
  if (!new RegExp(`view\\(\\s*['"]blocks\\.${ctx.slug}['"]`).test(ctx.php)) messages.push(`no view('blocks.${ctx.slug}', ...) call`);

  return messages;
});

rule(21, 'PHP-4', 'Entrance', (ctx) =>
  /BlockEntrance::fromBlock\(\s*\$attributes\s*,\s*__DIR__\s*\)/.test(ctx.php) ? [] : ['block.php does not call BlockEntrance::fromBlock($attributes, __DIR__)']);

rule(22, 'PHP-3', 'Anchor', (ctx) =>
  /sanitize_html_class\(\s*\$attributes\[\s*['"]anchor['"]/.test(ctx.php) ? [] : ["block.php does not pass sanitize_html_class($attributes['anchor'] ?? '')"]);

rule(23, 'PHP-5', 'Padding arguments match', (ctx) => {
  if (noJson(ctx)) return [];
  const bare = Object.fromEntries(Object.entries(sampleAttributes(ctx.json)).filter(([name]) => !PADDING_KEYS.includes(name)));
  const source = PADDING_KEYS.every((key) => declared(ctx, key)) ? ctx.own : GLOBAL_ATTRIBUTES;
  const padding = Object.fromEntries(PADDING_KEYS.map((key) => [key, source[key].default]));

  const fallback = ctx.tryRender(bare);
  const filled = ctx.tryRender({ ...bare, ...padding });
  if (fallback.error || filled.error) return [`block.php could not render with sample content: ${fallback.error ?? filled.error}`];
  const tagA = openingTag(fallback.html, ctx.slug);
  const tagB = openingTag(filled.html, ctx.slug);
  if (!tagA || !tagB) {
    return [
      `no .${ctx.slug} root in a render with sample content, so the padding can't be compared. ` +
        `The sample content fills ${SAMPLE_ENTRY_KEYS.join(', ')} in every repeater entry, and every other attribute by its type. ` +
        'A block whose entries use other key names (question, answer) draws nothing from it: name them heading and body (JSON-7)',
    ];
  }

  return tagA === tagB ? [] : ["the padding classes block.php falls back to differ from the padding block.json declares (or the global 112, 56, true)"];
});

rule(24, 'PHP-6', 'Ground through the helper', (ctx) =>
  hasAttr(ctx, 'ground') && !(ctx.php.includes('BlockAttributes::groundClass(') && /['"]groundClass['"]\s*=>/.test(ctx.php))
    ? ["block.php must pass 'groundClass' => BlockAttributes::groundClass($ground)"]
    : []);

rule(25, 'PHP-7', 'CTA through the helper', (ctx) =>
  hasAttr(ctx, 'ctaText') && hasAttr(ctx, 'ctaLink') && !ctx.php.includes('BlockAttributes::cta(') ? ['block.php must spread BlockAttributes::cta($attributes)'] : []);

rule(26, 'PHP-8', 'Divider through the helper', (ctx) =>
  hasAttr(ctx, 'sectionDivider') && !ctx.php.includes('BlockAttributes::divider(') ? ["block.php must pass 'sectionDivider' => BlockAttributes::divider($attributes)"] : []);

rule(27, 'PHP-9', 'Malformed entries', (ctx) => {
  if (noJson(ctx)) return [];
  const arrays = Object.entries(ctx.attributes).filter(([, spec]) => spec.type === 'array').map(([name]) => name);
  if (!arrays.length) return [];
  const messages = [];
  // Either form filters: array_filter($x, 'is_array') or an is_array($entry) guard in the loop.
  if (!/['"]is_array['"]|\bis_array\(/.test(ctx.php)) messages.push("block.php never filters an array attribute with 'is_array'");
  const malformed = { ...sampleAttributes(ctx.json), ...Object.fromEntries(arrays.map((name) => [name, [null, 'text', 5, []]])) };
  const { error } = ctx.tryRender(malformed);
  if (error) messages.push(`block.php fails on a null, string and number entry: ${error}`);

  return messages;
});

rule(28, ['PHP-13', 'MEDIA-7'], 'Explicit image size', (ctx) =>
  [['block.php', ctx.php], ['the view', ctx.view]].flatMap(([label, source]) =>
    callArguments(source, 'wp_get_attachment_image')
      .filter((call) => call.args.length < 2)
      .map((call) => `${label} line ${lineOf(source, call.index)}: wp_get_attachment_image() has no size argument`)));

// The theme's own handles: Sage 11's Vite bundles.
const THEME_HANDLES = /^['"](app|editor)['"]$/;
// PHP-11 protects the front end, so a callback on one of these hooks may enqueue
// anything. Sage's own editor-dependencies loop runs on admin_head.
const ADMIN_HOOKS = /^['"](admin_head|admin_enqueue_scripts|enqueue_block_editor_assets)['"]$/;

rule(29, 'PHP-11', 'No global vendor enqueue', (ctx) => {
  const files = walkFiles(ctx.themeRoot, (file) => file.endsWith('.php') && !file.endsWith('.blade.php'), new Set(['node_modules', 'vendor', '.git', 'public', 'test-fixtures']));
  const blockPhp = new RegExp(`(^|\\${sep})resources\\${sep}blocks\\${sep}[^\\${sep}]+\\${sep}block\\.php$`);

  return files.flatMap((file) => {
    if (blockPhp.test(relative(ctx.themeRoot, file))) return [];
    const source = ctx.read(file);
    const adminCallbacks = callArguments(source, 'add_action').filter((call) => ADMIN_HOOKS.test(call.args[0] ?? ''));

    return ['wp_enqueue_script', 'wp_enqueue_style']
      .flatMap((name) => callArguments(source, name).map((call) => ({ name, ...call })))
      .filter((call) => !THEME_HANDLES.test(call.args[0] ?? ''))
      .filter((call) => !adminCallbacks.some((hook) => hook.index < call.index && call.index < hook.end))
      .map((call) => `${relative(ctx.themeRoot, file)} line ${lineOf(source, call.index)}: ${call.name}() outside a block.php`);
  });
}, 'project');

// Blade views
const ROOT_HINT = "the view's first element";

rule(30, 'VIEW-1', 'Root shape', (ctx) => {
  if (!ctx.view) return [];
  const [first] = bladeTags(ctx.view);
  if (first?.name !== 'section') return [`${ROOT_HINT} must be a <section>`];
  const messages = [];
  if (!first.text.includes('@if ($anchor) id="{{ $anchor }}" @endif')) messages.push('the root has no `@if ($anchor) id="{{ $anchor }}" @endif`');
  if (!new RegExp(`class="${ctx.slug}[\\s"]`).test(first.text)) messages.push(`the root's class list must start with ${ctx.slug}`);
  if (!first.text.includes('@paddingClasses(')) messages.push('the root has no @paddingClasses(...)');
  if (!first.text.includes('@entrance(')) messages.push('the root has no @entrance(...)');

  return messages;
});

rule(31, 'VIEW-1', 'Anchor only on the root', (ctx) => {
  const count = (bladeMarkup(ctx.view).match(/id="\{\{\s*\$anchor\s*\}\}"/g) ?? []).length;

  return count > 1 ? [`id="{{ $anchor }}" is printed ${count} times; only the root gets the anchor`] : [];
});

rule(32, 'VIEW-2', 'Container', (ctx) =>
  !ctx.view || ctx.view.includes(`${ctx.slug}__inner container`) ? [] : [`the view has no ${ctx.slug}__inner container`]);

rule(33, 'VIEW-3', 'Heading levels', (ctx) =>
  bladeTags(ctx.view).some((tag) => tag.name.toLowerCase() === 'h1') ? ['the view has an <h1>; the page layout owns it'] : []);

rule(34, 'VIEW-5', 'One style attribute', (ctx) =>
  bladeTags(ctx.view)
    .filter((tag) => /@entrance(Part)?\(/.test(tag.text) && /\sstyle\s*=/.test(tag.text.replace(/@entrance(Part)?\([^)]*\)/g, '')))
    .map((tag) => `<${tag.name}> has @entrance and a literal style; pass the style as the directive's second argument`));

rule(35, 'VIEW-6', 'Token colors', (ctx) => {
  const view = bladeMarkup(ctx.view);
  const hex = view.match(/\[[^\]\n]*#[0-9a-fA-F]{3,8}\b[^\]\n]*\]|style="[^"]*#[0-9a-fA-F]{3,8}\b|(?:fill|stroke|color|background)\s*[:=]\s*["']?#[0-9a-fA-F]{3,8}\b/g) ?? [];
  const utilities = 'bg|text|border|ring|fill|stroke|from|to|via|outline|divide|decoration|accent|caret|shadow';
  const steps = view.match(new RegExp(`\\b(?:${utilities})-[a-z]+(?:-[a-z]+)*-(?:50|[1-9]00|950)\\b`, 'g')) ?? [];
  const named = view.match(new RegExp(`\\b(?:${utilities})-(?:white|black)\\b`, 'g')) ?? [];

  return [...hex, ...steps, ...named].map((found) => `${found.trim()} is a hex value, palette step or named color; use a color token`);
});

rule(36, 'ESC-1', 'URL escaping', (ctx) => {
  const view = bladeMarkup(ctx.view);
  const messages = [];
  if (/\{\{\s*esc_url\(/.test(view)) messages.push('{{ esc_url() }} double-encodes; print {!! esc_url($url) !!}');
  for (const tag of bladeTags(ctx.view)) {
    for (const [, attribute, value] of tag.text.matchAll(/\b(href|src|action|poster)=("[^"]*"|'[^']*')/g)) {
      const dynamic = /\{\{|\{!!|@/.test(value);
      if (dynamic && !value.includes('esc_url(')) messages.push(`${attribute}=${value} is not printed through esc_url()`);
    }
    // A srcset is a list WordPress builds (wp_get_attachment_image_srcset), so
    // esc_url() would mangle it. {{ }} escapes it; raw output is the failure.
    for (const [, value] of tag.text.matchAll(/\bsrcset=("[^"]*"|'[^']*')/g)) {
      if (/\{!!/.test(value) && !/esc_(url|attr)\(/.test(value)) messages.push(`srcset=${value} is printed raw; print it with {{ }}`);
    }
    for (const [, url] of tag.text.matchAll(/\bstyle=(?:"[^"]*"|'[^']*')/g).flatMap((style) => [...style[0].matchAll(/url\(([^)]*)\)/g)])) {
      if (/\{\{|\{!!|@/.test(url) && !url.includes('esc_url(')) messages.push(`url(${url}) in a style attribute is not printed through esc_url()`);
    }
  }

  return messages;
});

rule(37, 'CTA-6', 'No hard-coded rel', (ctx) =>
  /rel="noopener/.test(ctx.view) ? ['the view hard-codes rel="noopener"; browsers already treat target="_blank" as noopener'] : []);

rule(38, 'CTA-6', 'New-tab flag', (ctx) => {
  const view = bladeMarkup(ctx.view);
  const all = view.match(/target="_blank"/g) ?? [];
  const guarded = [...view.matchAll(/@if\s*\(([^\n]*?)\)\s*target="_blank"/g)].filter(([, condition]) => /new|blank|tab/i.test(condition));

  const messages = all.length === guarded.length ? [] : ['a target="_blank" is not inside an @if on a new-tab flag'];
  // `target="{{ $new ? '_blank' : '_self' }}"` skips the flag check above and
  // gives the hint nothing to hang on.
  for (const tag of bladeTags(ctx.view)) {
    for (const [, value] of tag.text.matchAll(/\starget=("[^"]*"|'[^']*')/g)) {
      if (/\{\{|\{!!|@/.test(value)) messages.push(`target=${value} is printed from an expression; write @if ($flag) target="_blank" @endif`);
    }
  }

  return messages;
});

rule(39, 'GROUND-2', 'Ground class printed', (ctx) =>
  /['"]groundClass['"]\s*=>/.test(ctx.php) && !ctx.view.includes('{{ $groundClass }}') ? ['the view does not print {{ $groundClass }}'] : []);

// block.jsx
rule(40, 'PHP-1', 'Server-rendered', (ctx) =>
  /save\s*:\s*\(\s*\)\s*=>\s*null|save\s*\(\s*\)\s*\{\s*return\s+null/.test(ctx.jsx) ? [] : ['registerBlockType() must set save: () => null']);

// Canvas checks share one shape: run over every render, name the variant.
async function overRenders(ctx, check, { only } = {}) {
  const editor = await ctx.editor();
  if (editor.error) return [];
  // A problem shows once, with the first variant that hit it.
  const found = new Map();
  for (const render of editor.renders) {
    if (only && !only(render)) continue;
    for (const message of check(render, editor)) {
      if (!found.has(message)) found.set(message, `${render.label}${render.isSelected ? ', selected' : ''}`);
    }
  }

  return [...found].map(([message, where]) => `${message} (${where})`);
}

const canvas = (render) => render.nodes.filter((node) => !node.inspector);
const populated = (render) => render.label === 'sample content';

rule('EDITOR-RENDER', 'EDITOR-RENDER', 'The editor half loads and renders', async (ctx) => {
  const editor = await ctx.editor();

  return editor.error ? [editor.error] : [];
});

rule(41, 'INSP-3', 'Entrance panel', async (ctx) => {
  const editor = await ctx.editor();
  if (editor.error) return [];
  const children = [].concat(editor.sample.raw?.props?.children ?? []).flat();
  const names = children.map((child) => (child?.type?.name ?? '').replace(/\$\d+$/, ''));
  const mounted = names.flatMap((name, index) => (name === 'EntranceControl' ? [index] : []));
  if (mounted.length !== 1) return [`EntranceControl is mounted ${mounted.length} times; mount it once`];

  const [at] = mounted;
  const messages = [];
  for (const prop of ['attributes', 'setAttributes', 'clientId']) {
    if (!(prop in children[at].props)) messages.push(`EntranceControl is missing the ${prop} prop`);
  }
  if (names.lastIndexOf('InspectorControls') > at) messages.push("EntranceControl must come after the block's InspectorControls");
  if (names.some((name, index) => index < at && name !== 'InspectorControls')) messages.push('EntranceControl must come before the canvas root');

  return messages;
});

rule(42, 'ENT-5', 'Safe preset read', (ctx) =>
  /\bentrance\.default\b/.test(stripJsComments(ctx.jsx)) ? ['read the preset with entrance?.default'] : []);

rule(43, 'INSP-1', 'Collapsed panels', (ctx) =>
  overRenders(ctx, (render) => render.panels.filter((panel) => panel.initialOpen !== false).map((panel) => `the ${unmark(panel.title)} panel opens by default`)));

rule(45, 'INSP-6', 'Ground select has Default', (ctx) =>
  overRenders(ctx, (render, editor) => {
    const groundValues = editor.grounds.map((ground) => ground.name);

    return render.selects
      .filter((select) => (select.options ?? []).some((option) => groundValues.includes(option.value)))
      .filter((select) => !select.options.some((option) => option.value === ''))
      .map((select) => `the ${unmark(select.label)} select lists grounds with no Default option`);
  }));

rule(46, ['CANVAS-1', 'CANVAS-2'], 'Canvas root class', (ctx) =>
  overRenders(ctx, (render) => {
    const root = canvas(render).find((node) => node.host && classTokens(node.props).includes(`${ctx.slug}-editor`));
    if (!root) return [`no element carries the class ${ctx.slug}-editor`];
    const messages = [];
    if (root.name !== 'section') messages.push(`the canvas root is a <${root.name}>, not a <section>`);
    const missing = EDITOR_BLOCK_FRAME.split(/\s+/).filter((token) => !classTokens(root.props).includes(token));
    if (missing.length) messages.push(`the canvas root lacks the shared outline (${missing.join(' ')})`);
    const inner = canvas(render).find((node) => node.host && classTokens(node.props).includes(`${ctx.slug}-editor__inner`));
    if (!inner || !classTokens(inner.props).includes('container')) messages.push(`no ${ctx.slug}-editor__inner container`);

    return messages;
  }, { only: (render) => populated(render) || render.label === 'defaults' }));

rule(47, 'CANVAS-9', 'No writes on mount', (ctx) =>
  overRenders(ctx, (render) => render.calls.map((call) => `mounting called setAttributes(${JSON.stringify(call).slice(0, 80)})`)));

rule(48, 'CTA-8', 'No navigating anchors', (ctx) =>
  overRenders(ctx, (render) => canvas(render).filter((node) => node.host && node.name === 'a' && 'href' in node.props).map(() => 'the canvas renders an <a href>'),
    { only: populated }));

rule(49, ['A11Y-1', 'CTA-3'], 'No components-button previews', (ctx) =>
  overRenders(ctx, (render) =>
    canvas(render)
      .filter((node) => node.host && classTokens(node.props).includes('components-button') && classTokens(node.props).some((token) => /^btn(-|$)/.test(token)))
      .map(() => 'the canvas draws a btn as a components-button'),
  { only: populated }));

rule(50, 'A11Y-1', 'Keyboard triggers', (ctx) =>
  overRenders(ctx, (render) =>
    render.nodes
      .filter((node) => node.props.role === 'button')
      .flatMap((node) => [
        ...(node.props.tabIndex === 0 ? [] : ['a role="button" has no tabIndex={0}']),
        ...(typeof node.props.onKeyDown === 'function' ? [] : ['a role="button" has no onKeyDown']),
      ]),
  { only: populated }));

rule(51, 'CANVAS-4', 'Heading tiers', (ctx) => {
  const tiers = Object.values(EDITOR_TYPE).map((value) => value.split(/\s+/));

  return overRenders(ctx, (render) =>
    canvas(render)
      .filter((node) => node.host && classTokens(node.props).some((token) => /^heading-\d$/.test(token)))
      .filter((node) => !tiers.some((tier) => tier.every((token) => classTokens(node.props).includes(token))))
      .map((node) => `a ${classTokens(node.props).find((token) => /^heading-\d$/.test(token))} field on the canvas has no EDITOR_TYPE tier`),
  { only: populated });
});

rule(52, 'TEXT-4', 'Fields are named', (ctx) =>
  overRenders(ctx, (render) =>
    render.nodes
      .filter((node) => (node.host && (node.name === 'textarea' || (node.name === 'input' && !['checkbox', 'radio', 'hidden', 'file'].includes(node.props.type)))) || node.name === 'RichText')
      .filter((node) => !unmark(node.props['aria-label']).trim())
      .map((node) => `a ${node.name} has no aria-label`),
  { only: (render) => populated(render) && render.isSelected }));

rule(53, ['MEDIA-1'], 'Media selection stores IDs', async (ctx) => {
  const editor = await ctx.editor();
  if (editor.error) return [];
  const { nodes, calls } = editor.sample;
  const messages = [];
  for (const node of nodes.filter((entry) => ['AttachmentImageControl', 'MediaUpload'].includes(entry.name) && typeof entry.props.onSelect === 'function')) {
    const before = calls.length;
    node.props.onSelect({ id: 7, url: 'x' });
    const written = JSON.stringify(calls.slice(before));
    if (/"x"/.test(written)) messages.push(`${node.name} onSelect writes a URL; store the attachment ID and clear the URL`);
    else if (!/\b7\b/.test(written)) messages.push(`${node.name} onSelect never writes the attachment ID`);
  }

  return messages;
});

rule(54, 'MEDIA-3', 'Media through the shared frame', (ctx) =>
  overRenders(ctx, (render) => render.rawNodes.filter((node) => !node.inspector && node.name === 'MediaUpload').map(() => 'the canvas uses MediaUpload directly; use AttachmentImageControl'),
    { only: populated }));

rule(55, 'INSP-5', 'Inline inspector styles', (ctx) =>
  overRenders(ctx, (render) =>
    render.rawNodes
      .filter((node) => node.inspector && node.name !== 'InspectorControls')
      .flatMap((node) => classTokens(node.props).filter((token) => !/^(components|block-editor|edit-post|editor)-/.test(token)))
      .map((token) => `the inspector uses the class ${token}, which never reaches the sidebar; use inline styles`),
  { only: (render) => populated(render) || render.label === 'defaults' }));

const CALLS = ['__', '_e', '_n', '_x', '_nx', 'esc_html__', 'esc_html_e', 'esc_html_x', 'esc_attr__', 'esc_attr_e', 'esc_attr_x'];
rule(56, 'I18N-1', 'Text domain', async (ctx) => {
  const domains = ctx.tokens.textDomain;
  const messages = [];
  for (const [label, source] of [['block.jsx', ctx.jsx], ['block.php', ctx.php], ['the view', ctx.view]]) {
    const code = label === 'block.jsx' ? stripJsComments(source) : source;
    for (const name of CALLS) {
      for (const call of callArguments(code, name)) {
        const last = call.args.at(-1) ?? '';
        if (!domains.some((domain) => last === `'${domain}'` || last === `"${domain}"`)) {
          messages.push(`${label} line ${lineOf(source, call.index)}: ${name}() must end with the '${domains[0]}' text domain`);
        }
      }
    }
  }

  const editor = await ctx.editor();
  if (!editor.error) {
    const labelled = /label|title|help|placeholder|description/i;
    const bare = (value) => typeof value === 'string' && value.trim() !== '' && !value.includes(I18N_MARK);
    const strings = (node) =>
      Object.entries(node.props).flatMap(([key, value]) => {
        if (!labelled.test(key)) return [];
        if (Array.isArray(value)) return value.flatMap((item) => (item && bare(item.label) ? [item.label] : []));
        return bare(value) ? [value] : [];
      });
    const found = editor.sample.rawNodes.filter((node) => node.inspector).flatMap(strings);
    for (const value of new Set(found)) messages.push(`an inspector label is a bare string, "${value}"; wrap it in __()`);
  }

  return messages;
});

const PLACEHOLDER_VERBS = /^(Write|Add|Enter|Choose|Type|Select|Paste|Describe|Name|Pick|Set|Search)\b/;
rule(57, 'CANVAS-7', 'Neutral placeholders', (ctx) =>
  overRenders(ctx, (render) =>
    canvas(render)
      .map((node) => unmark(node.props.placeholder ?? node.props['data-placeholder'] ?? ''))
      .filter((placeholder) => placeholder && !PLACEHOLDER_VERBS.test(placeholder))
      .map((placeholder) => `the placeholder "${placeholder}" doesn't start with a verb like Write, Add or Enter`),
  { only: (render) => populated(render) && render.isSelected }));

// Tests
rule(58, 'TEST-1', 'Both halves exist', (ctx) => {
  if (!ctx.exists(ctx.path('block.test.mjs'))) return ['block.test.mjs is missing'];
  const messages = [];
  if (!/from\s+['"][^'"]*render-harness\.mjs['"]/.test(ctx.testSource)) messages.push('block.test.mjs does not import render-harness.mjs');
  if (!/from\s+['"][^'"]*editor-test-bundle\.mjs['"]/.test(ctx.testSource)) messages.push('block.test.mjs does not import editor-test-bundle.mjs');

  return messages;
});

rule(59, 'TEST-2', 'Hostile input', (ctx) =>
  /\btest\(\s*(['"`])[^'"`]*\b(hostile|escaped)\b/i.test(ctx.testSource) ? [] : ['block.test.mjs has no test whose name says "hostile" or "escaped"']);

rule(60, 'TEST-1', 'No source-text assertions', (ctx) =>
  /readFileSync\([^;]*?(block\.(php|jsx)|\.blade\.php)/.test(ctx.testSource) ? ["block.test.mjs reads the block's own source to assert on its text"] : []);

// Beyond the doc's numbered list
rule('VIEW-4-empty', 'VIEW-4-empty', 'An empty block renders nothing', (ctx) => {
  if (noJson(ctx)) return [];
  const messages = [];
  const blank = { 'no attributes': {}, 'the block.json defaults': defaultAttributes(ctx.json) };
  for (const [label, attributes] of Object.entries(blank)) {
    const { html, error } = ctx.tryRender(attributes, []);
    if (error) messages.push(`block.php fails to render with ${label}: ${error}`);
    else if (html.trim() !== '') messages.push(`renders markup with ${label}; an empty block must render nothing`);
  }

  return messages;
});

rule('PHP-2-hostile', ['PHP-2', 'ESC-2', 'ESC-3'], 'Hostile input renders inert', (ctx) => {
  if (noJson(ctx)) return [];
  const { html, error } = ctx.tryRender(hostileAttributes(ctx.json));
  if (error) return [`block.php fails to render hostile input: ${error}`];

  return [
    ...(/<script/i.test(html) ? ['hostile text reached the page as a <script> tag; sanitize it in block.php and print it with {{ }}'] : []),
    ...(/javascript:/i.test(html) ? ['a javascript: URL reached the page; sanitize it with esc_url()'] : []),
  ];
});

rule('PHP-10', ['PHP-10', 'ENT-2'], 'Entrance parts are computed', (ctx) =>
  [...bladeMarkup(ctx.view).matchAll(/@entrancePart\(\s*(\d+)\s*[,)]/g)]
    .map(([, index]) => `@entrancePart(${index}) is a fixed number; take the index from BlockEntrance::partIndexes()`));

rule('GROUND-4', 'GROUND-4', 'No hard-coded background on the root', (ctx) => {
  const [root] = bladeTags(ctx.view);
  if (root?.name !== 'section') return [];
  // What a {{ }} or a directive prints is the helper's business, not a literal class.
  const literal = root.text.replace(/\{\{[\s\S]*?\}\}|\{!![\s\S]*?!!\}|@\w+\([^)]*\)/g, ' ');

  return /(?:^|[\s"'])(?:[\w-]+:)*bg-/.test(literal)
    ? ["the root hard-codes a bg-* class; the block's tone comes from its ground (a flat fallback is set in @php and printed through {{ }})"]
    : [];
});

rule('A11Y-6', 'A11Y-6', 'A new-tab link says so', (ctx) => {
  const view = bladeMarkup(ctx.view);
  const links = (view.match(/target="_blank"/g) ?? []).length;
  const hints = (view.match(/partials\.new-tab-hint/g) ?? []).length;

  const messages =
    hints < links ? [`the view has ${links} new-tab links but includes 'partials.new-tab-hint' ${hints} times; every new-tab link needs its own`] : [];

  // A link inside rich copy is the editor's, so the view can't include the hint
  // for it. Render copy that holds one and look at what prints.
  if (!noJson(ctx)) {
    const { html, error } = ctx.tryRender(richLinkAttributes(ctx.json));
    if (error) return [...messages, `block.php fails to render copy with a new-tab link: ${error}`];
    const bare = [...html.matchAll(new RegExp(`<a\\b[^>]*href="${RICH_LINK_HREF}"[^>]*>[\\s\\S]*?</a>`, 'g'))]
      .filter(([link]) => !/opens in a new tab/.test(link)).length;
    if (bare) messages.push(`${bare} new-tab link(s) in rich copy print with no hint; pass the filtered copy through BlockAttributes::newTabHints() in block.php`);
  }

  return messages;
});

// The kit's hard rule (create-block): content is edited on the canvas; the sidebar holds configuration only.
const CONTENT_EDITORS = ['ActionEditor', 'LinkPicker', 'LinkControl', 'RichText', 'AutoGrowingTextarea', 'InlineField', 'InlineHeading', 'ParagraphsField'];
rule('INSP-7', 'INSP-7', 'No content editing in the sidebar', (ctx) =>
  overRenders(ctx, (render) =>
    [...new Set(render.rawNodes.filter((node) => node.inspector && CONTENT_EDITORS.includes(node.name)).map((node) => node.name))]
      .map((name) => `${name} is inside InspectorControls; edit content on the canvas`),
  { only: (render) => render.isSelected }));

rule('INSP-8', 'INSP-8', 'Text settings in the sidebar', (ctx) =>
  overRenders(ctx, (render) =>
    render.rawNodes
      .filter((node) => node.inspector && node.name === 'TextControl' && node.props.type !== 'number')
      .map((node) => `a text TextControl (${unmark(node.props.label ?? '')}) is in the sidebar; text the page shows belongs on the canvas`),
  { only: (render) => render.isSelected }));

export const RULE_IDS = new Set(RULES.flatMap((entry) => entry.ids));

// Warnings report without failing: canvas polish, naming and test coverage. Everything else is an error.
export const WARN_RULES = new Set([
  'TEST-1', 'TEST-2', 'VIEW-2', 'VIEW-4-empty', 'VIEW-6', 'PHP-5', 'PHP-6', 'PHP-7', 'PHP-8', 'PHP-10',
  'GROUND-4', 'ENT-5', 'INSP-1', 'INSP-3', 'INSP-5', 'INSP-6', 'CANVAS-1', 'CANVAS-4', 'CANVAS-7',
  'CTA-3', 'MEDIA-3', 'JSON-7', 'JSON-9', 'INSP-8',
]);
const levelOf = (rule) => (WARN_RULES.has(rule) ? 'warn' : 'error');

// ── Running ───────────────────────────────────────────────────────────────

const label = (entry) => `${typeof entry.n === 'number' ? `#${entry.n} ` : ''}${entry.ids[0]}`;

// The block's reasoned opt-outs, and a failure for any that aren't valid.
export function readSkips(json) {
  const skips = json?.__conformance?.skip ?? {};
  const problems = [];
  const active = {};
  for (const [id, reason] of Object.entries(skips)) {
    if (typeof reason !== 'string' || reason.trim() === '') problems.push(`the skip for ${id} needs a reason`);
    else if (!RULE_IDS.has(id)) problems.push(`the skip names ${id}, which is not a conformance rule`);
    else active[id] = reason.trim();
  }

  return { active, problems };
}

// { failures: [{ n, rule, title, message }], skipped: [{ rule, reason }] }
// `only` limits the run to the listed rule numbers or IDs.
export async function checkBlock({ only, ...options }) {
  const ctx = createContext(options);
  const { active, problems } = readSkips(ctx.json);
  const failures = problems.map((message) => ({ n: 'SKIP', rule: 'CONFORMANCE-SKIP', title: 'Opt-outs need a reason', message, level: 'error' }));

  for (const entry of RULES.filter((item) => item.scope === 'block')) {
    if (entry.ids.some((id) => active[id])) continue;
    if (only && !only.includes(entry.n) && !entry.ids.some((id) => only.includes(id))) continue;
    let messages;
    try {
      messages = await entry.check(ctx);
    } catch (error) {
      messages = [`the check crashed: ${error.message}`];
    }
    for (const message of messages) failures.push({ n: entry.n, rule: entry.ids[0], title: entry.title, message, level: levelOf(entry.ids[0]) });
  }

  return {
    slug: ctx.slug,
    failures,
    skipped: Object.entries(active).map(([id, reason]) => ({ rule: id, reason })),
  };
}

// The theme-wide rules: shared components, asset folders, enqueues.
export async function checkProject({ themeRoot, resourcesRoot = join(themeRoot, 'resources') }) {
  const ctx = createContext({ themeRoot, blockDir: join(resourcesRoot, 'blocks', '__project__'), resourcesRoot });
  const failures = [];
  for (const entry of RULES.filter((item) => item.scope === 'project')) {
    for (const message of await entry.check(ctx)) failures.push({ n: entry.n, rule: entry.ids[0], title: entry.title, message, level: levelOf(entry.ids[0]) });
  }

  return failures;
}

// Every folder under blocksDir that is a block. `components` holds shared code.
export function listBlocks(blocksDir) {
  if (!existsSync(blocksDir)) return [];

  return readdirSync(blocksDir)
    .filter((name) => name !== 'components' && statSync(join(blocksDir, name)).isDirectory())
    .sort();
}

export const formatFailure = (failure) => `${label({ n: failure.n, ids: [failure.rule] })} ${failure.title}: ${failure.message}`;

// CLI: `node scripts/conformance.mjs [--verbose|--rules] [slug...]` from the theme root. Reports only; never edits a file.
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--rules')) {
    for (const entry of RULES) console.log(`${levelOf(entry.ids[0]).padEnd(5)}  ${entry.ids.join(', ').padEnd(24)}  ${entry.title}${entry.scope === 'project' ? ' (theme-wide)' : ''}`);
    return;
  }
  const verbose = args.includes('--verbose');
  const themeRoot = process.cwd();
  const blocksDir = join(themeRoot, 'resources', 'blocks');
  const wanted = args.filter((arg) => !arg.startsWith('--'));
  const slugs = listBlocks(blocksDir).filter((slug) => !wanted.length || wanted.includes(slug));
  const results = [{ slug: '(theme)', failures: await checkProject({ themeRoot }), skipped: [] }];
  for (const slug of slugs) results.push(await checkBlock({ themeRoot, blockDir: join(blocksDir, slug) }));

  let errors = 0;
  let warnings = 0;
  for (const { slug, failures, skipped } of results) {
    for (const failure of failures.filter((f) => f.level === 'error')) {
      errors++;
      console.log(`error  ${slug}  ${failure.rule}  ${failure.message}`);
    }
    const warns = failures.filter((f) => f.level === 'warn');
    warnings += warns.length;
    if (verbose) warns.forEach((f) => console.log(`warn   ${slug}  ${f.rule}  ${f.message}`));
    else {
      const byRule = Map.groupBy(warns, (f) => f.rule);
      for (const [rule, list] of byRule) console.log(`warn   ${slug}  ${rule} ×${list.length}  ${list[0].title}`);
    }
    for (const { rule, reason } of skipped) console.log(`skip   ${slug}  ${rule}  ${reason}`);
  }
  console.log(`conformance: ${slugs.length} block(s), ${errors} error(s), ${warnings} warning(s)${warnings && !verbose ? ' — --verbose for details' : ''}`);
  process.exitCode = errors ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

// The runtime half of the conformance checks (see conformance.mjs): it loads a
// block's editor bundle with stand-in WordPress packages, renders `edit()` with
// generated attributes, and renders block.php through the real Blade compiler.
// Nothing here knows a specific block. Every stand-in is generic, so a block
// that imports an editor package this file doesn't fake fails the check with
// the bundler's message instead of passing by accident.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LIMITS } from '../resources/blocks/components/backend/entranceCanvas.js';
import { executeBundle } from './editor-test-bundle.mjs';
import { callPhp, registerDirective, renderBlock } from './render-harness.mjs';
import { resetWpEditorTest, wpEditorStubs } from './wp-editor-stubs.mjs';
import { APP_AUTOLOAD } from '../app/Blocks/test-support.mjs';

// The attributes BlockManager::globalAttributes() gives every theme block.
// conformance.test.mjs asserts this mirrors the PHP.
export const GLOBAL_ATTRIBUTES = {
  paddingVertDesktop: { type: 'number', default: 112 },
  paddingVertMobile: { type: 'number', default: 56 },
  paddingXDesktop: { type: 'boolean', default: true },
  paddingXMobile: { type: 'boolean', default: true },
  entrance: {
    type: 'object',
    default: {
      type: 'fade-slide',
      direction: 'up',
      distance: null,
      unit: 'px',
      duration: null,
      delay: null,
      stagger: null,
      trigger: 'section',
    },
  },
};

export const PADDING_KEYS = ['paddingVertDesktop', 'paddingVertMobile', 'paddingXDesktop', 'paddingXMobile'];
export const ENTRANCE_KEYS = ['type', 'direction', 'distance', 'unit', 'duration', 'delay', 'stagger', 'trigger'];
export { LIMITS as ENTRANCE_LIMITS };

// Grounds the canvas checks use when the project has none of its own, so the
// ground-dependent checks always have a light and a dark one to switch between.
const FALLBACK_GROUNDS = [
  { name: 'ink', token: '--color-ink', light: false },
  { name: 'paper', token: '--color-surface', light: true },
];

// __() marks every string it returns, so a visible label that never went
// through it shows up as an unmarked string in the rendered tree.
export const I18N_MARK = '​';
export const unmark = (text) => String(text ?? '').split(I18N_MARK).join('');

const I18N = `
const mark = (value) => '${I18N_MARK}' + value;
export function __(value) { return mark(value); }
export function _x(value) { return mark(value); }
export function _n(single, plural, count) { return mark(count === 1 ? single : plural); }
export function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%(\\d+)\\$[sd]|%[sd]/g, (_, n) => (n ? args[n - 1] : args[i++]));
}
export function isRTL() { return false; }
`;

const PLAIN_COMPONENTS = [
  'BaseControl', 'ButtonGroup', 'ExternalLink', 'Flex', 'FlexBlock', 'FlexItem', 'Icon', 'Placeholder',
  'ToolbarButton', 'ToolbarGroup', 'Tooltip', 'VisuallyHidden',
];

const COMPONENTS = (base) => `${base}
export function Notice(props) { return React.createElement('div', { role: 'status' }, props.children); }
export function TextareaControl(props) { return React.createElement('textarea', { 'aria-label': props.label }); }
export function CheckboxControl(props) { return React.createElement('input', { type: 'checkbox', 'aria-label': props.label }); }
export function RadioControl(props) { return React.createElement('fieldset', { 'aria-label': props.label }); }
${PLAIN_COMPONENTS.map((name) => `export function ${name}(props) { return React.createElement('div', null, props.children); }`).join('\n')}
`;

const BLOCK_EDITOR = (base) => `${base}
export const store = 'core/block-editor';
export function useBlockEditContext() { return { clientId: 'conformance-1' }; }
export function BlockControls({ children }) { return React.createElement('div', null, children); }
export function InnerBlocks() { return null; }
`;

const EXTRA_PACKAGES = [
  ['@wordpress/api-fetch', 'export default function apiFetch() { return Promise.resolve(null); }'],
  ['@wordpress/url', 'export function addQueryArgs(url) { return url; }'],
  ['@wordpress/core-data', "export const store = 'core';"],
  ['@wordpress/html-entities', 'export function decodeEntities(value) { return value; }'],
  ['@wordpress/compose', 'export function useInstanceId() { return 1; } export function useDebounce(fn) { return fn; }'],
];

// EntranceControl is stood in for, and recorded, so INSP-3 can check how the
// block mounts it. The control itself has its own tests.
const ENTRANCE_STUB = `export function EntranceControl() { return null; }`;

let bundleCounter = 0;

function configStub(grounds) {
  return `export default { grounds: ${JSON.stringify(grounds?.length ? grounds : FALLBACK_GROUNDS)} };`;
}

export function groundsFor(themeRoot) {
  const path = join(themeRoot, 'kit.config.json');
  if (!existsSync(path)) return FALLBACK_GROUNDS;
  try {
    const grounds = JSON.parse(readFileSync(path, 'utf8')).grounds;
    return grounds?.length ? grounds : FALLBACK_GROUNDS;
  } catch {
    return FALLBACK_GROUNDS;
  }
}

// ── Attributes ────────────────────────────────────────────────────────────

export const mergedAttributes = (json) => ({ ...GLOBAL_ATTRIBUTES, ...(json.attributes ?? {}) });

export function defaultAttributes(json) {
  return Object.fromEntries(
    Object.entries(mergedAttributes(json)).map(([name, spec]) => [name, structuredClone(spec.default ?? null)]),
  );
}

// One entry with every text-like key a repeater in this vocabulary uses, so
// PHP's "drop an entry with nothing to render" keeps it.
const SAMPLE_ENTRY = {
  heading: 'Sample heading',
  subtitle: 'Sample subtitle',
  eyebrow: 'Sample eyebrow',
  body: '<p>Sample body</p>',
  name: 'Sample name',
  label: 'Sample label',
  title: 'Sample title',
  text: 'Sample text',
  caption: 'Sample caption',
  linkText: 'Sample link',
  link: { url: 'https://example.com/entry', opensInNewTab: true },
  imageId: 7,
};

// The keys a repeater entry needs at least one of, for the sample content to
// draw anything.
export const SAMPLE_ENTRY_KEYS = Object.keys(SAMPLE_ENTRY);

const RICH_NAMES = new Set(['body', 'intro', 'content']);

function sampleValue(name, spec) {
  const { type } = spec;
  if (type === 'boolean') return spec.default ?? false;
  if (type === 'number' || type === 'integer') return /Id$/.test(name) ? 7 : (spec.default ?? 0);
  if (type === 'array') {
    return /Ids$/.test(name) ? [] : [{ ...SAMPLE_ENTRY, name: 'Sample one' }, { ...SAMPLE_ENTRY, name: 'Sample two', imageId: 8 }];
  }
  if (type === 'object') {
    if (name === 'link' || name.endsWith('Link')) return { url: 'https://example.com/', opensInNewTab: true };
    return structuredClone(spec.default ?? {});
  }
  if (spec.enum) return spec.default || spec.enum[0];
  if (name === 'ground') return '';
  if (name === 'sectionDivider') return 'below';
  if (spec.default) return spec.default;
  if (name === 'ctaIcon') return 'arrow';
  if (/Url$/.test(name)) return '';
  return RICH_NAMES.has(name) ? '<p>Sample text</p>' : 'Sample text';
}

// Every attribute filled with a plausible value, so a block that renders
// nothing when empty draws all its parts.
export function sampleAttributes(json) {
  return Object.fromEntries(Object.entries(mergedAttributes(json)).map(([name, spec]) => [name, sampleValue(name, spec)]));
}

export const HOSTILE_TEXT = '<script>x</script>"';
export const HOSTILE_URL = 'javascript:alert(1)';

// Attributes that name a class or a token; hostile text there would test the
// shared helper that resolves them, not the block.
const KEPT_WHOLE = new Set(['ground', 'sectionDivider', 'ctaIcon', 'entrance']);

function hostile(value, key, text = HOSTILE_TEXT, url = HOSTILE_URL) {
  if (typeof value === 'string') return /url$/i.test(key) ? url : text;
  if (Array.isArray(value)) return value.map((entry) => hostile(entry, key, text, url));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name, entry]) => [name, hostile(entry, name, text, url)]));
  return value;
}

// Every attribute that takes a rich value is a new-tab link inside copy when
// the block's PHP lets markup through, so a block that prints it has to say
// the link opens a new tab. Plain strings lose the tag in sanitize_text_field.
export const RICH_LINK_HREF = 'https://example.com/rich-copy';
const RICH_LINK_TEXT = `<p>Copy with <a href="${RICH_LINK_HREF}" target="_blank">a link</a></p>`;

// The sample content with every free-text string set to markup and every URL
// to a javascript: link, for a block that prints what it was given.
export function hostileAttributes(json) {
  return mapAttributes(json, hostile);
}

function mapAttributes(json, change) {
  const attributes = mergedAttributes(json);

  return Object.fromEntries(Object.entries(sampleAttributes(json)).map(([name, value]) => [
    name,
    KEPT_WHOLE.has(name) || attributes[name].enum || /Id$/.test(name) ? value : change(value, name),
  ]));
}

// The sample content with every free-text string set to copy that holds a
// new-tab link.
export function richLinkAttributes(json) {
  return mapAttributes(json, (value, key) => hostile(value, key, RICH_LINK_TEXT, ''));
}

// Sample content with one attribute changed per variant, so a control that
// only shows for one choice (INSP-9) is rendered at least once.
export function editorVariants(json, groundNames) {
  const attributes = mergedAttributes(json);
  const sample = sampleAttributes(json);
  const variants = [
    { label: 'defaults', attributes: defaultAttributes(json) },
    { label: 'sample content', attributes: sample },
  ];

  for (const [name, spec] of Object.entries(attributes)) {
    const choices = spec.enum ?? (spec.type === 'boolean' ? [true, false] : name === 'ground' ? groundNames : []);
    for (const choice of choices) {
      if (choice === sample[name]) continue;
      variants.push({ label: `${name} = ${JSON.stringify(choice)}`, attributes: { ...sample, [name]: choice } });
    }
  }

  return variants;
}

// ── Editor ────────────────────────────────────────────────────────────────

const isElement = (node) => node && typeof node === 'object' && 'type' in node && 'props' in node;
const FRAGMENT = Symbol.for('react.fragment');

// Flattens an element tree into { host, name, props, inspector } nodes.
// `expand` calls each function component, so the nodes are what would reach
// the page; without it only what the block's own JSX wrote is listed.
// Everything under <InspectorControls> is flagged, because the sidebar and the
// canvas are styled differently.
export function walkTree(root, { expand = true } = {}) {
  const nodes = [];

  const visit = (node, inspector) => {
    if (Array.isArray(node)) return node.forEach((child) => visit(child, inspector));
    if (!isElement(node)) return;

    const { type, props } = node;
    if (type === FRAGMENT) return visit(props.children, inspector);

    if (typeof type === 'string') {
      nodes.push({ host: true, name: type, props, inspector });
      return visit(props.children, inspector);
    }

    const target = type?.type ?? type;
    // The bundler suffixes a name that collides with another module's.
    const name = (target?.name || target?.displayName || '').replace(/\$\d+$/, '');
    nodes.push({ host: false, name, props, inspector });

    if (name === 'InspectorControls') return visit(props.children, true);
    if (typeof type === 'object' && type?.render) {
      if (expand) visit(type.render(props, null), inspector);
      return undefined;
    }
    if (!expand || typeof target !== 'function') return visit(props.children, inspector);

    return visit(target(props), inspector);
  };

  visit(root, false);

  return nodes;
}

export const classTokens = (props) => String(props.className ?? '').split(/\s+/).filter(Boolean);

export async function loadEditor({ blockDir, themeRoot }) {
  const grounds = groundsFor(themeRoot);
  const entry = join(blockDir, 'block.jsx');
  resetWpEditorTest();
  globalThis.window = { HTMLElement: class {} };

  const defaults = new Map(wpEditorStubs());
  const modules = wpEditorStubs({
    '@wordpress/i18n': I18N,
    '@wordpress/block-editor': BLOCK_EDITOR(defaults.get('@wordpress/block-editor')),
    '@wordpress/components': COMPONENTS(defaults.get('@wordpress/components')),
  });
  modules.push(...EXTRA_PACKAGES, ['conformance-config', configStub(grounds)], ['conformance-entrance', ENTRANCE_STUB]);

  await executeBundle(entry, modules, `ConformanceBundle${bundleCounter++}`, {
    'kit.config.json': 'conformance-config',
    'EntranceControl.jsx': 'conformance-entrance',
  });

  const registration = globalThis.__wpEditorTest.registrations[0];
  if (!registration) throw new Error('block.jsx never called registerBlockType()');

  return { settings: registration.settings, grounds };
}

// One render of edit(): what it wrote through setAttributes, the nodes it
// produced, and what the panels and selects captured.
export function renderEdit(settings, { attributes, isSelected }) {
  resetWpEditorTest();
  globalThis.window = { HTMLElement: class {} };

  const calls = [];
  const props = {
    attributes,
    setAttributes: (patch) => calls.push(patch),
    isSelected,
    clientId: 'conformance-1',
  };
  const raw = settings.edit(props);

  return {
    calls,
    raw,
    rawNodes: walkTree(raw, { expand: false }),
    nodes: walkTree(raw),
    panels: [...globalThis.__wpEditorTest.panels],
    selects: [...globalThis.__wpEditorTest.selects],
  };
}

// ── PHP ───────────────────────────────────────────────────────────────────

let directivesRegistered = false;

function registerDirectives() {
  if (directivesRegistered) return;
  directivesRegistered = true;
  const directives = callPhp('__conformance_directives', [], {
    functions: [
      APP_AUTOLOAD,
      'function __conformance_directives() { return \\App\\Providers\\BlockDirectivesServiceProvider::directives(); }',
    ],
  });
  for (const [name, body] of Object.entries(directives)) registerDirective(name, body);
}

// WordPress functions block.php files commonly call that the render harness
// doesn't fake. Each answers "nothing", which is enough to draw a block.
const WP_FUNCTIONS = ['sanitize_email', 'sanitize_key', 'do_shortcode', 'get_post_mime_type', 'wp_json_encode', 'apply_filters', 'add_filter', 'remove_filter', 'wp_enqueue_script', 'wp_enqueue_style', 'wp_script_is', 'wp_style_is', 'get_field', 'is_admin']
  .map((name) => {
    const body = {
      sanitize_email: 'return filter_var((string) $v, FILTER_SANITIZE_EMAIL);',
      sanitize_key: "return preg_replace('/[^a-z0-9_-]/', '', strtolower((string) $v));",
      get_post_mime_type: "return 'image/png';",
      wp_json_encode: 'return json_encode($v);',
      apply_filters: 'return $v;',
      wp_script_is: 'return false;',
      wp_style_is: 'return false;',
    }[name] ?? "return '';";

    return `if (! function_exists('${name}')) { function ${name}($v = null, ...$rest) { ${body} } }`;
  });

// `extra` adds to the render env: appRoots for PHP that lives outside the
// theme, functions a block's own PHP needs, and `posts`, the fixture records
// a collection block queries (the kit's examples use all three).
export function phpRenderer({ themeRoot, resourcesRoot, slug, extra = {} }) {
  registerDirectives();
  const env = {
    quiet: true,
    root: resourcesRoot,
    ...extra,
    functions: [
      APP_AUTOLOAD,
      `function get_template_directory() { return ${JSON.stringify(themeRoot)}; }`,
      ...WP_FUNCTIONS,
      ...(extra.functions ?? []),
    ],
  };

  return (attributes, posts) => renderBlock(slug, attributes, posts ?? extra.posts ?? [], env);
}

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { build } from 'vite';

globalThis.__React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// shortcut: enough document for effects that add a stylesheet or a listener, upgrade to jsdom if a test needs real DOM.
globalThis.document ??= {
  head: { appendChild() {} },
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  addEventListener() {},
  removeEventListener() {},
};

const named = (names) => names.map((n) => `export const ${n} = R.${n};`).join('\n');
const hooks = ['useState', 'useEffect', 'useLayoutEffect', 'useRef', 'useMemo', 'useCallback', 'useId', 'createElement', 'Fragment', 'forwardRef', 'memo', 'Children', 'cloneElement', 'createContext', 'useContext'];
const reactSource = `const R = globalThis.__React;\nexport default R;\n${named(hooks)}`;

// A stand-in renders its children, so what sits inside it is still on the tree.
const box = (name) => `export function ${name}(props) { return R.createElement('div', { 'data-stub': '${name}' }, props.children); }`;
const leaf = (name) => `export function ${name}(props) { return R.createElement('span', { 'data-stub': '${name}', 'aria-label': props.label }); }`;

const STUBS = new Map([
  ['react', reactSource],
  ['@wordpress/element', `${reactSource}\nexport const RawHTML = (p) => R.createElement('div', null, p.children);`],
  ['@wordpress/i18n', `export const __ = (v) => v;
    export const _x = (v) => v;
    export const _n = (a, b, n) => (n === 1 ? a : b);
    export const sprintf = (f, ...a) => { let i = 0; return f.replace(/%[sd]/g, () => a[i++]); };`],
  ['@wordpress/blocks', `export function registerBlockType(metadata, settings) { globalThis.__registered = { metadata, settings }; }
    export const getBlockType = () => undefined;`],
  ['@wordpress/block-editor', `const R = globalThis.__React;
    export const useBlockProps = (props = {}) => ({ ...props, className: ['wp-block', props.className].filter(Boolean).join(' ') });
    export function RichText(p) { const T = p.tagName || 'div'; return R.createElement(T, { className: p.className, 'data-richtext': true, 'data-value': p.value }); }
    export function MediaUpload(p) { return p.render({ open: () => {} }); }
    export function LinkControl(p) { return R.createElement('span', { 'data-stub': 'LinkControl', 'data-url': p.value?.url }); }
    ${['InspectorControls', 'BlockControls', 'MediaUploadCheck'].map(box).join('\n')}`],
  ['@wordpress/components', `const R = globalThis.__React;
    export function Button(p) { return R.createElement('button', { type: 'button', 'aria-label': p.label, disabled: p.disabled, onClick: p.onClick, className: 'components-button' }, p.children); }
    export function PanelBody(p) { return R.createElement('section', { 'data-panel': p.title }, p.children); }
    export function Popover(p) { return R.createElement('div', { 'data-stub': 'Popover', onKeyDown: p.onKeyDown }, p.children); }
    ${['ToolbarGroup', 'Flex', 'FlexItem', 'BaseControl', 'Placeholder'].map(box).join('\n')}
    ${['SelectControl', 'ToggleControl', 'RangeControl', 'TextControl', 'TextareaControl', 'CheckboxControl', 'ToolbarButton', 'Spinner', 'Notice', 'Icon', 'Dashicon', 'FocalPointPicker', 'ButtonGroup'].map(leaf).join('\n')}`],
  ['@wordpress/data', `const store = new Proxy({}, { get: (_, name) => (name === 'getEntityRecords' ? () => null : () => undefined) });
    export const useSelect = (map) => (typeof map === 'function' ? map(() => store, {}) : store);
    export const useDispatch = () => new Proxy({}, { get: () => () => {} });
    export const select = () => store;
    export const dispatch = () => new Proxy({}, { get: () => () => {} });`],
  ['@wordpress/rich-text', `export const create = ({ html }) => ({ html, text: (html || '').replace(/<[^>]*>/g, ''), start: 0, end: 0 });
    export const split = (v) => [{ html: v.html }, { html: '' }];
    export const toHTMLString = ({ value }) => value.html;`],
  ['@wordpress/icons', `const R = globalThis.__React; export const Icon = () => null;\nexport default new Proxy({}, { get: () => null });`],
]);


// Bundles an entry with Vite and runs it here. JSX compiles against the one React
// the test renderer uses, because two copies would break every hook.
export async function bundle(entry, name = 'Bundle') {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    esbuild: { jsx: 'transform', jsxFactory: 'globalThis.__React.createElement', jsxFragment: 'globalThis.__React.Fragment' },
    plugins: [{
      name: 'wp-stubs',
      enforce: 'pre',
      resolveId: (id) => (STUBS.has(id) ? `\0${id}` : null),
      load: (id) => (id.startsWith('\0') ? STUBS.get(id.slice(1)) : null),
    }],
    build: { write: false, minify: false, target: 'node20', assetsInlineLimit: 100000, lib: { entry, formats: ['iife'], name } },
  });
  const chunk = [result].flat().flatMap((r) => r.output).find((o) => o.type === 'chunk');
  return new Function(`${chunk.code}; return typeof ${name} === 'undefined' ? undefined : ${name};`)();
}

// Refs get a node-shaped object, so an effect that measures or queries one still runs.
const createNodeMock = () => ({
  ownerDocument: globalThis.document,
  getBoundingClientRect: () => ({ top: 0, bottom: 10, left: 0, right: 10, width: 10, height: 10 }),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
  focus() {},
  style: {},
});

export function render(element) {
  let tree;
  act(() => { tree = TestRenderer.create(element, { createNodeMock }); });
  return tree;
}

export const fire = (fn, ...args) => act(() => { fn(...args); });

const textOf = (node) => (typeof node === 'string' ? node : (node.children ?? []).map(textOf).join(''));
export const text = (tree) => [tree.toJSON()].flat().filter(Boolean).map(textOf).join('');
export const byStub = (tree, name) => tree.root.findAll((n) => n.props['data-stub'] === name, { deep: true });

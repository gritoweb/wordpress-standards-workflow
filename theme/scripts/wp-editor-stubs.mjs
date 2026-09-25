// Default `@wordpress/*` stubs for executeBundle(), so a block test doesn't
// paste its own copy of registerBlockType/useBlockProps/RichText/etc. Every
// stub writes what it captured onto `globalThis.__wpEditorTest`, which
// resetWpEditorTest() clears between tests.
//
// wpEditorStubs({ '@wordpress/i18n': '...' }) returns the default modules
// with an override merged in, ready to pass to executeBundle() as `modules`.
export function wpEditorStubs(overrides = {}) {
  const defaults = new Map([
    [
      '@wordpress/blocks',
      `export function registerBlockType(metadata, settings) {
        globalThis.__wpEditorTest.registrations.push({ metadata, settings });
      }
      // Real getBlockType() returns the type after BlockManager's
      // block_type_metadata filter merges the global attributes server-side;
      // this stub only has the block's own imported block.json, which is
      // enough for a block.jsx that reads its own declared entrance default.
      export function getBlockType(name) {
        const found = globalThis.__wpEditorTest.registrations.find((r) => r.metadata.name === name);
        return found ? found.metadata : undefined;
      }`,
    ],
    [
      '@wordpress/block-editor',
      `import React from 'react';
      export function useBlockProps(props = {}) {
        return { className: 'wp-block-test', ...props };
      }
      export function RichText(props) {
        globalThis.__wpEditorTest.richTexts.push(props);
        const Tag = props.tagName || 'div';
        return React.createElement(Tag, {
          className: props.className,
          'aria-label': props['aria-label'],
          'data-placeholder': props.placeholder,
          dangerouslySetInnerHTML: { __html: props.value || '' },
        });
      }
      export function BlockControls({ children }) {
        return React.createElement('div', { 'data-block-controls': true }, children);
      }
      export function InspectorControls({ children }) {
        return React.createElement('aside', null, children);
      }
      export function LinkControl() { return null; }
      export function MediaUploadCheck({ children }) {
        globalThis.__wpEditorTest.permissionChecks += 1;
        return globalThis.__wpEditorTest.canUpload
          ? React.createElement('span', { 'data-media-permission': true }, children)
          : null;
      }
      export function MediaUpload(props) {
        globalThis.__wpEditorTest.uploads.push(props);
        return props.render({
          open() {
            globalThis.__wpEditorTest.openCalls += 1;
          },
        });
      }`,
    ],
    [
      '@wordpress/components',
      `import React from 'react';
      export function PanelBody(props) {
        globalThis.__wpEditorTest.panels.push(props);
        return React.createElement('section', {
          'data-panel-title': props.title,
          'data-initial-open': String(props.initialOpen),
        }, props.children);
      }
      export function SelectControl(props) {
        globalThis.__wpEditorTest.selects.push(props);
        return React.createElement('label', null, props.label);
      }
      export function ToggleControl(props) {
        globalThis.__wpEditorTest.toggles.push(props);
        return React.createElement('label', null, props.label);
      }
      export function RangeControl(props) {
        globalThis.__wpEditorTest.ranges.push(props);
        return React.createElement('label', null, props.label);
      }
      export function TextControl(props) {
        return React.createElement('input', { 'aria-label': props.label });
      }
      export function Button(props) {
        globalThis.__wpEditorTest.buttons.push(props);
        return React.createElement('button', {
          type: 'button',
          // Core renders an icon button's label prop as its aria-label.
          'aria-label': props['aria-label'] ?? props.label,
          'data-variant': props.variant,
          onClick: props.onClick,
          className: ['components-button', props.className].filter(Boolean).join(' '),
        }, props.children);
      }
      export function ToolbarGroup({ children }) {
        return React.createElement('div', null, children);
      }
      export function ToolbarButton(props) {
        return React.createElement('button', {
          type: 'button',
          'aria-label': props.label,
          onClick: props.onClick,
        });
      }
      export function Popover(props) {
        return React.createElement('div', null, props.children);
      }
      export function Spinner() {
        return React.createElement('span', { role: 'status' });
      }`,
    ],
    [
      '@wordpress/element',
      `export function useState(initialValue) {
        const index = globalThis.__wpEditorTest.stateCursor++;
        if (!(index in globalThis.__wpEditorTest.state)) {
          globalThis.__wpEditorTest.state[index] = typeof initialValue === 'function'
            ? initialValue()
            : initialValue;
        }
        return [
          globalThis.__wpEditorTest.state[index],
          (value) => {
            globalThis.__wpEditorTest.state[index] = typeof value === 'function'
              ? value(globalThis.__wpEditorTest.state[index])
              : value;
          },
        ];
      }
      export function RawHTML(props) { return props.children ?? null; }
      let __stubIdCounter = 0;
      export function useId() { return 'test-id-' + __stubIdCounter++; }
      export function useRef(initialValue) {
        return { current: initialValue };
      }
      // Runs the effect immediately (there's no real mount/unmount cycle
      // here) and stashes its cleanup so a test can call it to simulate one.
      export function useEffect(fn) {
        const cleanup = fn();
        if (cleanup) {
          globalThis.__wpEditorTest.effectCleanups.push(cleanup);
        }
      }
      // Layout effects read the live DOM; like server rendering, the stub never runs them.
      export function useLayoutEffect() {}`,
    ],
    // Every selector answers "nothing yet" (a list query answers null, which a
    // collection block reads as loading), so a block that only mounts still
    // renders. A test that needs real records overrides this module.
    [
      '@wordpress/data',
      `const store = new Proxy({}, {
        get: (_target, name) => {
          if (name === 'getEntityRecords') return () => null;
          if (name === 'getSelectionStart' || name === 'getSelectionEnd') return () => globalThis.__selection ?? { offset: 0 };
          return () => undefined;
        },
      });
      export function useSelect(map) { return typeof map === 'function' ? map(() => store) : store; }
      export function useDispatch() { return new Proxy({}, { get: () => () => {} }); }
      export function select() { return store; }
      export function dispatch() { return new Proxy({}, { get: () => () => {} }); }`,
    ],
    [
      '@wordpress/rich-text',
      `export function create({ html }) { return { html, text: (html || '').replace(/<[^>]*>/g, ''), start: 0, end: 0 }; }
      export function split(value) { return [{ html: value.html.slice(0, value.start) }, { html: value.html.slice(value.end) }]; }
      export function toHTMLString({ value }) { return value.html; }`,
    ],
    [
      '@wordpress/i18n',
      `export function __(value) { return value; }
      export function _n(single, plural, count) { return count === 1 ? single : plural; }
      export function sprintf(format, ...args) {
        let i = 0;
        return format.replace(/%(\\d+)\\$[sd]|%[sd]/g, (_, n) => (n ? args[n - 1] : args[i++]));
      }`,
    ],
  ]);

  for (const [id, source] of Object.entries(overrides)) {
    defaults.set(id, lastDeclarationWins(source));
  }

  return [...defaults];
}

// Resets the captures every default stub writes to. Call before each test
// that bundles with wpEditorStubs(); resetState: false keeps useState()
// values across a re-bundle within one test.
export function resetWpEditorTest({ resetState = true } = {}) {
  globalThis.__wpEditorTest = {
    registrations: [],
    richTexts: [],
    panels: [],
    selects: [],
    toggles: [],
    ranges: [],
    buttons: [],
    uploads: [],
    permissionChecks: 0,
    openCalls: 0,
    canUpload: true,
    stateCursor: 0,
    state: resetState ? [] : (globalThis.__wpEditorTest?.state ?? []),
    effectCleanups: [],
  };
}

// Tests extend a default module by appending to it
// (`${defaults.get(id)}\nexport function X() {}`). When X is already a
// default, keep only the later declaration so the bundle doesn't fail with a
// redeclaration error and the test's version wins.
function lastDeclarationWins(source) {
  const starts = [...source.matchAll(/^[ \t]*export function (\w+)\s*\(/gm)];
  const lastIndex = new Map(starts.map((m, i) => [m[1], i]));
  let out = '';
  let cursor = 0;
  starts.forEach((m, i) => {
    if (lastIndex.get(m[1]) === i) return;
    const end = starts[i + 1]?.index ?? source.length;
    out += source.slice(cursor, m.index);
    cursor = end;
  });
  return out + source.slice(cursor);
}

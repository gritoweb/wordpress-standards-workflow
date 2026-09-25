import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';

import { executeBundle } from '../../../../scripts/editor-test-bundle.mjs';

const entry = fileURLToPath(new URL('./ItemList.jsx', import.meta.url));

const { ItemList } = await executeBundle(
  entry,
  [
    [
      '@wordpress/components',
      `import React from 'react';
      export function Button(props) {
        // Core's Button renders its label prop as the aria-label; the stub does the same.
        return React.createElement('button', {
          type: 'button',
          className: 'components-button',
          'aria-label': props.label,
          disabled: props.disabled,
          onClick: props.onClick,
        }, props.children);
      }`,
    ],
    [
      '@wordpress/element',
      `export function useState(initialValue) {
        return [
          typeof initialValue === 'function' ? initialValue() : initialValue,
          () => {},
        ];
      }
      export function useRef(initialValue) {
        return { current: initialValue };
      }
      // Runs the effect immediately (there's no real mount here) and stashes
      // its cleanup so a test can call it to simulate an unmount.
      export function useLayoutEffect() {}
export function useEffect(fn) {
        const cleanup = fn();
        if (cleanup) {
          globalThis.__effectCleanups = globalThis.__effectCleanups || [];
          globalThis.__effectCleanups.push(cleanup);
        }
      }`,
    ],
    ['@wordpress/i18n', `export function __(value) { return value; } export function sprintf(format, ...args) { let i = 0; return format.replace(/%\\d\\$s/g, () => args[i++]); }`],
  ],
  'ItemListTestBundle',
);

// A rendered React-tree walker, not a DOM: this reads style/prop ownership on
// the actual elements ItemList returns — a stubbed component or a source-text
// match would not prove which element carries which inline style.
function mountTestTree(element) {
  if (
    element === null ||
    element === undefined ||
    typeof element === 'boolean'
  ) {
    return null;
  }
  if (Array.isArray(element)) {
    return {
      type: 'fragment',
      props: {},
      children: element.map(mountTestTree).filter(Boolean),
    };
  }
  if (typeof element === 'string' || typeof element === 'number') {
    return {
      type: '#text',
      props: {},
      children: [],
      textContent: String(element),
    };
  }
  if (element.type === React.Fragment) {
    return mountTestTree(React.Children.toArray(element.props.children));
  }
  if (typeof element.type === 'function') {
    return mountTestTree(element.type(element.props));
  }

  const node = { type: element.type, props: element.props, children: [] };
  node.children = React.Children.toArray(element.props.children)
    .map(mountTestTree)
    .filter(Boolean);
  node.textContent = node.children
    .map((child) => child.textContent || '')
    .join('');

  return node;
}

function findAll(node, predicate, matches = []) {
  if (!node) return matches;
  if (predicate(node)) matches.push(node);
  for (const child of node.children || []) findAll(child, predicate, matches);
  return matches;
}

const LONG_NAME = 'A very long item name that wraps across two full lines before it clips';

function baseItems() {
  return [
    { key: 'a', id: 1 },
    { key: 'b', id: 2 },
  ];
}

function rowsFor(tree) {
  return findAll(tree, (node) => node.props && node.props['data-row'] !== undefined);
}

function nameSpanIn(row) {
  // The label wrapper (button when selectable, span when static) is the only
  // element with this flex value; its own first title-bearing span is the
  // name — the drag handle also carries a `title` ("Drag to reorder"), so
  // searching the whole row for any titled span would find that instead.
  const wrapper = findAll(
    row,
    (node) => node.props.style && node.props.style.flex === '1 1 auto',
  )[0];
  return findAll(
    wrapper,
    (node) => node.type === 'span' && node.props.title,
  )[0];
}

test('wraps the row name to two lines then ellipsis instead of clipping to one line', () => {
  const tree = mountTestTree(
    React.createElement(ItemList, {
      items: [{ key: 'a', id: 1 }],
      selectable: false,
      minItems: 0,
      onRemove: () => {},
      onMove: () => {},
      getLabel: () => LONG_NAME,
    }),
  );
  const name = nameSpanIn(rowsFor(tree)[0]);

  assert.ok(name, 'expected a title-bearing name span');
  assert.equal(name.props.title, LONG_NAME);
  assert.equal(name.textContent, LONG_NAME);
  assert.equal(name.props.style.display, '-webkit-box');
  assert.equal(name.props.style.WebkitLineClamp, 2);
  assert.equal(name.props.style.WebkitBoxOrient, 'vertical');
  assert.equal(name.props.style.overflow, 'hidden');
  assert.equal(name.props.style.textOverflow, 'ellipsis');
  assert.notEqual(name.props.style.whiteSpace, 'nowrap');
});

test('keeps the drag handle, thumbnail, and move/remove buttons in a row with a wrapped two-line name', () => {
  const tree = mountTestTree(
    React.createElement(ItemList, {
      items: [
        { key: 'a', id: 1 },
        { key: 'b', id: 2 },
      ],
      selectable: false,
      minItems: 0,
      onRemove: () => {},
      onMove: () => {},
      getLabel: () => LONG_NAME,
      getThumb: () => '/uploads/thumb.jpg',
    }),
  );
  const row = rowsFor(tree)[0];

  const handle = findAll(row, (node) => node.props['data-drag-handle'] !== undefined)[0];
  assert.ok(handle, 'expected the drag handle');

  const thumbImg = findAll(row, (node) => node.type === 'img')[0];
  assert.ok(thumbImg, 'expected the thumbnail image');
  assert.equal(thumbImg.props.src, '/uploads/thumb.jpg');

  const moveUp = findAll(row, (node) => (node.props['aria-label'] ?? node.props.label)?.startsWith('Move up'))[0];
  const moveDown = findAll(row, (node) => (node.props['aria-label'] ?? node.props.label)?.startsWith('Move down'))[0];
  const remove = findAll(row, (node) => (node.props['aria-label'] ?? node.props.label)?.startsWith('Remove'))[0];

  assert.ok(moveUp, 'expected the move-up button');
  assert.ok(moveDown, 'expected the move-down button');
  assert.ok(remove, 'expected the remove button');
  assert.equal(remove.props.disabled, false);
});

test('the move/remove accessible names are one translatable string, not a runtime concatenation', () => {
  const tree = mountTestTree(
    React.createElement(ItemList, {
      items: [{ key: 'a', id: 1 }],
      selectable: false,
      minItems: 0,
      onRemove: () => {},
      onMove: () => {},
      getLabel: () => 'Row one',
    }),
  );
  const remove = findAll(rowsFor(tree)[0], (node) => (node.props['aria-label'] ?? node.props.label)?.startsWith('Remove'))[0];
  assert.equal(remove.props['aria-label'] ?? remove.props.label, 'Remove: Row one');
});

test('breaks the wrapped name only between words, never mid-word', () => {
  const tree = mountTestTree(
    React.createElement(ItemList, {
      items: [{ key: 'a', id: 1 }],
      selectable: false,
      minItems: 0,
      onRemove: () => {},
      onMove: () => {},
      getLabel: () => LONG_NAME,
    }),
  );
  const name = nameSpanIn(rowsFor(tree)[0]);

  assert.equal(name.props.style.wordBreak, 'normal');
  assert.equal(name.props.style.overflowWrap, 'normal');
});

test('keeps a short name legible while still carrying the clamp rule', () => {
  const tree = mountTestTree(
    React.createElement(ItemList, {
      items: baseItems(),
      selectable: false,
      minItems: 0,
      onRemove: () => {},
      onMove: () => {},
      getLabel: (item) => (item.id === 1 ? 'First' : 'Second'),
    }),
  );
  const rows = rowsFor(tree);
  const first = nameSpanIn(rows[0]);
  const second = nameSpanIn(rows[1]);

  assert.equal(first.textContent, 'First');
  assert.equal(second.textContent, 'Second');
  assert.equal(first.props.style.WebkitLineClamp, 2);
});

// A fake document that records which drag listeners are still attached.
function startDragOnFakeDocument() {
  globalThis.__effectCleanups = [];
  const listeners = new Map();
  const fakeDocument = {
    addEventListener: (type, fn) => listeners.set(`${type}:${listeners.size}`, [type, fn]),
    removeEventListener: (type, fn) => {
      for (const [key, [t, f]] of listeners) {
        if (t === type && f === fn) listeners.delete(key);
      }
    },
  };
  globalThis.document = fakeDocument;
  const moves = [];
  const tree = mountTestTree(
    React.createElement(ItemList, {
      items: baseItems(),
      selectable: false,
      minItems: 0,
      onRemove: () => {},
      onMove: (from, to) => moves.push([from, to]),
    }),
  );
  const handle = findAll(tree, (node) => node.props && node.props.onMouseDown)[0];
  handle.props.onMouseDown({
    button: 0,
    preventDefault() {},
    target: { ownerDocument: fakeDocument },
  });
  const fire = (type, event) =>
    [...listeners.values()]
      .filter(([t]) => t === type)
      .forEach(([, fn]) => fn({ target: { ownerDocument: fakeDocument }, clientY: 0, ...event }));

  return { listeners, moves, fire };
}

test('a mouse move with no button held ends the drag without moving the row', () => {
  const { listeners, moves, fire } = startDragOnFakeDocument();
  assert.ok(listeners.size > 0);

  fire('mousemove', { buttons: 0 });

  assert.equal(listeners.size, 0);
  assert.deepEqual(moves, []);
});

test('the pointer leaving the window ends the drag without moving the row', () => {
  const { listeners, moves, fire } = startDragOnFakeDocument();

  fire('mouseout', { relatedTarget: null });

  assert.equal(listeners.size, 0);
  assert.deepEqual(moves, []);
});

test('unmounting mid-drag detaches the drag listeners instead of leaking them', () => {
  const { listeners } = startDragOnFakeDocument();
  assert.ok(listeners.size > 0, 'a drag in flight should hold listeners');

  // Simulate React unmounting the component: run every effect cleanup this
  // render registered, the way React would when the component leaves.
  for (const cleanup of globalThis.__effectCleanups) cleanup();

  assert.equal(listeners.size, 0, 'unmounting should detach the drag listeners');
});

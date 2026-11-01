import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { before, test } from 'node:test';
import { clamp, emptyLink } from '../skills/create-block/templates/components/backend/editorCanvas.js';
import { entrancePartProps, entranceRootProps, resolveEntrance } from '../skills/create-block/templates/components/backend/entranceCanvas.js';
import { moveItem } from '../skills/create-block/templates/components/backend/moveItem.js';
import { bundle, byStub, fire, render, text } from './support/editor-harness.mjs';
import { kitRoot } from './support/render-harness.mjs';

let C;
const h = (...args) => globalThis.__React.createElement(...args);

before(async () => {
  C = await bundle(resolve(kitRoot, 'tests/support/components.entry.js'), 'Components');
});

const button = (tree, label) => tree.root.find((n) => n.type === 'button' && n.props['aria-label'] === label);

// --- ButtonPair

const pair = (props = {}) => render(h(C.ButtonPair, {
  text: 'Go', link: { url: '/x' }, onTextChange() {}, onLinkChange() {}, ...props,
}));
const trigger = (tree) => tree.root.find((n) => n.type === 'span' && n.props.role === 'button');

test('ButtonPair is a styled span, with no editor until it is opened', () => {
  const tree = pair({ className: 'btn btn-secondary' });
  assert.match(trigger(tree).props.className, /btn btn-secondary/);
  assert.equal(trigger(tree).props.tabIndex, 0);
  assert.equal(byStub(tree, 'Popover').length, 0);
  assert.equal(tree.root.findAllByType(C.ActionEditor).length, 0);
  assert.equal(tree.root.findAll((n) => n.type === 'a').length, 0);
});

test('ButtonPair opens ActionEditor in a Popover on click, Enter and Space', () => {
  const clicked = pair();
  fire(trigger(clicked).props.onClick);
  assert.equal(byStub(clicked, 'Popover').length, 1);
  assert.equal(clicked.root.findAllByType(C.ActionEditor).length, 1);

  for (const key of ['Enter', ' ']) {
    const tree = pair();
    let prevented = false;
    fire(trigger(tree).props.onKeyDown, { key, preventDefault: () => { prevented = true; } });
    assert.equal(byStub(tree, 'Popover').length, 1, key);
    assert.ok(prevented, key);
  }

  const other = pair();
  fire(trigger(other).props.onKeyDown, { key: 'a', preventDefault() {} });
  assert.equal(byStub(other, 'Popover').length, 0);
});

test('ButtonPair shows its add label when empty', () => {
  assert.match(text(pair({ text: '', addLabel: '+ Add link' })), /\+ Add link/);
});

test('ActionEditor edits the text and writes through a string', () => {
  const seen = [];
  const tree = render(h(C.ActionEditor, {
    groupLabel: 'B', label: 'T', linkLabel: 'L', text: 'a', link: emptyLink(), stacked: true,
    onTextChange: (v) => seen.push(v), onLinkChange() {},
  }));
  const input = tree.root.find((n) => n.props.value === 'a');
  fire(input.props.onChange, { target: { value: 'b' } });
  assert.deepEqual(seen, ['b']);
});

// --- ItemList

const list = (props = {}) => render(h(C.ItemList, {
  items: [{ title: 'A' }, { title: 'B' }, { title: 'C' }],
  activeItem: 0, setActiveItem() {}, onRemove() {}, onMove() {},
  getLabel: (i) => i.title, ...props,
}));

test('ItemList names a row, falling back to its prefix and position', () => {
  const tree = list({ items: [{ title: ' ' }, { title: 'B' }] , itemLabelPrefix: 'Slide' });
  assert.match(text(tree), /Slide 1/);
  assert.match(text(tree), /B/);
});

test('ItemList arrows move a row and follow it, and stop at the ends', () => {
  const moves = [];
  const active = [];
  const tree = list({ onMove: (...a) => moves.push(a), setActiveItem: (i) => active.push(i) });
  assert.equal(button(tree, 'Move up: A').props.disabled, true);
  assert.equal(button(tree, 'Move down: C').props.disabled, true);
  fire(button(tree, 'Move down: A').props.onClick);
  fire(button(tree, 'Move up: C').props.onClick);
  assert.deepEqual(moves, [[0, 1], [2, 1]]);
  assert.deepEqual(active, [1, 1]);
});

test('ItemList removes at once by default and keeps its minimum', () => {
  const removed = [];
  fire(button(list({ onRemove: (i) => removed.push(i) }), 'Remove: B').props.onClick, { stopPropagation() {}, preventDefault() {} });
  assert.deepEqual(removed, [1]);
  assert.equal(button(list({ minItems: 3 }), 'Remove: A').props.disabled, true);
});

test('ItemList hides Add without onAdd and shows it with one', () => {
  assert.doesNotMatch(text(list()), /Add item/);
  assert.match(text(list({ onAdd() {} })), /\+ Add item/);
});

test('moveItem moves without mutating the input', () => {
  const items = ['a', 'b', 'c', 'd'];
  assert.deepEqual(moveItem(items, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveItem(items, 3, 1), ['a', 'd', 'b', 'c']);
  assert.deepEqual(items, ['a', 'b', 'c', 'd']);
});

// --- LinkPicker

const control = (tree) => byStub(tree, 'LinkControl')[0];

test('LinkPicker in full width shows the control at once and merges changes', () => {
  const seen = [];
  const tree = render(h(C.LinkPicker, { value: { url: '/a', opensInNewTab: true }, onChange: (v) => seen.push(v), fullWidth: true }));
  assert.equal(control(tree).props['data-url'], '/a');
  const link = tree.root.findAll((n) => typeof n.type === 'function' && n.props.settings !== undefined || n.props.onRemove)[0];
  fire(link.props.onChange, { url: '/b' });
  assert.deepEqual(seen, [{ url: '/b', opensInNewTab: true }]);
});

test('LinkPicker removal empties the link unless the caller owns it', () => {
  const seen = [];
  const tree = render(h(C.LinkPicker, { value: { url: '/a' }, onChange: (v) => seen.push(v), fullWidth: true }));
  fire(tree.root.findAll((n) => n.props.onRemove)[0].props.onRemove);
  assert.deepEqual(seen, [{ url: '', opensInNewTab: false }]);

  let removed = 0;
  const owned = render(h(C.LinkPicker, { value: {}, onChange() {}, onRemove: () => { removed++; }, fullWidth: true }));
  fire(owned.root.findAll((n) => n.props.onRemove)[0].props.onRemove);
  assert.equal(removed, 1);
});

test('LinkPicker in compact mode opens in a Popover from its button', () => {
  const tree = render(h(C.LinkPicker, { value: { url: '' }, onChange() {} }));
  assert.match(text(tree), /Select link/);
  assert.equal(byStub(tree, 'Popover').length, 0);
  fire(tree.root.find((n) => n.type === 'button').props.onClick);
  assert.equal(byStub(tree, 'Popover').length, 1);
});

// --- ImagePositionControl

test('ImagePositionControl opens its grid and reports the chosen position', () => {
  const seen = [];
  const tree = render(h(C.ImagePositionControl, { value: 'center', onChange: (v) => seen.push(v) }));
  const buttons = () => tree.root.findAll((n) => n.type === 'button');
  assert.equal(buttons().length, 1);
  fire(buttons()[0].props.onClick);
  assert.equal(buttons().length, 10);
  fire(buttons().find((b) => b.props.title === 'bottom right').props.onClick);
  assert.deepEqual(seen, ['bottom-right']);
});

test('focalCss turns a position into CSS and falls back to center', () => {
  assert.equal(C.focalCss('bottom-right'), 'right bottom');
  assert.equal(C.focalCss('center'), 'center center');
  assert.equal(C.focalCss('nope'), 'center center');
});

// --- AttachmentImageControl

test('AttachmentImageControl is an add action when empty', () => {
  const tree = render(h(C.AttachmentImageControl, { imageId: 0, onSelect() {}, onRemove() {} }));
  assert.ok(tree.root.find((n) => n.props['aria-label'] === 'Add image' && n.type === 'button'));
  assert.equal(tree.root.findAll((n) => n.type === 'img').length, 0);
});

test('AttachmentImageControl shows the image it is given and removes it', () => {
  let removed = 0;
  const tree = render(h(C.AttachmentImageControl, { imageId: 7, imageUrl: '/i.jpg', onSelect() {}, onRemove: () => { removed++; } }));
  assert.equal(tree.root.find((n) => n.type === 'img').props.src, '/i.jpg');
  fire(button(tree, 'Remove image').props.onClick, { stopPropagation() {}, preventDefault() {} });
  assert.equal(removed, 1);
});

// --- AutoGrowingTextarea

test('AutoGrowingTextarea passes the string, never the event, and marks headings', () => {
  const seen = [];
  const tree = render(h(C.AutoGrowingTextarea, { value: undefined, onChange: (v) => seen.push(v), className: 'heading-2', heading: true }));
  const area = tree.root.find((n) => n.type === 'textarea');
  assert.equal(area.props.value, '');
  assert.match(area.props.className, /heading-2/);
  assert.equal(area.props['data-heading'], '');
  fire(area.props.onChange, { target: { value: 'x' } });
  assert.deepEqual(seen, ['x']);
});

// --- editorCanvas, entranceCanvas, EntranceControl

test('clamp bounds a number and falls back on anything else', () => {
  assert.equal(clamp(5, 0, 3, 1), 3);
  assert.equal(clamp(-1, 0, 3, 1), 0);
  assert.equal(clamp('', 0, 3, 1), 1);
  assert.equal(clamp('x', 0, 3, 1), 1);
});

test('emptyLink returns a fresh object each time', () => {
  assert.deepEqual(emptyLink(), { url: '', opensInNewTab: false });
  assert.notEqual(emptyLink(), emptyLink());
});

test('resolveEntrance keeps explicit null, takes the preset for a missing key, and drops bad values', () => {
  const preset = { type: 'fade', stagger: 50, duration: 900 };
  const out = resolveEntrance({ duration: null, direction: 'sideways', delay: 999999 }, preset);
  assert.equal(out.type, 'fade');
  assert.equal(out.stagger, 50);
  assert.equal(out.duration, null);
  assert.equal(out.direction, 'up');
  assert.equal(out.delay, 3000);
  assert.deepEqual(resolveEntrance('junk', { type: 'none' }).type, 'none');
});

test('the canvas prints the entrance only when there is one', () => {
  assert.deepEqual(entranceRootProps({ type: 'none' }), {});
  assert.deepEqual(entrancePartProps({ type: 'none' }, 3), {});
  const on = resolveEntrance({ type: 'fade', stagger: 100 }, {});
  assert.equal(entranceRootProps(on)['data-entrance'], 'fade');
  assert.equal(entranceRootProps(on).style['--e-stagger'], '100ms');
  assert.deepEqual(entrancePartProps(on, 0), { 'data-entrance-part': '' });
  assert.equal(entrancePartProps(on, 2).style['--e-i'], 2);
});

test('EntranceControl writes nothing on mount and merges a change into the saved object', () => {
  const writes = [];
  const attributes = { entrance: { type: 'fade', stagger: 100 } };
  const tree = render(h(C.EntranceControl, { attributes, setAttributes: (v) => writes.push(v), clientId: 'c', preset: {} }));
  assert.deepEqual(writes, []);
  const select = tree.root.findAll((n) => n.props.onChange && n.props['value'] === 'fade')[0];
  fire(select.props.onChange, 'slide');
  assert.deepEqual(writes, [{ entrance: { type: 'slide', stagger: 100 } }]);
});

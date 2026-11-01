# Disclosure list

## When it applies

A list of items where each shows a question or a title and opens to show the answer: an FAQ, a list of terms. Use it only when the design hides the detail until it's opened. If every answer shows at once, build a plain list.

## Built from

- Native `<details name>` on the page, with no `block.js`
- `ItemList` in the **Items** panel, with `activeItem` and `setActiveItem`
- `AutoGrowingTextarea`, `RichText`
- `PaddingControls`, `EntranceControl`

## Rules that matter most

- A11Y-4: a native `<details>` meets it. A scripted version uses `aria-expanded`, `aria-controls` and Escape.
- REP-9: the canvas opens the active item, and clicking an item selects it.
- JS-5: every answer is in the HTML.
- REP-3, REP-7: copy is edited in place, and PHP drops empty and malformed entries.
- VIEW-4: with no items and no heading, the block renders nothing.

## Adapt per design

- The marker: a plus and minus, a chevron or none.
- One open at a time, or any number.
- The item's frame.

## Do not change

- The question as real text in the HTML, with the answer readable without JavaScript.
- The control as a `<summary>` or a `<button>` inside a heading, never a `<div>` with a click handler.

## Example

`docs/examples/accordion.md`.

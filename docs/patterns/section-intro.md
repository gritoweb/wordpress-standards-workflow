# Section intro

## When it applies

A section opens with a heading, an optional body and an optional button. It's the smallest block and the base every other pattern extends: when no pattern fits, compose from these parts.

## Built from

- `AutoGrowingTextarea`
- `RichText` or `ParagraphsField`
- `ButtonPair` on the canvas, `<x-button-link>` on the page
- `PaddingControls`, `EntranceControl`
- `EDITOR_BLOCK_FRAME`, `editorPaddingClasses`

## Rules that matter most

- VIEW-1, VIEW-2: the standard root, and content inside `container`.
- VIEW-3: the heading is an `<h2>`, and its size comes from a type class.
- VIEW-4: every optional part renders only when it has content.
- CANVAS-3, CANVAS-4: the canvas draws the same parts with the same classes as the view.
- CTA-1, CTA-2: the button needs text and a URL, and its editor opens in a `Popover` from the button on the canvas.
- ENT-1, ENT-5: one running part index in reading order, the same on the canvas.
- CANVAS-6, CANVAS-7: optional fields show when they have a value or the block is selected, with neutral placeholders.
- INSP-2, INSP-4: panels in the standard order, and no text, link or button control in the sidebar.

## Adapt per design

- The text measures (the `max-w-*` values).
- The heading class (`heading-2` or `heading-1`), the same on the canvas.
- The default alignment and padding (JSON-5).

## Do not change

- The root shape in VIEW-1.
- The part order: heading, body, button.
- The attribute names in JSON-7.
- The button editor on the canvas, in its `Popover`.

## Example

`docs/examples/section-intro.md`.

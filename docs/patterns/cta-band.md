# CTA band

## When it applies

An invitation on a band of color, with or without a background photo. Use it for a closing call to action, not for a section opener (that's the section intro).

## Built from

- `AutoGrowingTextarea`
- `RichText` or `ParagraphsField`
- `ButtonPair` on the canvas, `<x-button-link>` on the page
- `PaddingControls`, `EntranceControl`
- `EDITOR_BLOCK_FRAME`, `editorPaddingClasses`
- `AttachmentImageControl` and `ImagePositionControl` in **Background Media**, when it has a photo
- `DividerControl`

## Rules that matter most

- VIEW-1, VIEW-2: the standard root, and content inside `container`.
- CANVAS-3, CANVAS-4: the canvas draws the same parts with the same classes as the view.
- CTA-1, CTA-2: the button needs text and a URL, and its editor opens in a `Popover` from the button on the canvas.
- ENT-1, ENT-5: one running part index in reading order, the same on the canvas.
- ENT-3: a panel of body and button is one part, and the directive sits on it, not on a size container inside it.
- CANVAS-12: on a dark band every field names its own color and placeholder color.
- JSON-5: declare all four padding keys if the comp differs from the global default.

## Adapt per design

- The column shares and the gap.
- The heading size.
- The band color, from a contract token, and the button variant passed to both `ButtonPair` and `<x-button-link>`.

## Do not change

- The stacking order on a phone: heading first, then the panel.
- The shared attribute names.

## Example

`docs/examples/cta-band.md`.

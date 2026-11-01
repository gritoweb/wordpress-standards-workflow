# Logo row

## When it applies

Client or partner marks in rows, with an optional heading. Use it when the marks are the content.

## Built from

- `ItemList` in the **Logos** panel
- `AttachmentImageControl`
- `AutoGrowingTextarea`
- `PaddingControls`, `EntranceControl`

## Rules that matter most

- MEDIA-12: `object-fit: contain`, one render per attachment, and no image means no entry.
- MEDIA-9, A11Y-5: alt text from the Media Library, and a logo that's a link always has a name.
- CANVAS-8: an empty repeater shows one line that points to its panel.
- REP-2, REP-3, REP-7: the panel holds the order, the canvas the marks, and PHP drops malformed entries.
- CTA-6: a linked logo opens a new tab only when flagged.
- JSON-5: this block usually needs its own padding defaults.

## Adapt per design

- The size caps and the gap.
- The padding defaults.
- Whether a heading exists.

## Do not change

- The array attribute `logos`.
- Alt text from the attachment, not typed per block.

## Example

`docs/examples/logo-wall.md`.

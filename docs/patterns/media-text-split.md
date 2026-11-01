# Media and text split

## When it applies

Copy on one side and a photo on the other, with an optional button. The image's side can flip.

## Built from

- `AutoGrowingTextarea`
- `RichText` or `ParagraphsField`
- `ButtonPair` on the canvas, `<x-button-link>` on the page
- `PaddingControls`, `EntranceControl`
- `EDITOR_BLOCK_FRAME`, `editorPaddingClasses`
- `AttachmentImageControl` on the canvas

## Rules that matter most

- JSON-7: the side is `imageSide`, never a page-named variant (JSON-9).
- CANVAS-3: the canvas keeps the page's column split and reversal, and the image isn't capped.
- MEDIA-3, MEDIA-7, MEDIA-10: the frame on the canvas, an explicit size, and the crop.
- INSP-9: a control that doesn't apply is hidden, and its value kept.

## Adapt per design

- The column shares.
- The aspect ratios and the corner radius.
- The heading and body classes.

## Do not change

- The reversal driven by `imageSide`, not by a second block.
- The foreground image edited on the canvas, not in the sidebar.
- Copy first in reading order, which sets the entrance order.

## Example

`docs/examples/media-text.md`.

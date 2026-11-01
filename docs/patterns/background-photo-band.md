# Background-photo band

## When it applies

Copy and a button over a full-bleed photo, as a short band or as a tall panel with the copy at the bottom. The photo is the block's background, not a column.

## Built from

- `AutoGrowingTextarea`
- `RichText` or `ParagraphsField`
- `ButtonPair` on the canvas, `<x-button-link>` on the page
- `PaddingControls`, `EntranceControl`
- `EDITOR_BLOCK_FRAME`, `editorPaddingClasses`
- `AttachmentImageControl noStylesheet` and `ImagePositionControl` in **Background Media**
- `focalCss` on the canvas, `BlockImagePosition::cssValue()` on the page

## Rules that matter most

- MEDIA-4: the photo is set in the sidebar, and the canvas shows only a passive preview behind the copy.
- MEDIA-1, MEDIA-5: the photo is an attachment ID, and an optional photo passes `onRemove`.
- MEDIA-9: a background photo gets `alt=""`.
- MEDIA-7, MEDIA-8, MEDIA-10: `full` size, the right loading, and `object-cover` plus the focal point.
- CANVAS-12: every field names its own color and placeholder color on the photo.
- CANVAS-3: the canvas draws the page's heights and spacing.

## Adapt per design

- The heights (band or tall panel) and where the copy sits.
- The text tone for a pale or a dark photo.
- The scrim gradient.
- The recommended upload size.

## Do not change

- The `alt=""` on a background photo.
- The photo as an attachment ID, never a URL.
- The control in the sidebar, with no click target on the canvas.
- A flat token background, not a placeholder image, when no photo is set (MEDIA-13).

## Example

`docs/examples/cta-band.md`, which has the **Background Media** panel.

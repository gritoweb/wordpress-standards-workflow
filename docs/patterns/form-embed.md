# Form embed

## When it applies

A heading, an intro and a form, usually beside an image. The form comes from a form plugin. The block never builds fields.

## Built from

- `AutoGrowingTextarea`
- `RichText` or `ParagraphsField`
- `AttachmentImageControl`
- `PaddingControls`, `EntranceControl`
- A plain panel on the canvas that says which form loads there

## Rules that matter most

- CANVAS-11: the editor can't draw a form honestly, so it says what loads there.
- PHP-12: a filter that applies to one render is added before the call and removed after.
- ESC-3: `{!! $form !!}` prints only markup the form plugin built.
- JSON-7: the image side is `imageSide`.
- MEDIA-1, MEDIA-5: the image is an attachment ID, and an optional image passes `onRemove`.
- TEXT-1, CANVAS-7: an auto-growing heading with a neutral placeholder.

## Adapt per design

- The image ratio and crop.
- The column shares.
- Which form plugin the site uses.

## Do not change

- The form printed as one entrance part, only when it rendered something.
- Never live fields on the canvas.
- Field styles in the design system's forms CSS, not `block.css`, so every form looks the same.

## Example

None.

# Opening statement

## When it applies

A full-height first panel with a logo, an image or neither above one large statement, and an optional scroll cue that leads to the next section.

## Built from

- `RichText` for a statement with inline formatting, or `AutoGrowingTextarea` for a plain one
- `AttachmentImageControl`
- `PaddingControls`, `EntranceControl`
- `EDITOR_BLOCK_FRAME`, `editorPaddingClasses`

## Rules that matter most

- TEXT-2, TEXT-6: a formatted statement stays rich, and nothing rewrites markup on mount.
- MEDIA-1: a selection writes an ID, never a URL.
- CANVAS-6, ENT-2: optional parts show by value or selection.
- JS-6, JS-7: reduced motion turns the glide into a jump, and the cue measures fixed chrome at click time.
- A11Y-5: a decorative icon is `aria-hidden`, and a logo that carries meaning has a name.
- ESC-3: `{!! !!}` prints only filtered markup.
- VIEW-3: as the page opener this block may be the one `<h1>`.

## Adapt per design

- The logo asset and its size.
- The spacing above and below the statement.
- The statement's type class and the panel's minimum height.
- Whether the scroll cue shows.

## Do not change

- The cue shipping `hidden` until the script finds a target (JS-5).
- The statement filtered with an allow-list.
- One `<h1>` on the page at most.

## Example

None. `docs/examples/hero.md` is the closest.

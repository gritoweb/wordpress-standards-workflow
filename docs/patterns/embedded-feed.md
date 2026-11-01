# Embedded feed

## When it applies

An intro above a third-party feed, such as a social or news widget. The provider renders the feed, and the block only frames it. Seen on one site only.

## Built from

- `AutoGrowingTextarea`
- `RichText` or `ParagraphsField`
- `ButtonPair` on the canvas, `<x-button-link>` on the page
- `PaddingControls`, `EntranceControl`
- `EDITOR_BLOCK_FRAME`, `editorPaddingClasses`
- A plain panel on the canvas that says which feed loads there

## Rules that matter most

- VIEW-4: an empty block renders nothing.
- CANVAS-11: no feed runs on the canvas.
- ESC-3: `{!! $feed !!}` prints only the provider's own markup.
- PHP-11: the provider's script is enqueued in `block.php`, only when a feed renders.
- CTA-1, CTA-2: the intro button needs text and a URL, and opens on the canvas.

## Adapt per design

- The provider and its configuration.
- The intro alignment and measure.

## Do not change

- The section rendering nothing when the intro and the feed are both empty.
- The feed printed as one entrance part.
- The provider's markup never reaching the canvas.

## Example

None.

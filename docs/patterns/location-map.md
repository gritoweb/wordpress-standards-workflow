# Location with map

## When it applies

One office with address lines, contact details, a directions button and a map. Use one block per office. Many offices are a post type and a collection grid.

## Built from

- `AutoGrowingTextarea`
- `RichText` or `ParagraphsField`
- `ButtonPair` on the canvas, `<x-button-link>` on the page
- `PaddingControls`, `EntranceControl`
- `EDITOR_BLOCK_FRAME`, `editorPaddingClasses`
- A plain panel on the canvas where the map loads

## Rules that matter most

- INSP-12: turning an address into coordinates runs only from an explicit button, reports status in a polite live region, and ignores a stale response.
- A11Y-3: the map has a text label as a sibling, and never `role="img"` on the frame.
- PHP-11, JS-8: the vendor script is enqueued in `block.php`, only with valid coordinates, and read through its global.
- CANVAS-6, CANVAS-11: empty lines show only when selected, and no live map runs on the canvas.
- CTA-2, CTA-9: the button opens on the canvas, and counts as complete with a computed destination.
- ENT-4: a block whose items stack down the page defaults to the `item` trigger.

## Adapt per design

- The icons beside each line.
- The map style and zoom.
- The line layout.

## Do not change

- The map label and frame contract.
- No map column without valid coordinates.
- Any Maps key in Site Settings, on its own SCF tab (`site-settings-wizard`).

## Example

None.

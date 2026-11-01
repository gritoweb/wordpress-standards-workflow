# Card row with two faces

## When it applies

A row of cards that show a question at rest and details on hover, focus or tap. Use it only when the design reveals content this way. Seen on one site only, so expect the next one to change it.

## Built from

- `ItemList` in the **Cards** panel
- `card`
- `AutoGrowingTextarea`, `RichText`, `ButtonPair`
- `PaddingControls`, `EntranceControl`

## Rules that matter most

- A11Y-4: `aria-expanded`, `aria-controls`, close on Escape, and a hidden face out of the tab order.
- CANVAS-11: the canvas shows both faces so each can be edited. How it does that is the block's choice, as no shared rule exists.
- ENT-4: a row of cards defaults to the `item` trigger.
- REP-3, REP-8: card content and links are edited on the canvas.
- JS-4, JS-5: listeners delegate to `document`, and without JavaScript hover and `:focus-within` still reveal the detail.
- CTA-7: cards that share a link label add hidden context.

## Adapt per design

- The card colors, as contract tokens.
- The flip: a fade, a slide or a swap.
- The row height and columns.

## Do not change

- The link on the revealed face.
- The keyboard path: focus opens the detail face.
- The per-card color as a stored meaning, not a class name (JSON-8).

## Example

None. `docs/examples/card-grid.md` is the closest.

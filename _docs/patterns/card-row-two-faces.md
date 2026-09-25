# Card row with two faces

Seen once: White Summers built this, and no other site has. Treat the page as a
starting point, and expect the second site to change it.

## When it applies

A row of colored cards that show a question at rest and details on hover,
focus, or tap. Use it only when the design reveals content this way. A card that
links straight through is a collection grid card.

## Blade skeleton

Each card is an `<article>` and an entrance part, with a title face and a detail
face in one grid cell. The row is a list, and the columns share the row's
width instead of a fixed pixel size:

```blade
<ul class="ethos-grid__list grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,max(28rem,33.333cqw)),1fr))]">
  @foreach ($items as $index => $item)
    <li class="ethos-grid__cell">
      <article @entrancePart($parts[$index]) class="ethos-card ethos-card-{{ $item['color'] }}">
        <div class="ethos-card__title-face">
          <h3 class="ethos-card__title" @if (! $item['hasLink']) tabindex="0" @endif>{{ $item['question'] }}</h3>
        </div>
        <div class="ethos-card__detail-face" id="{{ $item['detailId'] }}">
          eyebrow, detail, and the link
          @if ($item['hasLink'])<a class="btn-link" href="{!! esc_url($item['linkUrl']) !!}">{{ $item['linkText'] }}<span class="sr-only"> {{ $item['question'] }}</span></a>@endif
        </div>
      </article>
    </li>
  @endforeach
</ul>
```

- A face that holds a link is the revealed face, never the one hover replaces.
- A card with no link takes focus on its title, so `:focus-within` opens the detail face for a keyboard.
- `block.js` toggles `data-open` for touch, with `aria-expanded` on the toggle button, `aria-controls` pointing at the detail face's id, and Escape to close.
- Detect touch by the interaction (`event.pointerType`), not by the device.

## Canvas skeleton

One face showing every field at once, so nothing hides while an editor types.
Card color is a per-item setting in the **Cards** panel. No flip runs on the
canvas (CANVAS-11).

## Built from

- `EditorSection`
- `ItemList`
- `useRepeater`
- `InlineField`
- `InlineHeading`
- `ParagraphsField`
- `ActionEditor` (`stacked`)
- `partIndexes`

## Rules that matter most

- A11Y-4: `aria-expanded` and `aria-controls`, close on Escape, and a hidden face out of the tab order.
- CANVAS-11: no hover or tap flip on the canvas.
- ENT-4: a row of cards defaults to the `item` trigger.
- REP-3, REP-8: card content is edited in place, the link is an `<ActionEditor stacked>` under the card on the canvas, and the panel holds order and the per-card color.
- JS-4, JS-5: listeners delegate to `document`, and without JavaScript the hover and `:focus-within` path still reveals the detail.
- CTA-7: cards that share a link label add hidden context with the question.
- JSON-9: never carry over White Summers' `mobileVariant: "home"`. Name a variant for what it does.

## Adapt per design

- The card colors, as roles from the site's grounds and tokens.
- The flip: a fade, a slide, or a swap.
- The row height rule and the number of columns.
- Which face the mobile design opens first.

## Do not change

- The link on the revealed face.
- The keyboard path: focus opens the detail face.
- The detail id and `aria-controls` pairing.
- The per-card color as an item setting, not a class name stored in content (JSON-8).

## Tests to write

- The baseline in [Section intro](section-intro.md).
- A card with a link and a card without both render a focusable path to the detail face.
- Malformed items are dropped and the rest render, with the entrance indexes in order.
- Front-end script test: a touch tap toggles `data-open` and `aria-expanded`, a mouse click doesn't, and Escape closes the open card.
- Editor half: the canvas shows both faces' fields at once, and changing a card's color writes only that item.

## Example

Seen once, so the kit has no example. The reference is the White Summers block
`resources/blocks/ethos-grid/` in the White Summers theme, read only.

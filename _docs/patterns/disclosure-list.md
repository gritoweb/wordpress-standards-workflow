# Disclosure list

No White Summers block does this. The page follows the conventions (A11Y-4,
JS-5, CANVAS-11) and the section intro's parts, and the kit's `faq` example was
built from it and tested. Treat it as a starting point, and expect the next
site that builds it to change it.

## When it applies

A list of items where each shows a question or a title, and the visitor opens
it to read the answer or the detail: an FAQ, a list of terms, a "what's
included" list. Use it only when the design hides the detail until it's opened.
If every answer shows at once, build a plain list from the section intro's
parts. A card that reveals its detail on hover or tap is the card row with two
faces.

## Blade skeleton

The section root, container, heading, and body are the section intro's. The
items are a list of disclosures, one entrance part for the whole list.

Start with a native `<details>` and `<summary>`. It meets A11Y-4 as it is: the
browser supplies the open state, the keyboard handling, and the name, the
answers are in the HTML without JavaScript (JS-5), and the block needs no
`block.js`.

```blade
@if (count($items))
  <div class="faq__list" @entrancePart($parts['items'])>
    @foreach ($items as $item)
      <details class="faq__item">
        <summary class="faq__summary">
          <h3 class="faq__question heading-4">{{ $item['heading'] }}</h3>
        </summary>
        <div class="faq__answer">{!! $item['body'] !!}</div>
      </details>
    @endforeach
  </div>
@endif
```

- The item's copy is `heading` and `body` (JSON-7), sanitized in `block.php`
  with `sanitize_text_field()` and `BlockAttributes::newTabHints(wp_kses_post())`.
- Give every `<details>` the same `name` attribute when only one may be open at
  a time.
- The question is an `<h3>` inside the `<summary>` (VIEW-3). HTML allows a
  heading there, and the heading keeps its place in the page outline.
- Style the marker in CSS. The `<summary>` is the control, so it keeps a
  visible focus ring.

Choose a scripted version only when the design needs something `<details>`
can't do, such as an animated height. Then the markup ships every question as
plain text above a visible answer, and `block.js` builds the control:

```blade
<div class="faq__item" data-disclosure>
  <h3 class="faq__question heading-4">{{ $item['heading'] }}</h3>
  <div class="faq__answer" id="{{ $item['answerId'] }}">{!! $item['body'] !!}</div>
</div>
```

- The script wraps the question's text in a `<button type="button">` inside
  the `<h3>`, sets `aria-expanded` and `aria-controls` (the answer's id), and
  collapses the answer with `hidden`. Escape closes the open item and returns
  focus to its button.
- Without the script, the questions and answers are all readable, which is the
  JS-5 contract.
- Listeners delegate to `document` (JS-4), and reduced motion drops the height
  transition (JS-6).

## Canvas skeleton

Every item drawn open, with its question and its answer as fields in place
(REP-3). Nothing opens or closes on the canvas (CANVAS-11). The **Questions**
panel (named for what it holds) holds order and membership through `ItemList`.
With no items, a line on the canvas points to that panel.

## Built from

- `EditorSection`
- `ItemList`
- `useRepeater`
- `InlineField`
- `InlineHeading`
- `ParagraphsField`
- `partIndexes`

## Rules that matter most

- A11Y-4: a native `<details>` meets it, and a scripted version uses `aria-expanded`, `aria-controls`, Escape, and a hidden answer out of the tab order.
- JS-5: every answer is in the HTML, and a control that needs a script appears only when the script runs.
- CANVAS-11: no open or close on the canvas.
- JSON-7: a repeater item's copy is `heading` and `body`, so the conformance test's sample content fills it.
- REP-3, REP-7: item copy is edited in place, and PHP drops empty and malformed entries.
- VIEW-4: with no items and no heading, the block renders nothing.

## Adapt per design

- The marker: a plus and minus, a chevron, or none, drawn as a CSS mask from an exported icon.
- One open at a time, or any number.
- The item's frame: a rule between items, a card, or a panel.
- The type sizes, as tokens.

## Do not change

- The question as real text in the HTML, and the answer readable without JavaScript.
- The control as a `<summary>` or a `<button>` inside a heading, never a `<div>` with a click handler.
- The item's copy names, `heading` and `body`.
- Every answer open on the canvas.

## Tests to write

- The baseline in [Section intro](section-intro.md).
- Render-harness test: each item renders its question and answer, malformed and empty items are dropped, and a hostile question and answer stay escaped and filtered.
- With no items, the items list doesn't render.
- Scripted version only: a script test with a fake DOM checks that the button is built, `aria-expanded` follows the answer, and Escape closes the open item.
- Editor half: the canvas shows every item's fields at once, and adding, moving, and removing an item write only that item.

## Example

`<kitPath>/examples/blocks/faq/` and `<kitPath>/examples/views/blocks/faq.blade.php`: the native
`<details>` version, with an optional heading, introduction, and button around
the list. White Summers has no reference. Log what the next build changes
through the harvest checklist (`_docs/kit-harvest.md`).

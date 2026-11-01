# Staggered panel list

## When it applies

A vertical list of heading and body panels, each with a colored rule beside it, stepping inward down the page. Seen on one site only.

## Built from

- `ItemList` in the **Items** panel
- `AutoGrowingTextarea`, `RichText`
- `PaddingControls`, `EntranceControl`

## Rules that matter most

- VIEW-5: an element with `@entrancePart` never carries a second `style` attribute.
- ENT-1, ENT-3: one running index, and the directive on the `<li>`.
- ENT-4: a list that stacks down the page defaults to the `item` trigger.
- REP-3, REP-7: copy is edited in place, and PHP drops empty items.
- JSON-8, VIEW-6: the rule color is a stored meaning that maps to a token.
- A11Y-5: the rule is decorative and `aria-hidden`.

## Adapt per design

- The step sizes.
- The rule colors and width.
- The heading level: an `<h3>` under a section heading.

## Do not change

- The step driven by data, through a custom property.
- The `item` trigger.
- Items as an array attribute.

## Example

None. `docs/examples/number-grid.md` is the closest text-only repeater.

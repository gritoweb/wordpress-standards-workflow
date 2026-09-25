# Staggered panel list

Seen once: White Summers built this, and no other site has. Treat the page as a
starting point, and expect the second site to change it.

## When it applies

A vertical list of heading and body panels, each with a colored rule beside it,
stepping inward down the page.

## Blade skeleton

An ordered list whose items carry their step as a custom property and their rule
as a decorative span. The entrance direction is `right` with the `item` trigger:

```blade
<ul class="highlights__list m-0 flex list-none flex-col gap-16 p-0">
  @foreach ($items as $index => $item)
    <li class="highlights__item flex gap-8" @entrancePart($parts[$index]) style="--i: {{ $item['step'] }}">
      <span class="highlights__rule {{ $item['ruleClass'] }} w-5 shrink-0 self-stretch" aria-hidden="true"></span>
      <div class="highlights__content flex min-w-0 flex-col gap-8">
        @if ($item['heading'] !== '')<h2 class="highlights__heading heading-2">{{ $item['heading'] }}</h2>@endif
        @if ($item['body'] !== '')<div class="highlights__body text-lead">{!! $item['body'] !!}</div>@endif
      </div>
    </li>
  @endforeach
</ul>
```

- A panel's step comes from a saved position (left, middle, right) and falls back to its index for content saved before the position existed.
- Both `@entrancePart` and a `style` attribute on the same element go through the directive's second argument (VIEW-5), not a second `style`.
- The rule color is a token-based class chosen from the item's setting.

## Canvas skeleton

Every populated item in order, with the same step formulas, so the staircase is
visible while editing. The rule color is a per-item setting in the **Panels**
panel.

## Built from

- `EditorSection`
- `ItemList`
- `useRepeater`
- `InlineHeading`
- `ParagraphsField`
- `partIndexes`
- `entrancePartProps`

## Rules that matter most

- VIEW-5: an element with `@entrancePart` never carries a second `style` attribute.
- ENT-1, ENT-2, ENT-3: one running index, no gap for an empty panel, and the directive on the `<li>`.
- ENT-4: a list that stacks down the page defaults to the `item` trigger.
- REP-3, REP-7: item content is edited in place, and PHP drops empty items while the canvas keeps them editable.
- JSON-8, VIEW-6: the rule color is a stored meaning that maps to a token, never a class name or a hex value.
- JSON-9: never carry White Summers' `layoutVariant: "ethos"`.
- A11Y-5: the rule is decorative and `aria-hidden`.

## Adapt per design

- The step sizes (the inward offset per position).
- The rule colors and width.
- The entrance direction and distance.
- The heading level inside each panel: an `<h3>` if the list sits under a section heading.

## Do not change

- The custom-property step, driven by data.
- The `item` trigger.
- The decorative rule.
- Items as an array attribute (`items`) with `heading`, `body`, and a rule color.

## Tests to write

- The baseline in [Section intro](section-intro.md).
- The step for each saved position and the index fallback for content saved without one.
- An item with neither heading nor body is dropped, and the entrance indexes have no gap.
- An unknown rule color falls back to the default token.
- Editor half: the canvas uses the same step formulas as the view, and changing a rule color writes only that item.

## Example

Seen once, so the kit has no example. The reference is the White Summers block
`resources/blocks/highlights/` in the White Summers theme, read only.

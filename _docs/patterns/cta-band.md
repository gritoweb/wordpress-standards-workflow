# CTA band

## When it applies

An invitation with a heading on one side and body copy plus a button on the
other, on a ground. Use it for a closing call to action, not for a section
opener (that's the section intro).

## Blade skeleton

The row stacks below `xl`. The heading takes a fixed share, and the panel (body
then button) is one entrance part so it arrives together:

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="cta-split {{ $groundClass }} @paddingClasses(...) {{ \App\Blocks\BlockAttributes::dividerClass($sectionDivider) }}"
  @entrance($entrance)>
  <div class="cta-split__inner container">
    <div class="cta-split__row flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
      @if ($heading !== '')
        <h2 class="cta-split__heading heading-1 xl:w-[45%]" @entrancePart($parts['heading'])>{{ $heading }}</h2>
      @endif
      @if ($body !== '' || $hasCta)
        <div class="cta-split__panel flex flex-col items-start gap-8 xl:w-[48%]" @entrancePart($parts['panel'])>
          @if ($body !== '')<div class="cta-split__body text-lead">{!! $body !!}</div>@endif
          @if ($hasCta)<a class="btn {{ $ctaButtonClass }} {{ $ctaIconClass }}" href="{!! esc_url($ctaUrl) !!}">{{ $ctaText }}</a>@endif
        </div>
      @endif
    </div>
  </div>
</section>
```

Wrap the section in `@if ($hasContent)` as the section intro does. Compute
`$parts` with `BlockEntrance::partIndexes()` so the panel takes an index only
when it renders.

## Canvas skeleton

The same row inside `EditorSection`, with the heading as an `InlineHeading` at
the `statement` tier and the panel holding a `ParagraphsField` and a
`CtaPreview`. The row stacks below `lg` on the canvas because the canvas is
narrower than the front end.

## Built from

- `EditorSection`
- `InlineHeading`
- `ParagraphsField`
- `CtaPreview`
- `ActionEditor`
- `GroundSelect`
- `DividerControl`
- `EntranceControl`
- `partIndexes`
- `EDITOR_TYPE`

## Rules that matter most

- VIEW-1, VIEW-2: the standard root, and content inside `cta-split__inner container`.
- ENT-1, ENT-2, ENT-3: the panel is one part and carries the directive, not a size container inside it.
- CANVAS-3: the canvas draws the same parts in the same order as the view.
- CANVAS-4: the canvas heading uses a tier from `EDITOR_TYPE`, never larger than `statement`.
- CTA-1, CTA-4: the button family follows the ground.
- JSON-5: declare all four padding keys if the comp's padding differs from the global default.

## Adapt per design

- The column shares (the two `xl:w-[..%]` values) and the gap.
- The heading size (`heading-1` or `heading-2`).
- The default divider and ground.

## Do not change

- The stacking order below `xl`: heading first, then the panel.
- The panel as one entrance part.
- The button previewed with `CtaPreview` and edited on the canvas with `ActionEditor` under it (never a sidebar panel).
- The shared attribute names.

## Tests to write

- The baseline in [Section intro](section-intro.md), for the heading, body, and button.
- The panel takes no entrance index when both body and button are empty, and the heading keeps index 0.
- A heading with no body and no button still renders the row without an empty panel.
- Editor half: the canvas root carries `cta-split-editor` and the dashed outline, and the heading uses a tier class.

## Example

`<kitPath>/examples/blocks/cta-split/` and `<kitPath>/examples/views/blocks/cta-split.blade.php`.

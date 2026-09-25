# Section intro

## When it applies

A section opens with a heading, an optional body, and an optional button,
aligned and measured on a ground. It's the smallest block and the base every
other pattern extends: when no pattern fits, compose from these parts.

## Blade skeleton

```blade
@php
  $hasCta = $ctaText !== '' && $ctaUrl !== '';
  $parts = \App\Blocks\BlockEntrance::partIndexes([
    'heading' => $heading !== '',
    'body' => $body !== '',
    'cta' => $hasCta,
  ]);
  $hasContent = count(array_filter($parts, fn ($part) => $part !== null)) > 0;
@endphp

@if ($hasContent)
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="section-intro {{ $groundClass }} @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) {{ \App\Blocks\BlockAttributes::dividerClass($sectionDivider) }}"
  @entrance($entrance)>
  <div class="section-intro__inner container">
    <div class="section-intro__stack {{ $stackAlign }} flex flex-col gap-8">
      @if ($heading !== '')
        <h2 class="section-intro__heading heading-2 {{ $headingMeasure }}" @entrancePart($parts['heading'])>{{ $heading }}</h2>
      @endif
      @if ($body !== '')
        <div class="section-intro__body {{ $bodyTypeClass }} {{ $bodyMeasure }}" @entrancePart($parts['body'])>{!! $body !!}</div>
      @endif
      @if ($hasCta)
        <a class="section-intro__cta btn {{ $ctaButtonClass }} {{ $ctaIconClass }}" href="{!! esc_url($ctaUrl) !!}"
          @if ($ctaNew) target="_blank" @endif
          @entrancePart($parts['cta'])>{{ $ctaText }}@include('partials.new-tab-hint', ['new' => $ctaNew])</a>
      @endif
    </div>
  </div>
</section>
@endif
```

`block.php` follows PHP-1 to PHP-8: sanitize `heading` with
`sanitize_text_field()`, `body` with `BlockAttributes::newTabHints(wp_kses_post())`, resolve the alignment,
measure, and body scale with `BlockAttributes::enum()`, and pass
`...BlockAttributes::cta($attributes)`.

## Canvas skeleton

```jsx
<EditorSection slug="section-intro" ground={ground} sectionDivider={sectionDivider} entrance={entrance}>
  {showHeading && (
    <InlineHeading {...entrancePartProps(entrance, part.heading)} tier="section" headingClass="heading-2"
      label={__('Heading', '__TEXT_DOMAIN__')} value={heading} placeholder={__('Write a heading', '__TEXT_DOMAIN__')}
      onChange={(value) => setAttributes({ heading: value })} />
  )}
  {(body || isSelected) && (
    <ParagraphsField aria-label={__('Body', '__TEXT_DOMAIN__')} value={body || ''}
      placeholder={__('Write the introduction', '__TEXT_DOMAIN__')} onChange={(value) => setAttributes({ body: value })} />
  )}
  <CtaPreview {...entrancePartProps(entrance, part.cta)} text={ctaText} link={ctaLink} icon={ctaIcon}
    iconPosition={ctaIconPosition} ground={ground} isSelected={isSelected} />
</EditorSection>
```

The inspector holds a **Layout** panel (alignment, text width, body scale), a
**Section** panel (`GroundSelect`, `DividerControl`), and `EntranceControl` last.
The button is edited on the canvas: `ActionEditor` under the `CtaPreview`.

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
- `entrancePartProps`
- `resolveEntrance`
- `BlockAttributes`
- `BlockEntrance`
- `BlockPadding`

## Rules that matter most

- VIEW-1: one `<section>` root with the anchor, slug class, ground, padding, divider, and entrance in that order.
- VIEW-3: the heading is an `<h2>`, and its size comes from a type class.
- VIEW-4: every optional part renders only when it has content, and an empty block renders nothing.
- CTA-1, CTA-2, CTA-3: the button needs a label and a URL, previews as a span on the canvas and is edited there with `ActionEditor` under it.
- CANVAS-6, CANVAS-7: optional fields show when they have a value or the block is selected, with neutral placeholders.
- ENT-1, ENT-2: one running part index in reading order, with no gap for a part that doesn't render.
- INSP-1, INSP-2, INSP-4: collapsed panels in the standard order, and no padding control.

## Adapt per design

- The text measures (the `max-w-*` values for the heading and the body).
- The body scale names and the type class each one maps to.
- The heading class (`heading-2` or `heading-1`) and its canvas tier.
- The default alignment, and the block's default padding when the comp differs from the global one (JSON-5).

## Do not change

- The root shape in VIEW-1 and the `__inner container` wrapper.
- The `<h2>` level, and the part order: heading, body, button.
- The attribute names in JSON-7 (`heading`, `body`, `ctaText`, `ctaLink`, `ctaIcon`, `ctaIconPosition`, `ground`, `sectionDivider`).
- The button editor location. It never moves onto the canvas.
- No padding, color, or size control (INSP-4).

## Tests to write

- Default attributes render the root with the block's own padding default.
- An empty block renders nothing.
- Each optional part present and absent, with the entrance part indexes staying gap-free.
- An unknown value for the alignment, measure, and body scale falls back to the default.
- A dark ground adds `on-dark` and switches the button family.
- A hostile heading and URL stay escaped, and a button needs both label and URL.
- Editor half: mounting and selecting write nothing, the heading shows on an empty block, and `CtaPreview` reads "Add button", "Complete button", and the label.

## Example

`<kitPath>/examples/blocks/section-intro/` and `<kitPath>/examples/views/blocks/section-intro.blade.php`.

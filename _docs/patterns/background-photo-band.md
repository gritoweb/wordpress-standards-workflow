# Background-photo band

## When it applies

Copy and a button over a full-bleed photo, as a short band or as a tall panel
with the copy at the bottom. The photo is the block's background, not a column.

## Blade skeleton

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="cta-banner {{ $groundClass }} relative isolate flex flex-col {{ $heightClass }} @unless ($hasImage) {{ $fallbackGround }} @endunless {{ \App\Blocks\BlockAttributes::dividerClass($sectionDivider) }}"
  @entrance($entrance)>
  @if ($hasImage)
    {!! wp_get_attachment_image($bgImageId, 'full', false, ['class' => 'absolute inset-0 -z-10 h-full w-full object-cover', 'alt' => '', 'loading' => 'lazy', 'decoding' => 'async', 'style' => 'object-position: '.$bgObjectPosition]) !!}
  @endif
  @if ($scrim)<div class="cta-banner__scrim pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2"></div>@endif
  <div class="cta-banner__inner container">
    <div class="{{ $toneClass }} flex flex-col gap-6">heading, subtitle, button</div>
  </div>
</section>
```

`block.php` reads the photo as `bgImageId` with a legacy `bgImageUrl`, and
resolves the focal point with `BlockImagePosition::cssValue()`. The scrim is
markup, not an attribute.

## Canvas skeleton

The photo paints in an `absolute inset-0 -z-10` layer with the same
`object-position` — a passive preview with no click target. It is picked,
replaced and removed in the sidebar's **Background Media** panel
(`AttachmentImageControl noStylesheet` + `ImagePositionControl`), so the whole
block stays selectable and the copy stays editable. The button is edited on the
canvas: `ActionEditor` under the `CtaPreview` while the block is selected. Every text field takes its color from `fieldToneClass(true)` because
the browser's form styles override inherited color.

```jsx
<EditorSection slug="cta-banner" ground={hasPhoto ? '' : ground} sectionDivider={sectionDivider} entrance={entrance}>
  <div className="absolute inset-0 -z-10">photo layer (passive)</div>
  <InlineHeading onDark tier="statement" ... />
  <InlineField onDark label={__('Subtitle', '__TEXT_DOMAIN__')} ... />
  <CtaPreview tone={textTone} ground={ground} isSelected={isSelected} ... />
  {isSelected && <ActionEditor ... />}
</EditorSection>

// InspectorControls › PanelBody "Background Media":
<AttachmentImageControl label={__('Background image (1920×1080)', '__TEXT_DOMAIN__')} noStylesheet onRemove={clearImage} ... />
<ImagePositionControl ... />
```

## Built from

- `EditorSection`
- `AttachmentImageControl`
- `ImagePositionControl`
- `InlineHeading`
- `InlineField`
- `CtaPreview`
- `ActionEditor`
- `ctaButtonClass`
- `focalCss`
- `BlockImagePosition`

## Rules that matter most

- MEDIA-4: the canvas paints the photo behind the copy and puts the control in the corner panel.
- MEDIA-1, MEDIA-2: a new selection writes `{ bgImageId, bgImageUrl: '' }`, and the editor never writes the legacy URL.
- MEDIA-5: an optional single image passes `onRemove`.
- MEDIA-9: a background photo gets `alt=""`.
- MEDIA-7, MEDIA-8, MEDIA-10: `full` size, lazy and async loading, and a crop of `object-cover` plus the focal point.
- GROUND-4: the one place a view may set a flat background is a token-based fallback when the photo is missing.
- Over a photo the text tone owns the tone, so `block.php` passes an empty `groundClass` and the canvas an empty ground. The ground, with its `on-dark` styles, applies only when there is no photo.
- CANVAS-12: every field names its own color and placeholder color on the photo.
- CTA-4: the text-tone override lets the button follow a pale photo.

## Adapt per design

- The heights (band or tall panel) and where the copy sits.
- The text tone, `light` or `dark`, for a pale or dark photo.
- The scrim gradient.
- The recommended upload size in the control's label.

## Do not change

- The `alt=""` on a background photo.
- The photo as an attachment ID, never a URL.
- The image control in the sidebar's Background Media panel, never on the canvas.
- The block rendering a flat token background, not a placeholder image, when no photo is set (MEDIA-13).

## Tests to write

- The baseline in [Section intro](section-intro.md).
- An image by ID and by legacy URL renders the same frame, and no image renders the fallback ground and no `<img>`.
- The background image has an empty `alt` and an explicit size.
- The focal point reaches the inline `object-position` on the front end and the canvas.
- Editor half: selecting media writes a number ID and an empty URL, and `onRemove` clears both.
- Editor half: the text fields carry a tone class on the photo.

## Example

`<kitPath>/examples/blocks/cta-banner/` and `<kitPath>/examples/views/blocks/cta-banner.blade.php`.

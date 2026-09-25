# Logo row

## When it applies

Client or partner marks in centered rows, with an optional heading and a
read-more link. Use it when the marks are the content. If a logo panel sits
beside copy, use the media and text split with its logo media type.

## Blade skeleton

```blade
<section ... class="logo-wall {{ $groundClass }} @paddingClasses(...) {{ \App\Blocks\BlockAttributes::dividerClass($sectionDivider) }}" @entrance($entrance)>
  <div class="logo-wall__inner container">
    @if ($heading !== '')<h2 class="logo-wall__heading heading-3" @entrancePart($parts['heading'])>{{ $heading }}</h2>@endif
    <div class="logo-wall__brand-rows">
      @foreach ($brandRows as $row)
        <ul class="logo-wall__brand-row" style="--brand-gap: {{ $row['gap'] }}px">
          @include('blocks.partials.logo-row', ['logos' => $row['logos'], 'itemClass' => 'logo-wall__brand-logo'])
        </ul>
      @endforeach
    </div>
    @if ($ctaUrl !== '')<a class="btn-link {{ $linkToneClass }}" href="{!! esc_url($ctaUrl) !!}">{{ $ctaText }}</a>@endif
  </div>
</section>
```

- `block.php` builds `$brandRows` with `BlockLogos`: it renders a duplicate attachment once, drops an entry with no image, and sizes each mark with `BlockLogos::size()` (a 90 px height cap for one or two logos, 70 px otherwise).
- A logo flagged single-color is tinted from the ground's light or dark setting, through `BlockLogos::tintClass()`.
- A logo's alt comes from `BlockLogos::alt()`: the client name, then the attachment alt, then the link's host.
- The entrance part indexes come from what actually renders (PHP-10).

## Canvas skeleton

The same rows. Each cell is an `AttachmentImageControl` with
`objectFit="contain"` on a transparent background. The list and each logo's
name, link, single-color flag, and arrangement live in the **Logos** panel
(`ItemList`). An empty list shows one line pointing to that panel: "Add logos in
the Logos panel." The canvas tints single-color marks with `logoTintClass()`.

## Built from

- `EditorSection`
- `AttachmentImageControl`
- `ItemList`
- `useRepeater`
- `LinkPicker`
- `useAttachmentUrls`
- `BlockLogos`
- `logo-row`
- `logoTintClass`
- `InlineHeading`

## Rules that matter most

- MEDIA-12: `object-fit: contain`, the shared size caps, one render per attachment, and no image means no entry.
- MEDIA-9: alt text from `BlockLogos::alt()`, never a block field, and a logo that's a link always has a name (A11Y-5).
- PHP-10: entrance indexes computed from the rows that render.
- GROUND-3: whether the ground is light decides the tint, the link tone, and the rule color.
- CANVAS-8: an empty repeater shows one line that points to its panel.
- REP-2, REP-3, REP-7: the panel holds order and per-logo settings, the canvas holds the marks, and PHP drops malformed entries.
- CTA-5, CTA-6, A11Y-6: the read-more link is a text link, opens a new tab only when flagged, and says so to screen readers.
- JSON-5: this block usually needs its own padding defaults, so it declares all four keys.

## Adapt per design

- The row size and the height caps.
- The gap between marks.
- The ground and the padding defaults.
- Whether a heading or a read-more link exists.

## Do not change

- The array attribute name `logos`, with `name`, `imageId`, and `link` on each entry, plus the single-color flag and the row arrangement.
- The tint rule tied to the ground's light setting, not to a hard-coded color.
- `alt` derived from the record, not typed per block.
- The `logo-row` partial as the one place a mark is drawn.

## Tests to write

- The baseline in [Section intro](section-intro.md).
- A duplicate attachment renders once, and an entry with no image is dropped.
- One or two logos get the 90 px cap, and more get 70 px.
- A single-color mark gets the dark tint on a light ground and the light tint on a dark one.
- Alt text: the client name first, then the attachment alt, then the host.
- Editor half: an empty list shows the pointer line, and the canvas counts rows the same way PHP does.

## Example

`<kitPath>/examples/blocks/logo-wall/` and `<kitPath>/examples/views/blocks/logo-wall.blade.php`.

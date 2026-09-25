# Media and text split

## When it applies

Copy on one side, with optional stacked entries and a button, and a photo or a
logo panel on the other. The media side can flip, and the media can bleed to the
viewport edge.

## Blade skeleton

```blade
<div class="text-media__row {{ $mediaFirst ? 'xl:flex-row-reverse' : '' }} flex flex-col xl:flex-row xl:items-center">
  <div class="text-media__col {{ $contentWidth }} min-w-0 xl:shrink-0">
    heading, eyebrow, body, entries, button
  </div>
  <div class="text-media__media {{ $mediaBleed ? $bleedPull : '' }} min-w-0 xl:flex-1">
    <figure class="{{ $mediaAspect }} {{ $mediaRounded }} !m-0 overflow-hidden" @entrancePart($parts['media'])>
      {!! wp_get_attachment_image($mediaImageId, 'large', false, ['class' => 'h-full w-full object-cover', 'style' => 'object-position: '.$mediaPosition]) !!}
    </figure>
  </div>
</div>
```

- Compute the entrance indexes from what renders, in reading order: copy first, entries one after another, then the media.
- A media bleed uses the shared `bleed-x`, `xl:bleed-start`, `xl:bleed-end`, and `bleed-media` helpers, not a fixed pixel offset (VIEW-2).
- A logo panel renders the logo row partial on the ground's color instead of a figure.
- An entry with a link ends with `@include('partials.new-tab-hint')` when it opens a new tab.

## Canvas skeleton

The same row with `lg:` breakpoints and the copy column first. The media column
is capped at `28rem` and filled by `AttachmentImageControl`, or by a logo grid
on the ground's color. Entries are edited in place with `InlineHeading`,
`ParagraphsField`, and each entry's link with `<ActionEditor stacked>` under the
entry while the block is selected. Logo images and names are edited on the canvas
too. The inspector's **Items** panel holds the list through `ItemList` and
`useRepeater`; no text or link field is in the sidebar (INSP-7).

## Built from

- `EditorSection`
- `AttachmentImageControl`
- `ImagePositionControl`
- `ItemList`
- `useRepeater`
- `ActionEditor` (`stacked`)
- `InlineHeading`
- `InlineField`
- `ParagraphsField`
- `ActionEditor`
- `BlockLogos`
- `logo-row`
- `logoTintClass`
- `useAttachmentUrls`

## Rules that matter most

- JSON-7: the layout attributes are `mediaPosition`, `mediaType`, `mediaRatio`, and `mediaBleed`, never a page-named variant (JSON-9).
- VIEW-2, VIEW-7: the bleed helpers, and `!m-0` on the figure.
- CANVAS-14: the media column is capped so the copy leads.
- CANVAS-10: `data-media-position`, `data-media-type`, and `data-media-bleed` on the canvas root for tests.
- INSP-9: a control that doesn't apply, such as the logo panel's ground, is hidden and its value kept.
- REP-2, REP-3, REP-4, REP-5, REP-6: the entries repeater.
- REP-8: an entry's link is a `span role="button"` that opens an inline editor.
- MEDIA-12: logos use `object-fit: contain` and `BlockLogos::size()`.

## Adapt per design

- The column shares, and the width names an editor picks between.
- The aspect ratios and the media corner radius.
- Whether the media can bleed, and the bleed helper values.
- The scale names for the heading and body.

## Do not change

- The reversal driven by `mediaPosition`, not by a second block.
- The entries as an array attribute of objects with `heading`, `body`, `linkText`, and `link`.
- Media edited on the canvas frame, entries in place, and list order in the inspector.
- Copy first in reading order, which sets the entrance order.

## Tests to write

- The baseline in [Section intro](section-intro.md).
- `mediaPosition` flips the row, and the entrance indexes stay in reading order.
- An image, a logo panel, and no media each render the right column, and the media column disappears when empty.
- Malformed entries (a `null`, a string) are dropped and the rest render.
- A duplicate logo renders once, and a logo with no image is dropped.
- Editor half: moving an entry keeps it active, removing the active entry selects the nearest survivor, and the data attributes reflect the saved choices.

## Example

`<kitPath>/examples/blocks/text-media/` and `<kitPath>/examples/views/blocks/text-media.blade.php`.

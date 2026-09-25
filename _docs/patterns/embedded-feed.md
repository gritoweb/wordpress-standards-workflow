# Embedded feed

Seen once: White Summers built this, and no other site has. Treat the page as a
starting point, and expect the second site to change it.

## When it applies

An intro (heading, body, button) above a third-party feed, such as a social or
news widget. The feed provider renders the feed. The block only frames it.

## Blade skeleton

The intro parts, then the feed's markup as one part. The whole section renders
nothing when both are empty:

```blade
@if ($hasIntro || $feed !== '')
  <section @if ($anchor) id="{{ $anchor }}" @endif class="news-feed {{ $groundClass }} @paddingClasses(...)" @entrance($entrance)>
    <div class="news-feed__inner container">
      @if ($hasIntro)
        <div class="news-feed__intro mx-auto flex flex-col items-center gap-8 text-center">
          heading, body, button, each an entrance part
        </div>
      @endif
      @if ($feed !== '')
        <div class="news-feed__feed" @entrancePart($parts['feed'])>{!! $feed !!}</div>
      @endif
    </div>
  </section>
@endif
```

`block.php` calls a helper that returns the provider's markup, and enqueues the
provider's script only when a feed renders (PHP-11).

## Canvas skeleton

The intro fields, and an `InfoPanel` that names the feed ("Social feed loads
here"). The canvas never loads the provider's script or draws its posts
(CANVAS-11).

## Built from

- `EditorSection`
- `InfoPanel`
- `InlineHeading`
- `ParagraphsField`
- `CtaPreview`
- `ActionEditor`
- `GroundSelect`
- `BlockAttributes`

## Rules that matter most

- VIEW-4: an empty block renders nothing, and this is the one White Summers block that already did.
- CANVAS-11: an embedded feed becomes an `InfoPanel` on the canvas.
- ESC-3: `{!! $feed !!}` prints only the provider's own markup.
- PHP-11: the provider's script is enqueued in `block.php`, only when a feed renders.
- GROUND-1, CTA-4: the tone is a `ground`, not a `background` attribute with hard-coded classes, and the button follows the ground.
- CTA-1, CTA-2: the intro button needs a label and a URL, and is edited on the canvas (`ActionEditor` under the `CtaPreview`, INSP-7).

## Adapt per design

- The feed provider and its configuration (which feed, which account).
- The intro alignment and measure.
- The default ground.

## Do not change

- The section rendering nothing when the intro and the feed are both empty.
- The feed printed as one entrance part.
- The provider's markup never reaching the canvas.
- The tone as a `ground`, so a new site's grounds work here without edits.

## Tests to write

- The baseline in [Section intro](section-intro.md).
- A block with no intro and no feed renders nothing, a block with only a feed renders the feed part, and a block with only an intro renders no feed wrapper.
- The provider's script is enqueued only when a feed renders.
- The feed markup passes through untouched, and the intro is escaped.
- Editor half: the canvas shows the `InfoPanel`, loads no provider script, and mounting writes nothing.

## Example

Seen once, so the kit has no example. The reference is the White Summers block
`resources/blocks/news-feed/` in the White Summers theme, read only.

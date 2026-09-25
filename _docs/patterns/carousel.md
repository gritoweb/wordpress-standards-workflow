# Carousel

## When it applies

Two or more slides of copy and media that the visitor steps through, with
optional autoplay. A single slide renders with no controls, so a hero with one
slide is still this pattern.

## Blade skeleton

Carousels run on **Swiper**, the kit's vendor library (`CLAUDE.md` › Block
assets). The media column is the Swiper root; each slide's copy sits in one
grid cell, and `block.js` marks the active one when Swiper changes slide. The
section carries the settings `block.js` reads:

```blade
<section class="hero {{ $groundClass }} ... [container-type:inline-size]"
  @if ($hasChrome) data-hero-slideshow data-hero-transition="{{ $transition }}" data-hero-loop="{{ $loop ? 'true' : 'false' }}"
    data-hero-autoplay="{{ $autoplay ? 'true' : 'false' }}" data-hero-delay="{{ $delay }}" data-hero-speed="{{ $speed }}" @endif
  @entrance($entrance, $copyStyle)>
  <div class="hero__copies">
    @foreach ($slides as $index => $slide)
      <div data-hero-copy class="hero__copy {{ $index === 0 ? 'is-active' : '' }}" @if ($index) aria-hidden="true" @endif>
        <h2 class="hero__heading heading-1">{{ $slide['heading'] }}</h2>
      </div>
    @endforeach
  </div>
  <div class="hero__slides {{ $hasChrome ? 'swiper' : '' }}">
    @if ($hasChrome)<div class="swiper-wrapper">@endif
    @foreach ($slides as $index => $slide)
      <figure class="hero__slide {{ $hasChrome ? 'swiper-slide' : '' }} !m-0">
        {!! wp_get_attachment_image($slide['imageId'], 'full', false, ['loading' => $index === 0 ? 'eager' : 'lazy', 'decoding' => 'async', 'alt' => $slide['alt']]) !!}
      </figure>
    @endforeach
    @if ($hasChrome)</div>@endif
  </div>
  @if ($hasChrome)
    <div class="hero__chrome">counter (data-hero-current), status live region (data-hero-status), data-hero-prev, data-hero-next, and data-hero-play-pause when autoplay is on</div>
  @endif
</section>
```

- One slide renders no Swiper markup and no chrome: it is a static hero.
- Every slide is in the HTML, so the page works without JavaScript.
- Only the first slide's image is `eager` (MEDIA-8), and it may take `fetchpriority="high"` when it opens the page.
- A different mobile crop is a second attachment served through `<picture><source media>` (MEDIA-11).
- `block.php` enqueues the `swiper` script and style (registered in `app/setup.php`) **only when there is more than one slide**; `block.json` declares `viewScript: file:./block.js`.
- `block.js` is plain JavaScript that waits for `DOMContentLoaded` and reads `window.Swiper`: effect `fade` or `slide`, speed 0 for `none` and under `prefers-reduced-motion` (which also turns autoplay off), `a11y` on, and on `slideChange` it swaps the active copy, the counter and the status text.

## Canvas skeleton

Only the active slide draws, chosen in the **Slides** panel. Fields edit that
slide, and the media frame replaces its image. No slider runs, and no control
navigates (CANVAS-11).

```jsx
const repeater = useRepeater({ items: slides, setItems: (next) => setAttributes({ slides: next }), blank: blankSlide });
const slide = repeater.activeItem;
```

The **Slides** panel is an `ItemList` over `repeater`, with each row labelled
from the slide's own heading. Pure slide edits (reading and rewriting the
array) live in a sibling module the tests import directly (FILE-5).

## Built from

- `EditorSection`
- `useRepeater`
- `ItemList`
- `AttachmentImageControl`
- `ImagePositionControl`
- `InlineHeading`
- `InlineField`
- Swiper (vendor) + the block's own `block.js`
- `editor-slides.js`
- `clamp`

## Rules that matter most

- A11Y-2: previous and next buttons with labels, a counter, a polite live region that names the slide, `aria-hidden` on inactive slides, and a pause button whenever it autoplays.
- JS-2, JS-3: `block.js` finds its markup through `data-hero-*` attributes, never a block's class names, and does nothing when `window.Swiper` is missing.
- JS-5, JS-6: the page works without JavaScript, and reduced motion drops the transition and the autoplay.
- MEDIA-8: only the first slide is eager.
- CANVAS-11: the canvas shows one static slide.
- REP-2, REP-4, REP-5: the slides repeater and its active row.
- INSP-9, INSP-10: **Delay** shows only with autoplay, and a ranged number clamps with the limits PHP uses.
- JSON-10: the shared script is named by handle.

## Adapt per design

- What a slide holds (heading, eyebrow, caption, image, link).
- The frame height and aspect ratio.
- The transition CSS in `block.css`.
- The recommended upload size for a slide (1200×800 for a content slide, 1920×1080 for a full-width one).

A card carousel wires the same data attributes to its own markup.

## Do not change

- The `data-hero-*` attribute contract and the `swiper` handle.
- The behavior for one slide: no counter, no buttons, no status region.
- Slide order equals the array order, and the first slide is the active one at load.
- The attribute names `slides`, `loop`, `autoplay`, `autoplayDelay`, `transitionDuration`, and `transition` (JSON-7).

## Tests to write

- The baseline in [Section intro](section-intro.md), plus a hostile slide heading.
- One slide renders no chrome, and two or more render the chrome with `hidden` controls.
- The first slide's image is `eager` and the rest are `lazy`, and inactive slides carry `aria-hidden`.
- A malformed slide entry is dropped, and the autoplay delay clamps to the same range as the editor.
- A `block.js` test with a faked Swiper (`<kitPath>/examples/blocks/hero/block-js.test.mjs`): the config it passes, the copy, counter and status on slide change, and play/pause.
- Editor half: adding, moving, and removing a slide keeps the active row on the right item, and mounting writes nothing.

## Example

`<kitPath>/examples/blocks/hero/` and `<kitPath>/examples/views/blocks/hero.blade.php`.

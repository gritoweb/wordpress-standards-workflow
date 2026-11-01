# Carousel

## When it applies

Two or more slides the visitor steps through, with optional autoplay. A single slide renders with no controls, so a hero with one slide is still this pattern.

## Built from

- Splide, copied from `create-block` templates to `resources/vendor/splide/`
- `ItemList` in the **Slides** panel
- `AttachmentImageControl`, `AutoGrowingTextarea`, `RichText`
- `PaddingControls`, `EntranceControl`

## Rules that matter most

- JS-8, PHP-11: Splide is registered in `app/blocks.php`, enqueued in `block.php`, and read as `window.Splide` in `block.js`.
- CANVAS-11: the canvas shows the same slides per view and bullets as the page, never a scrollbar, and never autoplays. The track moves with the bullets and the sidebar list, and editing a visible slide never moves it.
- A11Y-2: labeled controls, `aria-hidden` on inactive slides, and autoplay that pauses on hover and stops for reduced motion.
- JS-5, JS-6: every slide is in the HTML, and reduced motion drops the transition.
- MEDIA-8: only the first slide is eager.
- REP-2, REP-4, REP-5: the slides repeater and its active row.
- INSP-9, INSP-10: the delay shows only with autoplay, and clamps with the limits PHP uses.
- VIEW-1: the Splide id is on an inner element. The section keeps the anchor.

## Adapt per design

- What a slide holds.
- The frame height and aspect ratio.
- Slides per view and Splide options.
- Bullet and arrow styles, in `block.css`.

## Do not change

- Slide order equals array order.
- The behavior for one slide: no controls.
- The attribute names `autoplay` and `autoplaySeconds`.

## Example

`docs/examples/testimonial-carousel.md` and `docs/examples/gallery.md`.

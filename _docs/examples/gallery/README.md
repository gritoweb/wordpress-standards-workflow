# Reference block: Gallery (vendor library) — `gallery`

Images in a Splide carousel, each with an optional caption. The second carousel on the same **vendor library** as `testimonial-carousel.md` (same `splide` handle registered in `app/blocks.php`, enqueued only here, `perMove: 1` so the bullets match the canvas), with image slides picked on the canvas. Read `../testimonial-carousel/README.md` for the library setup.

## Files

- `resources/blocks/gallery/block.css`
- `resources/blocks/gallery/block.js`
- `resources/blocks/gallery/block.json`
- `resources/blocks/gallery/block.jsx`
- `resources/blocks/gallery/block.php`
- `resources/blocks/gallery/preview.svg`
- `resources/views/blocks/gallery.blade.php`

## Use it

From the theme root, copy the files and fill the placeholders (the same values `create-block` uses), then add the slug to `BlockManager`'s list:

```bash
cp -r _docs/examples/gallery/resources .
sed -i 's#<namespace>#NAMESPACE#g; s#<text-domain>#TEXT_DOMAIN#g; s#<category>#CATEGORY#g' resources/blocks/gallery/* resources/views/blocks/gallery.blade.php
```

Then change only what the site asks for (copy, fields, layout), keeping the patterns.

The rules every block follows are in `../README.md`; read it before this block.

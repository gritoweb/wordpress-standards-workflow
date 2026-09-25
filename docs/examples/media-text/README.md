# Reference block: Media and text — `media-text`

Text on one side and an image on the other. Demonstrates a **side switch** (the image's side is a sidebar setting; both the canvas and the page reorder with `md:order-*`, so the markup order never changes), and the secondary button role (`btn btn-secondary`).

## Files

- `resources/blocks/media-text/block.json`
- `resources/blocks/media-text/block.jsx`
- `resources/blocks/media-text/block.php`
- `resources/blocks/media-text/preview.svg`
- `resources/views/blocks/media-text.blade.php`

## Use it

From the theme root, copy the files and fill the placeholders (the same values `create-block` uses), then add the slug to `BlockManager`'s list:

```bash
cp -r docs/examples/media-text/resources .
sed -i 's#<namespace>#NAMESPACE#g; s#<text-domain>#TEXT_DOMAIN#g; s#<category>#CATEGORY#g' resources/blocks/media-text/* resources/views/blocks/media-text.blade.php
```

Then change only what the site asks for (copy, fields, layout), keeping the patterns.

The rules every block follows are in `../README.md`; read it before this block.

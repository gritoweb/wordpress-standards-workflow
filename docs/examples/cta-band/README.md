# Reference block: CTA band (background image) — `cta-band`

A closing call to action on a dark band, with an optional photo behind it. Demonstrates **background media**: picked, replaced and removed in the sidebar's `Background Media` panel (`AttachmentImageControl noStylesheet` + `ImagePositionControl`), shown on the canvas as a passive layer with no click target, and printed on the page with `BlockImagePosition::objectClass()` for the focal point.

## Files

- `resources/blocks/cta-band/block.json`
- `resources/blocks/cta-band/block.jsx`
- `resources/blocks/cta-band/block.php`
- `resources/blocks/cta-band/preview.svg`
- `resources/views/blocks/cta-band.blade.php`

## Use it

From the theme root, copy the files and fill the placeholders (the same values `create-block` uses), then add the slug to `BlockManager`'s list:

```bash
cp -r docs/examples/cta-band/resources .
sed -i 's#<namespace>#NAMESPACE#g; s#<text-domain>#TEXT_DOMAIN#g; s#<category>#CATEGORY#g' resources/blocks/cta-band/* resources/views/blocks/cta-band.blade.php
```

Then change only what the site asks for (copy, fields, layout), keeping the patterns.

The rules every block follows are in `../README.md`; read it before this block.

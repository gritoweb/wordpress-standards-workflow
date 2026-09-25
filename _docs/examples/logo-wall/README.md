# Reference block: Logo wall — `logo-wall`

A row of client or partner logos. Demonstrates an **image-only repeater**: each logo is picked on the canvas (`AttachmentImageControl` with `objectFit="contain"`), reordered in the sidebar `ItemList` with thumbnails, and its alt text comes from the Media Library, so the block adds no text field.

## Files

- `resources/blocks/logo-wall/block.json`
- `resources/blocks/logo-wall/block.jsx`
- `resources/blocks/logo-wall/block.php`
- `resources/blocks/logo-wall/preview.svg`
- `resources/views/blocks/logo-wall.blade.php`

## Use it

From the theme root, copy the files and fill the placeholders (the same values `create-block` uses), then add the slug to `BlockManager`'s list:

```bash
cp -r _docs/examples/logo-wall/resources .
sed -i 's#<namespace>#NAMESPACE#g; s#<text-domain>#TEXT_DOMAIN#g; s#<category>#CATEGORY#g' resources/blocks/logo-wall/* resources/views/blocks/logo-wall.blade.php
```

Then change only what the site asks for (copy, fields, layout), keeping the patterns.

The rules every block follows are in `../README.md`; read it before this block.

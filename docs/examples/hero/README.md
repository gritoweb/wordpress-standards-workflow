# Reference block: Hero — `hero`

The page opener: an `h1`, supporting text, one button and an image. Demonstrates the **section button components** (`ButtonPair` on the canvas opens `ActionEditor` on click, never on select; `<x-button-link>` prints the button only when it has text and a link), the image picked on the canvas with `AttachmentImageControl`, and the hero entrance preset.

## Files

- `resources/blocks/hero/block.json`
- `resources/blocks/hero/block.jsx`
- `resources/blocks/hero/block.php`
- `resources/blocks/hero/preview.svg`
- `resources/views/blocks/hero.blade.php`

## Use it

From the theme root, copy the files and fill the placeholders (the same values `create-block` uses), then add the slug to `BlockManager`'s list:

```bash
cp -r docs/examples/hero/resources .
sed -i 's#<namespace>#NAMESPACE#g; s#<text-domain>#TEXT_DOMAIN#g; s#<category>#CATEGORY#g' resources/blocks/hero/* resources/views/blocks/hero.blade.php
```

Then change only what the site asks for (copy, fields, layout), keeping the patterns.

The rules every block follows are in `../README.md`; read it before this block.

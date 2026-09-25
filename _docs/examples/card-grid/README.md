# Reference block: Card grid — `card-grid`

An array of cards with image, title, text and an optional link. Demonstrates the **all-visible** repeater (`selectable={false}`), per-card images on the canvas, a per-card link edited inline with `ActionEditor stacked`, a single `setAttributes` per change, and the `trigger: "item"` entrance preset.

## Files

- `resources/blocks/card-grid/block.json`
- `resources/blocks/card-grid/block.jsx`
- `resources/blocks/card-grid/block.php`
- `resources/blocks/card-grid/preview.svg`
- `resources/views/blocks/card-grid.blade.php`

## Use it

From the theme root, copy the files and fill the placeholders (the same values `create-block` uses), then add the slug to `BlockManager`'s list:

```bash
cp -r _docs/examples/card-grid/resources .
sed -i 's#<namespace>#NAMESPACE#g; s#<text-domain>#TEXT_DOMAIN#g; s#<category>#CATEGORY#g' resources/blocks/card-grid/* resources/views/blocks/card-grid.blade.php
```

Then change only what the site asks for (copy, fields, layout), keeping the patterns.

The rules every block follows are in `../README.md`; read it before this block.

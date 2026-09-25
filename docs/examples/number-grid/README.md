# Reference block: Number grid — `number-grid`

Key numbers, each with a short label. Demonstrates a **text-only repeater**: `ItemList` in the sidebar (`selectable={false}`, all items visible), both fields edited on the canvas, empty items skipped in `block.php`, and a `<dl>` on the page.

## Files

- `resources/blocks/number-grid/block.json`
- `resources/blocks/number-grid/block.jsx`
- `resources/blocks/number-grid/block.php`
- `resources/blocks/number-grid/preview.svg`
- `resources/views/blocks/number-grid.blade.php`

## Use it

From the theme root, copy the files and fill the placeholders (the same values `create-block` uses), then add the slug to `BlockManager`'s list:

```bash
cp -r docs/examples/number-grid/resources .
sed -i 's#<namespace>#NAMESPACE#g; s#<text-domain>#TEXT_DOMAIN#g; s#<category>#CATEGORY#g' resources/blocks/number-grid/* resources/views/blocks/number-grid.blade.php
```

Then change only what the site asks for (copy, fields, layout), keeping the patterns.

The rules every block follows are in `../README.md`; read it before this block.

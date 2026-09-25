# Reference block: Accordion (one open at a time) — `accordion`

An array of question/answer items. Demonstrates the **one-open-at-a-time** repeater: `ItemList` in the sidebar shares `activeItem` with the canvas, and the front end uses native `<details name>` so opening one item closes the others — no JavaScript.

## Files

- `resources/blocks/accordion/block.json`
- `resources/blocks/accordion/block.jsx`
- `resources/blocks/accordion/block.php`
- `resources/blocks/accordion/preview.svg`
- `resources/views/blocks/accordion.blade.php`

## Use it

From the theme root, copy the files and fill the placeholders (the same values `create-block` uses), then add the slug to `BlockManager`'s list:

```bash
cp -r _docs/examples/accordion/resources .
sed -i 's#<namespace>#NAMESPACE#g; s#<text-domain>#TEXT_DOMAIN#g; s#<category>#CATEGORY#g' resources/blocks/accordion/* resources/views/blocks/accordion.blade.php
```

Then change only what the site asks for (copy, fields, layout), keeping the patterns.

The rules every block follows are in `../README.md`; read it before this block.

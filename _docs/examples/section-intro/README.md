# Reference block: Section intro — `section-intro`

A heading, intro text and a button that open a section. Demonstrates a **layout setting in the sidebar** (alignment, a `SelectControl` in a `Layout` panel) whose value `block.php` whitelists before the view uses it, and the same button pair as the hero.

## Files

- `resources/blocks/section-intro/block.json`
- `resources/blocks/section-intro/block.jsx`
- `resources/blocks/section-intro/block.php`
- `resources/blocks/section-intro/preview.svg`
- `resources/views/blocks/section-intro.blade.php`

## Use it

From the theme root, copy the files and fill the placeholders (the same values `create-block` uses), then add the slug to `BlockManager`'s list:

```bash
cp -r _docs/examples/section-intro/resources .
sed -i 's#<namespace>#NAMESPACE#g; s#<text-domain>#TEXT_DOMAIN#g; s#<category>#CATEGORY#g' resources/blocks/section-intro/* resources/views/blocks/section-intro.blade.php
```

Then change only what the site asks for (copy, fields, layout), keeping the patterns.

The rules every block follows are in `../README.md`; read it before this block.

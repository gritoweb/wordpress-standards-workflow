# Reference block: Testimonial carousel (vendor library) — `testimonial-carousel`

An array of quotes in a Splide carousel. Demonstrates the **vendor library** rule (self-hosted in `resources/vendor/splide/`, registered in `app/blocks.php`, enqueued only in this `block.php`), a plain `block.js`/`block.css` served from source through `block.json`, an editor canvas that looks like the front end (two slides and the same pagination bullets, no scrollbar; the sidebar list moves it to the selected slide, editing a visible slide never moves it), and autoplay set in the sidebar (off on hover and for reduced motion).

## Files

- `resources/blocks/testimonial-carousel/block.css`
- `resources/blocks/testimonial-carousel/block.js`
- `resources/blocks/testimonial-carousel/block.json`
- `resources/blocks/testimonial-carousel/block.jsx`
- `resources/blocks/testimonial-carousel/block.php`
- `resources/blocks/testimonial-carousel/preview.svg`
- `resources/views/blocks/testimonial-carousel.blade.php`

## Use it

From the theme root, copy the files and fill the placeholders (the same values `create-block` uses), then add the slug to `BlockManager`'s list:

```bash
cp -r _docs/examples/testimonial-carousel/resources .
sed -i 's#<namespace>#NAMESPACE#g; s#<text-domain>#TEXT_DOMAIN#g; s#<category>#CATEGORY#g' resources/blocks/testimonial-carousel/* resources/views/blocks/testimonial-carousel.blade.php
```

Then change only what the site asks for (copy, fields, layout), keeping the patterns.

## Vendor library: Splide (only when a block needs a carousel)

Copy `.claude/skills/create-block/templates/vendor/splide/` to `resources/vendor/splide/` (Splide 4.1.4, the pre-built `splide.min.js` and `splide-core.min.css`, self-hosted: no CDN), and append to `app/blocks.php`:

```php
// Splide self-hosted in resources/vendor/splide/ (no CDN); enqueued per-block in each block.php.
add_action('init', function () {
    wp_register_style('splide', get_theme_file_uri('resources/vendor/splide/css/splide-core.min.css'), [], '4.1.4');
    wp_register_script('splide', get_theme_file_uri('resources/vendor/splide/js/splide.min.js'), [], '4.1.4', true);
});
```

`app/setup.php` stays untouched. Every carousel block reuses the same `splide` handle; WordPress loads it once per page.

The rules every block follows are in `../README.md`; read it before this block.

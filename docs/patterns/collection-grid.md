# Collection grid

## When it applies

Cards drawn from a post type that an editor chooses, sorts and pages. The records come from WordPress, not from fields typed into the block. If the editor types each card by hand, use a repeater (`docs/examples/card-grid.md`).

## Install

`create-block` copies `skills/create-block/templates/collection/` onto the theme root the first time a block needs a collection, without its `*.test.mjs` files, then runs `node scripts/kit-setup.mjs`. A site without a collection never gets these files. Then add to `app/blocks.php`:

```php
\App\Content\ContentTypes::register(\App\Content\Posts::class);

add_action('init', function () {
    $path = 'resources/blocks/components/frontend/collection-paging';
    $dir = get_template_directory();
    $uri = get_template_directory_uri();

    wp_register_script('collection-paging', "{$uri}/{$path}.js", [], (string) filemtime("{$dir}/{$path}.js"), true);
    wp_register_style('collection-paging', "{$uri}/{$path}.css", [], (string) filemtime("{$dir}/{$path}.css"));
});
```

## Built from

- `ContentType`, `ContentTypes`, `Paging`, `Posts` in `app/Content/`
- `PostPicker`, `PagingControls`, `useCollectionSummary`, `postPickerQuery`
- `partials/collection-paging`, `collection-paging.{js,css}`
- `PaddingControls`, `EntranceControl`
- `card` for the card surface
- `EDITOR_BLOCK_FRAME`, `editorPaddingClasses`

## Add a content type

1. Register the post type with `show_in_rest: true`, so `PostPicker` can list it. A public type sets `rewrite => ['slug' => ..., 'with_front' => false, 'pages' => false]`. Its fields are one SCF group.
2. Add a class in `app/Content/` that extends `Posts`, overriding `postType()`, `label()` and `card()`.
3. Register it in `app/blocks.php` with `ContentTypes::register()`, and add it to the block's `CONTENT_TYPES` (COLL-3).

Content that must survive a theme change registers its post type in a mu-plugin instead. Nothing else changes.

## Rules that matter most

- COLL-1, COLL-2: the query lives in `block.php`, and every adapter returns the same card.
- COLL-4: Selected and All follow one rule in PHP and on the canvas, and an empty list never means everything.
- COLL-5: the canvas draws the real records in the page's card, never sample cards.
- COLL-7: paging works without JavaScript.
- CTA-7: cards that share a "Read more" label add hidden context with the record title.
- ENT-3, ENT-4: the `item` trigger, with the directive on the `<li>`, not the stretched link.

## Adapt per design

- The card markup, on both the Blade view and the canvas.
- The column classes and the gap.
- The card's link label.
- A type with its own sort resolves `title` to its field inside `selectedPosts()`. Never add a fourth `orderby` for one type.

## Do not change

- The query out of the Blade view.
- Paging that works without JavaScript.
- The same records and order in PHP and on the canvas.

## Example

`docs/examples/post-grid.md`.

# The content-type pattern

`post-grid` is the kit's example collection block: a card grid backed by a
`WP_Query` over a post type, with sorting and paging. It's generic: every
content type it can show plugs in as a small adapter class, not a new block.
The framework holds the pieces every collection block shares (`ContentType`,
`ContentTypes`, `Paging`, the paging partial and script). The block, its card
and the sample `Person` type are examples in `<kitPath>/examples/`: a site copies the
ones its design needs.

## When to use it

Reach for the content-type pattern when a project needs a repeatable record
with its own fields (a team directory, a client list, case studies, locations)
shown as a grid of cards. It doesn't fit a one-off list of items an editor
types into a block's own repeater field (`ItemList`): that's for content
that lives on the page, not a post type with its own records and admin
screens.

## Architecture

| Piece | File | Job |
| --- | --- | --- |
| `ContentType` | `app/Content/ContentType.php` | The interface every adapter implements: `postType()`, `label()`, `selectedPosts()`, `card()`. |
| `ContentTypes` | `app/Content/ContentTypes.php` | The registry a collection block reads. Empty until a site's bootstrap calls `ContentTypes::register(Person::class)` for each adapter. |
| `Paging` | `app/Content/Paging.php` | Numbered pages or Load More over any array of items. Not specific to a content type. |
| `Person` | `<kitPath>/examples/app/Content/Person.php` | The worked example adapter, backing the `person` sample content type. Its bootstrap, `<kitPath>/examples/app/content-types.php`, registers the post type and the adapter. Its SCF group is `<kitPath>/examples/acf-json/group___PREFIX___person.json`. |
| `post-grid` | `<kitPath>/examples/blocks/post-grid/` | The example Gutenberg block. Its `contentType` attribute picks the adapter. |
| Card partial | `<kitPath>/examples/views/partials/post-grid-card.blade.php` | Renders one card from an adapter's `card()` data. Shared by every content type. Its styles are `<kitPath>/examples/css/components/post-card.css`. |
| Paging partial | `resources/views/partials/collection-paging.blade.php` | Renders the Load More link or numbered pages from `Paging::paginate()`'s result. |
| Paging behavior/styles | `resources/blocks/components/frontend/collection-paging.{js,css}` | Fetches the next page and appends its items without a reload. Registered once, in `app/blocks.php`, and shared by every collection block through the `__PREFIX__-collection-paging` handle: never redeclared with `file:` in a block's own `block.json`. |

`post-grid` never queries a post type directly. It reads
`ContentTypes::adapter($contentType)` for the class, then calls that class's
`selectedPosts()` and `card()`. Nothing in the block, the Blade views or the
paging partial knows a content type's field names.

## The card data contract

Every adapter's `card()` returns the same shape, so the card partial never
branches on which content type it's rendering:

```php
[
    'id' => int,
    'title' => string,   // the card's heading
    'meta' => string,    // one short line under the title, e.g. a role ('' to omit)
    'excerpt' => string, // a line or two of body copy ('' to omit)
    'url' => string,     // an optional link (a permalink or an external URL), '' to omit
    'photoId' => int,    // an attachment id, usually the featured image (0 to omit)
    'photoAlt' => string,
]
```

A content type with more fields than this (a profile page, a price, a date)
keeps them off the card and reads them wherever that richer view actually
renders: `card()` only prepares what the grid shows.

## Adding a new type, end to end

Say a project needs a directory of **Locations**.

1. **Register the post type.** Add a `register_post_type()` call for it,
   following `<kitPath>/examples/app/content-types.php`'s shape (see "Where post types
   live" below for whether that belongs in the theme or a separate mu-plugin).
   A site's own `app/content-types.php` holds every call and every
   `ContentTypes::register()`; add `'content-types'` to `functions.php`'s
   `collect([...])` list once.
   Give it `show_in_rest: true` so `PostPicker` can list its records in the
   editor: even a type with `public: false` can still expose that, the same
   way `Person` does.

2. **Add its SCF field group.** A new
   `acf-json/group___PREFIX___location.json`, modeled on
   `<kitPath>/examples/acf-json/group___PREFIX___person.json`: a `message` field pointing at the
   featured image for the card photo, then whatever fields the type needs
   (an address, a phone number). Location rule: `post_type == <the new
   type's slug>`.

3. **Write the adapter.** A new class in `app/Content/`, implementing
   `ContentType`. `<kitPath>/examples/app/Content/Person.php` is the template: copy its shape, not its
   fields:
   - `postType()` returns the registered slug.
   - `label()` returns what the editor's "Content type" control shows.
   - `selectedPosts($include, $exclude, $orderby)` returns `WP_Post[]` for
     manual/title/date order, `$exclude` always winning. `Person`'s version
     works unchanged for any type that only needs to sort by title, date or
     a hand-picked list: copy it as-is unless the type needs a different
     sort (see "A different sort" below).
   - `card($post)` returns the shape above, reading whatever meta fields the
     type's own SCF group added.

4. **List it in the registry, in both places:**
   - `ContentTypes::register(Location::class)` (PHP), in your
     `app/content-types.php`.
   - The collection block's `CONTENT_TYPES` constant in `block.jsx` (JS): add
     its slug and label.

   Two places because the editor never loads the PHP class: see "Why two
   registries" below.

5. **Test it.** Add cases to the block's `block.test.mjs` (or a focused test
   for the new adapter alone) using `render-harness.mjs`'s `post(type, title,
   over)` fixture helper (see the existing Person-backed tests in that file
   for the shape): cards render the right fields, `selectedPosts()` sorts and
   filters correctly, paging still works.

That's the whole change. `post-grid` itself, the card partial, the paging
partial and `collection-paging.js` never change for a new type.

### A different sort

`selectedPosts()`'s `$orderby` is always one of `'manual' | 'title' |
'date'`: `post-grid`'s own Sort control only offers those three, so every
adapter answers the same three. A type that genuinely needs a different sort
(alphabetical by a meta field, say) still takes the same three values in its
signature; it just resolves `'title'` (or whichever) to its own field before
querying. Don't add a fourth value to the block's `orderby` enum for one
type: that's a sign the block needs a per-type sort list, which is a bigger
change than this pattern covers yet.

### Why two registries

The types registered with `ContentTypes::register()` and `block.jsx`'s
`CONTENT_TYPES` constant are the same list, kept in two languages, because the editor's "Content type"
control has to render before any REST call resolves what's registered on the
server. The kit already does this for the block framework's own PHP/JS
pairs: `BlockAttributes::groundClass()`/`ground.js` and
`BlockEntrance`'s limits (see `grounds-parity.test.mjs` and
`entrance-limits-parity.test.mjs` for the pattern of testing two mirrored
lists agree). A project with several content
types and enough churn to make the duplication painful can replace this with
a `wp_add_inline_script()` bridge (the same mechanism `_docs/entrance.md`
describes for Site Settings > Motion); that's a bigger change than the kit
ships by default.

## Where post types live

`<kitPath>/examples/app/content-types.php` registers `Person`'s post type inside the
theme, for the example's own simplicity: this repo has no mu-plugins folder to speak of
beyond Pantheon's storage fix. A real project's content usually needs to
survive a theme change, though: registering a post type in the theme orphans
every record the day the theme is replaced, because nothing still declares
the type. When that matters, move the `register_post_type()` call into a
small mu-plugin instead (`wp-content/mu-plugins/`, loaded before any theme).
Nothing else changes: the `ContentType` adapter, the SCF group and the
block read the post type by its slug either way.

## Collection blocks and the editor

`post-grid`'s canvas never renders fake cards. It shows an honest
description instead: a count, the sort order, the paging setup, because
the REST response the editor can see may lack a field the type's own SCF
group hides from REST, and doesn't know the exact result a load-more click
would produce. See `_docs/editor-contract.md`, "Collection blocks: don't
fabricate what the editor can't see," before changing what the canvas shows.

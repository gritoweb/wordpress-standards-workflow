# Block conventions

The rules every block built with this kit follows, so a site built from any
comp gets the same editor experience, controls and behavior. The blocks change
from site to site; these rules don't.

## How to read this document

- **MUST** means a block that breaks the rule is a bug. **SHOULD** means you
  need a written reason to break it.
- Each rule has an ID (for example, `MEDIA-1`) so reviews can cite it. IDs have
  gaps on purpose: a retired ID is never reused.
- `<slug>` is the block's folder name. `<text-domain>` and `<namespace>` come
  from `create-block` › Theme identity.
- `skills/create-block/SKILL.md` owns how a block is scaffolded, and
  `docs/examples/` holds the reference blocks. When this document and a
  reference block disagree, say so in `docs/kit-log.md` instead of guessing.
- `docs/editor-fidelity-checklist.md` is the canvas contract, and
  `docs/patterns/` holds one guide per recurring structure.

## The conventions

### File layout and naming

- **FILE-1 (MUST).** Each block lives in `resources/blocks/<slug>/`, the slug
  matches `^[a-z][a-z0-9-]*$`, and the slug is listed in
  `BlockManager::$blocks`.
- **FILE-2 (MUST).** The folder always holds `block.json`, `block.php`,
  `block.jsx` and `preview.svg` (or a `.webp`/`.png` that replaced it). The view
  always lives at `resources/views/blocks/<slug>.blade.php`.
- **FILE-3 (MUST).** A block has a `block.css` only for reusable, semantic or
  vendor-override CSS, and a `block.js` only for real front-end behavior. Both
  are declared in `block.json` as `file:./block.css` (`viewStyle`) and
  `file:./block.js` (`viewScript`), and served from source: plain CSS with no
  `@apply`, `@reference`, `@import` or `@layer`, and plain JavaScript with no
  `import` or `export`. One-off layout stays as Tailwind in the Blade view.
- **FILE-4 (MUST).** Code that two or more blocks use lives in one shared
  place, never copied into each block: editor components in
  `resources/blocks/components/backend/`, PHP helpers in `app/Blocks/`, Blade
  in `resources/views/components/` or `resources/views/blocks/partials/`.
- **FILE-5 (SHOULD).** Pure editor logic a block needs, such as reading and
  rewriting its slides, lives in a sibling module rather than inside `edit()`.
- **FILE-6 (MUST).** A class a block's `block.css` or `block.js` targets
  follows BEM on the slug: `.<slug>`, `.<slug>__<part>`, `.<slug>--<modifier>`.
  Classes carry no project prefix.

### `block.json` shape and attribute naming

- **JSON-1 (MUST).** Every `block.json` sets `apiVersion: 3`,
  `name: "<namespace>/<slug>"`, the theme's block `category`,
  `textdomain: "<text-domain>"`, `render: "file:./block.php"`, a Dashicon
  `icon` and a one-line `description`.
- **JSON-2 (MUST).** Every block sets `supports.anchor: true` and doesn't
  declare an `anchor` attribute of its own.
- **JSON-3 (MUST).** Every block declares `isPreview` (boolean, default
  `false`) and `example.attributes.isPreview: true`, and `edit()` returns the
  preview image when `isPreview` is true.
- **JSON-4 (MUST).** Every attribute declares a `type` and a `default`.
  Strings default to `""`, arrays to `[]`, and link objects to
  `{ "url": "", "opensInNewTab": false }`, never `"#"`.
- **JSON-5 (MUST).** A block doesn't redeclare the four padding keys unless a
  default differs from `BlockManager::globalAttributes()` (112, 56, `true`,
  `true`). When one differs, the block declares all four.
- **JSON-6 (SHOULD).** A declared `entrance` default names all eight keys
  (ENT-8), so a preset reads the same in PHP and JS.
- **JSON-7 (MUST).** Attributes use the shared vocabulary, so the same idea has
  the same name in every block:

  | Idea | Attribute names |
  | --- | --- |
  | Copy | `title`, `eyebrow`, `subtitle`, `body`, `caption` |
  | An image | `<name>Id` (number), `<name>Position` (string) |
  | Section rule | `sectionDivider` |
  | Section button | `ctaText`, `ctaLink` |
  | Repeaters | `items`, `cards`, `logos`, `slides`, `images` |
  | Item link | `linkText`, `link` |
  | Layout | `layout`, `align`, `imageSide` |
  | Carousel | `autoplay`, `autoplaySeconds` |

- **JSON-8 (MUST).** A choice attribute stores a meaning (`band`, `panel`,
  `compact`), never a class name or a pixel value. A closed list SHOULD declare
  `enum`.
- **JSON-9 (MUST NOT).** A block never has a variant named for a page or a
  breakpoint board, such as `layoutVariant: "about"` or `mobileVariant: "home"`.

### `block.php`

- **PHP-1 (MUST).** `block.php` shapes and sanitizes; the view only prints. It
  guards `ABSPATH`, then ends in one `echo view('blocks.<slug>', [...])->render();`.
  Queries and data shaping happen here, never in the view.
- **PHP-2 (MUST).** Every attribute is sanitized by type before it reaches the
  view: `sanitize_text_field()` for plain strings, `wp_kses_post()` for rich
  copy, `absint()` for unsigned numbers, `(bool)` for flags, `esc_url_raw()` for
  URLs, and an `in_array()` allow-list for choices.
- **PHP-3 (MUST).** The anchor reaches the view as
  `'anchor' => sanitize_html_class($attributes['anchor'] ?? '')`.
- **PHP-4 (MUST).** The entrance reaches the view as
  `BlockEntrance::fromBlock($attributes, __DIR__)`.
- **PHP-5 (MUST).** Padding reaches the view through
  `...\App\Blocks\BlockPadding::fromAttributes($attributes)`.
- **PHP-7 (MUST).** A section button reaches the view as its text, its URL
  (`esc_url_raw()`) and its new-tab flag, in the keys `<x-button-link>` takes.
- **PHP-9 (MUST).** An array attribute is read with `foreach`, skipping
  non-array items, sanitizes each sub-field, and drops entries with nothing to
  render.
- **PHP-10 (SHOULD).** When the set of rendered parts depends on content, the
  entrance indexes are computed from what actually renders.
- **PHP-11 (MUST).** A vendor library is enqueued only in `block.php`, and only
  when this render needs it. A callback on an admin-only hook may enqueue
  anything: the rule protects the front end.
- **PHP-12 (SHOULD).** A filter that applies to one render is added right
  before the call and removed right after.
- **PHP-13 (MUST).** Image markup comes from
  `wp_get_attachment_image($id, $size, false, [...])` with an explicit size
  (MEDIA-7).

### Blade views

- **VIEW-1 (MUST).** The view's root is one `<section>` carrying the anchor id,
  the `<slug>` class, `@paddingClasses(...)` **inside** `class`, and
  `@entrance($entrance)`:

  ```blade
  <section @if ($anchor) id="{{ $anchor }}" @endif
    class="<slug> @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop)"
    @entrance($entrance)>
  ```

  Only the section gets the anchor id. A generated id goes on an inner element.
- **VIEW-2 (MUST).** Content sits inside `<div class="container">`.
- **VIEW-3 (MUST).** A block's heading is an `<h2>` and a repeated item's
  heading is an `<h3>`. The block that opens a page (a hero) may be the page's
  one `<h1>`, because `front-page.blade.php` prints none. Display size comes
  from a type class, so an `<h2>` can carry `heading-1`.
- **VIEW-4 (MUST).** Every optional part renders only when it has content. A
  button renders only with both text and a URL (`<x-button-link>` does this),
  and an image only with an attachment ID. A block with nothing to show SHOULD
  render nothing at all, not an empty padded section.
- **VIEW-5 (MUST).** An element with `@entrance` or `@entrancePart` never has a
  second `style` attribute: the directive prints its own.
- **VIEW-6 (MUST).** Color and type come from the style guide: contract tokens
  and classes (`text-ink`, `text-muted`, `bg-light`, `bg-surface`,
  `border-border`, `heading-N`, `text-body`, `card`, `btn btn-primary`), never
  hex values, Tailwind's stock palette or type scale, or arbitrary sizes.
  `check-css-foundation.mjs` enforces it.

### The inspector

The sidebar holds configuration only. Text, links and buttons are edited on
the canvas (`CLAUDE.md` › Blocks).

- **INSP-1 (SHOULD).** The item list panel starts open with `initialOpen`.
- **INSP-2 (MUST).** Panels appear in this order, and a block uses only the
  ones it needs: the item list (**Items**, **Slides**, **Cards**, **Logos**) →
  **Background Media** → the block's own settings (layout, autoplay) →
  **Spacing** → **Entrance animation**.
- **INSP-3 (MUST).** Every block mounts `<PaddingControls />` and one
  `<EntranceControl />`, the latter with `attributes`, `setAttributes` and
  `clientId`.
- **INSP-4 (MUST NOT).** A block never puts `ActionEditor`, `LinkPicker`,
  `LinkControl`, `RichText`, `AutoGrowingTextarea`, or a `TextControl` that
  isn't `type="number"` inside `<InspectorControls>`, and never offers a
  free-form typography or page-layout variant control.
- **INSP-5 (MUST).** Inspector contents are styled with inline styles, never
  Tailwind, because `editor.css` reaches only the canvas iframe. Reuse
  `stackedStyles` from `ActionEditor.jsx`, and pass `noStylesheet` to an
  `AttachmentImageControl` in the sidebar.
- **INSP-7 (MUST).** A section rule is set through `DividerControl`.
- **INSP-8 (MUST).** A focal point is set through `ImagePositionControl`, right
  under the image it belongs to.
- **INSP-9 (MUST).** A control that doesn't apply to the current choice is
  hidden, and its saved value stays.
- **INSP-10 (SHOULD).** A number with a range uses `RangeControl` and clamps
  with the same limits PHP uses.
- **INSP-11 (SHOULD).** Labels say what a choice does, not how it's built.
  Help text says what empty or zero means.
- **INSP-12 (MUST).** An action that calls an outside service runs only from an
  explicit button, reports its status in a polite live region, and ignores a
  stale response.

### The canvas

**The canvas is the page.** `scripts/editor-fidelity.mjs` proves it in Chrome by
comparing computed styles, and `docs/editor-fidelity-checklist.md` is the
contract.

- **CANVAS-1 (MUST).** The canvas root is a `<section>` that spreads
  `useBlockProps()` and `entranceRootProps(entrance)`, merges both `style`
  objects, and carries `editorPaddingClasses(attributes)`, the block's class and
  `EDITOR_BLOCK_FRAME`. The frame marks the block's edge without taking layout
  space.
- **CANVAS-2 (MUST).** Spacing on the canvas is the page's: the root takes the
  same responsive padding classes as the view, through
  `editorPaddingClasses(attributes)`, never an inline padding style, and
  changing Spacing in the sidebar moves the canvas at once.
- **CANVAS-3 (MUST).** The canvas renders the Blade view's composition: the same
  parts in the same order, the same type and button classes, the same column
  split and image-side reversal, and the same conditions for which parts show.
- **CANVAS-4 (MUST).** A text field carries the same style guide classes as its
  Blade element (`heading-2` on both). The canvas never shrinks a heading with a
  smaller scale.
- **CANVAS-5 (MUST NOT).** The canvas never shows a block title, a "... Preview"
  heading, or field captions such as "HEADING" or "BUTTON LINK".
- **CANVAS-6 (MUST).** An optional field shows when it has a value or the block
  is selected (`value || isSelected`). The main heading also shows when the
  block has no other content, so an empty block always has a writing target.
- **CANVAS-7 (MUST).** Placeholders are neutral instructions ("Write a heading",
  "Add a supporting line"), never sample copy that could pass for saved content.
- **CANVAS-8 (MUST).** An empty repeater shows one line that points to its panel
  ("Add logos in the Logos panel.").
- **CANVAS-9 (MUST).** Mounting, selecting, opening a panel, resolving a query
  or loading an attachment never calls `setAttributes`. Editor-only state (the
  active item, whether a link editor is open) lives in `useState`.
- **CANVAS-11 (MUST).** Navigation, form submission, live maps and feed embeds
  never run on the canvas, and a carousel never autoplays there. A carousel shows
  the same slides per view and bullets as the page. Anything the editor can't
  draw honestly (a map, a form, a feed, a query) is a plain panel in the block's
  frame that says what loads there.
- **CANVAS-12 (MUST).** Every text field names its own color, and on a dark band
  or photo its own placeholder color, because the browser's form styles override
  inherited color.
- **CANVAS-13 (MUST NOT).** The canvas never shrinks a block with a CSS
  `transform`.

### Text fields

- **TEXT-1 (MUST).** A plain-string heading, eyebrow, subtitle or label is
  edited in `AutoGrowingTextarea`, which already carries the field reset. A
  field that is an `h1`–`h6` on the page gets the `heading` prop. Never an
  `<input>`, a form wrapper, or a border around the field.
- **TEXT-2 (MUST).** Formatted long copy is edited in `RichText` or
  `ParagraphsField`, on the canvas, with the page's classes.
- **TEXT-3 (MUST NOT).** `RichText` is never used for a plain string: it invites
  markup into a heading.
- **TEXT-4 (MUST).** Every field has an `aria-label`. A repeated field adds its
  position ("Card title 2").
- **TEXT-6 (MUST).** A field keeps its stored data type, and nothing strips or
  rewrites markup on mount or selection.

### Media

- **MEDIA-1 (MUST).** Every image comes from the Media Library and is stored as
  `<name>Id` only. New content never stores a URL: it breaks when the file moves
  and skips `srcset`.
- **MEDIA-3 (MUST).** A foreground image is edited on the canvas through
  `AttachmentImageControl`, with its empty, loading, unavailable and ready
  states. `useAttachmentUrls` resolves the URL.
- **MEDIA-4 (MUST).** A photo that fills the block behind other content is set
  in the sidebar: a `PanelBody title="Background Media"` holding
  `<AttachmentImageControl noStylesheet />` with `<ImagePositionControl />`
  right under it. The canvas shows only the passive full-bleed preview, with no
  click target.
- **MEDIA-5 (SHOULD).** An optional single image passes `onRemove`, which clears
  the ID but never the library file.
- **MEDIA-6 (MUST).** The field names the recommended upload size by role:
  1920×1080 for a hero or background, 1200×800 for a slide, 800×600 for a card,
  300×150 for a logo, 200×200 for an avatar.
- **MEDIA-7 (MUST).** The front end renders every attachment with
  `wp_get_attachment_image($id, $size, false, [...])` and an explicit size by
  role: `full` for full-bleed, hero and logo images, `large` for a content
  column, `medium` or `medium_large` for cards.
- **MEDIA-8 (MUST).** Images load with `loading="lazy"` and `decoding="async"`,
  except an above-the-fold hero image, which is `eager` (and
  `fetchpriority="high"` for a single opening image). In a slider, only the
  first slide is eager.
- **MEDIA-9 (MUST).** Alt text comes from the attachment's own alt, never a block
  field. A background photo gets `alt=""`.
- **MEDIA-10 (MUST).** A crop is the frame's aspect class plus `object-cover` plus
  the focal point, from `BlockImagePosition::cssValue()` on the page and
  `focalCss()` on the canvas.
- **MEDIA-11 (SHOULD).** A different mobile crop is a second attachment
  (`mobileImageId`) served through `<picture><source media>`.
- **MEDIA-12 (MUST).** Logos are drawn with `object-fit: contain` on a ground
  where the mark shows. A duplicate attachment renders once, and an entry with no
  image is dropped.
- **MEDIA-13 (MUST NOT).** A block never assigns a placeholder or stock image.

### Repeaters

- **REP-1 (MUST).** A repeater is one array attribute (default `[]`) of objects.
  Array position is the only source of order: never store an `order` number.
- **REP-2 (MUST).** The sidebar manages the list with `ItemList` in a panel named
  for the items, and adding, deleting and reordering happen only there. Every row
  labels itself from the item's text (`getLabel`), with `minItems={0}` when the
  list is optional.
- **REP-3 (MUST).** Item content (text, foreground images, links) is edited in
  place on the canvas, where the item renders, with no delete, add or reorder
  buttons there.
- **REP-4 (MUST).** The active row follows the item: after a move it's the moved
  item, after an add it's the new item, and after a removal it's the nearest
  survivor.
- **REP-5 (MUST).** Every write is one `setAttributes` built from the current
  array (`items.map(...)` with a patch object that keeps every key), and moves use
  `moveItem()`. Two calls in a row start from the same stale array, and the second
  erases the first.
- **REP-6 (MUST).** The editor never saves an id of its own into an item.
- **REP-7 (MUST).** PHP drops empty and malformed entries. The canvas keeps empty
  entries editable.
- **REP-8 (MUST).** A per-item link uses `ButtonPair`, like a section button, with
  `linkText` and `link`.
- **REP-9 (MUST).** A one-open-at-a-time widget (accordion, tabs) passes
  `activeItem` and `setActiveItem` to `ItemList`: the canvas opens that item, and
  clicking an item on the canvas selects it.

### Collections from a post type

`create-block` copies the collection templates the first time a block needs them
(`skills/create-block/templates/collection/`). `docs/patterns/collection-grid.md`
adds a content type, and `docs/examples/post-grid.md` is the reference block.

- **COLL-1 (MUST).** A collection block queries in `block.php`, through
  `ContentTypes::adapter()`, and builds cards only for the page that renders. The
  block never knows a content type's field names.
- **COLL-2 (MUST).** Every adapter's `card()` returns the same shape: `id`, `title`,
  `meta`, `excerpt`, `url`, `photoId`, `photoAlt`.
- **COLL-3 (MUST).** A new type is listed in `ContentTypes::register()` and in the
  block's `CONTENT_TYPES`, because the editor never loads the PHP class.
- **COLL-4 (MUST).** Selection follows one rule in PHP and on the canvas: **Selected**
  shows only the chosen posts, and an empty list shows nothing. **All** shows every
  published record and honors the exclude list. An empty list never means everything.
- **COLL-5 (MUST).** The canvas draws the real records in the page's card markup,
  resolved by `useCollectionSummary` to the same set and order as PHP, never sample
  cards. It tells loading, a failed request and an empty result apart in
  `data-collection-state`, and the sidebar says how many show, in what order and how
  they page.
- **COLL-6 (MUST).** Paging is `PagingControls` in the sidebar, over
  `Paging::paginate()` in `block.php`. The Load more label and the card's link label
  are text, so they're edited on the canvas.
- **COLL-7 (MUST).** Without JavaScript the pager links and Load more still work:
  Load more is a link to the next page, and `collection-paging.js` only enhances it.
- **COLL-8 (MUST).** `collection-paging.{js,css}` are registered once in
  `app/blocks.php` and enqueued in each collection block's `block.php`.

### Buttons and links

- **CTA-1 (MUST).** A section button is `<name>Text` plus a `<name>Link` object, and
  renders only when both are set.
- **CTA-2 (MUST).** On the canvas a button is `ButtonPair`, with the same classes as
  the page. Clicking it opens `ActionEditor` in a core `Popover` right below the
  button, never on select. It closes on Escape or a click outside, and it's never
  in the sidebar.
- **CTA-3 (MUST).** On the page a section button is `<x-button-link>`. Never re-type
  the pair in a block.
- **CTA-6 (MUST).** A link gets `target="_blank"` only when `opensInNewTab` is set,
  and never a hard-coded `rel`.
- **CTA-7 (MUST).** When several links share a label ("Read more"), each adds hidden
  context: `<span class="sr-only"> about {{ $title }}</span>`.
- **CTA-8 (MUST NOT).** The canvas never renders a navigating `<a href>`.
- **CTA-9 (SHOULD).** When PHP computes a fallback destination, the canvas treats the
  button as complete under the same condition.

### Entrance, spacing and dividers

- **ENT-1 (MUST).** Every block animates in. The root carries
  `@entrance($entrance)`, and each revealing part carries `@entrancePart($index)`
  with one running index across the block, in reading order.
- **ENT-2 (SHOULD).** A part that doesn't render takes no index, so the stagger has
  no gap.
- **ENT-3 (MUST).** The directives go on parts, never on a size container or a
  clipping panel, because a transform breaks their children.
- **ENT-4 (MUST).** A block whose items stack down the page defaults to the `item`
  trigger.
- **ENT-5 (MUST).** The canvas resolves the entrance with
  `resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default)`, then
  spreads `entranceRootProps()` on the root and `entrancePartProps(entrance, index)`
  on the same parts, with the same indexes the view prints.
- **ENT-7 (MUST NOT).** An item with `scroll-snap-align` doesn't carry
  `@entrancePart`. Put the entrance on a child of the snap item.
- **ENT-8 (MUST NOT).** A block's `entrance` default holds only the keys
  `EntranceControl` reads: `type`, `direction`, `distance`, `unit`, `duration`,
  `delay`, `stagger`, `trigger`.
- **PAD-1 (MUST).** Spacing works in three places, all required:
  `BlockPadding::fromAttributes()` in `block.php`, `@paddingClasses(...)` inside the
  root `class`, and `editorPaddingClasses(attributes)` on the canvas root.
- **PAD-2 (MUST).** Stored padding values come from the `BlockPadding` scale. A comp
  that needs another step adds it to both the `BlockPadding` maps and
  `padding-presets.js`.
- **DIV-1 (MUST).** A section rule is `sectionDivider`, set through `DividerControl`
  and drawn on the canvas with `dividerClass()`.

### Front-end JavaScript

- **JS-1 (MUST).** A block's `block.js` is plain JavaScript with no `import`, served
  from source and gated on `DOMContentLoaded`.
- **JS-4 (SHOULD).** Listeners are delegated to `document` when a block can appear
  more than once or later in the page.
- **JS-5 (MUST).** The page works without JavaScript: every slide and card is in the
  HTML, and a control that needs a script ships `hidden`.
- **JS-6 (MUST).** Scripts respect `prefers-reduced-motion`: smooth scrolling becomes
  a jump, and a slider drops its transition and autoplay.
- **JS-7 (SHOULD).** A script that scrolls measures fixed chrome (the admin bar, a
  sticky header) at click time.
- **JS-8 (MUST).** A vendor library is self-hosted in `resources/vendor/<lib>/`,
  registered in `app/blocks.php`, enqueued in the block's `block.php`, and read
  through its global in `block.js`. Never a CDN.

### Accessibility

- **A11Y-1 (MUST).** An interactive canvas element is a real `<button>`, or a `span`
  with `role="button"`, `tabIndex={0}`, an `onClick`, and an `onKeyDown` for Enter and
  Space. It's never a `components-button` dressed as the theme's button.
- **A11Y-2 (MUST).** A slider has labeled previous and next controls or bullets, and
  `aria-hidden` on inactive slides, which Splide provides. Autoplay pauses on hover
  and is off for reduced motion.
- **A11Y-3 (MUST).** A map has a text label as a sibling, never `role="img"` on the
  map frame, so the map's own links stay reachable.
- **A11Y-4 (MUST).** A disclosure is a native `<details>` with a `<summary>`, using
  `name` for one open at a time, with no `block.js`. A scripted disclosure uses a
  `<button aria-expanded aria-controls>` inside the item's heading, closes on Escape,
  and keeps hidden content out of the tab order.
- **A11Y-5 (MUST).** A decorative icon is `aria-hidden`. A logo that's a link always
  has a name.
- **A11Y-6 (SHOULD).** A link that opens a new tab says so to screen readers with
  hidden text inside the link.

### Escaping

- **ESC-1 (MUST).** A URL prints as `{!! esc_url($url) !!}`, never inside `{{ }}`,
  which encodes the `&` that `esc_url()` already encoded, and never bare. A `srcset`
  is the exception: WordPress builds it as a list, so it prints through `{{ }}`.
- **ESC-2 (MUST).** Plain text prints with `{{ }}`.
- **ESC-3 (MUST).** `{!! !!}` prints only HTML that PHP already filtered
  (`wp_kses_post`, an allow-list `wp_kses`) or markup WordPress built
  (`wp_get_attachment_image`).
- **ESC-4 (MUST).** A directive or helper that prints caller text into an attribute
  escapes it itself.

### Internationalization

- **I18N-1 (MUST).** Every visible editor or front-end string goes through `__()` with
  the text domain, counts use `_n()`, and a `sprintf()` string has a `translators:`
  comment.

## Verify a block

Run `node scripts/check-css-foundation.mjs`, then `scripts/editor-fidelity.mjs` for the
block, and check the rendered HTML at 390, 768 and 1440 wide.

## Patterns

One page per recurring structure lives in `docs/patterns/`. Start at
[`docs/patterns/README.md`](patterns/README.md).

## Checkable rules

A static read of a block's files can detect each rule below. "Each block" means every
folder under `resources/blocks/` except `components`.

### Files

1. **Required files (FILE-2).** `block.json`, `block.php`, `block.jsx`, a `preview.*`
   file and the view exist.
2. **Listed (FILE-1).** The slug matches the pattern and is in `BlockManager::$blocks`.
3. **Declared assets exist (FILE-3).** Every `file:./...` path in `viewScript` or
   `viewStyle` exists, and every `block.css` or `block.js` in the folder is declared.
4. **Plain block assets (FILE-3, JS-1).** `block.css` has no `@apply`, `@reference`,
   `@import` or `@layer`, and `block.js` has no `import` or `export`.

### `block.json`

5. **Metadata (JSON-1).** `apiVersion` is `3`, `name` ends in the folder's slug,
   `textdomain` is set, and `render` is `file:./block.php`.
6. **Anchor support (JSON-2).** `supports.anchor` is `true` and `attributes` has no
   `anchor` key.
7. **Inserter preview (JSON-3).** `attributes.isPreview` defaults to `false`,
   `example.attributes.isPreview` is `true`, and `block.jsx` reads `isPreview`.
8. **Every attribute has a default (JSON-4).** Each declares `type` and `default`.
9. **Link objects are whole (JSON-4).** An attribute named `link` or ending in `Link`
   defaults to an object with `url: ""` and `opensInNewTab`.
10. **Padding keys come as a set (JSON-5).** All four padding keys or none.
11. **Entrance presets (ENT-8).** A declared `entrance.default` holds only the eight
    known keys.
12. **Image attributes store IDs (MEDIA-1).** No attribute ending in `Url` is an image
    (`image*Url`, `bg*Url`, `photo*Url`).
13. **No page-named variants (JSON-9).** No attribute is named `layoutVariant` or
    `mobileVariant`.

### `block.php`

14. **Guard and shape (PHP-1).** The `ABSPATH` guard and `view('blocks.<slug>'` with the
    folder's slug.
15. **Anchor (PHP-3).** Passes `sanitize_html_class($attributes['anchor']`.
16. **Entrance (PHP-4).** Calls `BlockEntrance::fromBlock($attributes, __DIR__)`.
17. **Padding (PHP-5).** Calls `BlockPadding::fromAttributes(`.
18. **Malformed entries (PHP-9).** A block with an `array` attribute uses `is_array`.
19. **Explicit image size (PHP-13, MEDIA-7).** Every `wp_get_attachment_image(` call in
    `block.php` or the view has a second argument.
20. **No global vendor enqueue (PHP-11).** `wp_enqueue_script(` and `wp_enqueue_style(`
    appear only in `resources/blocks/*/block.php`, apart from the theme's `app` and
    `editor` handles and admin-only hooks.

### Blade views

21. **Root shape (VIEW-1).** The first element is a `<section>` with the anchor
    condition, `@paddingClasses(` inside `class`, and `@entrance(`.
22. **Anchor only on the root (VIEW-1).** One `id="{{ $anchor }}"`.
23. **Container (VIEW-2).** The view contains the `container` class.
24. **One style attribute (VIEW-5).** No tag has `@entrance(` or `@entrancePart(` and a
    literal `style=`.
25. **Token colors (VIEW-6).** No hex color, stock palette class, `text-white` or
    `bg-black`.
26. **URL escaping (ESC-1).** No `{{ esc_url(`, and every `href=`, `src=`, `action=` or
    `poster=` value goes through `esc_url(`.
27. **No hard-coded rel (CTA-6).** No `rel="noopener` in a view.
28. **New-tab flag (CTA-6).** Every `target="_blank"` sits inside an `@if`.

### `block.jsx`

29. **Server-rendered (PHP-1).** `save: () => null`.
30. **Entrance panel (INSP-3).** `<EntranceControl` appears once, with `clientId`.
31. **Spacing panel (INSP-3).** `<PaddingControls` appears once.
32. **Safe preset read (ENT-5).** No `attributes.entrance.default`.
33. **Spacing on the canvas (CANVAS-2, PAD-1).** Uses `editorPaddingClasses(`.
34. **Editor frame (CANVAS-1).** Uses `EDITOR_BLOCK_FRAME`.
35. **No content in the sidebar (INSP-4, CTA-2).** Nothing between `<InspectorControls>`
    and its closing tag is `ActionEditor`, `LinkPicker`, `LinkControl`, `RichText`,
    `AutoGrowingTextarea`, or a `TextControl` without `type="number"`.
36. **No canvas tiers (CANVAS-4).** No `EDITOR_TYPE.` read.
37. **No scaling (CANVAS-13).** No `scale(` in the canvas markup.
38. **No navigating anchors (CTA-8).** No `<a ` with `href` in `block.jsx`.
39. **Media through the shared frame (MEDIA-3).** No direct `MediaUpload` import.
40. **Text domain (I18N-1).** Every `__(`, `_n(`, `_x(` call names the theme's text
    domain, in `.jsx`, `.php` and `.blade.php`.
41. **Neutral placeholders (CANVAS-7).** Flag a placeholder that doesn't start with a
    verb (Write, Add, Enter, Choose, Type, Select, Paste, Describe, Name, Pick, Set,
    Search). Heuristic.
42. **No order field (REP-1).** No item key named `order` or `position`.

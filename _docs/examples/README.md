# Code examples — read this first

Three complete Gutenberg blocks for the kit's Sage 11 + Acorn + Vite setup.
**Copy these, not older code**: every file below was run on a live site
(2026-09-23) — editor (no block errors, sidebar list reorders / deletes /
adds with the canvas updating at once, Spacing and entrance Preview visible)
and front end (padding classes inside `class`, accordion exclusive, Swiper
initialised only where the block renders, console clean).

Placeholders, same as the `create-block` templates: `<namespace>` (block
namespace), `<text-domain>`, `<category>`. Theme infrastructure
(`BlockManager`, `BlockPadding`, `BlockEntrance`, `BlockMotion`, the shared
components) is **not** repeated here — it comes from
`skills/create-block/templates/`.

## Rules every block follows

- **`block.php` shapes and sanitizes; Blade only prints.** Arrays are read
  with `foreach`, skipping non-array items; every field has its own
  sanitizer (`sanitize_text_field`, `wp_kses_post`, `absint`, `esc_url_raw`).
- **Canvas = the page.** Text is edited where it shows
  (`AutoGrowingTextarea` for short text, `RichText` for copy), images with
  `AttachmentImageControl`, links with `ActionEditor`. No labelled form
  fields on the canvas.
- **Sidebar = configuration**: the item list, Spacing, Entrance animation,
  background media. Never text fields.
- **Repeaters:** `ItemList` in a sidebar `PanelBody` is the only place to
  reorder, delete and add items. Array order is the only order. No item
  delete / add / reorder buttons on the canvas.
- **Remove controls are components:** `RemoveImageButton` (core "X") removes
  an image — `AttachmentImageControl` shows it on hover; `RemoveButton`
  (core trash) deletes anything else. Icons come from `coreIcons.jsx`; every
  editor icon button is `size="compact"` (32px). Never type `×` / `✕`.
- **One `setAttributes` per change**, built from the current array with a
  patch object — two calls in a row lose the first write.
- **Hooks before any early return** (`useState`, `useAttachmentUrls`), so
  the preview branch never changes the hook order.
- **Spacing in three places**: `...BlockPadding::fromAttributes($attributes)`
  in `block.php`, `@paddingClasses(...)` **inside** the root `class`, and
  `editorPaddingClasses(attributes)` in the canvas root's `className` — the
  same responsive classes as the page, so a narrow canvas gets the mobile
  padding instead of a forced desktop one.
- **Entrance**: preset in `block.json` (from the `create-block` preset
  table), `@entrance` on the root, `@entrancePart(n)` on each part, the same
  indexes in `block.jsx`.
- **Assets**: a block's own JS/CSS is plain, declared in `block.json`
  (`file:./block.js` / `file:./block.css`) and served from source. Vendor
  libraries are registered in `app/setup.php` and enqueued in the
  `block.php` that needs them — never globally.

## One file per block

Read this file, then **only** the block file closest to what you are building:

| Block | File | Shows |
| --- | --- | --- |
| Accordion (one open at a time) | `accordion.md` | a repeater with one item open at a time (native `<details name>`) |
| Card grid | `card-grid.md` | a grid of repeated cards with image, text and link |
| Testimonial carousel (vendor library) | `testimonial-carousel.md` | a carousel on a vendor library (Swiper), registered and enqueued per block |

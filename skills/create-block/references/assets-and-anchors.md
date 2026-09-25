# create-block — How a block loads its own CSS/JS and vendor libraries, and anchor ids

Part of the `create-block` skill (`../SKILL.md`); read it only when the task needs it.

### Block asset loading (the canonical rule)

Two kinds of asset, two mechanisms — never mix them:

1. **The block's own front-end CSS/JS** (`block.css` / `block.js`) — **each
   optional** (see the Tailwind-first rule): declared in `block.json` via
   **`file:./block.css`** (`viewStyle`) and **`file:./block.js`** (`viewScript`).
   WordPress enqueues them **conditionally** — only on pages where the block
   renders — and dedupes automatically. Served **straight from source**, not
   Vite-built, so:
   - `block.css` exists only for reusable/semantic CSS or lib overrides; it's
     **plain CSS** (no `@apply`/`@reference`). One-off layout goes in the Blade
     as Tailwind utilities, not here.
   - `block.js` exists only when the block has behavior; it's **plain vanilla**
     (no `import`), gated on `DOMContentLoaded`.
   - Never register these in `setup.php`. `block.json` is the whole wiring.

2. **Third-party vendor libs** (Splide, GSAP, …): **`wp_register_script` /
   `wp_register_style` in `app/blocks.php`** (declare only — nothing loads), then
   **`wp_enqueue_script` / `wp_enqueue_style` in the block's `block.php`** (only
   the blocks that use it; WP dedupes by handle so N blocks share one copy).
   Vendor bundles are self-hosted under `resources/vendor/<lib>/` and referenced
   with `get_theme_file_uri(...)` — not a CDN. Splide ships with this skill:
   copy `<skill>/templates/vendor/splide/` to `resources/vendor/splide/` when a
   block needs a carousel, never before. The block's `block.js` consumes
   the lib via its global (e.g. `window.Splide`), which is guaranteed available
   because classic vendor scripts execute before the block's `DOMContentLoaded`
   handler.

The editor's `block.jsx` is the **only** block file Vite compiles (via the
`editor.js` glob). Vite never touches front-end `block.js`/`block.css`.

**Per-attribute generation rules:**

| Attribute type | `block.json` schema | `block.php` sanitization | `block.jsx` editor control |
|---|---|---|---|
| `string` (heading / label / simple short text) | `{"type":"string","default":""}` | `sanitize_text_field($attributes['<name>'] ?? '')` | `<AutoGrowingTextarea value={...} onChange={(value) => setAttributes({ <name>: value })} className="<page classes>" />` on the canvas |
| `string` (description / long copy) | `{"type":"string","default":""}` | `wp_kses_post($attributes['<name>'] ?? '')` if formatting is allowed; otherwise `sanitize_text_field(...)` | `<RichText tagName="div" value={...} onChange={(value) => setAttributes({ <name>: value })} className="<page classes>" />` on the canvas |
| `number` | `{"type":"number","default":0}` | `absint($attributes['<name>'] ?? 0)` (unsigned) — use `(int)` only if negatives are valid | `<TextControl type="number" ... />` or `<NumberControl ... />` |
| `boolean` | `{"type":"boolean","default":false}` | `(bool) ($attributes['<name>'] ?? false)` | `<ToggleControl ... />` |
| `array` | `{"type":"array","default":[]}` | `foreach` over the array, skipping non-array items, with per-field sanitization | **`<ItemList>` in the sidebar** + canvas items in array order (see **Repeaters**) |
| image (ID-first) | `{"<name>Id":{"type":"number","default":0}}` | `absint($attributes['<name>Id'] ?? 0)` — URL resolved at render via `wp_get_attachment_url()` or `wp_get_attachment_image()` | `<AttachmentImageControl imageId={...<name>Id} onSelect={(media) => setAttributes({ <name>Id: media.id })} onRemove={() => setAttributes({ <name>Id: 0 })} />` — X button on hover to remove, Spinner while loading, `useAttachmentUrls` resolves URL in the editor. X button on hover to remove |
| link (Gutenberg `LinkControl` object) | `{"type":"object","default":{"url":"","opensInNewTab":false}}` | `esc_url($attributes['<name>']['url'] ?? '')` + `(bool) ($attributes['<name>']['opensInNewTab'] ?? false)` | `<LinkPicker label="..." value={attributes.<name>} onChange={(value) => setAttributes({ <name>: value })} />`. Blade emits `target="_blank"` only when the flag is true; **don't hardcode `rel="noopener"`** — WP's `wp_targeted_link_rel()` filter (priority 15 on `the_content`) adds it automatically |

**Spacing works in three places, and all three are required** (the attrs
come from `BlockManager::globalAttributes()`):

1. `block.php` passes the four values to the view:
   `...\App\Blocks\BlockPadding::fromAttributes($attributes),`
2. The Blade root puts the directive **inside** `class="…"`:
   `class="<slug> @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop)"`
3. `block.jsx` puts the same responsive classes on the canvas root:
   `className={`${blockProps.className} ${editorPaddingClasses(attributes)} <slug> …`}` —
   never an inline padding style: it can't follow breakpoints, so a narrow
   canvas (list view + settings open on a laptop) got 96px side padding and
   the content no room.

Verify on the rendered HTML, not by reading the Blade: the `<section>`'s
`class` attribute must contain `py-… md:py-… px-… lg:px-…`, and changing
Spacing in the sidebar must move the canvas at once.

### Anchor support (every block)

Every block **must** support the Gutenberg HTML anchor so editors can link to
it (`#my-section`). It's free and consistent — wire it on every block, no need
to ask.

1. **`block.json`** — add `"supports": { "anchor": true }`. This surfaces the
   "HTML anchor" field in the block's *Advanced* panel and registers the
   `anchor` attribute automatically (don't declare `anchor` in `attributes`).
2. **`block.jsx`** — nothing to do. `useBlockProps()` already applies the
   anchor `id` in the editor preview.
3. **`block.php`** — pass `'anchor' => sanitize_html_class($attributes['anchor'] ?? '')`
   to the view (server-rendered blocks don't auto-emit the id on the front end).
4. **Blade** — render the id **on the `<section>` wrapper, and only there**:
   `<section @if ($anchor) id="{{ $anchor }}" @endif class="<slug>">`.

**Dynamic ids go on an inner element — never the section.** When a block needs
its own unique id at render time (e.g. a carousel instance: `id="carousel-{$block_id}"`
targeted by `block.js`), putting it on the `<section>` would collide with — and
overwrite — the editor's anchor id. Always emit dynamic ids on a nested `<div>`
so the section's `id` stays reserved for the anchor:

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif class="<slug>">
    <div id="carousel-{{ $uid }}" class="<slug>__carousel splide">
        {{-- slides --}}
    </div>
</section>
```

(Generate `$uid` in `block.php` — e.g. `wp_unique_id('carousel-')` — and pass it
to the view; never reuse the anchor for it.)

---

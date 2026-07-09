# Code Examples — AI Context

Concrete, canonical patterns that put the [`CLAUDE.md`](./CLAUDE.md) rules
together **in context**. Point the AI here + at `CLAUDE.md` before generating
code. The rule-level snippets live in `CLAUDE.md`; this file is the *composed*
reference: three complete Gutenberg blocks (Sage 11 + Acorn + Vite),
each demonstrating a different pattern (repeater with media, icon-driven
repeater with a zero-JS accordion, fixed-array card grid with a zero-JS
reveal), plus the theme-level glue that registers blocks, resolves
padding/image-position attributes to CSS, and loads vendored libs on
demand.

This is the **canonical layout** — the team's `create-block` skill should
generate folders that match this shape.

## Folder layout

```
app/
  Blocks/
    BlockManager.php                 # blocks list + globalAttributes (minimal)
    BlockCategories.php              # registers the custom block category in Gutenberg
    BlockPadding.php                 # resolves padding attrs → Tailwind class string (@paddingClasses)
    BlockImagePosition.php           # resolves imagePosition attr → Tailwind object-* class / CSS value
  blocks.php                         # block bootstrap (BlockCategories::register + BlockManager init action)
  setup.php                          # theme supports + vendor libs (vanilla Sage role; no block code here)
  filters.php                        # WP filters (vanilla Sage role)
  Providers/
    ThemeServiceProvider.php         # registers the `@paddingClasses` Blade directive (Sage's own scaffolded provider)

resources/
  blocks/
    testimonial-carousel/            # folder name = block slug
      block.json                     # metadata; `render` points to block.php
      block.php                      # data prep + view(...)->render()
      block.jsx                      # editor (React, server-rendered save: null)
      block.js                       # frontend behavior (e.g. init Swiper)
      block.css                      # styles scoped under .testimonial-carousel
      preview.svg                    # inserter-hover preview (placeholder; swap for .webp/.png if you want)
    components/
      backend/                       # shared JSX components used across blocks
        ImageUploadWithHover.jsx
        LinkPicker.jsx
        RemoveButton.jsx
        TabSelector.jsx
        PaddingControls.jsx
        padding-presets.js
        ImagePositionControl.jsx
        IconPicker.jsx
  views/
    blocks/
      testimonial-carousel.blade.php # view-only Blade
  js/
    vendor/
      swiper-bundle.min.js           # pre-built distributable
  css/
    vendor/
      swiper-bundle.min.css

vite.config.js                       # discoverBlockAssets() makes block.js/.css Vite entries
```

## Responsibilities

| Concern | Owned by |
|---|---|
| List of blocks the theme exposes | `BlockManager::$blocks` (manual list, on purpose) |
| Attributes injected into every block (e.g. padding presets) | `BlockManager::globalAttributes()` |
| Calling `register_block_type` for each block | `BlockManager::registerSingleBlock()` |
| Block bootstrap (centralizes block-related wiring) | `app/blocks.php` — calls `BlockCategories::register()` and the BlockManager `init` action. Loaded by `functions.php` via `collect(['setup', 'filters', 'blocks'])` (Sage's "categorically named theme files" mechanism). |
| Custom block category (so the team's blocks group together in the inserter) | `app/Blocks/BlockCategories.php` (class with consts `SLUG`/`TITLE` + static `register()` that hooks `block_categories_all`). Called from `app/blocks.php`. |
| Shared editor components (image picker, link picker, repeater tabs, delete button, padding panel, etc.) | `resources/blocks/components/backend/` (re-used by every `block.jsx`) |
| Vendor libs registration (URL + version) | `app/setup.php` (`wp_register_script`/`wp_register_style` on `init`) |
| Vendor libs enqueue (per-block, conditional) | `block.php` of each block that needs the lib (`wp_enqueue_script`/`wp_enqueue_style`) |
| Per-block local assets (`block.js`, `block.css`) | Vite (`discoverBlockAssets()` in `vite.config.js`) + `@roots/vite-plugin` |
| Data preparation/sanitization for a block | `<block>/block.php` |
| Rendering markup | `resources/views/blocks/<slug>.blade.php` (Blade is view-only) |
| Editor UI (Gutenberg) | `<block>/block.jsx` |
| Padding attrs → Tailwind class string | `App\Blocks\BlockPadding::resolve()`, via the `@paddingClasses(...)` Blade directive registered in `app/Providers/ThemeServiceProvider.php` |
| `imagePosition` attr → Tailwind `object-*` class (or raw CSS value) | `App\Blocks\BlockImagePosition::objectClass()` / `::cssValue()` |

## How to read this reference

- **Blade is view-only.** Data is shaped/sanitized in `block.php`; the Blade
  view loops over already-prepared data and only decides *how* it looks.
- **`{{ }}` auto-escapes** (≈ `esc_html`). The one raw output is
  `{!! wp_get_attachment_image(...) !!}` — trusted HTML from WP core.
- **Vendor libs are downloaded into `resources/{js,css}/vendor/`** as
  pre-built distributables. `wp_register_script`/`wp_register_style` lives
  in `app/setup.php` (centralized inventory of URL + version). Each
  `block.php` that needs a lib calls `wp_enqueue_script`/`wp_enqueue_style`
  for the handle, so libs only load on pages that have those blocks.
- **Block-local assets (`block.js`/`block.css`) are NOT in `block.json`.**
  They are discovered by `vite.config.js` and wired by `@roots/vite-plugin`.
- **`block.json` uses `"render": "file:./block.php"`** — WP 6.1+ runs that PHP
  as the block's render. No `render_callback` is passed to `register_block_type`.
- **Every block has a unique root class** matching its slug
  (`.testimonial-carousel`) — encapsulation scope for the styles.
- **Shared editor components live in `resources/blocks/components/backend/`** — every
  `block.jsx` imports `PaddingControls` from there (renders the spacing panel in
  the sidebar); blocks with images use `ImageUploadWithHover` +
  `ImagePositionControl`, blocks with internal/external links use `LinkPicker`
  (a thin Popover wrapper around Gutenberg's `<LinkControl>` — the link
  attribute is stored as the **native LinkControl object** `{url, opensInNewTab}`,
  not a stringly-typed marker), blocks with array attributes use
  `TabSelector` + `RemoveButton` for the tab-style repeater. These ship with
  the team's `create-block` skill — see `skills/create-block/templates/`.
- **Editor layout pattern**: every block.jsx renders `<PaddingControls />`
  (sidebar config) outside the wrapper, then a `<section>` with the dashed
  border + bg color + `mb-10` margin to separate blocks visually. Inside the
  section, content fields go in labeled white cards
  (`<div className="p-3 border border-gray-300 rounded bg-white">`).
- **Field control rule**: long copy (descriptions, paragraphs, quotes)
  uses `<RichText>` so inline bold/italic/links work; **headings,
  labels and short single-line text use a plain `<input type="text">`**
  inside the same white-card wrapper. Mixing bold/links into a heading
  or button label is almost always wrong, and a single-line `<input>`
  is friendlier for placeholder + accidental-newline behavior than
  `RichText`. The `LinkPicker` button is sized to match that white-card
  input height so a CTA text + CTA link pair lines up in a `flex` row.
- **Repeater delete UI**: array repeaters using `<TabSelector>` place
  `<RemoveButton />` (red pill — same visual style as the
  `ImageUploadWithHover` "Remove image" button: white text on `#dc2626`,
  4×8 padding, 4px radius; default label "Delete Item") in a
  `<div className="flex justify-end">` at the **top of the active
  item's panel**, gated by `items.length > 1`. No trash icon, no
  inline-with-fields placement.
- **Padding is never rendered ad hoc.** Every block receives the four
  global padding attributes (see Responsibilities above); the Blade view
  applies them with `@paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop)`
  on its root wrapper — see this block's Blade view below. A block that
  renders an `imagePosition` attribute (a background/cover image) maps it
  to a class with `App\Blocks\BlockImagePosition::objectClass($imagePosition)`
  rather than hardcoding one — see **Reference block 2** and
  **Reference block 3** below, since this block doesn't render a
  positioned background image itself.

---

## `app/Blocks/BlockManager.php`

Minimal manager: a flat list of block slugs, global attributes merged into
each block at registration, nothing else. Vendor libs and their enqueue
behavior live elsewhere (`app/setup.php` registers; `block.php` enqueues).
Adding a new block = create the folder + add the slug to the `$blocks` array.

```php
<?php

namespace App\Blocks;

class BlockManager
{
    /**
     * Folders under resources/blocks/ (each must contain a block.json).
     */
    protected array $blocks = [
        'testimonial-carousel',
        // 'hero',
        // 'split-banner',
    ];

    /**
     * Gutenberg block namespace — the prefix used in each block's `block.json`
     * `name` field (e.g., "sage/<slug>"). Not used internally by BlockManager;
     * exposed via getNamespace() so external tooling (the `create-block` skill)
     * knows what prefix to put in new block.json files.
     *
     * Not the same as:
     *   - PHP namespace `App\` (composer PSR-4 autoload, in composer.json)
     *   - Text domain `sage` (used by __('...', 'sage') for translations)
     */
    protected string $namespace = 'sage';

    /**
     * Global attributes injected into every block at registration time.
     * Change defaults here; per-block attributes (in block.json) take precedence.
     */
    protected function globalAttributes(): array
    {
        return [
            'paddingVertDesktop' => ['type' => 'number',  'default' => 112],
            'paddingVertMobile'  => ['type' => 'number',  'default' => 56],
            'paddingXDesktop'    => ['type' => 'boolean', 'default' => true],
            'paddingXMobile'     => ['type' => 'boolean', 'default' => true],
        ];
    }

    public function register(): void
    {
        foreach ($this->blocks as $blockName) {
            $this->registerSingleBlock($blockName);
        }
    }

    protected function registerSingleBlock(string $blockName): void
    {
        $blockPath = get_template_directory() . "/resources/blocks/{$blockName}";
        $blockJson = "{$blockPath}/block.json";

        if (!is_dir($blockPath) || !file_exists($blockJson)) {
            return;
        }

        $metadata   = json_decode(file_get_contents($blockJson), true);
        $blockAttrs = $metadata['attributes'] ?? [];

        // Global attributes are the base; block-level attributes take precedence.
        $mergedAttributes = array_merge($this->globalAttributes(), $blockAttrs);

        register_block_type($blockPath, ['attributes' => $mergedAttributes]);
    }

    public function addBlock(string $blockName): void
    {
        if (!in_array($blockName, $this->blocks, true)) {
            $this->blocks[] = $blockName;
        }
    }

    public function getBlocks(): array
    {
        return $this->blocks;
    }

    public function getNamespace(): string
    {
        return $this->namespace;
    }
}
```

## `app/blocks.php` (block bootstrap)

Central block-bootstrap file. Loaded by `functions.php` via Sage's
`collect([...])` mechanism — keeps `setup.php`/`filters.php` vanilla
and makes the block lifecycle discoverable in one place.

```php
<?php

namespace App;

use App\Blocks\BlockCategories;
use App\Blocks\BlockManager;

// Register the custom block category (filter — fires before init).
BlockCategories::register();

// Register all blocks once WP is ready.
add_action('init', function () {
    (new BlockManager())->register();
});
```

For this file to load, `functions.php` must include `'blocks'` in its
`collect([...])` array:

```diff
-collect(['setup', 'filters'])
+collect(['setup', 'filters', 'blocks'])
     ->each(function ($file) {
         if (! locate_template($file = "app/{$file}.php", true, true)) {
             // ...
         }
     });
```

Without `'blocks'` in the array, the file is never required and no
blocks register.

## `app/setup.php` (vendor libs — vanilla Sage role)

`setup.php` keeps its stock Sage role: theme supports, nav menus,
sidebars, and theme-level asset registration. **No block-related code
here** — block bootstrap moved to `app/blocks.php`. Vendor libs still
live in `setup.php` since they're theme-level (registered globally,
enqueued per-block):

```php
/**
 * Register vendor libs. Registration != enqueue — nothing loads here.
 * Each block's block.php that needs a lib calls wp_enqueue_script/style
 * for the handle when it renders, so libs only load on pages that have
 * those blocks.
 */
add_action('init', function () {
    wp_register_script('swiper',
        get_theme_file_uri('resources/js/vendor/swiper-bundle.min.js'),
        [], '11.0', true);
    wp_register_style('swiper',
        get_theme_file_uri('resources/css/vendor/swiper-bundle.min.css'),
        [], '11.0');
});
```

## `vite.config.js` — block asset discovery

`block.js` / `block.css` for each block become Vite entries automatically by
folder convention — no manual list to keep in sync.

```js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { wordpressPlugin } from '@roots/vite-plugin';
import fs from 'fs';
import path from 'path';

function discoverBlockAssets() {
  const entries = [];
  const blocksDir = 'resources/blocks';
  if (!fs.existsSync(blocksDir)) return entries;

  for (const dirent of fs.readdirSync(blocksDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const blockPath = path.join(blocksDir, dirent.name);
    for (const file of ['block.js', 'block.css']) {
      const p = path.join(blockPath, file);
      if (fs.existsSync(p)) entries.push(p);
    }
  }
  return entries;
}

export default defineConfig({
  plugins: [
    laravel({
      input: [
        'resources/css/app.css',
        'resources/js/app.js',
        ...discoverBlockAssets(),
      ],
      refresh: true,
    }),
    wordpressPlugin(),
  ],
});
```

---

## Reference block: `testimonial-carousel`

A Swiper-based carousel. Demonstrates conditional vendor enqueue, view-only
Blade, sanitization at the boundary, and BEM-scoped styles.

### `resources/blocks/testimonial-carousel/block.json`

No `viewScript`/`style`/`editorScript` keys — those local assets are wired
by Vite + `@roots/vite-plugin`. `render` points to the per-block PHP.

```json
{
  "apiVersion": 3,
  "name": "sage/testimonial-carousel",
  "title": "Testimonial Carousel",
  "category": "custom-blocks",
  "icon": "format-quote",
  "description": "A Swiper-based testimonials carousel.",
  "keywords": ["testimonial", "quote", "carousel"],
  "textdomain": "sage",
  "render": "file:./block.php",
  "attributes": {
    "isPreview": {
      "type": "boolean",
      "default": false
    },
    "heading": {
      "type": "string",
      "default": ""
    },
    "bgImageId": {
      "type": "number",
      "default": 0
    },
    "bgImageUrl": {
      "type": "string",
      "default": ""
    },
    "bgImagePosition": {
      "type": "string",
      "default": "center"
    },
    "items": {
      "type": "array",
      "default": []
    }
  },
  "supports": {
    "html": false,
    "align": ["wide", "full"]
  },
  "example": {
    "attributes": {
      "isPreview": true
    }
  }
}
```

### `resources/blocks/testimonial-carousel/block.php`

Runs as the block's render (via `block.json` `render` key). Shapes/sanitizes
data, then hands off to Blade. Blade never touches raw attributes.

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

// Swiper was registered in app/setup.php; enqueue it here so it only loads
// on pages where this block is actually rendered.
wp_enqueue_script('swiper');
wp_enqueue_style('swiper');

/**
 * Item shape (one entry of the `items` attribute):
 *   [ 'quote' => string, 'author' => string, 'role' => string, 'imageId' => int ]
 */
$attributes = $attributes ?? [];

$items = array_map(static function (array $item): array {
    return [
        'quote'    => sanitize_text_field($item['quote']  ?? ''),
        'author'   => sanitize_text_field($item['author'] ?? ''),
        'role'     => sanitize_text_field($item['role']   ?? ''),
        // Editor input — coerce on the way in.
        'image_id' => isset($item['imageId']) ? absint($item['imageId']) : 0,
    ];
}, $attributes['items'] ?? []);

echo view('blocks.testimonial-carousel', [
    'heading'         => sanitize_text_field($attributes['heading'] ?? ''),
    'bgImageId'       => absint($attributes['bgImageId'] ?? 0),
    'bgImageUrl'      => esc_url_raw($attributes['bgImageUrl'] ?? ''),
    'bgImagePosition' => sanitize_text_field($attributes['bgImagePosition'] ?? 'center'),
    'items'           => $items,
    // Global padding attributes injected by BlockManager::globalAttributes().
    'paddingVertDesktop' => absint($attributes['paddingVertDesktop'] ?? 112),
    'paddingVertMobile'  => absint($attributes['paddingVertMobile']  ?? 56),
    'paddingXDesktop'    => (bool) ($attributes['paddingXDesktop']   ?? true),
    'paddingXMobile'     => (bool) ($attributes['paddingXMobile']    ?? true),
])->render();
```

### `resources/blocks/testimonial-carousel/block.jsx`

Editor side (Gutenberg). `save: () => null` because rendering is server-side.

```jsx
import { registerBlockType } from '@wordpress/blocks';
import {
    useBlockProps,
    MediaUpload,
    MediaUploadCheck,
    RichText,
} from '@wordpress/block-editor';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { PaddingControls }       from '../components/backend/PaddingControls.jsx';
import { ImageUploadWithHover }  from '../components/backend/ImageUploadWithHover.jsx';
import { ImagePositionControl }  from '../components/backend/ImagePositionControl.jsx';
import { TabSelector }           from '../components/backend/TabSelector.jsx';
import { RemoveButton }          from '../components/backend/RemoveButton.jsx';
import previewImage from './preview.svg';
import metadata from './block.json';

registerBlockType(metadata, {
    edit({ attributes, setAttributes }) {
        const blockProps = useBlockProps();
        const { isPreview, heading, bgImageId, bgImageUrl, bgImagePosition, items } = attributes;

        // Static preview for the Gutenberg inserter hover panel.
        if (isPreview) {
            return (
                <div {...blockProps}>
                    <img
                        src={previewImage}
                        alt={__('Testimonial Carousel preview', 'sage')}
                        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
                    />
                </div>
            );
        }

        // Repeater helpers — see Phase 2 of the create-block skill for the canonical pattern.
        const [activeIdx, setActiveIdx] = useState(0);
        const safeItems = items || [];
        const updateItem = (index, patch) =>
            setAttributes({ items: safeItems.map((it, i) => i === index ? { ...it, ...patch } : it) });
        const removeItem = (index) => {
            setAttributes({ items: safeItems.filter((_, i) => i !== index) });
            setActiveIdx(Math.max(0, index - 1));
        };
        const addItem = () => {
            const next = [...safeItems, { quote: '', author: '', role: '', imageId: 0, imageUrl: '' }];
            setAttributes({ items: next });
            setActiveIdx(next.length - 1);
        };

        const active = safeItems[activeIdx];

        return (
            <>
                {/* Sidebar (InspectorControls) — config only. */}
                <PaddingControls attributes={attributes} setAttributes={setAttributes} />

                {/* Editor body — content in the dashed wrapper. */}
                <section
                    {...blockProps}
                    className={`${blockProps.className} mb-10 bg-gray-50 border-2 border-dashed border-gray-600 rounded-lg p-6 relative overflow-hidden`}
                >
                    <h3 className="text-base font-sans! font-bold mb-8 uppercase tracking-widest text-gray-500 relative z-10">
                        Testimonial Carousel Preview
                    </h3>

                    <div className="space-y-6 relative z-10">
                        {/* Heading — short text → plain input */}
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Heading</label>
                            <div className="p-3 border border-gray-300 rounded bg-white">
                                <input
                                    type="text"
                                    value={heading}
                                    onChange={(e) => setAttributes({ heading: e.target.value })}
                                    placeholder={__('Section heading…', 'sage')}
                                    className="w-full border-0 outline-none m-0 p-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                        {/* Background image (optional) */}
                        <div className="p-4 bg-white/50 rounded-lg border border-gray-200">
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Background</label>
                            <MediaUploadCheck>
                                <ImageUploadWithHover
                                    imageId={bgImageId}
                                    imageUrl={bgImageUrl}
                                    MediaUpload={MediaUpload}
                                    onSelect={(media) => setAttributes({ bgImageId: media.id, bgImageUrl: media.url })}
                                    onRemove={() => setAttributes({ bgImageId: 0, bgImageUrl: '' })}
                                    height="200px"
                                />
                            </MediaUploadCheck>
                            <ImagePositionControl
                                value={bgImagePosition}
                                onChange={(val) => setAttributes({ bgImagePosition: val })}
                            />
                        </div>

                        {/* Slides repeater — tabs pattern */}
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <TabSelector
                                items={safeItems}
                                activeItem={activeIdx}
                                setActiveItem={setActiveIdx}
                                addItem={addItem}
                                itemLabelPrefix={__('Slide', 'sage')}
                            />

                            {active && (
                                <div className="space-y-4">
                                    {/* Delete pill (same style as the ImageUploadWithHover "Remove image" button) — top-right of the active item's panel */}
                                    {safeItems.length > 1 && (
                                        <div className="flex justify-end">
                                            <RemoveButton
                                                confirmMessage={__('Remove this slide?', 'sage')}
                                                onClick={() => removeItem(activeIdx)}
                                            />
                                        </div>
                                    )}

                                    {/* Quote — long copy → RichText */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Quote</label>
                                        <div className="p-3 border border-gray-300 rounded bg-white">
                                            <RichText
                                                tagName="p"
                                                value={active.quote}
                                                onChange={(value) => updateItem(activeIdx, { quote: value })}
                                                className="!m-0 min-h-[80px]"
                                                placeholder={__('Enter testimonial quote…', 'sage')}
                                            />
                                        </div>
                                    </div>

                                    {/* Author — short text → plain input */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Author</label>
                                        <div className="p-3 border border-gray-300 rounded bg-white">
                                            <input
                                                type="text"
                                                value={active.author}
                                                onChange={(e) => updateItem(activeIdx, { author: e.target.value })}
                                                placeholder={__('Author name…', 'sage')}
                                                className="w-full border-0 outline-none m-0 p-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </>
        );
    },

    // Server-rendered via block.php — no client save.
    save: () => null,
});
```

### `resources/blocks/testimonial-carousel/block.js`

Frontend behavior. Swiper is registered by `BlockManager` and enqueued only
when this block renders, so `window.Swiper` is available here.

```js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Swiper === 'undefined') return;

    document.querySelectorAll('.testimonial-carousel__viewport').forEach((el) => {
        new Swiper(el, {
            loop: true,
            slidesPerView: 1,
            spaceBetween: 24,
            navigation: {
                nextEl: el.querySelector('.testimonial-carousel__next'),
                prevEl: el.querySelector('.testimonial-carousel__prev'),
            },
        });
    });
});
```

### `resources/blocks/testimonial-carousel/block.css`

Scoped under the block root class. Tailwind default scale via `@apply`. BEM
because this block has nested states (track/item/person/role).

```css
.testimonial-carousel {
    @apply py-16;
}

.testimonial-carousel__heading {
    @apply mb-8 text-3xl font-bold leading-tight;
}

.testimonial-carousel__viewport {
    @apply relative overflow-hidden;
}

.testimonial-carousel__track {
    @apply flex;
}

.testimonial-carousel__item {
    @apply flex flex-col gap-4 rounded-lg bg-gray-50 p-6;
}

.testimonial-carousel__quote {
    @apply text-lg italic text-gray-800;
}

.testimonial-carousel__person {
    @apply flex items-center gap-3;
}

.testimonial-carousel__avatar {
    @apply h-12 w-12 rounded-full object-cover;
}

.testimonial-carousel__author {
    @apply font-semibold;
}

.testimonial-carousel__role {
    @apply text-sm text-gray-500;
}

.testimonial-carousel__prev,
.testimonial-carousel__next {
    @apply absolute top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2;
}
```

### `resources/views/blocks/testimonial-carousel.blade.php`

View-only. Data was prepared in `block.php`. `{{ }}` auto-escapes; the only
raw output is `wp_get_attachment_image()` — trusted HTML from WP core, called
with an **explicit image size** (CLAUDE.md › Performance).

```blade
{{--
    View-only (CLAUDE.md › PHP/Blade): no queries, no business logic, no
    fetching. `.testimonial-carousel` is the block's unique root class —
    encapsulation scope for the styles (CLAUDE.md › CSS).
--}}
@unless (empty($items))
    <section
        class="testimonial-carousel @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop)"
        aria-label="{{ $heading ?: __('Testimonials', 'sage') }}"
    >
        @if ($heading)
            <h2 class="testimonial-carousel__heading">{{ $heading }}</h2>
        @endif

        <div class="testimonial-carousel__viewport swiper">
            <ul class="testimonial-carousel__track swiper-wrapper">
                @foreach ($items as $item)
                    <li class="testimonial-carousel__item swiper-slide">
                        <blockquote class="testimonial-carousel__quote">{{ $item['quote'] }}</blockquote>

                        <div class="testimonial-carousel__person">
                            @if ($item['image_id'])
                                {{-- Explicit size — CLAUDE.md › Performance --}}
                                {!! wp_get_attachment_image($item['image_id'], 'thumbnail', false, [
                                    'class' => 'testimonial-carousel__avatar',
                                    'alt'   => $item['author'],
                                ]) !!}
                            @endif

                            <p class="testimonial-carousel__author">{{ $item['author'] }}</p>

                            @if ($item['role'])
                                <p class="testimonial-carousel__role">{{ $item['role'] }}</p>
                            @endif
                        </div>
                    </li>
                @endforeach
            </ul>

            <button type="button" class="testimonial-carousel__prev" aria-label="{{ __('Previous', 'sage') }}">‹</button>
            <button type="button" class="testimonial-carousel__next" aria-label="{{ __('Next', 'sage') }}">›</button>
        </div>
    </section>
@endunless
```

---

## Reference block 2: `vision-accordion`

Demonstrates a pattern block 1 doesn't: an array repeater where each item
carries an **icon** (via the `IconPicker` shared component), and a
**zero-JS-framework accordion** — the open/closed state is driven by a
hidden `<input type="checkbox">` and pure CSS (`peer-checked:...`);
`accordion.js` only closes sibling items so a checkbox group behaves like
an accordion (checkboxes, unlike radios, can also be closed by clicking
the open one again — the one behavior CSS alone can't give us "for free").
Also demonstrates applying `BlockImagePosition::objectClass()` to a real
positioned background image, and validating a repeater field's value
(`icon`) against an allow-list in `block.php` rather than in Blade.

### `resources/blocks/vision-accordion/block.json`

```json
{
    "apiVersion": 3,
    "name": "sage/vision-accordion",
    "title": "Vision Accordion",
    "category": "custom-blocks",
    "icon": "list-view",
    "description": "Two-column layout: heading + accordion (left) and image (right).",
    "textdomain": "sage",
    "render": "file:./block.php",
    "supports": {
        "anchor": true
    },
    "attributes": {
        "isPreview": {
            "type": "boolean",
            "default": false
        },
        "title": {
            "type": "string",
            "default": "Our Vision"
        },
        "description": {
            "type": "string",
            "default": ""
        },
        "items": {
            "type": "array",
            "default": [
                {
                    "title": "Excellence",
                    "body": "",
                    "icon": "chakra-crown"
                }
            ]
        },
        "imageId": {
            "type": "number",
            "default": 0
        },
        "imageUrl": {
            "type": "string",
            "default": ""
        },
        "imagePosition": {
            "type": "string",
            "default": "center"
        },
        "showImageOverlay": {
            "type": "boolean",
            "default": false
        }
    },
    "example": {
        "attributes": {
            "isPreview": true
        }
    }
}
```

### `resources/blocks/vision-accordion/block.php`

The real project's version stored raw strings (no `sanitize_text_field`/
`wp_kses_post`), cast padding numbers with `(int)` instead of `absint`,
and validated `item.icon` against an allow-list **inside the Blade
view**. This corrected version sanitizes every field at the boundary and
moves the icon allow-list check here — validating input is data
preparation, not the render-control logic Blade is scoped to.

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// Matches the icon set IconPicker's options list offers in block.jsx —
// validated here so an unexpected value can't reach the icon-file lookup
// in Blade.
$allowedIcons = [
    'chakra-crown', 'chakra-third-eye', 'chakra-throat', 'chakra-heart',
    'chakra-solar-plexus', 'chakra-sacral', 'chakra-root',
    'personalized-healthcare-40', 'mindful-yoga-40',
    'preventative-family-medicine-40', 'health',
];

$items = array_map(static function (array $item) use ($allowedIcons): array {
    $icon = $item['icon'] ?? '';

    return [
        // RichText content — inline formatting (e.g. <strong>) is expected.
        'title' => wp_kses_post($item['title'] ?? ''),
        'body'  => wp_kses_post($item['body']  ?? ''),
        'icon'  => in_array($icon, $allowedIcons, true) ? $icon : 'chakra-crown',
    ];
}, $attributes['items'] ?? []);

echo view('blocks.vision-accordion', [
    'title'            => wp_kses_post($attributes['title'] ?? ''),
    'description'      => wp_kses_post($attributes['description'] ?? ''),
    'items'            => $items,
    'imageId'          => absint($attributes['imageId'] ?? 0),
    'imagePosition'    => sanitize_text_field($attributes['imagePosition'] ?? 'center'),
    'showImageOverlay' => (bool) ($attributes['showImageOverlay'] ?? false),
    'anchor'           => sanitize_html_class($attributes['anchor'] ?? ''),

    // Global padding attributes injected by BlockManager::globalAttributes().
    'paddingVertDesktop' => absint($attributes['paddingVertDesktop'] ?? 112),
    'paddingVertMobile'  => absint($attributes['paddingVertMobile']  ?? 56),
    'paddingXDesktop'    => (bool) ($attributes['paddingXDesktop']   ?? true),
    'paddingXMobile'     => (bool) ($attributes['paddingXMobile']    ?? true),
])->render();
```

### `resources/blocks/vision-accordion/block.jsx`

Editor side had no standards deviation in the source — reproduced with
the corrected `IconPicker` (see below): the block, not the shared
component, knows which icons live in a `chakras/` subfolder.

```jsx
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, MediaUpload, MediaUploadCheck, RichText } from '@wordpress/block-editor';
import { ToggleControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { PaddingControls } from '../components/backend/PaddingControls.jsx';
import { ImageUploadWithHover } from '../components/backend/ImageUploadWithHover.jsx';
import { ImagePositionControl } from '../components/backend/ImagePositionControl.jsx';
import { RemoveButton } from '../components/backend/RemoveButton.jsx';
import { IconPicker } from '../components/backend/IconPicker.jsx';
import { TabSelector } from '../components/backend/TabSelector.jsx';
import previewImage from './preview.svg';
import metadata from './block.json';

const ICON_OPTIONS = [
    { label: 'Crown (Default)', value: 'chakra-crown' },
    { label: 'Third Eye', value: 'chakra-third-eye' },
    { label: 'Throat', value: 'chakra-throat' },
    { label: 'Heart', value: 'chakra-heart' },
    { label: 'Solar Plexus', value: 'chakra-solar-plexus' },
    { label: 'Sacral', value: 'chakra-sacral' },
    { label: 'Root', value: 'chakra-root' },
    { label: 'Healthcare', value: 'personalized-healthcare-40' },
    { label: 'Yoga Practice', value: 'mindful-yoga-40' },
    { label: 'Family Medicine', value: 'preventative-family-medicine-40' },
    { label: 'Holistic Health', value: 'health' },
];

// Only the chakra-* icons live under public/icons/chakras/ — everything
// else lives directly under public/icons/. IconPicker itself doesn't know
// this; it's this block's own icon set, so the mapping lives here.
const iconFolderFor = (icon) => (icon.startsWith('chakra-') ? 'chakras' : '');

registerBlockType(metadata, {
    edit({ attributes, setAttributes }) {
        const blockProps = useBlockProps();
        const { isPreview, title, description, items, imageId, imageUrl, imagePosition, showImageOverlay } = attributes;

        if (isPreview) {
            return (
                <div {...blockProps}>
                    <img
                        src={previewImage}
                        alt="Vision Accordion preview"
                        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
                    />
                </div>
            );
        }

        const [activeItem, setActiveItem] = useState(0);

        const updateItem = (index, field, value) => {
            const next = [...items];
            next[index] = { ...next[index], [field]: value };
            setAttributes({ items: next });
        };

        const addItem = () => {
            const next = [...items, { title: '', body: '', icon: 'chakra-crown' }];
            setAttributes({ items: next });
            setActiveItem(next.length - 1);
        };

        const removeItem = (index) => {
            const next = items.filter((_, i) => i !== index);
            setAttributes({ items: next.length ? next : [{ title: '', body: '', icon: 'chakra-crown' }] });
            setActiveItem(Math.max(0, index - 1));
        };

        const active = items[activeItem];

        return (
            <>
                <PaddingControls attributes={attributes} setAttributes={setAttributes} />

                <section {...blockProps} className={`${blockProps.className} mb-10 bg-gray-50 border-2 border-dashed border-gray-600 rounded-lg p-6`}>
                    <h3 className="text-base font-sans! font-bold mb-6 text-gray-500 uppercase tracking-widest">Vision Accordion Preview</h3>

                    <div className="flex flex-col gap-6">
                        {/* Background image */}
                        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <MediaUploadCheck>
                                <ImageUploadWithHover
                                    imageId={imageId}
                                    imageUrl={imageUrl}
                                    MediaUpload={MediaUpload}
                                    onSelect={(media) => setAttributes({ imageId: media.id, imageUrl: media.url })}
                                    onRemove={() => setAttributes({ imageId: 0, imageUrl: '' })}
                                    height="220px"
                                />
                            </MediaUploadCheck>
                            <ImagePositionControl
                                value={imagePosition}
                                onChange={(val) => setAttributes({ imagePosition: val })}
                            />
                            <ToggleControl
                                label="Green image overlay"
                                checked={!!showImageOverlay}
                                onChange={(val) => setAttributes({ showImageOverlay: val })}
                                className="!mb-0 mt-3"
                            />
                        </div>

                        {/* Heading + description — short text → plain input; long copy → RichText */}
                        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Title</label>
                                <div className="p-3 border border-gray-300 rounded bg-white">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setAttributes({ title: e.target.value })}
                                        placeholder="Enter title…"
                                        className="w-full border-0 outline-none m-0 p-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Description</label>
                                <div className="p-3 border border-gray-300 rounded bg-white">
                                    <RichText
                                        tagName="p"
                                        value={description}
                                        onChange={(value) => setAttributes({ description: value })}
                                        className="!m-0 min-h-[60px]"
                                        placeholder="Enter description…"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Items repeater — icon + title + body */}
                        <div className="space-y-4">
                            <TabSelector
                                items={items}
                                activeItem={activeItem}
                                setActiveItem={setActiveItem}
                                addItem={addItem}
                                itemLabelPrefix="Item"
                            />

                            {active && (
                                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
                                    {items.length > 1 && (
                                        <div className="flex justify-end">
                                            <RemoveButton onClick={() => removeItem(activeItem)} />
                                        </div>
                                    )}

                                    <IconPicker
                                        label={`Item ${activeItem + 1} Icon`}
                                        value={active.icon || 'chakra-crown'}
                                        options={ICON_OPTIONS}
                                        onChange={(val) => updateItem(activeItem, 'icon', val)}
                                        iconFolder={iconFolderFor(active.icon || 'chakra-crown')}
                                    />

                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Title</label>
                                        <div className="p-2 border border-gray-300 rounded bg-white">
                                            <input
                                                type="text"
                                                value={active.title}
                                                onChange={(e) => updateItem(activeItem, 'title', e.target.value)}
                                                placeholder="Item title…"
                                                className="w-full border-0 outline-none m-0 p-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Body</label>
                                        <div className="p-2 border border-gray-300 rounded bg-white">
                                            <RichText
                                                tagName="p"
                                                value={active.body}
                                                onChange={(val) => updateItem(activeItem, 'body', val)}
                                                className="!m-0 min-h-[60px]"
                                                placeholder="Item body…"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </>
        );
    },

    save: () => null,
});
```

### `resources/blocks/vision-accordion/accordion.js`

Unmodified from the source — already minimal and framework-free.

```js
// Vision accordion — single-open behaviour with click-again-to-close.
//
// The open/closed visuals are pure CSS, driven by the input's :checked state.
// Using <input type="checkbox"> gives "click an open item again to close it"
// for free (radios can't be unchecked by clicking). The only thing checkboxes
// don't do on their own is enforce one-open-at-a-time — so when one opens we
// close the others that share its name (the accordion group).
//
// Markup contract:
//   - each item's toggle is an <input class="vision-accordion-input">
//   - items in the same accordion share the same `name`
//
// Degrades gracefully: with JS off, checkboxes still toggle (just without the
// single-open constraint).

function init() {
  const inputs = Array.from(document.querySelectorAll('.vision-accordion-input'));
  if (!inputs.length) return;

  for (const input of inputs) {
    input.addEventListener('change', () => {
      if (!input.checked) return;
      for (const other of inputs) {
        if (other !== input && other.name === input.name) {
          other.checked = false;
        }
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

### `resources/views/blocks/vision-accordion.blade.php`

Icon **validation** (allow-listing) moved to `block.php` — Blade only
maps an already-trusted icon name to its file path, a purely
presentational lookup. The background image now renders via
`wp_get_attachment_image()` with an explicit size instead of a raw
`<img src="{{ $imageUrl }}">`, and the root `<section>` applies
`@paddingClasses(...)`.

```blade
{{-- View-only. Icon validity is checked in block.php; this file only maps
     an already-trusted icon name to its SVG file path. --}}
@php
    $accordionGroup = 'vision-accordion-' . uniqid();
    $chakraIcons = [
        'chakra-crown', 'chakra-third-eye', 'chakra-throat', 'chakra-heart',
        'chakra-solar-plexus', 'chakra-sacral', 'chakra-root',
    ];
@endphp

<section
    @if ($anchor) id="{{ $anchor }}" @endif
    class="vision-accordion relative w-full bg-light-green overflow-hidden @paddingClasses($paddingVertMobile, $paddingVertDesktop, false, false)"
>
    <div class="grid grid-cols-1 lg:grid-cols-2">

        {{-- Left column: heading + accordion --}}
        <div class="relative px-6 md:px-12 lg:pl-24 lg:pr-12">
            <div class="flex flex-col gap-10">
                <div class="flex flex-col gap-8">
                    @if ($title)
                        <h2 class="!mb-0 vision-accordion__title">{!! $title !!}</h2>
                    @endif
                    @if ($description)
                        <p class="!mb-0 vision-accordion__description">{!! $description !!}</p>
                    @endif
                </div>

                <div class="relative z-10 flex flex-col gap-5">
                    @foreach ($items as $index => $item)
                        @php
                            $iconSubfolder = in_array($item['icon'], $chakraIcons, true) ? 'chakras/' : '';
                            $iconPath = get_template_directory() . '/public/icons/' . $iconSubfolder . $item['icon'] . '.svg';
                            $iconSvg = file_exists($iconPath) ? file_get_contents($iconPath) : '';
                            $itemId = $accordionGroup . '-' . $index;
                        @endphp

                        <div class="vision-accordion__item">
                            <input
                                type="checkbox"
                                name="{{ $accordionGroup }}"
                                id="{{ $itemId }}"
                                class="peer vision-accordion-input hidden"
                                @if ($index === 0) checked @endif
                            >
                            <div class="vision-accordion__card peer-checked:bg-off-white peer-checked:[&_.vision-accordion__chevron]:rotate-180 peer-checked:[&_.vision-accordion__body-grid]:grid-rows-[1fr]">
                                <label for="{{ $itemId }}" class="vision-accordion__trigger">
                                    @if ($iconSvg)
                                        <span class="vision-accordion__icon">{!! $iconSvg !!}</span>
                                    @endif

                                    <h3 class="vision-accordion__item-title !mb-0">{!! $item['title'] !!}</h3>

                                    <svg class="vision-accordion__chevron" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <path d="M8 12l8 8 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </label>

                                <div class="vision-accordion__body-grid">
                                    <div class="overflow-hidden">
                                        @if (!empty($item['body']))
                                            <p class="vision-accordion__body">{!! $item['body'] !!}</p>
                                        @endif
                                    </div>
                                </div>
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
        </div>

        {{-- Right column: full-bleed background image --}}
        <div class="relative min-h-[400px] lg:min-h-full">
            @if ($showImageOverlay)
                <div class="absolute inset-0 bg-medium-green/[0.15] z-10 pointer-events-none"></div>
            @endif
            @if ($imageId)
                {{-- Explicit size — CLAUDE.md › Performance --}}
                {!! wp_get_attachment_image($imageId, 'large', false, [
                    'class'   => 'absolute inset-0 h-full w-full object-cover ' . \App\Blocks\BlockImagePosition::objectClass($imagePosition),
                    'alt'     => $title ? wp_strip_all_tags($title) : '',
                    'loading' => 'lazy',
                ]) !!}
            @endif
        </div>

    </div>
</section>
```

---

## Reference block 3: `image-card-grid`

Demonstrates a pattern block 1 and 2 don't: a **fixed array** of cards
(add/remove, but no `TabSelector`/active-item state — the editor maps
over `cards` directly), and a **zero-JS** hover/tap-reveal interaction
using native `<details>/<summary>` with CSS `group-open` — no
`accordion.js`-style script at all needed on the frontend.

### `resources/blocks/image-card-grid/block.json`

```json
{
    "apiVersion": 3,
    "name": "sage/image-card-grid",
    "title": "Image Card Grid",
    "category": "custom-blocks",
    "icon": "grid-view",
    "description": "Stacked heading + 3 image cards with hover-reveal body.",
    "textdomain": "sage",
    "render": "file:./block.php",
    "supports": {
        "anchor": true
    },
    "attributes": {
        "isPreview": {
            "type": "boolean",
            "default": false
        },
        "headingSerif": {
            "type": "string",
            "default": ""
        },
        "headingSans": {
            "type": "string",
            "default": ""
        },
        "cards": {
            "type": "array",
            "default": [
                { "title": "", "body": "", "imageId": 0, "imageUrl": "", "imagePosition": "center" }
            ]
        }
    },
    "example": {
        "attributes": {
            "isPreview": true
        }
    }
}
```

### `resources/blocks/image-card-grid/block.php`

Same corrections as block 2: sanitize every field (the source used raw
casts/passthrough strings), `absint` the padding numbers, and each card's
image renders via `wp_get_attachment_image` rather than a raw `<img>`.

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

$cards = array_map(static function (array $card): array {
    return [
        'title'         => wp_kses_post($card['title'] ?? ''),
        'body'          => wp_kses_post($card['body']  ?? ''),
        'imageId'       => absint($card['imageId'] ?? 0),
        'imagePosition' => sanitize_text_field($card['imagePosition'] ?? 'center'),
    ];
}, $attributes['cards'] ?? []);

echo view('blocks.image-card-grid', [
    'headingSerif' => wp_kses_post($attributes['headingSerif'] ?? ''),
    'headingSans'  => wp_kses_post($attributes['headingSans']  ?? ''),
    'cards'        => $cards,
    'anchor'       => sanitize_html_class($attributes['anchor'] ?? ''),

    // Global padding attributes injected by BlockManager::globalAttributes().
    'paddingVertDesktop' => absint($attributes['paddingVertDesktop'] ?? 112),
    'paddingVertMobile'  => absint($attributes['paddingVertMobile']  ?? 56),
    'paddingXDesktop'    => (bool) ($attributes['paddingXDesktop']   ?? true),
    'paddingXMobile'     => (bool) ($attributes['paddingXMobile']    ?? true),
])->render();
```

### `resources/blocks/image-card-grid/block.jsx`

Editor side had no standards deviation — reproduced as-is (adds the
shared `preview.svg` wiring the source used a real `.webp` for instead,
per this kit's placeholder-preview convention).

```jsx
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, MediaUpload, MediaUploadCheck, RichText } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { PaddingControls } from '../components/backend/PaddingControls.jsx';
import { ImageUploadWithHover } from '../components/backend/ImageUploadWithHover.jsx';
import { ImagePositionControl } from '../components/backend/ImagePositionControl.jsx';
import { RemoveButton } from '../components/backend/RemoveButton.jsx';
import previewImage from './preview.svg';
import metadata from './block.json';

registerBlockType(metadata, {
    edit({ attributes, setAttributes }) {
        const blockProps = useBlockProps();
        const { isPreview, headingSerif, headingSans, cards } = attributes;

        if (isPreview) {
            return (
                <div {...blockProps}>
                    <img
                        src={previewImage}
                        alt="Image Card Grid preview"
                        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
                    />
                </div>
            );
        }

        const updateCard = (index, field, value) => {
            const next = [...cards];
            next[index] = { ...next[index], [field]: value };
            setAttributes({ cards: next });
        };

        const addCard = () => {
            setAttributes({
                cards: [...cards, { title: '', body: '', imageId: 0, imageUrl: '', imagePosition: 'center' }],
            });
        };

        const removeCard = (index) => {
            setAttributes({ cards: cards.filter((_, i) => i !== index) });
        };

        return (
            <>
                <PaddingControls attributes={attributes} setAttributes={setAttributes} />

                <section {...blockProps} className={`${blockProps.className} mb-10 bg-gray-50 border-2 border-dashed border-gray-600 rounded-lg p-6`}>
                    <h3 className="text-base font-sans! font-bold mb-6 text-gray-500 uppercase tracking-widest">Image Card Grid Preview</h3>

                    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4 mb-6">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Heading (serif)</label>
                            <div className="p-3 border border-gray-300 rounded bg-white">
                                <input
                                    type="text"
                                    value={headingSerif}
                                    onChange={(e) => setAttributes({ headingSerif: e.target.value })}
                                    placeholder="Serif heading…"
                                    className="w-full border-0 outline-none m-0 p-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Heading (sans)</label>
                            <div className="p-3 border border-gray-300 rounded bg-white">
                                <input
                                    type="text"
                                    value={headingSans}
                                    onChange={(e) => setAttributes({ headingSans: e.target.value })}
                                    placeholder="Sans heading…"
                                    className="w-full border-0 outline-none m-0 p-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fixed-array grid — direct .map(), no active-item state */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {cards.map((card, index) => (
                            <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center pb-2 mb-3 border-b border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Card #{index + 1}</span>
                                    {cards.length > 1 && (
                                        <RemoveButton onClick={() => removeCard(index)} />
                                    )}
                                </div>

                                <MediaUploadCheck>
                                    <ImageUploadWithHover
                                        imageId={card.imageId}
                                        imageUrl={card.imageUrl}
                                        MediaUpload={MediaUpload}
                                        onSelect={(media) => {
                                            updateCard(index, 'imageId', media.id);
                                            updateCard(index, 'imageUrl', media.url);
                                        }}
                                        onRemove={() => {
                                            updateCard(index, 'imageId', 0);
                                            updateCard(index, 'imageUrl', '');
                                        }}
                                        height="160px"
                                    />
                                </MediaUploadCheck>
                                <ImagePositionControl
                                    value={card.imagePosition || 'center'}
                                    onChange={(val) => updateCard(index, 'imagePosition', val)}
                                />

                                <div className="mt-3 space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Title</label>
                                        <div className="p-2 border border-gray-300 rounded bg-white">
                                            <input
                                                type="text"
                                                value={card.title}
                                                onChange={(e) => updateCard(index, 'title', e.target.value)}
                                                placeholder="Card title…"
                                                className="w-full border-0 outline-none m-0 p-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Body (hover)</label>
                                        <div className="p-2 border border-gray-300 rounded bg-white">
                                            <RichText
                                                tagName="p"
                                                value={card.body}
                                                onChange={(val) => updateCard(index, 'body', val)}
                                                className="!m-0 min-h-[60px]"
                                                placeholder="Body shown on hover…"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center mt-4">
                        <Button variant="secondary" onClick={addCard}>+ Add Card</Button>
                    </div>
                </section>
            </>
        );
    },

    save: () => null,
});
```

### `resources/views/blocks/image-card-grid.blade.php`

`<details>/<summary>` with a shared `name` attribute gives "only one open
at a time" natively (same browser behavior as radio-button-driven
accordions) with **zero JavaScript**; `group-open`/`group-hover` classes
drive the reveal animation entirely in CSS.

```blade
{{-- View-only. Data prepared in block.php. --}}
<section
    @if ($anchor) id="{{ $anchor }}" @endif
    class="image-card-grid relative w-full bg-light-green @paddingClasses($paddingVertMobile, $paddingVertDesktop, false, false)"
>
    <div class="mx-auto w-full max-w-[1440px] px-6 lg:px-24">
        <div class="flex flex-col gap-20">

            @if ($headingSerif || $headingSans)
                <div class="flex flex-col items-center text-center">
                    @if ($headingSerif)
                        <p class="!mb-0 image-card-grid__heading-serif">{!! $headingSerif !!}</p>
                    @endif
                    @if ($headingSans)
                        <h2 class="!mb-0 image-card-grid__heading-sans">{!! $headingSans !!}</h2>
                    @endif
                </div>
            @endif

            <div class="flex flex-wrap justify-center gap-6 items-start">
                @foreach ($cards as $card)
                    <details
                        name="image-card-grid"
                        class="group image-card-grid__card"
                    >
                        <summary class="image-card-grid__summary">
                            @if ($card['imageId'])
                                {{-- Explicit size — CLAUDE.md › Performance --}}
                                {!! wp_get_attachment_image($card['imageId'], 'large', false, [
                                    'class'   => 'absolute inset-0 h-full w-full object-cover -z-20 ' . \App\Blocks\BlockImagePosition::objectClass($card['imagePosition']),
                                    'alt'     => $card['title'] ? wp_strip_all_tags($card['title']) : '',
                                    'loading' => 'lazy',
                                ]) !!}
                            @endif

                            <div class="image-card-grid__overlay-default"></div>
                            <div class="image-card-grid__overlay-active"></div>

                            <div class="relative z-10 flex flex-col gap-5">
                                @if (!empty($card['title']))
                                    <h3 class="!mb-0 image-card-grid__card-title">{!! $card['title'] !!}</h3>
                                @endif
                                @if (!empty($card['body']))
                                    <div class="image-card-grid__body-grid">
                                        <div class="overflow-hidden">
                                            <p class="!mb-0 image-card-grid__body">{!! $card['body'] !!}</p>
                                        </div>
                                    </div>
                                @endif
                            </div>
                        </summary>
                    </details>
                @endforeach
            </div>

        </div>
    </div>
</section>
```

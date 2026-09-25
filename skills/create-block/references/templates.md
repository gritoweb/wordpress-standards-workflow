# create-block — The from-scratch file templates (block.json, block.php, block.jsx, block.js, block.css, the Blade view) and their placeholders

Part of the `create-block` skill (`../SKILL.md`); read it only when the task needs it.

## Templates

### Templates directory

```
<skill>/templates/
├── BlockManager.php                → copied to app/Blocks/BlockManager.php (check 0.1)
├── BlockCategories.php             → copied to app/Blocks/BlockCategories.php (check 0.11)
├── BlockPadding.php                → copied to app/Blocks/BlockPadding.php (check 0.15)
├── BlockImagePosition.php          → copied to app/Blocks/BlockImagePosition.php (check 0.15)
├── BlockEntrance.php               → copied to app/Blocks/BlockEntrance.php (check 0.15)
├── BlockMotion.php                 → copied to app/Blocks/BlockMotion.php (check 0.15)
├── entrance.css                    → copied to resources/css/components/entrance.css (check 0.18)
├── hover.css                       → copied to resources/css/components/hover.css (check 0.18)
├── entrance.js                     → copied to resources/js/modules/entrance.js (check 0.19)
├── editor-fidelity.mjs             → copied to scripts/editor-fidelity.mjs (check 0.20)
├── blocks.php                      → copied to app/blocks.php (check 0.6)
├── button-link.blade.php           → copied to resources/views/components/button-link.blade.php (check 0.12)
├── preview.svg                     → copied per block (with __BLOCK_TITLE__ substituted)
└── components/backend/             → copied to resources/blocks/components/backend/ (check 0.12)
    ├── AttachmentImageControl.jsx   ← default image control (X on hover, image icon when empty)
    ├── useAttachmentUrls.js         ← hook for resolving attachment URLs
    ├── ActionEditor.jsx             ← CTA label + link editor (canvas popover)
    ├── ButtonPair.jsx               ← a section button on the canvas: preview + ActionEditor on click
    ├── AutoGrowingTextarea.jsx      ← inline heading/subtitle editor
    ├── editorCanvas.js              ← canvas constants (EDITOR_TYPE, emptyLink)
    ├── EntranceControl.jsx          ← entrance animation sidebar panel
    ├── entranceCanvas.js            ← entrance animation canvas helpers
    ├── DividerControl.jsx           ← section divider selector
    ├── ItemList.jsx                 ← list repeater with drag + keyboard
    ├── moveItem.js                  ← reorder helper for ItemList
    ├── ParagraphsField.jsx          ← multi-paragraph RichText editor
    ├── LinkPicker.jsx
    ├── RemoveButton.jsx             ← deletes an item/row (core trash icon, isDestructive)
    ├── RemoveImageButton.jsx        ← removes an image (core close icon, dark round)
    ├── coreIcons.jsx                ← core icons inlined (trash, close, chevrons, drag handle, image)
    ├── PaddingControls.jsx
    ├── padding-presets.js
    ├── ImagePositionControl.jsx
    └── IconPicker.jsx
```

Copied infra files carry placeholders that must be replaced on copy — none may survive into the project:

| Placeholder | File(s) | Replace with |
|---|---|---|
| `__BLOCK_TITLE__` | `preview.svg` | the block's `<Title>` |
| `__BLOCK_NAMESPACE__` | `BlockManager.php` | the namespace confirmed in check 0.1 |
| `__TEXT_DOMAIN__` | every copied component that calls `__()`, and `BlockMotion.php` | `<text-domain>` |
| `__THEME_SLUG__` | `IconPicker.jsx` | `<theme-slug>` |

Every generated `block.jsx` imports `PaddingControls`; image / link / array blocks add the matching imports as needed.

### Block file placeholders

All block-file templates below use these — substitute throughout:

- `<slug>` — kebab-case (e.g. `testimonial-carousel`)
- `<Title>` — human-readable (e.g. `Testimonial Carousel`)
- `<category>` — custom category from check #11 (default `custom-blocks`)
- `<icon>` — Dashicon picked from context (e.g. `format-quote`)
- `<namespace>` — value of `BlockManager::$namespace` (e.g. `acme`)
- `<text-domain>` — `Text Domain` from the theme's `style.css` (e.g. `acme-2026`)

### Block files (Phase 2)

#### `resources/blocks/<slug>/block.json`

Include `"viewScript"` only when a `block.js` exists, and `"viewStyle"` only
when a `block.css` exists (both optional — see the Tailwind-first rule). A
presentational block omits both lines.

```json
{
    "apiVersion": 3,
    "name": "<namespace>/<slug>",
    "title": "<Title>",
    "category": "<category>",
    "icon": "<icon>",
    "description": "<one-line description>",
    "textdomain": "<text-domain>",
    "render": "file:./block.php",
    "viewScript": "file:./block.js",
    "viewStyle": "file:./block.css",
    "supports": {
        "anchor": true
    },
    "attributes": {
        "isPreview": {
            "type": "boolean",
            "default": false
        },
        // Preset: copy the row for this block's kind from "Entrance animation wiring".
        "entrance": {
            "type": "object",
            "default": { "type": "fade-slide", "direction": "up", "distance": null, "unit": "px", "duration": null, "delay": null, "stagger": 100 }
        }
        // Expand from Phase 1 attributes. Examples:
        // "heading": { "type": "string", "default": "" },
        // "items":   { "type": "array",  "default": [] }
    },
    "example": {
        "attributes": {
            "isPreview": true
        }
    }
}
```

#### `resources/blocks/<slug>/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

// The block's own block.css/block.js are auto-enqueued by WordPress via
// block.json's file: fields — nothing to do here for those.
// Only third-party vendor libs get enqueued here (registered in app/blocks.php):
// wp_enqueue_script('<handle>');
// wp_enqueue_style('<handle>');

$attributes = $attributes ?? [];

echo view('blocks.<slug>', [
    // Per-attribute sanitization (see Phase 2 table).
    // 'heading' => sanitize_text_field($attributes['heading'] ?? ''),

    // Gutenberg HTML anchor → id on the section wrapper (see "Anchor support").
    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),

    // Entrance animation: block.json preset + saved object, sanitized. Consumed
    // by @entrance / @entrancePart in the view (see "Entrance animation wiring").
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),

    // Always include the global padding attrs ($paddingVertMobile, … in the view).
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

#### `resources/blocks/<slug>/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { PaddingControls } from '../components/backend/PaddingControls.jsx';
import { editorPaddingClasses } from '../components/backend/padding-presets.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { resolveEntrance, entranceRootProps, entrancePartProps } from '../components/backend/entranceCanvas.js';
// Uncomment the imports your attributes actually need:
// import { PanelBody } from '@wordpress/components'; // needed if this block has a Background Media panel
// import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
// import { ActionEditor }           from '../components/backend/ActionEditor.jsx';
// import { AutoGrowingTextarea }     from '../components/backend/AutoGrowingTextarea.jsx';
// import { ParagraphsField }         from '../components/backend/ParagraphsField.jsx';
// import { ItemList }                from '../components/backend/ItemList.jsx';
// import { moveItem }                from '../components/backend/moveItem.js';
// import { ImagePositionControl }    from '../components/backend/ImagePositionControl.jsx';
// import { DividerControl }          from '../components/backend/DividerControl.jsx';
// import { LinkPicker }              from '../components/backend/LinkPicker.jsx';
// import { EDITOR_TYPE, EDITOR_BLOCK_FRAME, emptyLink } from '../components/backend/editorCanvas.js';
import previewImage from './preview.svg';
import metadata from './block.json';

registerBlockType(metadata, {
    edit({ attributes, setAttributes, clientId }) {
        const blockProps = useBlockProps();
        const { isPreview } = attributes;
        // Same resolution as BlockEntrance::fromBlock, so canvas == front end.
        const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default ?? {});
        const rootEntrance = entranceRootProps(entrance);
        // Destructure your block's other attributes here.
        // Example: const { heading, bgImageId, bgImagePosition, ctaText, ctaLink } = attributes;
        // const [isEditingButton, setIsEditingButton] = useState(false);

        // Static preview for the Gutenberg inserter hover panel.
        if (isPreview) {
            return (
                <div {...blockProps}>
                    <img
                        src={previewImage}
                        alt={__('<Title> preview', '<text-domain>')}
                        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
                    />
                </div>
            );
        }

        return (
            <>
                {/* Sidebar (InspectorControls) — configuration, plus background media.
                    No text fields, no link editors, no button editing here. */}
                <InspectorControls>
                    {/* Background media panel — only if this block has a bgImageId attribute:
                    <PanelBody title={__('Background Media', '<text-domain>')} initialOpen={true}>
                        <AttachmentImageControl
                            imageId={bgImageId}
                            label={__('Background image', '<text-domain>')}
                            onSelect={(media) => setAttributes({ bgImageId: Number(media.id) || 0 })}
                            onRemove={() => setAttributes({ bgImageId: 0 })}
                            noStylesheet
                        />
                        <ImagePositionControl value={bgImagePosition} onChange={(pos) => setAttributes({ bgImagePosition: pos })} />
                    </PanelBody>
                    */}

                    {/* Repeater — only if the block has an array attribute (see "Repeaters"):
                    <PanelBody title={__('Items', '<text-domain>')} initialOpen>
                        <ItemList
                            items={items}
                            selectable={false}
                            onAdd={() => setAttributes({ items: [...items, emptyItem()] })}
                            onRemove={(index) => setAttributes({ items: items.filter((_, i) => i !== index) })}
                            onMove={(from, to) => setAttributes({ items: moveItem(items, from, to) })}
                            getLabel={(item) => item.title}
                        />
                    </PanelBody>
                    */}

                    <PaddingControls attributes={attributes} setAttributes={setAttributes} />
                    {/* clientId is REQUIRED: Preview finds this block's canvas root by it. */}
                    <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />
                    {/* Add other config-only controls here:
                        <DividerControl value={sectionDivider} onChange={...} />
                        <SelectControl label="Layout" options={[...]} ... />
                    */}
                </InspectorControls>

                {/* Canvas — White Summers format:
                    Root wrapper uses EDITOR_BLOCK_FRAME for the signature 1px dashed outline boundary,
                    rounded card corners, and mb-10 separation between blocks.
                    Inside: real data, inline editing, theme typography, no form clutter. */}
                <section
                    {...blockProps}
                    {...rootEntrance}
                    className={`${blockProps.className || ''} ${editorPaddingClasses(attributes)} <slug>-editor ${EDITOR_BLOCK_FRAME}`}
                    style={{ ...blockProps.style, ...rootEntrance.style }}
                >
                    {/* Every visible part (heading, subtitle, body, CTA row, each
                        repeater item) spreads entrancePartProps with a running
                        index — same order as @entrancePart in the Blade view:
                    <div {...entrancePartProps(entrance, 0)}>…heading…</div>
                    <div {...entrancePartProps(entrance, 1)}>…subtitle…</div>
                    {items.map((item, i) => <article key={i} {...entrancePartProps(entrance, 2 + i)}>…</article>)}
                    */}
                    {/* Background Media — passive preview only, canvas has no click target.
                        Selecting/replacing/removing the image happens in the sidebar (above):
                    {bgUrl && (
                        <div
                            className="absolute inset-0 -z-10 bg-cover bg-no-repeat opacity-40"
                            style={{ backgroundImage: `url(${bgUrl})`, backgroundPosition: focalCss(bgImagePosition) }}
                        />
                    )}
                    */}

                    {/* Heading — inline editing via AutoGrowingTextarea:
                    <AutoGrowingTextarea
                        value={heading}
                        onChange={(value) => setAttributes({ heading: value })}
                        placeholder={__('Enter heading…', '<text-domain>')}
                        className={EDITOR_TYPE.display}
                        heading
                    />
                    `heading` marks a field that is an h1–h6 on the page, so it takes the
                    theme's heading font (base.css styles [data-heading] like h1–h6).
                    */}

                    {/* Inline Image — AttachmentImageControl (X on hover):
                    <AttachmentImageControl
                        imageId={imageId}
                        onSelect={(media) => setAttributes({ imageId: media.id })}
                        onRemove={() => setAttributes({ imageId: 0 })}
                        height="380px"
                    />
                    */}

                    {/* Body copy — inline ParagraphsField or RichText:
                    <ParagraphsField
                        value={description}
                        onChange={(value) => setAttributes({ description: value })}
                        placeholder={__('Enter description…', '<text-domain>')}
                    />
                    */}

                    {/* CTA button — styled preview on canvas.
                        DEFAULT: a full-width/single CTA opens ActionEditor INLINE,
                        directly below the button — the block already has the room and
                        naturally grows to contain it, so it never overlaps whatever
                        renders next:
                    <span
                        role="button"
                        tabIndex={0}
                        aria-label={__('Edit button', '<text-domain>')}
                        className="btn btn-primary"
                        onClick={() => setIsEditingButton(!isEditingButton)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsEditingButton(!isEditingButton);
                            }
                        }}
                    >
                        {ctaText || __('Button', '<text-domain>')}
                    </span>
                    {isEditingButton && (
                        <div className="w-full max-w-xl text-left">
                            <ActionEditor
                                groupLabel={__('Button editing', '<text-domain>')}
                                label={__('Button label', '<text-domain>')}
                                linkLabel={__('Button destination', '<text-domain>')}
                                text={ctaText}
                                link={ctaLink}
                                stacked={false}
                                onTextChange={(value) => setAttributes({ ctaText: value })}
                                onLinkChange={(value) => setAttributes({ ctaLink: value })}
                            />
                        </div>
                    )}
                    */}

                    {/* ONLY for a button/link that belongs to a REPEATER ITEM (a grid
                        card, a list item) — SAME inline pattern as the default above,
                        SAME component, just stacked={true} instead of stacked={false}.
                        stacked renders ActionEditor's fields in one vertical column,
                        which is what fits a ~280px grid column — no separate
                        mechanism, and never the sidebar:
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={() => setEditingLink(editingLink === index ? null : index)}
                    >
                        {item.linkText || __('Learn more', '<text-domain>')}
                    </span>
                    {editingLink === index && (
                        <div className="mt-3 text-left">
                            <ActionEditor
                                groupLabel={`${__('Item link editing', '<text-domain>')} ${index + 1}`}
                                label={__('Link text', '<text-domain>')}
                                linkLabel={__('Link destination', '<text-domain>')}
                                text={item.linkText}
                                link={item.link}
                                stacked={true}
                                onTextChange={(value) => updateItem(index, 'linkText', value)}
                                onLinkChange={(value) => updateItem(index, 'link', value)}
                            />
                        </div>
                    )}
                    */}
                </section>
            </>
        );
    },

    // Server-rendered via block.php; nothing to save on the client.
    save: () => null,
});
```

#### `resources/blocks/<slug>/block.js`

Plain vanilla — **no `import`**. Consume vendor libs via their global (e.g.
`window.Splide`); gate init on `DOMContentLoaded` so vendor scripts have run.

```js
// No frontend behavior yet. Example when a vendor lib is used:
// document.addEventListener('DOMContentLoaded', () => {
//   document.querySelectorAll('.<slug>').forEach((el) => {
//     if (typeof window.Splide !== 'undefined') new window.Splide(el, { /* ... */ }).mount();
//   });
// });
```

#### `resources/blocks/<slug>/block.css` — optional

Create this file **only** for reusable/semantic CSS or third-party lib
overrides. One-off layout (padding, flex, sizing) belongs in the Blade as
Tailwind utilities — not here. If the block has none of that, don't create the
file and don't add `viewStyle` to block.json.

When you do create it: plain CSS — **no `@apply` / `@reference`** (it's served
from source, not Vite-compiled, so Tailwind directives would ship uncompiled and
break). Use `var(--...)` tokens. Example of a legitimate use — overriding a
vendor lib's internals, scoped under the block's root class:

```css
.<slug> .splide__pagination__page.is-active {
    background-color: var(--color-primary);
}
```

#### `resources/views/blocks/<slug>.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif
    class="<slug> @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop)"
    @entrance($entrance)>
    {{-- @paddingClasses prints bare class names, so it goes INSIDE class="…"
         (outside, the browser ignores it and Spacing does nothing). @entrance
         prints its own style="" — never add a second style attribute here.
         Each visible part gets @entrancePart(<running index>), in the same
         order block.jsx uses (see "Entrance animation wiring"). --}}
    {{-- Anchor id stays on this <section>; any dynamic/unique id (e.g. a carousel
         instance id) goes on an INNER element so it can't collide — see
         "Anchor support". This note is guidance: keep it only if the block
         actually emits a dynamic id, else drop it. --}}
    {{-- Scaffolding — replace with the real render. Example:
        @if ($heading)
            <h2 class="<slug>__heading" @entrancePart(0)>{{ $heading }}</h2>
        @endif
        @foreach ($items as $item)
            <article @entrancePart($loop->index + 1)>…</article>
        @endforeach
    --}}
</section>
```

---

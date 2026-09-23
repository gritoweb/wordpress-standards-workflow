# Code Examples — AI Context

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
  `editorPaddingStyle(attributes)` on the canvas root.
- **Entrance**: preset in `block.json` (from the `create-block` preset
  table), `@entrance` on the root, `@entrancePart(n)` on each part, the same
  indexes in `block.jsx`.
- **Assets**: a block's own JS/CSS is plain, declared in `block.json`
  (`file:./block.js` / `file:./block.css`) and served from source. Vendor
  libraries are registered in `app/setup.php` and enqueued in the
  `block.php` that needs them — never globally.

---

## Reference block: Accordion (one open at a time) — `accordion`

An array of question/answer items. Demonstrates the **one-open-at-a-time** repeater: `ItemList` in the sidebar shares `activeItem` with the canvas, and the front end uses native `<details name>` so opening one item closes the others — no JavaScript.

### `resources/blocks/accordion/block.json`

```json
{
  "apiVersion": 3,
  "name": "<namespace>/accordion",
  "title": "Accordion",
  "category": "<category>",
  "icon": "list-view",
  "description": "Heading and questions; one answer open at a time.",
  "textdomain": "<text-domain>",
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
      "default": "How the kit is built"
    },
    "description": {
      "type": "string",
      "default": "Open one question — the one that was open closes."
    },
    "items": {
      "type": "array",
      "default": [
        {
          "title": "Where does data get cleaned?",
          "body": "In block.php, with WordPress sanitization functions. The Blade view only prints."
        },
        {
          "title": "How does the accordion open?",
          "body": "Native details elements that share a name, so opening one closes the others. No JavaScript."
        },
        {
          "title": "How do I reorder the items?",
          "body": "Drag them, or use the arrows, in the Items list in the block sidebar."
        }
      ]
    },
    "entrance": {
      "type": "object",
      "default": {
        "type": "fade-slide",
        "direction": "up",
        "distance": null,
        "unit": "px",
        "duration": null,
        "delay": null,
        "stagger": 100
      }
    }
  },
  "example": {
    "attributes": {
      "isPreview": true
    }
  }
}
```

### `resources/blocks/accordion/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// Array order is the only order: the sidebar ItemList reorders the array itself.
$items = [];
foreach (is_array($attributes['items'] ?? null) ? $attributes['items'] : [] as $item) {
    if (!is_array($item)) {
        continue;
    }
    $title = sanitize_text_field($item['title'] ?? '');
    if ($title === '') {
        continue;
    }
    $items[] = [
        'title' => $title,
        'body'  => wp_kses_post($item['body'] ?? ''),
    ];
}

echo view('blocks.accordion', [
    'anchor'      => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'       => sanitize_text_field($attributes['title'] ?? ''),
    'description' => wp_kses_post($attributes['description'] ?? ''),
    'items'       => $items,
    'entrance'    => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

### `resources/views/blocks/accordion.blade.php`

```blade
@php
  // Details that share a name form an exclusive group: opening one closes the others.
  $group = 'accordion-' . wp_unique_id();
@endphp

<section @if ($anchor) id="{{ $anchor }}" @endif
  class="accordion @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-surface"
  @entrance($entrance)>
  <div class="container grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
    <div class="lg:col-span-5">
      @if ($title)
        <h2 @entrancePart(0) class="heading-2">{{ $title }}</h2>
      @endif

      @if ($description)
        <div @entrancePart(1) class="mt-4 text-body text-muted">{!! $description !!}</div>
      @endif
    </div>

    <div class="space-y-3 lg:col-span-7">
      @foreach ($items as $item)
        <details name="{{ $group }}" @if ($loop->first) open @endif @entrancePart($loop->index + 2)
          class="accordion__item group card open:border-primary/30">
          <summary
            class="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left heading-6 group-open:text-primary [&::-webkit-details-marker]:hidden">
            <span>{{ $item['title'] }}</span>
            <svg class="h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>

          @if ($item['body'])
            <div class="border-t border-border px-5 pb-5 pt-3 text-small text-muted">{!! $item['body'] !!}</div>
          @endif
        </details>
      @endforeach
    </div>
  </div>
</section>
```

### `resources/blocks/accordion/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { AutoGrowingTextarea } from '../components/backend/AutoGrowingTextarea.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { moveItem } from '../components/backend/moveItem.js';
import { PaddingControls } from '../components/backend/PaddingControls.jsx';
import { editorPaddingStyle } from '../components/backend/padding-presets.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import {
  resolveEntrance,
  entranceRootProps,
  entrancePartProps,
} from '../components/backend/entranceCanvas.js';
import { EDITOR_BLOCK_FRAME } from '../components/backend/editorCanvas.js';
import previewImage from './preview.svg';
import metadata from './block.json';

const emptyItem = () => ({ title: '', body: '' });

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    // Hooks run before the preview return, so their order never changes.
    const [activeItem, setActiveItem] = useState(0);
    const blockProps = useBlockProps();
    const { isPreview, title, description } = attributes;
    const items = Array.isArray(attributes.items) ? attributes.items : [];

    if (isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Accordion preview', '<text-domain>')}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      );
    }

    const entrance = resolveEntrance(
      attributes.entrance,
      metadata.attributes.entrance.default,
    );
    const rootEntrance = entranceRootProps(entrance);
    // The open item on the canvas is the one selected in the sidebar list.
    const open = Math.min(activeItem, Math.max(items.length - 1, 0));

    const updateItem = (index, patch) =>
      setAttributes({
        items: items.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      });
    const addItem = () => {
      setAttributes({ items: [...items, emptyItem()] });
      setActiveItem(items.length);
    };
    const removeItem = (index) => {
      setAttributes({ items: items.filter((_, i) => i !== index) });
      setActiveItem((current) =>
        Math.max(0, current > index ? current - 1 : current),
      );
    };

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Items', '<text-domain>')} initialOpen>
            <ItemList
              items={items}
              activeItem={open}
              setActiveItem={setActiveItem}
              onAdd={addItem}
              onRemove={removeItem}
              onMove={(from, to) =>
                setAttributes({ items: moveItem(items, from, to) })
              }
              getLabel={(item) => item.title}
              addButtonLabel={__('+ Add question', '<text-domain>')}
              itemLabelPrefix={__('Question', '<text-domain>')}
            />
          </PanelBody>
          <PaddingControls
            attributes={attributes}
            setAttributes={setAttributes}
          />
          <EntranceControl
            attributes={attributes}
            setAttributes={setAttributes}
            clientId={clientId}
          />
        </InspectorControls>

        <section
          {...blockProps}
          {...rootEntrance}
          className={`${blockProps.className} accordion bg-surface ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...editorPaddingStyle(attributes),
            ...rootEntrance.style,
          }}
        >
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <AutoGrowingTextarea
                {...entrancePartProps(entrance, 0)}
                value={title}
                onChange={(value) => setAttributes({ title: value })}
                heading
                placeholder={__('Section title…', '<text-domain>')}
                className="heading-2"
              />
              <div {...entrancePartProps(entrance, 1)}>
                <RichText
                  tagName="div"
                  value={description}
                  onChange={(value) => setAttributes({ description: value })}
                  placeholder={__('Short description…', '<text-domain>')}
                  className="mt-4 text-body text-muted"
                />
              </div>
            </div>

            <div className="space-y-3 lg:col-span-7">
              {items.map((item, index) => {
                const isOpen = index === open;

                return (
                  <div
                    key={index}
                    {...entrancePartProps(entrance, index + 2)}
                    className={`card ${isOpen ? 'border-primary/30' : ''}`}
                  >
                    <div
                      className="flex cursor-pointer items-center justify-between gap-4 p-5"
                      onClick={() => setActiveItem(index)}
                    >
                      <AutoGrowingTextarea
                        value={item.title}
                        onChange={(value) =>
                          updateItem(index, { title: value })
                        }
                        onFocus={() => setActiveItem(index)}
                        placeholder={__('Question…', '<text-domain>')}
                        className={`heading-6 ${isOpen ? 'text-primary' : ''}`}
                      />
                      <svg
                        className={`h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>

                    {isOpen && (
                      <RichText
                        tagName="div"
                        value={item.body}
                        onChange={(value) => updateItem(index, { body: value })}
                        placeholder={__('Answer…', '<text-domain>')}
                        className="border-t border-border px-5 pt-3 pb-5 text-small text-muted"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </>
    );
  },

  save: () => null,
});
```

---

## Reference block: Card grid — `card-grid`

An array of cards with image, title, text and an optional link. Demonstrates the **all-visible** repeater (`selectable={false}`), per-card images on the canvas, a per-card link edited inline with `ActionEditor stacked`, a single `setAttributes` per change, and the `trigger: "item"` entrance preset.

### `resources/blocks/card-grid/block.json`

```json
{
  "apiVersion": 3,
  "name": "<namespace>/card-grid",
  "title": "Card Grid",
  "category": "<category>",
  "icon": "grid-view",
  "description": "Cards with image, title, text and an optional link.",
  "textdomain": "<text-domain>",
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
      "default": "What the kit gives you"
    },
    "description": {
      "type": "string",
      "default": ""
    },
    "cards": {
      "type": "array",
      "default": [
        {
          "title": "Sidebar item list",
          "body": "Reorder, add and delete cards from the block sidebar.",
          "imageId": 0,
          "linkText": "",
          "link": {
            "url": "",
            "opensInNewTab": false
          }
        },
        {
          "title": "Inline editing",
          "body": "Every text on the canvas is edited where it shows on the page.",
          "imageId": 0,
          "linkText": "",
          "link": {
            "url": "",
            "opensInNewTab": false
          }
        },
        {
          "title": "Entrance per card",
          "body": "Each card animates as it scrolls into view.",
          "imageId": 0,
          "linkText": "",
          "link": {
            "url": "",
            "opensInNewTab": false
          }
        }
      ]
    },
    "entrance": {
      "type": "object",
      "default": {
        "type": "fade-slide",
        "direction": "up",
        "distance": null,
        "unit": "px",
        "duration": null,
        "delay": null,
        "stagger": 100,
        "trigger": "item"
      }
    }
  },
  "example": {
    "attributes": {
      "isPreview": true
    }
  }
}
```

### `resources/blocks/card-grid/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// Array order is the only order: the sidebar ItemList reorders the array itself.
$cards = [];
foreach (is_array($attributes['cards'] ?? null) ? $attributes['cards'] : [] as $card) {
    if (!is_array($card)) {
        continue;
    }
    $title = sanitize_text_field($card['title'] ?? '');
    $imageId = absint($card['imageId'] ?? 0);
    if ($title === '' && $imageId === 0) {
        continue;
    }
    $cards[] = [
        'title'    => $title,
        'body'     => wp_kses_post($card['body'] ?? ''),
        'imageId'  => $imageId,
        'linkText' => sanitize_text_field($card['linkText'] ?? ''),
        'linkUrl'  => esc_url_raw($card['link']['url'] ?? ''),
        'linkNew'  => (bool) ($card['link']['opensInNewTab'] ?? false),
    ];
}

echo view('blocks.card-grid', [
    'anchor'      => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'       => sanitize_text_field($attributes['title'] ?? ''),
    'description' => wp_kses_post($attributes['description'] ?? ''),
    'cards'       => $cards,
    'entrance'    => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

### `resources/views/blocks/card-grid.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="card-grid @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-light"
  @entrance($entrance)>
  <div class="container">
    @if ($title || $description)
      <div class="mx-auto mb-12 max-w-2xl text-center">
        @if ($title)
          <h2 @entrancePart(0) class="heading-2">{{ $title }}</h2>
        @endif

        @if ($description)
          <div @entrancePart(1) class="mt-4 text-body text-muted">{!! $description !!}</div>
        @endif
      </div>
    @endif

    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      @foreach ($cards as $card)
        <article @entrancePart($loop->index + 2)
          class="card-grid__card card flex flex-col overflow-hidden">
          @if ($card['imageId'])
            {!! wp_get_attachment_image($card['imageId'], 'large', false, [
                'class' => 'aspect-[4/3] w-full object-cover',
                'loading' => 'lazy',
                'decoding' => 'async',
            ]) !!}
          @endif

          <div class="flex flex-1 flex-col p-6">
            @if ($card['title'])
              <h3 class="heading-5">{{ $card['title'] }}</h3>
            @endif

            @if ($card['body'])
              <div class="mt-3 text-small text-muted">{!! $card['body'] !!}</div>
            @endif

            @if ($card['linkText'] && $card['linkUrl'])
              <a href="{{ esc_url($card['linkUrl']) }}" @if ($card['linkNew']) target="_blank" @endif
                class="link mt-auto inline-flex pt-5 text-small font-semibold text-primary hover:underline">{{ $card['linkText'] }}</a>
            @endif
          </div>
        </article>
      @endforeach
    </div>
  </div>
</section>
```

### `resources/blocks/card-grid/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { AutoGrowingTextarea } from '../components/backend/AutoGrowingTextarea.jsx';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { ActionEditor } from '../components/backend/ActionEditor.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { moveItem } from '../components/backend/moveItem.js';
import { useAttachmentUrls } from '../components/backend/useAttachmentUrls.js';
import { PaddingControls } from '../components/backend/PaddingControls.jsx';
import { editorPaddingStyle } from '../components/backend/padding-presets.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import {
  resolveEntrance,
  entranceRootProps,
  entrancePartProps,
} from '../components/backend/entranceCanvas.js';
import {
  EDITOR_BLOCK_FRAME,
  emptyLink,
} from '../components/backend/editorCanvas.js';
import previewImage from './preview.svg';
import metadata from './block.json';

const emptyCard = () => ({
  title: '',
  body: '',
  imageId: 0,
  linkText: '',
  link: emptyLink(),
});

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    // Hooks run before the preview return, so their order never changes.
    const [editingLink, setEditingLink] = useState(null);
    const blockProps = useBlockProps();
    const cards = Array.isArray(attributes.cards) ? attributes.cards : [];
    const thumbs = useAttachmentUrls(
      cards.map((card) => Number(card.imageId) || 0),
    );

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Card Grid preview', '<text-domain>')}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      );
    }

    const entrance = resolveEntrance(
      attributes.entrance,
      metadata.attributes.entrance.default,
    );
    const rootEntrance = entranceRootProps(entrance);

    // One write per change: two calls in a row would both start from the stale array.
    const updateCard = (index, patch) =>
      setAttributes({
        cards: cards.map((card, i) =>
          i === index ? { ...card, ...patch } : card,
        ),
      });
    const removeCard = (index) => {
      setAttributes({ cards: cards.filter((_, i) => i !== index) });
      setEditingLink(null);
    };

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Cards', '<text-domain>')} initialOpen>
            <ItemList
              items={cards}
              selectable={false}
              onAdd={() => setAttributes({ cards: [...cards, emptyCard()] })}
              onRemove={removeCard}
              onMove={(from, to) =>
                setAttributes({ cards: moveItem(cards, from, to) })
              }
              getLabel={(card) => card.title}
              getThumb={(card) => thumbs[Number(card.imageId)] || ''}
              addButtonLabel={__('+ Add card', '<text-domain>')}
              itemLabelPrefix={__('Card', '<text-domain>')}
            />
          </PanelBody>
          <PaddingControls
            attributes={attributes}
            setAttributes={setAttributes}
          />
          <EntranceControl
            attributes={attributes}
            setAttributes={setAttributes}
            clientId={clientId}
          />
        </InspectorControls>

        <section
          {...blockProps}
          {...rootEntrance}
          className={`${blockProps.className} card-grid bg-light ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...editorPaddingStyle(attributes),
            ...rootEntrance.style,
          }}
        >
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <AutoGrowingTextarea
              {...entrancePartProps(entrance, 0)}
              value={attributes.title}
              onChange={(value) => setAttributes({ title: value })}
              heading
              placeholder={__('Section title…', '<text-domain>')}
              className="text-center heading-2"
            />
            <div {...entrancePartProps(entrance, 1)}>
              <RichText
                tagName="div"
                value={attributes.description}
                onChange={(value) => setAttributes({ description: value })}
                placeholder={__('Optional description…', '<text-domain>')}
                className="mt-4 text-body text-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {cards.map((card, index) => (
              <article
                key={index}
                {...entrancePartProps(entrance, index + 2)}
                className="card flex flex-col overflow-hidden"
              >
                <AttachmentImageControl
                  imageId={card.imageId}
                  onSelect={(media) =>
                    updateCard(index, { imageId: Number(media.id) || 0 })
                  }
                  onRemove={() => updateCard(index, { imageId: 0 })}
                  height="220px"
                />

                <div className="flex flex-1 flex-col p-6">
                  <AutoGrowingTextarea
                    value={card.title}
                    onChange={(value) => updateCard(index, { title: value })}
                    heading
                    placeholder={__('Card title…', '<text-domain>')}
                    className="heading-5"
                  />
                  <RichText
                    tagName="div"
                    value={card.body}
                    onChange={(value) => updateCard(index, { body: value })}
                    placeholder={__('Card text…', '<text-domain>')}
                    className="mt-3 text-small text-muted"
                  />

                  <span
                    role="button"
                    tabIndex={0}
                    className="mt-auto inline-flex cursor-pointer pt-5 text-small font-semibold text-primary"
                    onClick={() =>
                      setEditingLink(editingLink === index ? null : index)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setEditingLink(editingLink === index ? null : index);
                      }
                    }}
                  >
                    {card.linkText || __('+ Add link', '<text-domain>')}
                  </span>

                  {editingLink === index && (
                    <div className="w-full">
                      <ActionEditor
                        groupLabel={`${__('Card link', '<text-domain>')} ${index + 1}`}
                        label={__('Link text', '<text-domain>')}
                        linkLabel={__('Link destination', '<text-domain>')}
                        text={card.linkText}
                        link={card.link}
                        stacked
                        onTextChange={(value) =>
                          updateCard(index, { linkText: value })
                        }
                        onLinkChange={(value) =>
                          updateCard(index, { link: value })
                        }
                      />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  },

  save: () => null,
});
```

---

## Reference block: Testimonial carousel (vendor library) — `testimonial-carousel`

An array of quotes in a Swiper carousel. Demonstrates the **vendor library** rule (file in `resources/{js,css}/vendor/`, registered in `app/setup.php`, enqueued only in this `block.php`), a plain `block.js`/`block.css` served from source through `block.json`, an editor canvas that looks like the front end (two slides and the same pagination bullets, no scrollbar; the sidebar list moves it to the selected slide, editing a visible slide never moves it), and autoplay set in the sidebar (off on hover and for reduced motion).

### `resources/blocks/testimonial-carousel/block.json`

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "<namespace>/testimonial-carousel",
  "title": "Testimonial Carousel",
  "category": "<category>",
  "icon": "format-quote",
  "description": "Quotes in a carousel; reorder and delete them from the sidebar.",
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
    "title": {
      "type": "string",
      "default": "What teams say"
    },
    "items": {
      "type": "array",
      "default": [
        {
          "quote": "The sidebar list made reordering slides a two-second job.",
          "author": "Ana Lima",
          "role": "Content editor",
          "avatarId": 0
        },
        {
          "quote": "Every text is edited right where it shows on the page.",
          "author": "Bruno Costa",
          "role": "Marketing lead",
          "avatarId": 0
        },
        {
          "quote": "Deleting a slide works like everything else in WordPress.",
          "author": "Carla Dias",
          "role": "Site owner",
          "avatarId": 0
        }
      ]
    },
    "autoplay": {
      "type": "boolean",
      "default": true
    },
    "autoplaySeconds": {
      "type": "number",
      "default": 5
    },
    "entrance": {
      "type": "object",
      "default": {
        "type": "fade-slide",
        "direction": "up",
        "distance": null,
        "unit": "px",
        "duration": null,
        "delay": null,
        "stagger": 100
      }
    }
  },
  "example": {
    "attributes": {
      "isPreview": true
    }
  }
}
```

### `resources/blocks/testimonial-carousel/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

// Vendor lib registered in app/setup.php; enqueued here so it loads only where this block renders.
wp_enqueue_script('swiper');
wp_enqueue_style('swiper');

$attributes = $attributes ?? [];

// Array order is the only order: the sidebar ItemList reorders the array itself.
$items = [];
foreach (is_array($attributes['items'] ?? null) ? $attributes['items'] : [] as $item) {
    if (!is_array($item)) {
        continue;
    }
    $quote = wp_kses_post($item['quote'] ?? '');
    if ($quote === '') {
        continue;
    }
    $items[] = [
        'quote'    => $quote,
        'author'   => sanitize_text_field($item['author'] ?? ''),
        'role'     => sanitize_text_field($item['role'] ?? ''),
        'avatarId' => absint($item['avatarId'] ?? 0),
    ];
}

echo view('blocks.testimonial-carousel', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'items'    => $items,
    // 0 turns autoplay off; the range matches the sidebar control.
    'autoplayMs' => !empty($attributes['autoplay'])
        ? 1000 * max(2, min(15, absint($attributes['autoplaySeconds'] ?? 5)))
        : 0,
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

### `resources/views/blocks/testimonial-carousel.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="testimonial-carousel @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-surface"
  @entrance($entrance)>
  <div class="container">
    @if ($title)
      <h2 @entrancePart(0) class="mb-10 text-center heading-2">{{ $title }}</h2>
    @endif

    @if ($items)
      {{-- The anchor id stays on the section; Swiper only needs the data hook. --}}
      <div @entrancePart(1) class="testimonial-carousel__slider swiper" data-testimonial-carousel
        data-autoplay="{{ $autoplayMs }}">
        <div class="swiper-wrapper">
          @foreach ($items as $item)
            <figure class="swiper-slide !h-auto">
              <div class="card flex h-full flex-col p-8">
                <blockquote class="flex-1 text-lead">{!! $item['quote'] !!}</blockquote>

                <figcaption class="mt-6 flex items-center gap-4">
                  @if ($item['avatarId'])
                    {!! wp_get_attachment_image($item['avatarId'], 'thumbnail', false, [
                        'class' => 'h-12 w-12 rounded-full object-cover',
                        'loading' => 'lazy',
                    ]) !!}
                  @endif
                  <span>
                    <span class="block font-bold">{{ $item['author'] }}</span>
                    @if ($item['role'])
                      <span class="block text-small text-muted">{{ $item['role'] }}</span>
                    @endif
                  </span>
                </figcaption>
              </div>
            </figure>
          @endforeach
        </div>

        <div class="testimonial-carousel__pagination swiper-pagination !relative mt-8"></div>
      </div>
    @endif
  </div>
</section>
```

### `resources/blocks/testimonial-carousel/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { AutoGrowingTextarea } from '../components/backend/AutoGrowingTextarea.jsx';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { moveItem } from '../components/backend/moveItem.js';
import { useAttachmentUrls } from '../components/backend/useAttachmentUrls.js';
import { PaddingControls } from '../components/backend/PaddingControls.jsx';
import { editorPaddingStyle } from '../components/backend/padding-presets.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import {
  resolveEntrance,
  entranceRootProps,
  entrancePartProps,
} from '../components/backend/entranceCanvas.js';
import { EDITOR_BLOCK_FRAME } from '../components/backend/editorCanvas.js';
import previewImage from './preview.svg';
import metadata from './block.json';

// Same layout as block.js on a desktop viewport: two slides, 24px apart.
const PER_VIEW = 2;
const GAP = 24;

const emptyItem = () => ({ quote: '', author: '', role: '', avatarId: 0 });

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    // Hooks run before the preview return, so their order never changes.
    const [activeItem, setActiveItem] = useState(0);
    const [firstVisible, setFirstVisible] = useState(0);
    const blockProps = useBlockProps();
    const items = Array.isArray(attributes.items) ? attributes.items : [];
    const avatars = useAttachmentUrls(
      items.map((item) => Number(item.avatarId) || 0),
    );

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Testimonial Carousel preview', '<text-domain>')}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      );
    }

    const entrance = resolveEntrance(
      attributes.entrance,
      metadata.attributes.entrance.default,
    );
    const rootEntrance = entranceRootProps(entrance);

    // Swiper's page count: one bullet per position the first visible slide can take.
    const pages = Math.max(1, items.length - PER_VIEW + 1);
    const page = Math.min(firstVisible, pages - 1);
    const selected = Math.min(activeItem, Math.max(items.length - 1, 0));

    // Selecting a slide scrolls only when it is off screen, so editing never moves the track.
    const selectSlide = (index) => {
      setActiveItem(index);
      if (index < page) setFirstVisible(index);
      else if (index > page + PER_VIEW - 1)
        setFirstVisible(index - PER_VIEW + 1);
    };

    const updateItem = (index, patch) =>
      setAttributes({
        items: items.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      });
    const addItem = () => {
      setAttributes({ items: [...items, emptyItem()] });
      selectSlide(items.length);
    };
    const removeItem = (index) => {
      setAttributes({ items: items.filter((_, i) => i !== index) });
      setActiveItem((current) =>
        Math.max(0, current > index ? current - 1 : current),
      );
    };

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Slides', '<text-domain>')} initialOpen>
            <ItemList
              items={items}
              activeItem={selected}
              setActiveItem={selectSlide}
              onAdd={addItem}
              onRemove={removeItem}
              onMove={(from, to) =>
                setAttributes({ items: moveItem(items, from, to) })
              }
              getLabel={(item) => item.author}
              getThumb={(item) => avatars[Number(item.avatarId)] || ''}
              addButtonLabel={__('+ Add slide', '<text-domain>')}
              itemLabelPrefix={__('Slide', '<text-domain>')}
            />
          </PanelBody>
          <PanelBody title={__('Autoplay', '<text-domain>')} initialOpen={false}>
            <ToggleControl
              __nextHasNoMarginBottom
              label={__('Advance slides automatically', '<text-domain>')}
              help={__(
                'Pauses on hover; off for visitors who reduce motion.',
                '<text-domain>',
              )}
              checked={!!attributes.autoplay}
              onChange={(value) => setAttributes({ autoplay: value })}
            />
            {attributes.autoplay && (
              <RangeControl
                __nextHasNoMarginBottom
                label={__('Seconds per slide', '<text-domain>')}
                min={2}
                max={15}
                value={attributes.autoplaySeconds}
                onChange={(value) => setAttributes({ autoplaySeconds: value })}
              />
            )}
          </PanelBody>
          <PaddingControls
            attributes={attributes}
            setAttributes={setAttributes}
          />
          <EntranceControl
            attributes={attributes}
            setAttributes={setAttributes}
            clientId={clientId}
          />
        </InspectorControls>

        <section
          {...blockProps}
          {...rootEntrance}
          className={`${blockProps.className} testimonial-carousel bg-surface ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...editorPaddingStyle(attributes),
            ...rootEntrance.style,
          }}
        >
          <AutoGrowingTextarea
            {...entrancePartProps(entrance, 0)}
            value={attributes.title}
            onChange={(value) => setAttributes({ title: value })}
            heading
            placeholder={__('Section title…', '<text-domain>')}
            className="mb-10 text-center heading-2"
          />

          {/* The front end's carousel, driven by the bullets and the sidebar list instead of Swiper. */}
          <div {...entrancePartProps(entrance, 1)} className="overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{
                gap: `${GAP}px`,
                transform: `translateX(calc(${-page} * (${100 / PER_VIEW}% + ${GAP / PER_VIEW}px)))`,
              }}
            >
              {items.map((item, index) => (
                <figure
                  key={index}
                  className="card flex shrink-0 flex-col p-8"
                  style={{
                    width: `calc((100% - ${GAP * (PER_VIEW - 1)}px) / ${PER_VIEW})`,
                  }}
                  onFocus={() => setActiveItem(index)}
                >
                  <RichText
                    tagName="blockquote"
                    value={item.quote}
                    onChange={(value) => updateItem(index, { quote: value })}
                    placeholder={__('Quote…', '<text-domain>')}
                    className="flex-1 text-lead"
                  />

                  <figcaption className="mt-6 flex items-center gap-4">
                    <div className="w-16 shrink-0">
                      <AttachmentImageControl
                        imageId={item.avatarId}
                        onSelect={(media) =>
                          updateItem(index, {
                            avatarId: Number(media.id) || 0,
                          })
                        }
                        onRemove={() => updateItem(index, { avatarId: 0 })}
                        height="64px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <AutoGrowingTextarea
                        value={item.author}
                        onChange={(value) =>
                          updateItem(index, { author: value })
                        }
                        placeholder={__('Name…', '<text-domain>')}
                        className="font-bold"
                      />
                      <AutoGrowingTextarea
                        value={item.role}
                        onChange={(value) => updateItem(index, { role: value })}
                        placeholder={__('Role…', '<text-domain>')}
                        className="text-small text-muted"
                      />
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          {pages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: pages }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`${__('Go to slide', '<text-domain>')} ${index + 1}`}
                  aria-current={index === page ? 'true' : undefined}
                  onClick={() => setFirstVisible(index)}
                  className="h-2 w-2 cursor-pointer rounded-full border-0 p-0"
                  style={{
                    background:
                      index === page
                        ? 'var(--color-primary)'
                        : 'var(--color-border)',
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </>
    );
  },

  save: () => null,
});
```

### `resources/blocks/testimonial-carousel/block.js`

```js
// Served from source (no import): Swiper is the vendor script registered in app/setup.php.
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.Swiper === 'undefined') return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  document.querySelectorAll('[data-testimonial-carousel]').forEach((slider) => {
    const delay = Number(slider.dataset.autoplay) || 0;

    new window.Swiper(slider, {
      slidesPerView: 1,
      spaceBetween: 24,
      breakpoints: { 768: { slidesPerView: 2 } },
      // Rewind instead of loop: loop needs more slides than are visible.
      rewind: true,
      autoplay:
        delay > 0 && !reducedMotion
          ? { delay, pauseOnMouseEnter: true, disableOnInteraction: false }
          : false,
      pagination: {
        el: slider.querySelector('.swiper-pagination'),
        clickable: true,
      },
      a11y: { enabled: true },
    });
  });
});
```

### `resources/blocks/testimonial-carousel/block.css`

```css
.testimonial-carousel .swiper-pagination-bullet {
  background-color: var(--color-border);
  opacity: 1;
}

.testimonial-carousel .swiper-pagination-bullet-active {
  background-color: var(--color-primary);
}
```

### `app/setup.php` (append)

The library files are committed as `resources/js/vendor/swiper-bundle.min.js` and
`resources/css/vendor/swiper-bundle.min.css` (Swiper 11, pre-built distributables).

```php
/**
 * Register vendor libs. Registration != enqueue — each block.php that needs a lib enqueues its handle.
 */
add_action('init', function () {
    wp_register_script('swiper', get_theme_file_uri('resources/js/vendor/swiper-bundle.min.js'), [], '11.2.10', true);
    wp_register_style('swiper', get_theme_file_uri('resources/css/vendor/swiper-bundle.min.css'), [], '11.2.10');
});
```

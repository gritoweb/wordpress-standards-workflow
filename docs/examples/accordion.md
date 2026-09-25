# Reference block: Accordion (one open at a time) — `accordion`

An array of question/answer items. Demonstrates the **one-open-at-a-time** repeater: `ItemList` in the sidebar shares `activeItem` with the canvas, and the front end uses native `<details name>` so opening one item closes the others — no JavaScript.

## `resources/blocks/accordion/block.json`

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

## `resources/blocks/accordion/block.php`

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

## `resources/views/blocks/accordion.blade.php`

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

## `resources/blocks/accordion/block.jsx`

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
import { editorPaddingClasses } from '../components/backend/padding-presets.js';
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} accordion bg-surface ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
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

The rules every block follows are in `README.md` in this folder; read it before this file.

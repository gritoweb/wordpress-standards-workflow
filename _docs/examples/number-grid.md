# Reference block: Number grid — `number-grid`

Key numbers, each with a short label. Demonstrates a **text-only repeater**: `ItemList` in the sidebar (`selectable={false}`, all items visible), both fields edited on the canvas, empty items skipped in `block.php`, and a `<dl>` on the page.

## `resources/blocks/number-grid/block.json`

```json
{
  "apiVersion": 3,
  "name": "<namespace>/number-grid",
  "title": "Number Grid",
  "category": "<category>",
  "icon": "chart-bar",
  "description": "Key numbers, each with a short label.",
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
      "default": "In numbers"
    },
    "items": {
      "type": "array",
      "default": [
        {
          "value": "120+",
          "label": "Projects delivered"
        },
        {
          "value": "15",
          "label": "Years of experience"
        },
        {
          "value": "98%",
          "label": "Clients who come back"
        },
        {
          "value": "24h",
          "label": "Average reply time"
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

## `resources/blocks/number-grid/block.php`

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
    $value = sanitize_text_field($item['value'] ?? '');
    if ($value === '') {
        continue;
    }
    $items[] = [
        'value' => $value,
        'label' => sanitize_text_field($item['label'] ?? ''),
    ];
}

echo view('blocks.number-grid', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'items'    => $items,
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

## `resources/views/blocks/number-grid.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="number-grid @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-surface" @entrance($entrance)>
  <div class="container">
    @if ($title)
      <h2 @entrancePart(0) class="heading-2 mb-12 text-center">{{ $title }}</h2>
    @endif

    <dl class="grid grid-cols-2 gap-8 md:grid-cols-4">
      @foreach ($items as $item)
        <div @entrancePart($loop->index + 1) class="flex flex-col-reverse text-center">
          <dt class="text-small text-muted mt-2">{{ $item['label'] }}</dt>
          <dd class="heading-1 text-primary m-0">{{ $item['value'] }}</dd>
        </div>
      @endforeach
    </dl>
  </div>
</section>
```

## `resources/blocks/number-grid/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
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

const emptyItem = () => ({ value: '', label: '' });

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    const blockProps = useBlockProps();
    const items = Array.isArray(attributes.items) ? attributes.items : [];

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Number Grid preview', '<text-domain>')}
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
    const updateItem = (index, patch) =>
      setAttributes({
        items: items.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Numbers', '<text-domain>')} initialOpen>
            <ItemList
              items={items}
              selectable={false}
              onAdd={() => setAttributes({ items: [...items, emptyItem()] })}
              onRemove={(index) =>
                setAttributes({ items: items.filter((_, i) => i !== index) })
              }
              onMove={(from, to) =>
                setAttributes({ items: moveItem(items, from, to) })
              }
              getLabel={(item) =>
                [item.value, item.label].filter(Boolean).join(' ')
              }
              addButtonLabel={__('+ Add number', '<text-domain>')}
              itemLabelPrefix={__('Number', '<text-domain>')}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} number-grid bg-surface ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <AutoGrowingTextarea
            {...entrancePartProps(entrance, 0)}
            value={attributes.title}
            onChange={(value) => setAttributes({ title: value })}
            heading
            placeholder={__('Section title…', '<text-domain>')}
            className="heading-2 mb-12 text-center"
          />

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {items.map((item, index) => (
              <div
                key={index}
                {...entrancePartProps(entrance, index + 1)}
                className="text-center"
              >
                <AutoGrowingTextarea
                  value={item.value}
                  onChange={(value) => updateItem(index, { value })}
                  heading
                  placeholder={__('100+', '<text-domain>')}
                  className="heading-1 text-primary text-center"
                />
                <AutoGrowingTextarea
                  value={item.label}
                  onChange={(value) => updateItem(index, { label: value })}
                  placeholder={__('What it counts…', '<text-domain>')}
                  className="text-small text-muted mt-2 text-center"
                />
              </div>
            ))}
          </div>
        </section>
      </>
    );
  },

  save: () => null,
});
```

The rules every block follows are in `README.md` in this folder; read it before this file.

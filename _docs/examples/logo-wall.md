# Reference block: Logo wall — `logo-wall`

A row of client or partner logos. Demonstrates an **image-only repeater**: each logo is picked on the canvas (`AttachmentImageControl` with `objectFit="contain"`), reordered in the sidebar `ItemList` with thumbnails, and its alt text comes from the Media Library, so the block adds no text field.

## `resources/blocks/logo-wall/block.json`

```json
{
  "apiVersion": 3,
  "name": "<namespace>/logo-wall",
  "title": "Logo Wall",
  "category": "<category>",
  "icon": "images-alt2",
  "description": "A row of client or partner logos.",
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
      "default": "Trusted by teams like these"
    },
    "logos": {
      "type": "array",
      "default": [
        {
          "imageId": 0
        },
        {
          "imageId": 0
        },
        {
          "imageId": 0
        },
        {
          "imageId": 0
        },
        {
          "imageId": 0
        }
      ]
    },
    "entrance": {
      "type": "object",
      "default": {
        "type": "fade",
        "direction": "up",
        "distance": null,
        "unit": "px",
        "duration": 500,
        "delay": null,
        "stagger": 60
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

## `resources/blocks/logo-wall/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// Array order is the only order; a logo with no image is skipped. Its alt text is the Media Library's.
$logos = [];
foreach (is_array($attributes['logos'] ?? null) ? $attributes['logos'] : [] as $logo) {
    $imageId = is_array($logo) ? absint($logo['imageId'] ?? 0) : 0;
    if ($imageId) {
        $logos[] = $imageId;
    }
}

echo view('blocks.logo-wall', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'logos'    => $logos,
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

## `resources/views/blocks/logo-wall.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif class="logo-wall @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-light"
  @entrance($entrance)>
  <div class="container">
    @if ($title)
      <p @entrancePart(0) class="text-small text-muted mb-10 text-center">{{ $title }}</p>
    @endif

    @if ($logos)
      <ul class="m-0 grid list-none grid-cols-2 items-center gap-8 p-0 md:grid-cols-5">
        @foreach ($logos as $imageId)
          <li @entrancePart($loop->index + 1) class="flex h-20 items-center justify-center">
            {!! wp_get_attachment_image($imageId, 'medium', false, [
                'class' => 'max-h-full w-auto object-contain',
                'loading' => 'lazy',
                'decoding' => 'async',
            ]) !!}
          </li>
        @endforeach
      </ul>
    @endif
  </div>
</section>
```

## `resources/blocks/logo-wall/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { AutoGrowingTextarea } from '../components/backend/AutoGrowingTextarea.jsx';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { ItemList } from '../components/backend/ItemList.jsx';
import { moveItem } from '../components/backend/moveItem.js';
import { useAttachmentUrls } from '../components/backend/useAttachmentUrls.js';
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

const emptyLogo = () => ({ imageId: 0 });

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    // Hooks run before the preview return, so their order never changes.
    const blockProps = useBlockProps();
    const logos = Array.isArray(attributes.logos) ? attributes.logos : [];
    const thumbs = useAttachmentUrls(
      logos.map((logo) => Number(logo.imageId) || 0),
    );

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Logo Wall preview', '<text-domain>')}
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

    const updateLogo = (index, patch) =>
      setAttributes({
        logos: logos.map((logo, i) =>
          i === index ? { ...logo, ...patch } : logo,
        ),
      });

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Logos', '<text-domain>')} initialOpen>
            <ItemList
              items={logos}
              selectable={false}
              onAdd={() => setAttributes({ logos: [...logos, emptyLogo()] })}
              onRemove={(index) =>
                setAttributes({ logos: logos.filter((_, i) => i !== index) })
              }
              onMove={(from, to) =>
                setAttributes({ logos: moveItem(logos, from, to) })
              }
              getLabel={() => ''}
              getThumb={(logo) => thumbs[Number(logo.imageId)] || ''}
              addButtonLabel={__('+ Add logo', '<text-domain>')}
              itemLabelPrefix={__('Logo', '<text-domain>')}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} logo-wall bg-light ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <AutoGrowingTextarea
            {...entrancePartProps(entrance, 0)}
            value={attributes.title}
            onChange={(value) => setAttributes({ title: value })}
            placeholder={__('Short title…', '<text-domain>')}
            className="text-small text-muted mb-10 text-center"
          />

          <div className="grid grid-cols-2 items-center gap-8 md:grid-cols-5">
            {logos.map((logo, index) => (
              <div key={index} {...entrancePartProps(entrance, index + 1)}>
                <AttachmentImageControl
                  imageId={logo.imageId}
                  onSelect={(media) =>
                    updateLogo(index, { imageId: Number(media.id) || 0 })
                  }
                  onRemove={() => updateLogo(index, { imageId: 0 })}
                  height="80px"
                  objectFit="contain"
                  emptyLabel={__('Add logo', '<text-domain>')}
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

# Reference block: Media and text — `media-text`

Text on one side and an image on the other. Demonstrates a **side switch** (the image's side is a sidebar setting; both the canvas and the page reorder with `md:order-*`, so the markup order never changes), and the secondary button role (`btn btn-secondary`).

## `resources/blocks/media-text/block.json`

```json
{
  "apiVersion": 3,
  "name": "<namespace>/media-text",
  "title": "Media and Text",
  "category": "<category>",
  "icon": "align-pull-right",
  "description": "Text on one side and an image on the other.",
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
      "default": "Show one idea with a picture"
    },
    "body": {
      "type": "string",
      "default": "A paragraph that explains the idea. The image sits on the side you pick in the sidebar."
    },
    "ctaText": {
      "type": "string",
      "default": ""
    },
    "ctaLink": {
      "type": "object",
      "default": {
        "url": "",
        "opensInNewTab": false
      }
    },
    "imageId": {
      "type": "number",
      "default": 0
    },
    "imageSide": {
      "type": "string",
      "default": "right"
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

## `resources/blocks/media-text/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

echo view('blocks.media-text', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'body'     => wp_kses_post($attributes['body'] ?? ''),
    'imageId'  => absint($attributes['imageId'] ?? 0),
    'imageFirst' => ($attributes['imageSide'] ?? 'right') === 'left',
    'ctaText'  => sanitize_text_field($attributes['ctaText'] ?? ''),
    'ctaUrl'   => esc_url_raw($attributes['ctaLink']['url'] ?? ''),
    'ctaNew'   => (bool) ($attributes['ctaLink']['opensInNewTab'] ?? false),
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

## `resources/views/blocks/media-text.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif class="media-text @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-light"
  @entrance($entrance)>
  <div class="container grid items-center gap-10 md:grid-cols-2">
    <div @if ($imageFirst) class="md:order-2" @endif>
      @if ($title)
        <h2 @entrancePart(0) class="heading-2">{{ $title }}</h2>
      @endif

      @if ($body)
        <div @entrancePart(1) class="text-body text-muted mt-4">{!! $body !!}</div>
      @endif

      @if ($ctaText && $ctaUrl)
        <div @entrancePart(2) class="mt-8">
          <a href="{{ esc_url($ctaUrl) }}" @if ($ctaNew) target="_blank" @endif
            class="btn btn-secondary">{{ $ctaText }}</a>
        </div>
      @endif
    </div>

    @if ($imageId)
      <div @entrancePart(3) @if ($imageFirst) class="md:order-1" @endif>
        {!! wp_get_attachment_image($imageId, 'large', false, [
            'class' => 'aspect-[4/3] w-full rounded-card object-cover',
            'loading' => 'lazy',
            'decoding' => 'async',
        ]) !!}
      </div>
    @endif
  </div>
</section>
```

## `resources/blocks/media-text/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { AutoGrowingTextarea } from '../components/backend/AutoGrowingTextarea.jsx';
import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
import { ActionEditor } from '../components/backend/ActionEditor.jsx';
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

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    // Hooks run before the preview return, so their order never changes.
    const [editingCta, setEditingCta] = useState(false);
    const blockProps = useBlockProps();

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Media and Text preview', '<text-domain>')}
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
    const imageFirst = attributes.imageSide === 'left';

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Layout', '<text-domain>')} initialOpen>
            <SelectControl
              __nextHasNoMarginBottom
              label={__('Image side', '<text-domain>')}
              value={attributes.imageSide}
              options={[
                { label: __('Right', '<text-domain>'), value: 'right' },
                { label: __('Left', '<text-domain>'), value: 'left' },
              ]}
              onChange={(value) => setAttributes({ imageSide: value })}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} media-text bg-light ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className={imageFirst ? 'md:order-2' : ''}>
              <AutoGrowingTextarea
                {...entrancePartProps(entrance, 0)}
                value={attributes.title}
                onChange={(value) => setAttributes({ title: value })}
                heading
                placeholder={__('Title…', '<text-domain>')}
                className="heading-2"
              />
              <div {...entrancePartProps(entrance, 1)}>
                <RichText
                  tagName="div"
                  value={attributes.body}
                  onChange={(value) => setAttributes({ body: value })}
                  placeholder={__('Text…', '<text-domain>')}
                  className="text-body text-muted mt-4"
                />
              </div>
              <div {...entrancePartProps(entrance, 2)} className="mt-8">
                {/* The button pair: the preview opens ActionEditor on click, never on select. */}
                <span
                  role="button"
                  tabIndex={0}
                  className="btn btn-secondary cursor-pointer"
                  onClick={() => setEditingCta(!editingCta)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setEditingCta(!editingCta);
                    }
                  }}
                >
                  {attributes.ctaText || __('+ Add button', '<text-domain>')}
                </span>
                {editingCta && (
                  <div className="w-full max-w-xl text-left">
                    <ActionEditor
                      groupLabel={__('Button', '<text-domain>')}
                      label={__('Button text', '<text-domain>')}
                      linkLabel={__('Button link', '<text-domain>')}
                      text={attributes.ctaText}
                      link={attributes.ctaLink}
                      onTextChange={(value) =>
                        setAttributes({ ctaText: value })
                      }
                      onLinkChange={(value) =>
                        setAttributes({ ctaLink: value })
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <div
              {...entrancePartProps(entrance, 3)}
              className={imageFirst ? 'md:order-1' : ''}
            >
              <AttachmentImageControl
                imageId={attributes.imageId}
                onSelect={(media) =>
                  setAttributes({ imageId: Number(media.id) || 0 })
                }
                onRemove={() => setAttributes({ imageId: 0 })}
                height="360px"
              />
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

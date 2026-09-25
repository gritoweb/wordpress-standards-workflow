# Reference block: CTA band (background image) — `cta-band`

A closing call to action on a dark band, with an optional photo behind it. Demonstrates **background media**: picked, replaced and removed in the sidebar's `Background Media` panel (`AttachmentImageControl noStylesheet` + `ImagePositionControl`), shown on the canvas as a passive layer with no click target, and printed on the page with `BlockImagePosition::objectClass()` for the focal point.

## `resources/blocks/cta-band/block.json`

```json
{
  "apiVersion": 3,
  "name": "<namespace>/cta-band",
  "title": "CTA Band",
  "category": "<category>",
  "icon": "megaphone",
  "description": "A closing call to action over a dark band or a photo.",
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
      "default": "Ready to take the next step?"
    },
    "body": {
      "type": "string",
      "default": "One sentence that tells the visitor what happens when they click."
    },
    "ctaText": {
      "type": "string",
      "default": "Contact us"
    },
    "ctaLink": {
      "type": "object",
      "default": {
        "url": "",
        "opensInNewTab": false
      }
    },
    "bgImageId": {
      "type": "number",
      "default": 0
    },
    "bgImagePosition": {
      "type": "string",
      "default": "center"
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

## `resources/blocks/cta-band/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

echo view('blocks.cta-band', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'body'     => wp_kses_post($attributes['body'] ?? ''),
    'bgImageId' => absint($attributes['bgImageId'] ?? 0),
    'bgPosition' => \App\Blocks\BlockImagePosition::objectClass($attributes['bgImagePosition'] ?? 'center'),
    'ctaText'  => sanitize_text_field($attributes['ctaText'] ?? ''),
    'ctaUrl'   => esc_url_raw($attributes['ctaLink']['url'] ?? ''),
    'ctaNew'   => (bool) ($attributes['ctaLink']['opensInNewTab'] ?? false),
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

## `resources/views/blocks/cta-band.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="cta-band @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-ink text-light relative isolate overflow-hidden" @entrance($entrance)>
  @if ($bgImageId)
    {!! wp_get_attachment_image($bgImageId, 'full', false, [
        'class' => 'absolute inset-0 -z-10 h-full w-full object-cover opacity-40 ' . $bgPosition,
        'alt' => '',
        'loading' => 'lazy',
        'decoding' => 'async',
    ]) !!}
  @endif

  <div class="container">
    <div class="mx-auto max-w-2xl text-center">
      @if ($title)
        <h2 @entrancePart(0) class="heading-2 text-light">{{ $title }}</h2>
      @endif

      @if ($body)
        <div @entrancePart(1) class="text-lead text-light mt-4">{!! $body !!}</div>
      @endif

      @if ($ctaText && $ctaUrl)
        <div @entrancePart(2) class="mt-8">
          <x-button-link :text="$ctaText" :url="$ctaUrl" :new-tab="$ctaNew" variant="primary" />
        </div>
      @endif
    </div>
  </div>
</section>
```

## `resources/blocks/cta-band/block.jsx`

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
import { ButtonPair } from '../components/backend/ButtonPair.jsx';
import {
  ImagePositionControl,
  focalCss,
} from '../components/backend/ImagePositionControl.jsx';
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

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    const blockProps = useBlockProps();
    const bgUrl = useAttachmentUrls([Number(attributes.bgImageId) || 0])[
      Number(attributes.bgImageId)
    ];

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('CTA Band preview', '<text-domain>')}
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

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Background Media', '<text-domain>')} initialOpen>
            <AttachmentImageControl
              imageId={attributes.bgImageId}
              onSelect={(media) =>
                setAttributes({ bgImageId: Number(media.id) || 0 })
              }
              onRemove={() => setAttributes({ bgImageId: 0 })}
              height="140px"
              noStylesheet
            />
            <ImagePositionControl
              label={__('Focal point', '<text-domain>')}
              value={attributes.bgImagePosition}
              onChange={(value) => setAttributes({ bgImagePosition: value })}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} cta-band bg-ink text-light relative isolate overflow-hidden ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          {/* Passive background preview: picked, replaced and removed in the sidebar. */}
          {bgUrl && (
            <img
              src={bgUrl}
              alt=""
              className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-40"
              style={{ objectPosition: focalCss(attributes.bgImagePosition) }}
            />
          )}

          <div className="mx-auto max-w-2xl text-center">
            <AutoGrowingTextarea
              {...entrancePartProps(entrance, 0)}
              value={attributes.title}
              onChange={(value) => setAttributes({ title: value })}
              heading
              placeholder={__('Call to action…', '<text-domain>')}
              className="heading-2 text-light text-center"
            />
            <div {...entrancePartProps(entrance, 1)}>
              <RichText
                tagName="div"
                value={attributes.body}
                onChange={(value) => setAttributes({ body: value })}
                placeholder={__('Supporting text…', '<text-domain>')}
                className="text-lead text-light mt-4"
              />
            </div>
            <div {...entrancePartProps(entrance, 2)} className="mt-8">
              <ButtonPair
                text={attributes.ctaText}
                link={attributes.ctaLink}
                onTextChange={(value) => setAttributes({ ctaText: value })}
                onLinkChange={(value) => setAttributes({ ctaLink: value })}
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

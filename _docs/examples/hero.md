# Reference block: Hero — `hero`

The page opener: an `h1`, supporting text, one button and an image. Demonstrates the **button pair** (a `role="button"` preview with the button's own classes that opens `ActionEditor` on click, never on select; the front end prints the button only when it has text and a link), the image picked on the canvas with `AttachmentImageControl`, and the hero entrance preset.

## `resources/blocks/hero/block.json`

```json
{
  "apiVersion": 3,
  "name": "<namespace>/hero",
  "title": "Hero",
  "category": "<category>",
  "icon": "cover-image",
  "description": "The page opener: title, text, a button and an image.",
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
      "default": "A headline that says what you do"
    },
    "body": {
      "type": "string",
      "default": "A short sentence with the main benefit, written for the visitor."
    },
    "ctaText": {
      "type": "string",
      "default": "Get started"
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
    "entrance": {
      "type": "object",
      "default": {
        "type": "fade",
        "direction": "up",
        "distance": 24,
        "unit": "px",
        "duration": 700,
        "delay": null,
        "stagger": 150
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

## `resources/blocks/hero/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

echo view('blocks.hero', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'body'     => wp_kses_post($attributes['body'] ?? ''),
    'imageId'  => absint($attributes['imageId'] ?? 0),
    'ctaText'  => sanitize_text_field($attributes['ctaText'] ?? ''),
    'ctaUrl'   => esc_url_raw($attributes['ctaLink']['url'] ?? ''),
    'ctaNew'   => (bool) ($attributes['ctaLink']['opensInNewTab'] ?? false),
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

## `resources/views/blocks/hero.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif class="hero @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-surface"
  @entrance($entrance)>
  <div class="container grid items-center gap-10 md:grid-cols-2">
    <div>
      @if ($title)
        <h1 @entrancePart(0) class="heading-1">{{ $title }}</h1>
      @endif

      @if ($body)
        <div @entrancePart(1) class="text-lead text-muted mt-6">{!! $body !!}</div>
      @endif

      @if ($ctaText && $ctaUrl)
        <div @entrancePart(2) class="mt-8">
          <a href="{{ esc_url($ctaUrl) }}" @if ($ctaNew) target="_blank" @endif
            class="btn btn-primary">{{ $ctaText }}</a>
        </div>
      @endif
    </div>

    @if ($imageId)
      <div @entrancePart(3)>
        {!! wp_get_attachment_image($imageId, 'large', false, [
            'class' => 'aspect-[4/3] w-full rounded-card object-cover',
            'loading' => 'eager',
            'decoding' => 'async',
        ]) !!}
      </div>
    @endif
  </div>
</section>
```

## `resources/blocks/hero/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
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
            alt={__('Hero preview', '<text-domain>')}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} hero bg-surface ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <AutoGrowingTextarea
                {...entrancePartProps(entrance, 0)}
                value={attributes.title}
                onChange={(value) => setAttributes({ title: value })}
                heading
                placeholder={__('Hero title…', '<text-domain>')}
                className="heading-1"
              />
              <div {...entrancePartProps(entrance, 1)}>
                <RichText
                  tagName="div"
                  value={attributes.body}
                  onChange={(value) => setAttributes({ body: value })}
                  placeholder={__('Supporting text…', '<text-domain>')}
                  className="text-lead text-muted mt-6"
                />
              </div>
              <div {...entrancePartProps(entrance, 2)} className="mt-8">
                {/* The button pair: the preview opens ActionEditor on click, never on select. */}
                <span
                  role="button"
                  tabIndex={0}
                  className="btn btn-primary cursor-pointer"
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

            <div {...entrancePartProps(entrance, 3)}>
              <AttachmentImageControl
                imageId={attributes.imageId}
                onSelect={(media) =>
                  setAttributes({ imageId: Number(media.id) || 0 })
                }
                onRemove={() => setAttributes({ imageId: 0 })}
                height="420px"
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

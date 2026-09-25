# Reference block: Section intro — `section-intro`

A heading, intro text and a button that open a section. Demonstrates a **layout setting in the sidebar** (alignment, a `SelectControl` in a `Layout` panel) whose value `block.php` whitelists before the view uses it, and the same button pair as the hero.

## `resources/blocks/section-intro/block.json`

```json
{
  "apiVersion": 3,
  "name": "<namespace>/section-intro",
  "title": "Section Intro",
  "category": "<category>",
  "icon": "editor-alignleft",
  "description": "A heading, intro text and a button that open a section.",
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
      "default": "A clear heading for this section"
    },
    "body": {
      "type": "string",
      "default": "One or two sentences that say what the section is about and why it matters to the visitor."
    },
    "align": {
      "type": "string",
      "default": "left"
    },
    "ctaText": {
      "type": "string",
      "default": "Learn more"
    },
    "ctaLink": {
      "type": "object",
      "default": {
        "url": "",
        "opensInNewTab": false
      }
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

## `resources/blocks/section-intro/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// The sidebar offers these two; anything else falls back to left.
$align = in_array($attributes['align'] ?? '', ['left', 'center'], true) ? $attributes['align'] : 'left';

echo view('blocks.section-intro', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'body'     => wp_kses_post($attributes['body'] ?? ''),
    'align'    => $align,
    'ctaText'  => sanitize_text_field($attributes['ctaText'] ?? ''),
    'ctaUrl'   => esc_url_raw($attributes['ctaLink']['url'] ?? ''),
    'ctaNew'   => (bool) ($attributes['ctaLink']['opensInNewTab'] ?? false),
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

## `resources/views/blocks/section-intro.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="section-intro @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-light" @entrance($entrance)>
  <div class="container">
    <div class="@if ($align === 'center') mx-auto text-center @endif max-w-3xl">
      @if ($title)
        <h2 @entrancePart(0) class="heading-2">{{ $title }}</h2>
      @endif

      @if ($body)
        <div @entrancePart(1) class="text-lead text-muted mt-4">{!! $body !!}</div>
      @endif

      @if ($ctaText && $ctaUrl)
        <div @entrancePart(2) class="mt-8">
          <a href="{{ esc_url($ctaUrl) }}" @if ($ctaNew) target="_blank" @endif
            class="btn btn-primary">{{ $ctaText }}</a>
        </div>
      @endif
    </div>
  </div>
</section>
```

## `resources/blocks/section-intro/block.jsx`

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

const ALIGN = {
  left: '',
  center: 'mx-auto text-center',
};

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
            alt={__('Section Intro preview', '<text-domain>')}
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
    const align = ALIGN[attributes.align] ?? ALIGN.left;

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Layout', '<text-domain>')} initialOpen>
            <SelectControl
              __nextHasNoMarginBottom
              label={__('Alignment', '<text-domain>')}
              value={attributes.align}
              options={[
                { label: __('Left', '<text-domain>'), value: 'left' },
                { label: __('Center', '<text-domain>'), value: 'center' },
              ]}
              onChange={(value) => setAttributes({ align: value })}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} section-intro bg-light ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
            ...rootEntrance.style,
          }}
        >
          <div className={`max-w-3xl ${align}`}>
            <AutoGrowingTextarea
              {...entrancePartProps(entrance, 0)}
              value={attributes.title}
              onChange={(value) => setAttributes({ title: value })}
              heading
              placeholder={__('Section title…', '<text-domain>')}
              className="heading-2"
            />
            <div {...entrancePartProps(entrance, 1)}>
              <RichText
                tagName="div"
                value={attributes.body}
                onChange={(value) => setAttributes({ body: value })}
                placeholder={__('Intro text…', '<text-domain>')}
                className="text-lead text-muted mt-4"
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
                    onTextChange={(value) => setAttributes({ ctaText: value })}
                    onLinkChange={(value) => setAttributes({ ctaLink: value })}
                  />
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

The rules every block follows are in `README.md` in this folder; read it before this file.

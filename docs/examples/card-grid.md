# Reference block: Card grid — `card-grid`

An array of cards with image, title, text and an optional link. Demonstrates the **all-visible** repeater (`selectable={false}`), per-card images on the canvas, a per-card link edited inline with `ActionEditor stacked`, a single `setAttributes` per change, and the `trigger: "item"` entrance preset.

## `resources/blocks/card-grid/block.json`

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

## `resources/blocks/card-grid/block.php`

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

## `resources/views/blocks/card-grid.blade.php`

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

## `resources/blocks/card-grid/block.jsx`

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
import { editorPaddingClasses } from '../components/backend/padding-presets.js';
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} card-grid bg-light ${EDITOR_BLOCK_FRAME}`}
          style={{
            ...blockProps.style,
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

The rules every block follows are in `README.md` in this folder; read it before this file.

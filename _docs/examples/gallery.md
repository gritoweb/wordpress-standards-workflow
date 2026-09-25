# Reference block: Gallery (vendor library) — `gallery`

Images in a Splide carousel, each with an optional caption. The second carousel on the same **vendor library** as `testimonial-carousel.md` (same `splide` handle registered in `app/blocks.php`, enqueued only here, `perMove: 1` so the bullets match the canvas), with image slides picked on the canvas. Read `testimonial-carousel.md` for the library setup.

## `resources/blocks/gallery/block.json`

```json
{
  "apiVersion": 3,
  "name": "<namespace>/gallery",
  "title": "Gallery",
  "category": "<category>",
  "icon": "format-gallery",
  "description": "Images in a carousel, each with an optional caption.",
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
      "default": "A look inside"
    },
    "images": {
      "type": "array",
      "default": [
        {
          "imageId": 0,
          "caption": ""
        },
        {
          "imageId": 0,
          "caption": ""
        },
        {
          "imageId": 0,
          "caption": ""
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

## `resources/blocks/gallery/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// Vendor lib registered in app/blocks.php; enqueued here so it loads only where this block renders.
wp_enqueue_script('splide');
wp_enqueue_style('splide');

// Array order is the only order; an item with no image is skipped.
$images = [];
foreach (is_array($attributes['images'] ?? null) ? $attributes['images'] : [] as $image) {
    $imageId = is_array($image) ? absint($image['imageId'] ?? 0) : 0;
    if (!$imageId) {
        continue;
    }
    $images[] = [
        'imageId' => $imageId,
        'caption' => sanitize_text_field($image['caption'] ?? ''),
    ];
}

echo view('blocks.gallery', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'images'   => $images,
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

## `resources/views/blocks/gallery.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif class="gallery @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-light"
  @entrance($entrance)>
  <div class="container">
    @if ($title)
      <h2 @entrancePart(0) class="heading-2 mb-10 text-center">{{ $title }}</h2>
    @endif

    @if ($images)
      {{-- The anchor id stays on the section; Splide only needs the data hook. --}}
      <div @entrancePart(1) class="gallery__slider splide" data-gallery
        aria-label="{{ $title ?: __('Gallery', '<text-domain>') }}">
        <div class="splide__track">
          <ul class="splide__list">
            @foreach ($images as $image)
              <li class="splide__slide">
                <figure class="m-0">
                  {!! wp_get_attachment_image($image['imageId'], 'large', false, [
                      'class' => 'aspect-[3/2] w-full rounded-card object-cover',
                      'loading' => 'lazy',
                      'decoding' => 'async',
                  ]) !!}
                  @if ($image['caption'])
                    <figcaption class="text-small text-muted mt-3">{{ $image['caption'] }}</figcaption>
                  @endif
                </figure>
              </li>
            @endforeach
          </ul>
        </div>
      </div>
    @endif
  </div>
</section>
```

## `resources/blocks/gallery/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { useEffect, useRef, useState } from '@wordpress/element';
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

// Same layout as block.js: one image below 768px, two from 768px, 24px apart.
const GAP = 24;

// Splide's breakpoint, read on the canvas iframe, not the admin window.
const useSlidesPerView = (ref) => {
  const [perView, setPerView] = useState(1);
  useEffect(() => {
    const view = ref.current?.ownerDocument.defaultView;
    if (!view) return undefined;
    const query = view.matchMedia('(min-width: 768px)');
    const update = () => setPerView(query.matches ? 2 : 1);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [ref]);
  return perView;
};

const emptyImage = () => ({ imageId: 0, caption: '' });

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    // Hooks run before the preview return, so their order never changes.
    const [activeItem, setActiveItem] = useState(0);
    const [firstVisible, setFirstVisible] = useState(0);
    const blockProps = useBlockProps();
    const viewportRef = useRef(null);
    const perView = useSlidesPerView(viewportRef);
    const images = Array.isArray(attributes.images) ? attributes.images : [];
    const thumbs = useAttachmentUrls(
      images.map((image) => Number(image.imageId) || 0),
    );

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Gallery preview', '<text-domain>')}
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

    // Splide's page count with perMove 1: one bullet per position the first visible image can take.
    const pages = Math.max(1, images.length - perView + 1);
    const page = Math.min(firstVisible, pages - 1);
    const selected = Math.min(activeItem, Math.max(images.length - 1, 0));

    // Selecting an image scrolls only when it is off screen, so editing never moves the track.
    const selectSlide = (index) => {
      setActiveItem(index);
      if (index < page) setFirstVisible(index);
      else if (index > page + perView - 1) setFirstVisible(index - perView + 1);
    };

    const updateImage = (index, patch) =>
      setAttributes({
        images: images.map((image, i) =>
          i === index ? { ...image, ...patch } : image,
        ),
      });
    const addImage = () => {
      setAttributes({ images: [...images, emptyImage()] });
      selectSlide(images.length);
    };
    const removeImage = (index) => {
      setAttributes({ images: images.filter((_, i) => i !== index) });
      setActiveItem((current) =>
        Math.max(0, current > index ? current - 1 : current),
      );
    };

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Images', '<text-domain>')} initialOpen>
            <ItemList
              items={images}
              activeItem={selected}
              setActiveItem={selectSlide}
              onAdd={addImage}
              onRemove={removeImage}
              onMove={(from, to) =>
                setAttributes({ images: moveItem(images, from, to) })
              }
              getLabel={(image) => image.caption}
              getThumb={(image) => thumbs[Number(image.imageId)] || ''}
              addButtonLabel={__('+ Add image', '<text-domain>')}
              itemLabelPrefix={__('Image', '<text-domain>')}
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} gallery bg-light ${EDITOR_BLOCK_FRAME}`}
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
            className="heading-2 mb-10 text-center"
          />

          {/* The front end's carousel, driven by the bullets and the sidebar list instead of Splide. */}
          <div
            {...entrancePartProps(entrance, 1)}
            ref={viewportRef}
            className="overflow-hidden"
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{
                gap: `${GAP}px`,
                transform: `translateX(calc(${-page} * (${100 / perView}% + ${GAP / perView}px)))`,
              }}
            >
              {images.map((image, index) => (
                <figure
                  key={index}
                  className="m-0 shrink-0"
                  style={{
                    width: `calc((100% - ${GAP * (perView - 1)}px) / ${perView})`,
                  }}
                  onFocus={() => setActiveItem(index)}
                >
                  <AttachmentImageControl
                    imageId={image.imageId}
                    onSelect={(media) =>
                      updateImage(index, { imageId: Number(media.id) || 0 })
                    }
                    onRemove={() => updateImage(index, { imageId: 0 })}
                    height="360px"
                  />
                  <AutoGrowingTextarea
                    value={image.caption}
                    onChange={(value) => updateImage(index, { caption: value })}
                    placeholder={__('Optional caption…', '<text-domain>')}
                    className="text-small text-muted mt-3"
                  />
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
                  aria-label={`${__('Go to image', '<text-domain>')} ${index + 1}`}
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

## `resources/blocks/gallery/block.js`

```js
// Served from source (no import): Splide is the vendor script registered in app/blocks.php.
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.Splide === 'undefined') return;

  document.querySelectorAll('[data-gallery]').forEach((slider) => {
    if (slider.dataset.splideMounted) return;
    slider.dataset.splideMounted = '1';

    new window.Splide(slider, {
      perPage: 1,
      // One position per image, the same page count the editor canvas shows.
      perMove: 1,
      gap: '24px',
      mediaQuery: 'min',
      breakpoints: { 768: { perPage: 2 } },
      rewind: true,
      arrows: false,
      pagination: true,
    }).mount();
  });
});
```

## `resources/blocks/gallery/block.css`

```css
.gallery .splide__pagination {
  gap: 8px;
  margin-top: 2rem;
}

.gallery .splide__pagination__page {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 9999px;
  background-color: var(--color-border);
  cursor: pointer;
}

.gallery .splide__pagination__page.is-active {
  background-color: var(--color-primary);
}
```

The rules every block follows are in `README.md` in this folder; read it before this file.

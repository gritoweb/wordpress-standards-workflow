# Reference block: Testimonial carousel (vendor library) — `testimonial-carousel`

An array of quotes in a Splide carousel. Demonstrates the **vendor library** rule (self-hosted in `resources/vendor/splide/`, registered in `app/blocks.php`, enqueued only in this `block.php`), a plain `block.js`/`block.css` served from source through `block.json`, an editor canvas that looks like the front end (two slides and the same pagination bullets, no scrollbar; the sidebar list moves it to the selected slide, editing a visible slide never moves it), and autoplay set in the sidebar (off on hover and for reduced motion).

## `resources/blocks/testimonial-carousel/block.json`

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

## `resources/blocks/testimonial-carousel/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

// Vendor lib registered in app/setup.php; enqueued here so it loads only where this block renders.
wp_enqueue_script('splide');
wp_enqueue_style('splide');

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

## `resources/views/blocks/testimonial-carousel.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="testimonial-carousel @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-surface" @entrance($entrance)>
  <div class="container">
    @if ($title)
      <h2 @entrancePart(0) class="heading-2 mb-10 text-center">{{ $title }}</h2>
    @endif

    @if ($items)
      {{-- The anchor id stays on the section; Splide only needs the data hook. --}}
      <div @entrancePart(1) class="testimonial-carousel__slider splide" data-testimonial-carousel
        data-autoplay="{{ $autoplayMs }}" aria-label="{{ $title ?: __('Testimonials', '<text-domain>') }}">
        <div class="splide__track">
          <ul class="splide__list">
            @foreach ($items as $item)
              <li class="splide__slide">
                <figure class="card m-0 flex h-full flex-col p-8">
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

## `resources/blocks/testimonial-carousel/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from '@wordpress/block-editor';
import { PanelBody, RangeControl, ToggleControl } from '@wordpress/components';
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

// Same layout as block.js on a desktop viewport: two slides, 24px apart.
const GAP = 24;

// Splide's breakpoint (block.js): one slide below 768px, two from 768px — read on the canvas iframe, not the admin window.
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

const emptyItem = () => ({ quote: '', author: '', role: '', avatarId: 0 });

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    // Hooks run before the preview return, so their order never changes.
    const [activeItem, setActiveItem] = useState(0);
    const [firstVisible, setFirstVisible] = useState(0);
    const blockProps = useBlockProps();
    const viewportRef = useRef(null);
    const perView = useSlidesPerView(viewportRef);
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

    // Splide's page count with perMove 1: one bullet per position the first visible slide can take.
    const pages = Math.max(1, items.length - perView + 1);
    const page = Math.min(firstVisible, pages - 1);
    const selected = Math.min(activeItem, Math.max(items.length - 1, 0));

    // Selecting a slide scrolls only when it is off screen, so editing never moves the track.
    const selectSlide = (index) => {
      setActiveItem(index);
      if (index < page) setFirstVisible(index);
      else if (index > page + perView - 1) setFirstVisible(index - perView + 1);
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
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} testimonial-carousel bg-surface ${EDITOR_BLOCK_FRAME}`}
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
              {items.map((item, index) => (
                <figure
                  key={index}
                  className="card flex shrink-0 flex-col p-8"
                  style={{
                    width: `calc((100% - ${GAP * (perView - 1)}px) / ${perView})`,
                  }}
                  onFocus={() => setActiveItem(index)}
                >
                  <RichText
                    tagName="blockquote"
                    value={item.quote}
                    onChange={(value) => updateItem(index, { quote: value })}
                    placeholder={__('Quote…', '<text-domain>')}
                    className="text-lead flex-1"
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

## `resources/blocks/testimonial-carousel/block.js`

```js
// Served from source (no import): Splide is the vendor script registered in app/setup.php.
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.Splide === 'undefined') return;

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  document.querySelectorAll('[data-testimonial-carousel]').forEach((slider) => {
    if (slider.dataset.splideMounted) return;
    slider.dataset.splideMounted = '1';
    const delay = Number(slider.dataset.autoplay) || 0;

    new window.Splide(slider, {
      perPage: 1,
      // One position per slide, the same page count the editor canvas shows.
      perMove: 1,
      gap: '24px',
      mediaQuery: 'min',
      breakpoints: { 768: { perPage: 2 } },
      // Rewind instead of loop: loop clones slides and needs more than are visible.
      rewind: true,
      arrows: false,
      pagination: true,
      autoplay: delay > 0 && !reducedMotion,
      interval: delay || 5000,
      pauseOnHover: true,
    }).mount();
  });
});
```

## `resources/blocks/testimonial-carousel/block.css`

```css
.testimonial-carousel .splide__pagination {
  gap: 8px;
  margin-top: 2rem;
}

.testimonial-carousel .splide__pagination__page {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 9999px;
  background-color: var(--color-border);
  cursor: pointer;
}

.testimonial-carousel .splide__pagination__page.is-active {
  background-color: var(--color-primary);
}
```

## Vendor library: Splide (only when a block needs a carousel)

Copy `.claude/skills/create-block/templates/vendor/splide/` to `resources/vendor/splide/` (Splide 4.1.4, the pre-built `splide.min.js` and `splide-core.min.css`, self-hosted: no CDN), and append to `app/blocks.php`:

```php
// Splide self-hosted in resources/vendor/splide/ (no CDN); enqueued per-block in each block.php.
add_action('init', function () {
    wp_register_style('splide', get_theme_file_uri('resources/vendor/splide/css/splide-core.min.css'), [], '4.1.4');
    wp_register_script('splide', get_theme_file_uri('resources/vendor/splide/js/splide.min.js'), [], '4.1.4', true);
});
```

`app/setup.php` stays untouched. Every carousel block reuses the same `splide` handle; WordPress loads it once per page.

The rules every block follows are in `README.md` in this folder; read it before this file.

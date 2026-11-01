# Reference block: Post grid — `post-grid`

Cards from a post type, with Selected or All, sorting, a post limit and paging. It needs the collection templates: `create-block` copies them the first time a block needs a collection (`docs/patterns/collection-grid.md`). The canvas draws the real records in the page's card; the sidebar holds only the source, the sort and the counts. The card's link label and the Load more label are text, so they're edited on the canvas.

## `resources/blocks/post-grid/block.json`

```json
{
  "apiVersion": 3,
  "name": "<namespace>/post-grid",
  "title": "Post Grid",
  "category": "<category>",
  "icon": "grid-view",
  "description": "Cards from a post type, with sorting and paging.",
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
    "contentType": {
      "type": "string",
      "default": "post"
    },
    "collectionMode": {
      "type": "string",
      "enum": ["selected", "all"],
      "default": "all"
    },
    "includeIds": {
      "type": "array",
      "items": { "type": "integer" },
      "default": []
    },
    "excludeIds": {
      "type": "array",
      "items": { "type": "integer" },
      "default": []
    },
    "orderby": {
      "type": "string",
      "enum": ["manual", "title", "date"],
      "default": "date"
    },
    "order": {
      "type": "string",
      "enum": ["asc", "desc"],
      "default": "desc"
    },
    "postCount": {
      "type": "number",
      "default": 0
    },
    "columns": {
      "type": "number",
      "default": 3
    },
    "postsPerPage": {
      "type": "number",
      "default": 6
    },
    "pagination": {
      "type": "string",
      "enum": ["pager", "loadMore"],
      "default": "loadMore"
    },
    "moreText": {
      "type": "string",
      "default": "Load More"
    },
    "linkText": {
      "type": "string",
      "default": "Read More"
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
        "stagger": null,
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

## `resources/blocks/post-grid/block.php`

```php
<?php

use App\Content\ContentTypes;
use App\Content\Paging;

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// Registered once in app/blocks.php, shared by every collection block.
wp_enqueue_script('collection-paging');
wp_enqueue_style('collection-paging');

$adapter = ContentTypes::adapter((string) ($attributes['contentType'] ?? ''));

// A saved list that is not an array (hand-edited markup) reads as empty.
$ids = fn (string $name): array => array_values(array_unique(array_filter(
    is_array($attributes[$name] ?? null) ? $attributes[$name] : [],
    fn ($id): bool => is_int($id) && $id > 0
)));

$orderby = in_array($attributes['orderby'] ?? '', ['manual', 'title', 'date'], true) ? $attributes['orderby'] : 'date';

// Selected queries only the include list, and an empty list shows nothing.
$selected = ($attributes['collectionMode'] ?? '') === 'selected';
$include = $selected ? $ids('includeIds') : [];
$exclude = $selected ? [] : $ids('excludeIds');

$posts = !$adapter || ($selected && !$include) ? [] : $adapter::selectedPosts($include, $exclude, $orderby);

// The adapter sorts dates newest first. Oldest first flips only the date, so
// records that share one keep the title, then ID, tie-breakers.
if ($posts && $orderby === 'date' && ($attributes['order'] ?? '') === 'asc') {
    usort($posts, fn ($a, $b) => [$a->post_date, $a->post_title, $a->ID] <=> [$b->post_date, $b->post_title, $b->ID]);
}

// The cap applies after the sort and before paging. 0 removes it.
$postCount = absint($attributes['postCount'] ?? 0);
if ($postCount > 0) {
    $posts = array_slice($posts, 0, $postCount);
}

$moreText = sanitize_text_field($attributes['moreText'] ?? '');

$paging = Paging::paginate(
    $posts,
    absint($attributes['postsPerPage'] ?? 0),
    (string) ($attributes['pagination'] ?? ''),
    'post-grid-page',
    $moreText !== '' ? $moreText : __('Load More', '<text-domain>'),
);

echo view('blocks.post-grid', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    // Cards are built for the page that renders, not for every selected record.
    'items'    => $adapter ? array_map([$adapter, 'card'], $paging['items']) : [],
    'paging'   => $paging,
    'columns'  => min(max(absint($attributes['columns'] ?? 3), 1), 4),
    'linkText' => sanitize_text_field($attributes['linkText'] ?? ''),
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();
```

## `resources/views/blocks/post-grid.blade.php`

```blade
@if (count($items))
<section @if ($anchor) id="{{ $anchor }}" @endif
  class="post-grid @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop) bg-light"
  @entrance($entrance)>
  <div class="container">
    {{-- Column classes stay literal per count so Tailwind's scanner finds them. --}}
    <ul id="{{ $paging['key'] }}"
      class="grid grid-cols-1 gap-6 @if ($columns >= 2) sm:grid-cols-2 @endif @if ($columns === 4) lg:grid-cols-4 @elseif ($columns === 3) lg:grid-cols-3 @endif">
      @foreach ($items as $item)
        {{-- Capped at 8, the ROW_CAP collection-paging.js uses, so a long page never waits for its last card. --}}
        <li @entrancePart(min($loop->index, 8))>
          <article class="card flex h-full flex-col overflow-hidden">
            @if ($item['photoId'])
              {!! wp_get_attachment_image($item['photoId'], 'large', false, [
                  'class' => 'aspect-[4/3] w-full object-cover',
                  'alt' => $item['photoAlt'],
                  'loading' => 'lazy',
                  'decoding' => 'async',
              ]) !!}
            @endif

            <div class="flex flex-1 flex-col p-6">
              <h3 class="heading-5">{{ $item['title'] }}</h3>

              @if ($item['meta'])
                <p class="mt-1 text-small text-muted">{{ $item['meta'] }}</p>
              @endif

              @if ($item['excerpt'])
                <p class="mt-3 text-small text-muted">{{ $item['excerpt'] }}</p>
              @endif

              @if ($item['url'] && $linkText)
                <a href="{!! esc_url($item['url']) !!}" class="link mt-auto self-start pt-5 text-small font-semibold text-primary hover:underline">
                  {{ $linkText }}<span class="sr-only"> about {{ $item['title'] }}</span>
                </a>
              @endif
            </div>
          </article>
        </li>
      @endforeach
    </ul>

    <div class="mt-12">
      @include('partials.collection-paging', ['paging' => $paging])
    </div>
  </div>
</section>
@endif
```

## `resources/blocks/post-grid/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { AutoGrowingTextarea } from '../components/backend/AutoGrowingTextarea.jsx';
import { PaddingControls } from '../components/backend/PaddingControls.jsx';
import { editorPaddingClasses } from '../components/backend/padding-presets.js';
import { PagingControls } from '../components/backend/PagingControls.jsx';
import { PostPicker } from '../components/backend/PostPicker.jsx';
import { recordText, recordThumb } from '../components/backend/postPickerQuery.js';
import { useCollectionSummary } from '../components/backend/useCollectionSummary.js';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import {
  resolveEntrance,
  entranceRootProps,
  entrancePartProps,
} from '../components/backend/entranceCanvas.js';
import { EDITOR_BLOCK_FRAME } from '../components/backend/editorCanvas.js';
import previewImage from './preview.svg';
import metadata from './block.json';

// Mirrors ContentTypes::register(): the editor never loads that PHP class.
const CONTENT_TYPES = [{ value: 'post', label: __('Posts', '<text-domain>') }];

const SORT_OPTIONS = [
  { value: 'manual', label: __('Manual', '<text-domain>') },
  { value: 'title', label: __('Title', '<text-domain>') },
  { value: 'date:desc', label: __('Newest first', '<text-domain>') },
  { value: 'date:asc', label: __('Oldest first', '<text-domain>') },
];

// Literal per count so Tailwind's scanner finds them, as in the Blade view.
const COLUMN_CLASSES = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

registerBlockType(metadata, {
  edit({ attributes, setAttributes, clientId }) {
    const blockProps = useBlockProps();
    const { contentType, columns, orderby, order, postCount, postsPerPage, pagination, linkText, moreText } = attributes;
    const isSelected = attributes.collectionMode === 'selected';
    const includeIds = Array.isArray(attributes.includeIds) ? attributes.includeIds : [];
    const excludeIds = Array.isArray(attributes.excludeIds) ? attributes.excludeIds : [];

    // Hooks run before the preview return, so their order never changes.
    const summary = useCollectionSummary({
      ...attributes,
      includeIds: isSelected ? includeIds : [],
      excludeIds: isSelected ? [] : excludeIds,
      limit: postCount,
    });

    if (attributes.isPreview) {
      return (
        <div {...blockProps}>
          <img
            src={previewImage}
            alt={__('Post Grid preview', '<text-domain>')}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      );
    }

    const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance.default);
    const rootEntrance = entranceRootProps(entrance);

    // The summary reads an empty include list as everyone; Selected with none shows nothing.
    const visible = isSelected && !includeIds.length ? [] : summary.visible;
    const shown = postsPerPage > 0 ? visible.slice(0, postsPerPage) : visible;
    const hasMore = postsPerPage > 0 && visible.length > postsPerPage && pagination === 'loadMore';
    const notice =
      summary.state === 'resolved' && !visible.length
        ? __('Nothing to show yet. The block prints nothing on the page until it has posts.', '<text-domain>')
        : summary.message;

    const sortOptions = isSelected ? SORT_OPTIONS : SORT_OPTIONS.filter((option) => option.value !== 'manual');
    const sortValue = orderby === 'date' ? `date:${order === 'asc' ? 'asc' : 'desc'}` : !isSelected && orderby === 'manual' ? 'title' : orderby;

    return (
      <>
        <InspectorControls>
          <PanelBody title={__('Content', '<text-domain>')} initialOpen>
            <SelectControl
              label={__('Content type', '<text-domain>')}
              value={contentType}
              options={CONTENT_TYPES}
              onChange={(value) => setAttributes({ contentType: value })}
            />
            <SelectControl
              label={__('Source', '<text-domain>')}
              value={isSelected ? 'selected' : 'all'}
              options={[
                { value: 'all', label: __('All posts', '<text-domain>') },
                { value: 'selected', label: __('Selected posts', '<text-domain>') },
              ]}
              onChange={(value) => setAttributes({ collectionMode: value })}
            />
            <PostPicker
              postType={contentType}
              value={isSelected ? includeIds : excludeIds}
              onChange={(next) => setAttributes({ [isSelected ? 'includeIds' : 'excludeIds']: next })}
              label={isSelected ? __('Posts', '<text-domain>') : __('Exclude posts', '<text-domain>')}
              addLabel={isSelected ? __('Add a post', '<text-domain>') : __('Add a post to hide', '<text-domain>')}
              emptyNotice={isSelected ? __('Nothing is selected, so the grid shows nothing.', '<text-domain>') : undefined}
            />
            <SelectControl
              label={__('Sort', '<text-domain>')}
              value={sortValue}
              options={sortOptions}
              onChange={(value) => {
                const [nextOrderby, nextOrder] = value.split(':');
                setAttributes(nextOrder ? { orderby: nextOrderby, order: nextOrder } : { orderby: nextOrderby });
              }}
            />
            <RangeControl
              label={__('Number of posts', '<text-domain>')}
              help={__('Zero shows all.', '<text-domain>')}
              value={postCount}
              onChange={(value) => setAttributes({ postCount: value ?? 0 })}
              min={0}
              max={48}
            />
            {summary.state === 'resolved' && <p>{summary.message}</p>}
            {summary.extra && <p>{summary.extra}</p>}
          </PanelBody>
          <PanelBody title={__('Layout', '<text-domain>')} initialOpen={false}>
            <RangeControl
              label={__('Columns', '<text-domain>')}
              value={columns}
              onChange={(value) => setAttributes({ columns: value ?? 1 })}
              min={1}
              max={4}
            />
            <PagingControls attributes={attributes} setAttributes={setAttributes} />
          </PanelBody>
          <PaddingControls attributes={attributes} setAttributes={setAttributes} />
          <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />
        </InspectorControls>

        <section
          {...blockProps}
          {...rootEntrance}
          className={`${blockProps.className} ${editorPaddingClasses(attributes)} post-grid bg-light ${EDITOR_BLOCK_FRAME}`}
          style={{ ...blockProps.style, ...rootEntrance.style }}
        >
          {!shown.length && (
            <p className="text-body text-muted" data-collection-state={summary.state}>
              {notice}
            </p>
          )}

          {shown.length > 0 && (
            <ul data-collection-state={summary.state} className={`grid grid-cols-1 gap-6 ${COLUMN_CLASSES[columns] ?? ''}`}>
              {shown.map((record, index) => (
                <li key={record.id} {...entrancePartProps(entrance, Math.min(index, 8))}>
                  <article className="card flex h-full flex-col overflow-hidden">
                    {recordThumb(record, 'large') && (
                      <img src={recordThumb(record, 'large')} alt="" className="aspect-[4/3] w-full object-cover" />
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="heading-5">{recordText(record.title?.rendered)}</h3>
                      <p className="mt-3 text-small text-muted">{recordText(record.excerpt?.rendered)}</p>
                      <AutoGrowingTextarea
                        value={linkText}
                        onChange={(value) => setAttributes({ linkText: value })}
                        placeholder={__('Write the link label', '<text-domain>')}
                        className="link mt-auto self-start pt-5 text-small font-semibold text-primary"
                      />
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <div className="mt-12 flex justify-center">
              <AutoGrowingTextarea
                value={moreText}
                onChange={(value) => setAttributes({ moreText: value })}
                placeholder={__('Write the button label', '<text-domain>')}
                className="btn btn-secondary w-auto text-center"
              />
            </div>
          )}
        </section>
      </>
    );
  },

  save: () => null,
});
```

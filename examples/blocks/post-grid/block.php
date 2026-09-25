<?php

use App\Blocks\BlockAttributes;
use App\Blocks\BlockEntrance;
use App\Blocks\BlockPadding;
use App\Content\ContentTypes;
use App\Content\Paging;

if (!defined('ABSPATH')) {
    exit;
}

// This block's own frontend behavior (collection-paging.js/css) is
// registered once in app/blocks.php and shared by every collection block
// (see block.json's viewScript/viewStyle) — nothing to enqueue here.

$attributes = $attributes ?? [];

$adapter = ContentTypes::adapter((string) ($attributes['contentType'] ?? ''));

// A saved list that is not an array (hand-edited markup) reads as empty.
$lists = array_filter(array_intersect_key($attributes, array_flip(['includeIds', 'excludeIds'])), 'is_array');

$ids = fn (string $name): array => array_values(array_unique(array_filter(
    $lists[$name] ?? [],
    fn ($id): bool => is_int($id) && $id > 0
)));

$orderby = in_array($attributes['orderby'] ?? '', ['manual', 'title', 'date'], true)
    ? $attributes['orderby']
    : 'manual';

$posts = $adapter ? $adapter::selectedPosts($ids('includeIds'), $ids('excludeIds'), $orderby) : [];

$moreText = sanitize_text_field($attributes['moreText'] ?? '');

$paging = Paging::paginate(
    $posts,
    absint($attributes['postsPerPage'] ?? 0),
    (string) ($attributes['pagination'] ?? ''),
    'post-grid-page',
    $moreText !== '' ? $moreText : __('Load More', '__TEXT_DOMAIN__'),
);

// Cards are built for the page that renders, not for every selected record.
$paging['items'] = $adapter ? array_map([$adapter, 'card'], $paging['items']) : [];

echo view('blocks.post-grid', [
    'entrance' => BlockEntrance::fromBlock($attributes, __DIR__),
    'items' => $paging['items'],
    'paging' => $paging,

    'columns' => min(max(absint($attributes['columns'] ?? 3), 1), 4),
    'linkText' => sanitize_text_field($attributes['linkText'] ?? ''),
    'groundClass' => BlockAttributes::groundClass((string) ($attributes['ground'] ?? '')),
    'sectionDivider' => BlockAttributes::divider($attributes),

    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),

    ...BlockPadding::fromAttributes($attributes),
])->render();

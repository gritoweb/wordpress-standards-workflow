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

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

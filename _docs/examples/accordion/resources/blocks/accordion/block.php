<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// Array order is the only order: the sidebar ItemList reorders the array itself.
$items = [];
foreach (is_array($attributes['items'] ?? null) ? $attributes['items'] : [] as $item) {
    if (!is_array($item)) {
        continue;
    }
    $title = sanitize_text_field($item['title'] ?? '');
    if ($title === '') {
        continue;
    }
    $items[] = [
        'title' => $title,
        'body'  => wp_kses_post($item['body'] ?? ''),
    ];
}

echo view('blocks.accordion', [
    'anchor'      => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'       => sanitize_text_field($attributes['title'] ?? ''),
    'description' => wp_kses_post($attributes['description'] ?? ''),
    'items'       => $items,
    'entrance'    => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();

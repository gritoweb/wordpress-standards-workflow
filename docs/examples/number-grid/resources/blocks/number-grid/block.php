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
    $value = sanitize_text_field($item['value'] ?? '');
    if ($value === '') {
        continue;
    }
    $items[] = [
        'value' => $value,
        'label' => sanitize_text_field($item['label'] ?? ''),
    ];
}

echo view('blocks.number-grid', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'items'    => $items,
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();

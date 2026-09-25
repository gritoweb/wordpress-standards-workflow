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

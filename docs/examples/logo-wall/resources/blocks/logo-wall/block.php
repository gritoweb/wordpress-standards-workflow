<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// Array order is the only order; a logo with no image is skipped. Its alt text is the Media Library's.
$logos = [];
foreach (is_array($attributes['logos'] ?? null) ? $attributes['logos'] : [] as $logo) {
    $imageId = is_array($logo) ? absint($logo['imageId'] ?? 0) : 0;
    if ($imageId) {
        $logos[] = $imageId;
    }
}

echo view('blocks.logo-wall', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'logos'    => $logos,
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();

<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

echo view('blocks.cta-band', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'body'     => wp_kses_post($attributes['body'] ?? ''),
    'bgImageId' => absint($attributes['bgImageId'] ?? 0),
    'bgPosition' => \App\Blocks\BlockImagePosition::objectClass($attributes['bgImagePosition'] ?? 'center'),
    'ctaText'  => sanitize_text_field($attributes['ctaText'] ?? ''),
    'ctaUrl'   => esc_url_raw($attributes['ctaLink']['url'] ?? ''),
    'ctaNew'   => (bool) ($attributes['ctaLink']['opensInNewTab'] ?? false),
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();

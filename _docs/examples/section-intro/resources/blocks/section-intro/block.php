<?php

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// The sidebar offers these two; anything else falls back to left.
$align = in_array($attributes['align'] ?? '', ['left', 'center'], true) ? $attributes['align'] : 'left';

echo view('blocks.section-intro', [
    'anchor'   => sanitize_html_class($attributes['anchor'] ?? ''),
    'title'    => sanitize_text_field($attributes['title'] ?? ''),
    'body'     => wp_kses_post($attributes['body'] ?? ''),
    'align'    => $align,
    'ctaText'  => sanitize_text_field($attributes['ctaText'] ?? ''),
    'ctaUrl'   => esc_url_raw($attributes['ctaLink']['url'] ?? ''),
    'ctaNew'   => (bool) ($attributes['ctaLink']['opensInNewTab'] ?? false),
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),
    ...\App\Blocks\BlockPadding::fromAttributes($attributes),
])->render();

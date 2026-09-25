<?php

use App\Blocks\BlockAttributes;
use App\Blocks\BlockEntrance;
use App\Blocks\BlockPadding;

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

$ground = (string) ($attributes['ground'] ?? '');

$items = array_values(array_filter(array_map(
    fn (array $item) => ['heading' => sanitize_text_field($item['heading'] ?? '')],
    array_filter($attributes['items'] ?? [], 'is_array'),
), fn (array $item) => $item['heading'] !== ''));

echo view('blocks.conformance-pass', [
    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),
    'heading' => sanitize_text_field($attributes['heading'] ?? ''),
    'body' => BlockAttributes::newTabHints(wp_kses_post($attributes['body'] ?? '')),
    'imageId' => absint($attributes['imageId'] ?? 0),
    'items' => $items,
    'groundClass' => BlockAttributes::groundClass($ground),
    'sectionDivider' => BlockAttributes::divider($attributes),
    'ctaButtonClass' => BlockAttributes::ctaButtonClass($ground),
    ...BlockAttributes::cta($attributes),
    'entrance' => BlockEntrance::fromBlock($attributes, __DIR__),
    ...BlockPadding::fromAttributes($attributes),
])->render();

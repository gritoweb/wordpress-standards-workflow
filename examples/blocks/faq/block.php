<?php

use App\Blocks\BlockAttributes;
use App\Blocks\BlockEntrance;
use App\Blocks\BlockPadding;

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

$ground = (string) ($attributes['ground'] ?? '');

// An answer with no text left after stripping tags (an emptied paragraph) is as empty as no answer.
$items = array_values(array_filter(
    array_map(
        fn (array $item) => [
            'heading' => sanitize_text_field($item['heading'] ?? ''),
            'body' => BlockAttributes::newTabHints(wp_kses_post($item['body'] ?? '')),
        ],
        array_filter($attributes['items'] ?? [], 'is_array'),
    ),
    fn (array $item) => $item['heading'] !== '' && trim(wp_strip_all_tags($item['body'])) !== '',
));

$intro = BlockAttributes::newTabHints(wp_kses_post($attributes['intro'] ?? ''));

echo view('blocks.faq', [
    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),
    'heading' => sanitize_text_field($attributes['heading'] ?? ''),
    'intro' => trim(wp_strip_all_tags($intro)) !== '' ? $intro : '',
    'items' => $items,
    'groundClass' => BlockAttributes::groundClass($ground),
    'sectionDivider' => BlockAttributes::divider($attributes),
    'ctaButtonClass' => BlockAttributes::ctaButtonClass($ground),
    ...BlockAttributes::cta($attributes),
    'entrance' => BlockEntrance::fromBlock($attributes, __DIR__),
    ...BlockPadding::fromAttributes($attributes),
])->render();

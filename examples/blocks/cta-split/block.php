<?php

use App\Blocks\BlockAttributes;
use App\Blocks\BlockEntrance;
use App\Blocks\BlockPadding;

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

$ground = (string) ($attributes['ground'] ?? '');

echo view('blocks.cta-split', [
    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),
    'heading' => sanitize_text_field($attributes['heading'] ?? ''),
    'body' => BlockAttributes::newTabHints(wp_kses_post($attributes['body'] ?? '')),
    'groundClass' => BlockAttributes::groundClass($ground),
    'sectionDivider' => BlockAttributes::divider($attributes),
    'ctaButtonClass' => BlockAttributes::ctaButtonClass($ground),
    ...BlockAttributes::cta($attributes),
    'entrance' => BlockEntrance::fromBlock($attributes, __DIR__),
    ...BlockPadding::fromAttributes($attributes, 112, 56),
])->render();

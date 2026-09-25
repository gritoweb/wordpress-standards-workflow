<?php

use App\Blocks\BlockAttributes;
use App\Blocks\BlockEntrance;
use App\Blocks\BlockImagePosition;
use App\Blocks\BlockPadding;

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

$ground = (string) ($attributes['ground'] ?? '');
$position = BlockAttributes::enum($attributes, 'bgImagePosition', BlockImagePosition::positions(), 'center');
$textTone = BlockAttributes::enum($attributes, 'textTone', ['dark', 'light'], 'dark');
$bgImageId = absint($attributes['bgImageId'] ?? 0);
$bgImageUrl = esc_url_raw($attributes['bgImageUrl'] ?? '');

echo view('blocks.cta-banner', [
    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),
    'heading' => sanitize_text_field($attributes['heading'] ?? ''),
    'subtitle' => sanitize_text_field($attributes['subtitle'] ?? ''),
    // Over a photo the text tone owns the tone, so the ground's on-dark styles
    // never fight it. The ground shows only when there is no photo.
    'groundClass' => $bgImageId > 0 || $bgImageUrl !== '' ? '' : BlockAttributes::groundClass($ground),

    'layout' => BlockAttributes::enum($attributes, 'layout', ['band', 'panel'], 'band'),
    'textTone' => $textTone,
    'scrim' => (bool) ($attributes['scrim'] ?? false),

    'bgImageId' => $bgImageId,
    'bgImageUrl' => $bgImageUrl,
    'bgObjectPosition' => BlockImagePosition::cssValue($position),

    'ctaButtonClass' => BlockAttributes::ctaButtonClass($ground, $textTone),
    ...BlockAttributes::cta($attributes),

    'entrance' => BlockEntrance::fromBlock($attributes, __DIR__),
    ...BlockPadding::fromAttributes($attributes, 112, 56),
])->render();

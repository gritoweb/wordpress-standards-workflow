<?php

use App\Blocks\BlockAttributes;
use App\Blocks\BlockEntrance;
use App\Blocks\BlockLogos;
use App\Blocks\BlockPadding;

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// Cap the drawn HEIGHT and let width follow the asset, so two marks of
// different proportions read at the same optical size. A single-column
// panel (one or two logos) has the width to draw a bigger mark.
// A null/scalar entry (hand-edited markup, a failed migration) would throw a
// TypeError against the closures below, which are all typed `array $logo`.
$rawLogos = array_filter(is_array($attributes['logos'] ?? null) ? $attributes['logos'] : [], 'is_array');
$populatedCount = count(array_filter($rawLogos, fn (array $logo): bool => absint($logo['imageId'] ?? 0) > 0));
$maxHeight = $populatedCount > 0 && $populatedCount <= 2 ? 90 : 70;

$logos = array_values(array_filter(
    array_map(function (array $logo) use ($maxHeight): array {
        $imageId = absint($logo['imageId'] ?? 0);
        $size = BlockLogos::size($imageId, $maxHeight);

        $name = sanitize_text_field($logo['name'] ?? '');
        $linkUrl = esc_url_raw($logo['link']['url'] ?? '');
        $alt = BlockLogos::alt($imageId, $name, $linkUrl);

        return [
            'imageId' => $imageId,
            'alt' => $alt,
            'linkUrl' => $linkUrl,
            'linkNew' => (bool) ($logo['link']['opensInNewTab'] ?? false),
            'singleColor' => (bool) ($logo['singleColor'] ?? false),
            'width' => $size['width'],
            'height' => $size['height'],
            'desktop' => is_array($logo['desktop'] ?? null) ? $logo['desktop'] : [],
        ];
    }, $rawLogos),
    // A logo with no attachment would render an empty cell and throw the
    // rows off.
    fn (array $logo): bool => $logo['imageId'] > 0
));

// One logo list serves every viewport: grouped into the rows an editor
// arranged (BlockLogos::size() above already gives each mark its own
// fallback width/height; the editor's own desktop settings win when set).
$seenImages = [];
$rows = [];
foreach ($logos as $index => $logo) {
    if (isset($seenImages[$logo['imageId']])) {
        continue;
    }
    $seenImages[$logo['imageId']] = true;
    $settings = $logo['desktop'];
    $row = max(1, min(100, absint($settings['row'] ?? (intdiv($index, 6) + 1))));

    $width = max(1, min(600, (float) ($settings['width'] ?? $logo['width'])));
    $height = max(1, min(100, (float) ($settings['height'] ?? $logo['height'])));
    $cellWidth = max(1, min(640, (float) ($settings['cellWidth'] ?? $width)));

    $rows[$row]['gap'] ??= min(96, absint($settings['gap'] ?? 48));
    $rows[$row]['logos'][] = [
        'imageId' => $logo['imageId'],
        'alt' => $logo['alt'],
        'linkUrl' => $logo['linkUrl'],
        'linkNew' => $logo['linkNew'],
        'singleColor' => $logo['singleColor'],
        'width' => $width,
        'height' => $height,
        'cellWidth' => $cellWidth,
        'cellHeight' => max($height, min(100, (float) ($settings['cellHeight'] ?? 70))),
        'order' => absint($settings['order'] ?? $index),
    ];
}
ksort($rows);
foreach ($rows as &$row) {
    usort($row['logos'], fn ($a, $b) => $a['order'] <=> $b['order']);
}
unset($row);

$heading = sanitize_text_field($attributes['heading'] ?? '');
$ground = BlockAttributes::enum($attributes, 'ground', BlockAttributes::groundNames(), '');
$lightGround = BlockAttributes::isLightGround($ground);
$entrance = BlockEntrance::fromBlock($attributes, __DIR__);
// Parts in DOM order: the heading (part 0), then every logo across every
// row, so the stagger ripples through the whole wall.
$partIndex = $heading ? 1 : 0;

$brandRows = array_map(function (array $row) use (&$partIndex, $lightGround): array {
    return [
        'gap' => $row['gap'],
        'logos' => array_map(function (array $logo) use (&$partIndex, $lightGround): array {
            return [
                'image' => wp_get_attachment_image($logo['imageId'], 'full', false, [
                    'class' => trim('logo-wall__brand-img '.BlockLogos::tintClass($logo['singleColor'], $lightGround)),
                    'alt' => $logo['alt'],
                    'loading' => 'lazy',
                    'decoding' => 'async',
                    'style' => "--brand-width: {$logo['width']}px; --brand-height: {$logo['height']}px",
                ]),
                'url' => $logo['linkUrl'],
                'new' => $logo['linkNew'],
                'style' => "--brand-cell: {$logo['cellWidth']}px; --brand-height: {$logo['cellHeight']}px",
                'part' => $partIndex++,
            ];
        }, $row['logos']),
    ];
}, $rows);

echo view('blocks.logo-wall', [
    'entrance' => $entrance,
    'heading' => $heading,
    'brandRows' => $brandRows,
    'sectionDivider' => BlockAttributes::divider($attributes),
    'groundClass' => BlockAttributes::groundClass($ground),
    'isLightGround' => $lightGround,

    ...BlockAttributes::cta($attributes),
    // The label defaults so the only editorial decision left is where the
    // link points; the URL alone gates whether the CTA renders at all.
    'ctaText' => sanitize_text_field($attributes['ctaText'] ?? '') ?: __('Read More', '__TEXT_DOMAIN__'),

    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),

    ...BlockPadding::fromAttributes($attributes, 112, 56, false),
])->render();

<?php

use App\Blocks\BlockAttributes;
use App\Blocks\BlockEntrance;
use App\Blocks\BlockImagePosition;
use App\Blocks\BlockLogos;
use App\Blocks\BlockPadding;

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];
$mediaType = BlockAttributes::enum($attributes, 'mediaType', ['image', 'logos'], 'image');

// Cap the drawn HEIGHT and let width follow the asset. A single-column panel
// (one or two logos) has the width to draw a bigger mark, so it gets a
// taller cap; block.css's cell heights hold the same air over both caps.
// A null/scalar entry (hand-edited markup, a failed migration) would throw a
// TypeError against the closures below, which are all typed `array $logo`.
$rawLogos = array_filter(is_array($attributes['logos'] ?? null) ? $attributes['logos'] : [], 'is_array');
$logoCount = count(array_filter($rawLogos, fn (array $logo): bool => absint($logo['imageId'] ?? 0) > 0));
$maxLogoHeight = $logoCount > 0 && $logoCount <= 2 ? 90 : 70;

$logos = array_values(array_filter(
    array_map(function (array $logo) use ($maxLogoHeight): array {
        $imageId = absint($logo['imageId'] ?? 0);
        // SVGs report no useful intrinsic ratio in the browser and lose
        // nothing by scaling up; a raster mark only ever shrinks toward the
        // cap, or upscaling would soften it.
        $size = BlockLogos::size($imageId, $maxLogoHeight, 120, true);
        $linkUrl = esc_url_raw($logo['link']['url'] ?? '');
        $name = sanitize_text_field($logo['name'] ?? '');

        return [
            'imageId' => $imageId,
            'name' => $name,
            'linkUrl' => $linkUrl,
            'linkNew' => (bool) ($logo['link']['opensInNewTab'] ?? false),
            'singleColor' => (bool) ($logo['singleColor'] ?? false),
            'width' => $size['width'],
            'height' => $size['height'],
        ];
    }, $rawLogos),
    // A logo with no image would render an empty cell and throw the rows off.
    fn (array $logo): bool => $logo['imageId'] > 0
));

$ground = BlockAttributes::enum($attributes, 'ground', BlockAttributes::groundNames(), '');
$lightGround = BlockAttributes::isLightGround($ground);

$preparedLogos = array_map(fn (array $logo): array => [
    'image' => wp_get_attachment_image($logo['imageId'], 'full', false, [
        'class' => trim('text-media__logo-img '.BlockLogos::tintClass($logo['singleColor'], $lightGround)),
        'alt' => BlockLogos::alt($logo['imageId'], $logo['name'], $logo['linkUrl']),
        'loading' => 'lazy',
        'decoding' => 'async',
        'style' => "width: {$logo['width']}px; height: {$logo['height']}px",
    ]),
    'url' => $logo['linkUrl'],
    'new' => $logo['linkNew'],
], $logos);

$rawItems = array_filter(is_array($attributes['items'] ?? null) ? $attributes['items'] : [], 'is_array');

$items = array_values(array_filter(
    array_map(function (array $item): array {
        return [
            'heading' => sanitize_text_field($item['heading'] ?? ''),
            'body' => BlockAttributes::newTabHints(wp_kses_post($item['body'] ?? '')),
            'linkText' => sanitize_text_field($item['linkText'] ?? ''),
            'linkUrl' => esc_url_raw($item['link']['url'] ?? ''),
            'linkNew' => (bool) ($item['link']['opensInNewTab'] ?? false),
        ];
    }, $rawItems),
    // An item with neither a heading nor copy would render as a bare rule.
    fn (array $item): bool => $item['heading'] !== '' || $item['body'] !== ''
));

$heading = sanitize_text_field($attributes['heading'] ?? '');
$eyebrow = sanitize_text_field($attributes['eyebrow'] ?? '');
$body = BlockAttributes::newTabHints(wp_kses_post($attributes['body'] ?? ''));

// Parts in DOM order, as the Blade view prints them: heading, eyebrow, body,
// every item, the CTA, then the media (the image, or every logo).
$partIndex = 0;
$nextPart = function () use (&$partIndex): int {
    return $partIndex++;
};

$headingPart = $heading ? $nextPart() : null;
$eyebrowPart = $eyebrow ? $nextPart() : null;
$bodyPart = $body ? $nextPart() : null;
$itemParts = array_map($nextPart, $items);
$cta = BlockAttributes::cta($attributes);
$ctaPart = ($cta['ctaText'] !== '' && $cta['ctaUrl'] !== '') ? $nextPart() : null;
$imagePart = ($mediaType === 'image') ? $nextPart() : null;
if ($mediaType === 'logos') {
    foreach ($preparedLogos as &$logo) {
        $logo['part'] = $nextPart();
    }
    unset($logo);
}

echo view('blocks.text-media', [
    'entrance' => BlockEntrance::fromBlock($attributes, __DIR__),

    'eyebrow' => $eyebrow,
    'eyebrowPart' => $eyebrowPart,
    'heading' => $heading,
    'headingPart' => $headingPart,
    'body' => $body,
    'bodyPart' => $bodyPart,

    'scale' => BlockAttributes::enum($attributes, 'scale', ['feature', 'compact'], 'feature'),
    'sectionDivider' => BlockAttributes::divider($attributes),

    'mediaPosition' => BlockAttributes::enum($attributes, 'mediaPosition', ['left', 'right'], 'right'),
    'mediaType' => $mediaType,
    'mediaBleed' => (bool) ($attributes['mediaBleed'] ?? false),
    'mediaRatio' => BlockAttributes::enum($attributes, 'mediaRatio', ['auto', 'portrait', 'landscape', 'square'], 'auto'),
    'imagePart' => $imagePart,

    'imageId' => absint($attributes['imageId'] ?? 0),
    'imageUrl' => esc_url_raw($attributes['imageUrl'] ?? ''),
    'imagePosition' => BlockImagePosition::cssValue(sanitize_text_field($attributes['imagePosition'] ?? 'center')),
    'groundClass' => BlockAttributes::groundClass($ground),
    'logos' => $preparedLogos,

    ...$cta,
    'ctaButtonClass' => BlockAttributes::ctaButtonClass($ground),
    'ctaPart' => $ctaPart,

    'items' => $items,
    'itemParts' => $itemParts,

    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),

    ...BlockPadding::fromAttributes($attributes, 112, 56, false),
])->render();

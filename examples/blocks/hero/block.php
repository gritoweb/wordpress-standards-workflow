<?php

use App\Blocks\BlockAttributes;
use App\Blocks\BlockEntrance;
use App\Blocks\BlockImagePosition;
use App\Blocks\BlockPadding;

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];
$eyebrow = sanitize_text_field($attributes['eyebrow'] ?? '');
$heading = sanitize_text_field($attributes['heading'] ?? '');
$motionTransition = ($attributes['transition'] ?? '') === 'slide' ? 'slide' : 'fade';
$motionLoop = !array_key_exists('loop', $attributes)
    || filter_var($attributes['loop'], FILTER_VALIDATE_BOOLEAN);
$motionAutoplay = array_key_exists('autoplay', $attributes)
    && filter_var($attributes['autoplay'], FILTER_VALIDATE_BOOLEAN);
$motionDelay = absint($attributes['autoplayDelay'] ?? 5000);
$motionDelay = min(20000, max(1000, $motionDelay));
$motionTransitionDuration = absint($attributes['transitionDuration'] ?? 500);
$motionTransitionDuration = min(2000, max(0, $motionTransitionDuration));

// A null or scalar entry (hand-edited markup, a failed migration) would throw
// a TypeError against the typed closure below, so it never reaches it.
$rawSlides = array_values(array_filter(is_array($attributes['slides'] ?? null) ? $attributes['slides'] : [], 'is_array'));

$normalizedSlides = array_map(function (array $slide) use ($eyebrow, $heading): array {
    $hasEyebrow = array_key_exists('eyebrow', $slide);
    $hasHeading = array_key_exists('heading', $slide);
    $slideImageId = absint($slide['slideImageId'] ?? 0);
    $mobileImageId = absint($slide['mobileImageId'] ?? 0);
    $mobileImage = $mobileImageId ? wp_get_attachment_image_src($mobileImageId, 'full') : false;

    return [
        'eyebrow'  => $hasEyebrow ? sanitize_text_field($slide['eyebrow']) : $eyebrow,
        'heading'  => $hasHeading ? sanitize_text_field($slide['heading']) : $heading,
        // Always the desktop image's own alt text — a separate mobile crop is
        // a different file, not different content, so it never changes what
        // the photo says its accessible name is.
        'imageAlt' => sanitize_text_field(get_post_meta($slideImageId, '_wp_attachment_image_alt', true)),
        'mobileSrc' => $mobileImage ? esc_url_raw($mobileImage[0]) : '',
        'mobileSrcset' => $mobileImage ? (wp_get_attachment_image_srcset($mobileImageId, 'full') ?: $mobileImage[0]) : '',
        'imageId'  => $slideImageId,
        'imageUrl' => esc_url_raw($slide['slideImageUrl'] ?? ''),
        'imagePosition' => BlockImagePosition::cssValue(sanitize_text_field($slide['imagePosition'] ?? 'center')),
    ];
}, $rawSlides);

// A slide with nothing to show (no copy of its own or the block's, no image)
// would be an empty page in the slider.
$normalizedSlides = array_values(array_filter(
    $normalizedSlides,
    fn (array $slide): bool => $slide['eyebrow'] !== '' || $slide['heading'] !== '' || $slide['imageId'] > 0 || $slide['imageUrl'] !== ''
));

// One ordered collection drives copy, media, navigation and counters. A slide
// without an image keeps its place; its media panel renders empty.
$slides = $normalizedSlides ?: [[
    'eyebrow'  => $eyebrow,
    'heading'  => $heading,
    'imageAlt' => '',
    'mobileSrc' => '',
    'mobileSrcset' => '',
    'imageId'  => 0,
    'imageUrl' => '',
    'imagePosition' => BlockImagePosition::cssValue('center'),
]];

// Swiper is registered in app/setup.php; only a real slideshow loads it.
if (count($slides) > 1) {
    wp_enqueue_script('swiper');
    wp_enqueue_style('swiper');
}

echo view('blocks.hero', [
    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),
    'groundClass' => BlockAttributes::groundClass((string) ($attributes['ground'] ?? '')),
    'entrance' => BlockEntrance::fromBlock($attributes, __DIR__),

    'eyebrow' => $eyebrow,
    'heading' => $heading,
    'body'    => BlockAttributes::newTabHints(wp_kses_post($attributes['body'] ?? '')),
    'caption' => sanitize_text_field($attributes['caption'] ?? ''),
    'layout'  => in_array($attributes['layout'] ?? '', ['eyebrow-below', 'eyebrow-above', 'no-body'], true)
        ? $attributes['layout']
        : 'eyebrow-above',
    'slides'       => $slides,
    'motionTransition' => $motionTransition,
    'motionLoop' => $motionLoop,
    'motionAutoplay' => $motionAutoplay,
    'motionDelay' => $motionDelay,
    'motionTransitionDuration' => $motionTransitionDuration,

    ...BlockPadding::fromAttributes($attributes, 0, 0, false),
])->render();

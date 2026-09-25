<?php

use App\Blocks\BlockAttributes;
use App\Blocks\BlockEntrance;
use App\Blocks\BlockPadding;

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// The statement is this section's headline, so it renders as a heading
// element. RichText wraps it in a paragraph, and flow content can't sit
// inside a heading; wp_kses (not wp_kses_post) drops every tag outside this
// small inline allow-list, <p> included, so a multi-paragraph edit collapses
// to one run of text instead of leaving a stray </p><p> behind.
$heading = wp_kses($attributes['heading'] ?? '', [
    'em' => [],
    'strong' => [],
    'br' => [],
    'span' => ['class' => []],
]);

// Markup with no words in it is not a headline.
if (!trim(wp_strip_all_tags($heading))) {
    $heading = '';
}

$media = in_array($attributes['media'] ?? '', ['logo', 'image', 'none'], true)
    ? $attributes['media']
    : 'none';

$imageId = absint($attributes['imageId'] ?? 0);
$image = $imageId ? wp_get_attachment_image($imageId, 'large', false, [
    'class' => 'statement-hero__image block h-auto w-full',
    'alt' => sanitize_text_field(get_post_meta($imageId, '_wp_attachment_image_alt', true)),
    'decoding' => 'async',
    'fetchpriority' => 'high',
    'loading' => 'eager',
]) : '';

echo view('blocks.statement-hero', [
    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),
    'groundClass' => BlockAttributes::groundClass((string) ($attributes['ground'] ?? '')),
    'entrance' => BlockEntrance::fromBlock($attributes, __DIR__),

    'media' => $media,
    'image' => $image,
    'siteName' => html_entity_decode(get_bloginfo('name', 'display'), ENT_QUOTES),
    'heading' => $heading,
    'showScrollCue' => (bool) ($attributes['showScrollCue'] ?? false),
    // The shell's own header, read by the shared scroll-cue script as a data
    // attribute rather than guessed at with a selector list.
    'headerSelector' => '.header',

    ...BlockPadding::fromAttributes($attributes, 0, 0, false),
])->render();

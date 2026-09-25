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
$formId = absint($attributes['formId'] ?? 0);
$formShortcode = sanitize_text_field($attributes['formShortcode'] ?? '');
$form = '';

if ($formId > 0 && class_exists('GFForms')) {
    // The submit button's tone follows the SECTION's ground, not the form, so
    // site.php's gform_submit_button filter (App\FORM_BUTTON_TONES) reads
    // this filter instead of a hard-coded class. Named while the form
    // renders and removed right after, the same shape as any other "for
    // this render only" filter. FORM_BUTTON_TONES keys its classes as
    // on-light/on-dark, one step removed from ctaButtonClass()'s own
    // btn-primary/btn-on-dark naming.
    $tone = BlockAttributes::ctaButtonClass($ground) === 'btn-on-dark' ? 'on-dark' : 'on-light';
    $nameTone = fn (): string => $tone;

    add_filter('__PREFIX__/form_button_tone', $nameTone);

    $form = gravity_form($formId, false, false, false, null, false, 0, false);

    remove_filter('__PREFIX__/form_button_tone', $nameTone);
} elseif ($formShortcode !== '') {
    // Neutral fallback for a project with no Gravity Forms: any form plugin's
    // own shortcode (Contact Form 7, WPForms, a mail service's embed, ...).
    $form = do_shortcode($formShortcode);
}

echo view('blocks.contact-form', [
    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),
    'heading' => sanitize_text_field($attributes['heading'] ?? ''),
    'intro' => BlockAttributes::newTabHints(wp_kses_post($attributes['intro'] ?? '')),
    'groundClass' => BlockAttributes::groundClass($ground),
    'form' => $form,

    'imageId' => absint($attributes['imageId'] ?? 0),
    'imageUrl' => esc_url_raw($attributes['imageUrl'] ?? ''),
    'mediaPosition' => BlockAttributes::enum($attributes, 'mediaPosition', ['left', 'right'], 'right'),
    'imagePosition' => BlockImagePosition::cssValue(sanitize_text_field($attributes['imagePosition'] ?? 'center')),

    'entrance' => BlockEntrance::fromBlock($attributes, __DIR__),

    ...BlockPadding::fromAttributes($attributes, 112, 56, false),
])->render();

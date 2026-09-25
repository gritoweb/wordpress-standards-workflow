<?php

use App\Blocks\BlockAttributes;
use App\Blocks\BlockEntrance;
use App\Blocks\BlockPadding;

if (!defined('ABSPATH')) {
    exit;
}

$attributes = $attributes ?? [];

// Coordinates, not the address, drive the pin. Stored as strings so an empty
// field stays distinguishable from a real 0 — "0,0" is a real point, and a
// block that has never been located would otherwise render it.
$coordinate = function (string $key, float $min, float $max) use ($attributes): ?float {
    $raw = trim((string) ($attributes[$key] ?? ''));

    if ($raw === '' || !is_numeric($raw)) {
        return null;
    }

    $value = (float) $raw;

    return ($value >= $min && $value <= $max) ? $value : null;
};

$latitude = $coordinate('latitude', -90, 90);
$longitude = $coordinate('longitude', -180, 180);

// The registered handle, not just the key, decides whether a map is drawn:
// app/blocks.php registers it on init and only when a key exists, so a key
// that arrives after init would otherwise print a container the library
// never fills.
$hasMap = $latitude !== null
    && $longitude !== null
    && wp_script_is('__PREFIX__-google-maps', 'registered');

if ($hasMap) {
    wp_enqueue_script('__PREFIX__-google-maps');
}

$addressLine1 = sanitize_text_field($attributes['addressLine1'] ?? '');
$addressLine2 = sanitize_text_field($attributes['addressLine2'] ?? '');
$address = trim($addressLine1.' '.$addressLine2);

$cta = BlockAttributes::cta($attributes);

// The directions link falls back to the typed address, so the button works
// before anyone has pasted a coordinate. rawurlencode, because a suite
// number with a "+" would otherwise decode as a space. esc_url_raw, because
// the view escapes it once at output with {!! esc_url() !!}; esc_url() here
// as well would encode the "&" in the query string twice.
if ($cta['ctaUrl'] === '' && $address !== '') {
    $cta['ctaUrl'] = esc_url_raw('https://www.google.com/maps/dir/?api=1&destination='.rawurlencode($address));
}

$email = sanitize_email($attributes['email'] ?? '');

echo view('blocks.location', [
    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),
    'groundClass' => BlockAttributes::groundClass((string) ($attributes['ground'] ?? '')),

    'city' => sanitize_text_field($attributes['city'] ?? ''),

    'officeLabel' => sanitize_text_field($attributes['officeLabel'] ?? ''),
    'addressLine1' => $addressLine1,
    'addressLine2' => $addressLine2,
    'phone' => sanitize_text_field($attributes['phone'] ?? ''),
    'fax' => sanitize_text_field($attributes['fax'] ?? ''),

    'contactLabel' => sanitize_text_field($attributes['contactLabel'] ?? ''),
    'contactName' => sanitize_text_field($attributes['contactName'] ?? ''),
    'contactRole' => sanitize_text_field($attributes['contactRole'] ?? ''),
    'contactPhone' => sanitize_text_field($attributes['contactPhone'] ?? ''),
    'email' => $email,
    'emailUrl' => $email !== '' ? esc_url_raw('mailto:'.$email) : '',

    'hasMap' => $hasMap,
    'latitude' => $latitude,
    'longitude' => $longitude,
    'zoom' => min(21, max(1, absint($attributes['zoom'] ?? 15))),
    'mapLabel' => $address !== '' ? $address : sanitize_text_field($attributes['city'] ?? ''),

    ...$cta,

    'mediaPosition' => BlockAttributes::enum($attributes, 'mediaPosition', ['left', 'right'], 'right'),
    'sectionDivider' => BlockAttributes::divider($attributes),

    'entrance' => BlockEntrance::fromBlock($attributes, __DIR__),

    ...BlockPadding::fromAttributes($attributes, 112, 56, false),
])->render();

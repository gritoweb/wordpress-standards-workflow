<?php

/**
 * Google Maps bootstrap, for the location example.
 *
 * Loaded from functions.php by adding 'maps' to the collect([...]) list, next
 * to 'blocks'. See examples/README.md.
 */

namespace App;

use App\Settings\MapsSettings;

/**
 * Google Maps JavaScript API, for the `location` block. Registration is not
 * enqueue: nothing loads here. The block's own block.php enqueues this
 * handle, and only when it actually has a key and a pair of coordinates to
 * draw, so a page with no map never fetches the library. Registered only
 * when a key exists (Site Settings > Maps), so the "no key" state degrades
 * to "no map" rather than to a broken one.
 */
add_action('init', function () {
    $key = MapsSettings::mapsApiKey();

    if ($key === '') {
        return;
    }

    $src = 'https://maps.googleapis.com/maps/api/js?'.http_build_query([
        'key' => $key,
        'loading' => 'async',
        'callback' => '__PREFIX__LocationReady',
    ]);

    wp_register_script('__PREFIX__-google-maps', $src, [], null, [
        'strategy' => 'defer',
        'in_footer' => true,
    ]);

    // Google calls the callback as soon as the library is ready, which can be
    // before the block's own viewScript has parsed. This stub guarantees the
    // name exists, records that the library arrived, and lets block.js boot
    // itself when it finds the flag already set.
    wp_add_inline_script(
        '__PREFIX__-google-maps',
        'window.__PREFIX__LocationReady = window.__PREFIX__LocationReady || function () { window.__PREFIX__MapsReady = true; };',
        'before'
    );

    // Site-wide map appearance, resolved here so block.js never has to know
    // about ACF and every panel on the site draws the same map.
    wp_add_inline_script(
        '__PREFIX__-google-maps',
        'window.__PREFIX__MapSettings = '.wp_json_encode([
            'style' => MapsSettings::mapsStyle(),
            'hideBusiness' => MapsSettings::mapsHideBusiness() ? '1' : '0',
        ]).';',
        'before'
    );
});

/**
 * The editor's Locate action geocodes an address, which needs the library. It
 * isn't loaded with the editor: that would fetch Google's script on every
 * screen, for pages with no location block too. This prints only the address,
 * and the location block's editor code adds the script the first time an
 * editor clicks Locate. 'editor' is Sage 11's own Vite handle for
 * resources/js/editor.js, the same one site.php prints its defaults on.
 */
add_action('enqueue_block_editor_assets', function () {
    $key = MapsSettings::mapsApiKey();

    if ($key === '') {
        return;
    }

    wp_add_inline_script(
        'editor',
        'window.__PREFIX__MapsEditor = '.wp_json_encode([
            'src' => 'https://maps.googleapis.com/maps/api/js?'.http_build_query(['key' => $key, 'loading' => 'async']),
        ]).';',
        'before'
    );
});

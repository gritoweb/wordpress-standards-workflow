<?php

/**
 * Block bootstrap.
 *
 * Loaded by functions.php via collect(['setup', 'filters', 'blocks']).
 * All block-related wiring lives here:
 *   - Custom Gutenberg category (BlockCategories)
 *   - Block registration, by glob over resources/blocks/*\/block.json (BlockManager)
 *   - Frontend handles more than one block shares
 */

namespace App;

use App\Blocks\BlockCategories;
use App\Blocks\BlockManager;

// Register the custom block category (filter — fires before init).
BlockCategories::register();

// Register all blocks once WP is ready.
add_action('init', function () {
    (new BlockManager())->register();
});

// One handle per shared frontend file, so every block that references it by name gets it once per page.
add_action('init', function () {
    $dir = get_template_directory().'/resources/blocks/components/frontend';
    $uri = get_template_directory_uri().'/resources/blocks/components/frontend';

    wp_register_script(
        '__PREFIX__-collection-paging',
        "{$uri}/collection-paging.js",
        [],
        (string) filemtime("{$dir}/collection-paging.js"),
        true
    );

    wp_register_style(
        '__PREFIX__-collection-paging',
        "{$uri}/collection-paging.css",
        [],
        (string) filemtime("{$dir}/collection-paging.css")
    );

    wp_register_script(
        '__PREFIX__-scroll-cue',
        "{$uri}/scroll-cue.js",
        [],
        (string) filemtime("{$dir}/scroll-cue.js"),
        true
    );
});

<?php

/**
 * Block bootstrap.
 *
 * Loaded by functions.php via collect(['setup', 'filters', 'blocks']).
 * All block-related wiring lives here:
 *   - Custom Gutenberg category (BlockCategories)
 *   - Per-block register_block_type calls (BlockManager)
 *   - Site-wide entrance defaults + head wiring (BlockMotion)
 */

namespace App;

use App\Blocks\BlockCategories;
use App\Blocks\BlockManager;
use App\Blocks\BlockMotion;

// Register the custom block category (filter — fires before init).
BlockCategories::register();

// Customizer > Motion, the entrance head script and the --e-* defaults.
BlockMotion::register();

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

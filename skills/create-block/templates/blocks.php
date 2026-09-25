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
use App\Settings\SiteSettings;

// Register the custom block category (filter — fires before init).
BlockCategories::register();

// Customizer > Motion, the ws-entrance head script and the --e-* defaults.
BlockMotion::register();

// Site Settings page (SCF); an older theme without the class simply skips it.
if (class_exists(SiteSettings::class)) {
    SiteSettings::register();
}

// Register all blocks once WP is ready.
add_action('init', function () {
    (new BlockManager())->register();
});

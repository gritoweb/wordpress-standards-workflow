<?php

/**
 * Block bootstrap.
 *
 * Loaded by functions.php via collect(['setup', 'filters', 'blocks']).
 * All block-related wiring lives here:
 *   - Custom Gutenberg category (BlockCategories)
 *   - Per-block register_block_type calls (BlockManager)
 *   - Site Settings options page (SiteSettings) and its Motion defaults + head wiring (BlockMotion)
 */

namespace App;

use App\Blocks\BlockCategories;
use App\Blocks\BlockManager;
use App\Blocks\BlockMotion;
use App\Settings\SiteSettings;

// Register the custom block category (filter — fires before init).
BlockCategories::register();

// The Site Settings page (SCF), empty until site-settings-wizard adds a tab.
SiteSettings::register();

// Motion defaults, the ws-entrance head script and the --e-* properties.
BlockMotion::register();

// Register all blocks once WP is ready.
add_action('init', function () {
    (new BlockManager())->register();
});

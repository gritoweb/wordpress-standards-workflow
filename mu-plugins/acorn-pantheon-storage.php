<?php
/**
 * Plugin Name: Acorn Pantheon Storage
 * Description: Relocates Acorn's storage to a writable path on Pantheon.
 * Version:     1.0.0
 * Author:      GritoWeb
 *
 * Acorn's default storage path is wp-content/cache/acorn (see
 * Roots\Acorn\Configuration\Concerns\Paths::fallbackStoragePath). On Pantheon
 * Test/Live the code filesystem is read-only — only wp-content/uploads is
 * writable — so Acorn can't compile Blade views there and every request fails.
 *
 * Acorn resolves the storage path from the ACORN_STORAGE_PATH constant while it
 * boots inside the theme's functions.php. A mu-plugin loads before any theme, so
 * defining the constant here guarantees it's in place before that boot — with no
 * edit to the theme. When the path is overridden Acorn does not create the
 * directory tree (only its own fallback does), so we create it too.
 */

if (! defined('ABSPATH')) {
    exit;
}

if (! defined('ACORN_STORAGE_PATH')) {
    define('ACORN_STORAGE_PATH', WP_CONTENT_DIR . '/uploads/acorn');
}

// Create the tree Acorn expects, before the theme boots Acorn. Mirrors the
// directories Acorn's own fallbackStoragePath() would create.
foreach ([
    ACORN_STORAGE_PATH . '/framework/cache/data',
    ACORN_STORAGE_PATH . '/framework/views',
    ACORN_STORAGE_PATH . '/framework/sessions',
    ACORN_STORAGE_PATH . '/logs',
] as $dir) {
    if (! is_dir($dir)) {
        wp_mkdir_p($dir);
    }
}

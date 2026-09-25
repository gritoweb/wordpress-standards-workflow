<?php

namespace App\Blocks;

/**
 * Registers the project's custom block category in Gutenberg.
 *
 * Every block scaffolded by the `create-block` skill defaults to this
 * category, so they group together in the inserter instead of being
 * scattered across core categories. SLUG / TITLE come from the project's
 * kit.config.json (see the kit README, "Per-project config"); kit-setup.mjs fills
 * them in.
 */
class BlockCategories
{
    public const SLUG = '__BLOCK_CATEGORY_SLUG__';
    public const TITLE = '__BLOCK_CATEGORY_TITLE__';

    public static function register(): void
    {
        add_filter('block_categories_all', function (array $categories): array {
            $filtered = array_values(array_filter(
                $categories,
                fn ($cat) => ($cat['slug'] ?? '') !== self::SLUG
            ));

            array_unshift($filtered, [
                'slug'  => self::SLUG,
                'title' => self::TITLE,
                'icon'  => null,
            ]);

            return $filtered;
        }, 5);
    }
}

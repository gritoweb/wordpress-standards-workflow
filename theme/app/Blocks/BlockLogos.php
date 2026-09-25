<?php

namespace App\Blocks;

/**
 * Shared by `logo-wall` and `text-media`, the two blocks that draw a panel
 * of client/partner marks.
 */
class BlockLogos
{
    /**
     * A mark's drawn width/height, from the attachment's own dimensions,
     * capped by height. Two marks of different proportions read at the same
     * optical size only when a shared HEIGHT cap drives the width, never a
     * cell fit — a cell-fitted image takes the cell's own proportions
     * instead of its own.
     *
     * $allowSvgUpscale draws an SVG mark AT the cap instead of only ever
     * shrinking toward it (a vector loses nothing by scaling up; a raster
     * photo would soften).
     */
    public static function size(int $imageId, int $maxHeight, int $fallbackWidth = 120, bool $allowSvgUpscale = false): array
    {
        $naturalWidth = 0;
        $naturalHeight = 0;

        if ($imageId) {
            $src = wp_get_attachment_image_src($imageId, 'full');

            if (is_array($src)) {
                $naturalWidth = (int) ($src[1] ?? 0);
                $naturalHeight = (int) ($src[2] ?? 0);
            }
        }

        $isSvg = $allowSvgUpscale && $imageId > 0 && get_post_mime_type($imageId) === 'image/svg+xml';

        $height = $naturalHeight > 0
            ? ($isSvg ? $maxHeight : min($naturalHeight, $maxHeight))
            : $maxHeight;

        $width = ($naturalWidth > 0 && $naturalHeight > 0)
            ? (int) round($naturalWidth * ($height / $naturalHeight))
            : $fallbackWidth;

        return ['width' => $width, 'height' => $height];
    }

    /**
     * The class that redraws a single-color mark for its ground: dark on a
     * light ground, light on a dark one. A multi-color mark gets none.
     * Twin of logoTintClass() in components/backend/logoTint.js; the CSS is
     * in resources/css/global/helpers.css.
     */
    public static function tintClass(bool $singleColor, bool $lightGround): string
    {
        if (! $singleColor) {
            return '';
        }

        return $lightGround ? 'logo-tint-dark' : 'logo-tint-light';
    }

    /**
     * A logo's accessible name. An empty $name overrides the attachment's
     * own alt, which leaves a linked mark with no accessible name (WCAG
     * 2.4.4/4.1.2) — fall back to the attachment's own alt text, then the
     * link's host, so a linked logo always has one. An unlinked mark stays
     * decorative (empty alt is correct there).
     */
    public static function alt(int $imageId, string $name, string $linkUrl): string
    {
        if ($name !== '' || $linkUrl === '') {
            return $name;
        }

        $alt = $imageId ? (string) get_post_meta($imageId, '_wp_attachment_image_alt', true) : '';

        return $alt !== '' ? sanitize_text_field($alt) : (string) parse_url($linkUrl, PHP_URL_HOST);
    }
}

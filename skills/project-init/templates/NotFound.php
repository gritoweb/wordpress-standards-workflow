<?php

namespace App\View\Composers;

use App\Settings\SiteSettings;
use Roots\Acorn\View\Composer;

/** The 404's text: Site Settings › 404 when that optional tab exists, otherwise these defaults, so the page is always complete. */
class NotFound extends Composer
{
    /** Views served by this composer. */
    protected static $views = [
        '404',
    ];

    /** Plain values: a public method would reach the view as a lazy callable, not an array. */
    public function with(): array
    {
        return [
            'title' => self::text('not_found_title') ?: __('Page not found', '__TEXT_DOMAIN__'),
            'subline' => self::text('not_found_subline') ?: __('The page you’re looking for doesn’t exist or may have moved.', '__TEXT_DOMAIN__'),
            'button' => self::button(),
        ];
    }

    /** The way back as ['text', 'url', 'newTab']; an empty label or URL falls back to the home page. */
    private static function button(): array
    {
        $link = self::setting('not_found_button');
        $link = is_array($link) ? $link : [];
        // esc_url_raw drops a scheme such as javascript:, which HTML escaping in the view would keep.
        $url = esc_url_raw((string) ($link['url'] ?? ''));

        return [
            'text' => trim((string) ($link['title'] ?? '')) ?: __('Back to home', '__TEXT_DOMAIN__'),
            'url' => $url !== '' ? $url : home_url('/'),
            'newTab' => ($link['target'] ?? '') === '_blank',
        ];
    }

    private static function text(string $name): string
    {
        return trim((string) self::setting($name));
    }

    private static function setting(string $name): mixed
    {
        return class_exists(SiteSettings::class) ? SiteSettings::field($name) : null;
    }
}

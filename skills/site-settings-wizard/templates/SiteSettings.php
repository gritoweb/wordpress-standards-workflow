<?php

namespace App\Settings;

/** The Site Settings options page (SCF), added with its first tab, and the one reader for its fields; see _docs/site-settings-pattern.md. */
class SiteSettings
{
    public const PAGE = 'site-settings';

    public static function register(): void
    {
        add_action('acf/init', function () {
            if (! function_exists('acf_add_options_page')) {
                return;
            }

            acf_add_options_page([
                'page_title' => __('Site Settings', '__TEXT_DOMAIN__'),
                'menu_title' => __('Site Settings', '__TEXT_DOMAIN__'),
                'menu_slug'  => self::PAGE,
                'capability' => 'manage_options',
                'position'   => 61,
                'icon_url'   => 'dashicons-admin-generic',
                'redirect'   => false,
            ]);
        });
    }

    /** A saved Site Settings value, or $default when SCF is off or the field was never saved. */
    public static function field(string $name, mixed $default = null): mixed
    {
        $value = function_exists('get_field') ? get_field($name, 'option') : null;

        return $value === null || $value === '' ? $default : $value;
    }
}

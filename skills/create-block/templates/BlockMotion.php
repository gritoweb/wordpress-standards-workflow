<?php

namespace App\Blocks;

use App\Settings\SiteSettings;

/** Site-wide motion defaults (or Site Settings › Motion, once that tab is added) as --e-* properties; an empty block field inherits them. */
class BlockMotion
{
    // Site Settings field => [min, max, default], the same limits as BlockEntrance.
    private const NUMBERS = [
        'motion_duration' => [0, 3000, 1000],
        'motion_delay'    => [0, 3000, 250],
        'motion_stagger'  => [0, 1000, 250],
        'motion_distance' => [0, 2000, 32],
        'hover_duration'  => [0, 1000, 250],
    ];

    private const UNITS = ['px', 'vw'];

    // motion_ease value => the CSS timing function it prints.
    private const EASES = [
        'ease-out'    => 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        'ease-in-out' => 'ease-in-out',
        'ease'        => 'ease',
    ];

    private const HOVER_BUTTON = ['lift', 'fade', 'none'];

    private const HOVER_LINK = ['underline', 'fade', 'none'];

    public static function register(): void
    {
        // Runs before any stylesheet (wp_print_styles is 8), so parts are hidden from
        // first paint; the timeout un-hides everything if entrance.js never loads.
        add_action('wp_head', function () {
            echo "<script>var h=document.documentElement;h.classList.add('ws-entrance');"
                ."setTimeout(function(){h.hasAttribute('data-entrance-ready')||h.classList.remove('ws-entrance')},5000)</script>\n";
        }, 1);

        // html:root outranks the plain :root defaults in entrance.css.
        add_action('wp_head', function () {
            echo '<style id="motion-defaults">html:root{'.esc_html(self::declarations())."}</style>\n";
        }, 6);

        // The canvas iframe never runs wp_head, so it gets the same values here.
        add_filter('block_editor_settings_all', function (array $settings): array {
            $settings['styles'][] = ['css' => ':root{'.self::declarations().'}'];

            return $settings;
        });

        // CSS cannot branch on a custom property's value, so hover effects are body classes.
        add_filter('body_class', function (array $classes): array {
            $classes[] = 'ws-hover-btn-'.self::choice('hover_button', self::HOVER_BUTTON, 'fade');
            $classes[] = 'ws-hover-link-'.self::choice('hover_link', self::HOVER_LINK, 'underline');

            return $classes;
        });
    }

    /** The motion custom properties, every value clamped or whitelisted. */
    public static function properties(): array
    {
        $number = function (string $key): int {
            [$min, $max, $default] = self::NUMBERS[$key];

            return BlockEntrance::clamp(SiteSettings::field($key, $default), $min, $max) ?? $default;
        };

        $unit = self::choice('motion_distance_unit', self::UNITS, 'px');
        $ease = self::EASES[self::choice('motion_ease', array_keys(self::EASES), 'ease-out')];

        return [
            '--e-duration'     => $number('motion_duration').'ms',
            '--e-delay'        => $number('motion_delay').'ms',
            '--e-stagger'      => $number('motion_stagger').'ms',
            '--e-distance'     => $number('motion_distance').$unit,
            '--e-ease'         => $ease,
            '--hover-duration' => $number('hover_duration').'ms',
        ];
    }

    public static function declarations(): string
    {
        $pairs = [];

        foreach (self::properties() as $property => $value) {
            $pairs[] = "{$property}:{$value}";
        }

        return implode(';', $pairs);
    }

    private static function choice(string $key, array $allowed, string $default): string
    {
        $value = SiteSettings::field($key, $default);

        return is_string($value) && in_array($value, $allowed, true) ? $value : $default;
    }
}

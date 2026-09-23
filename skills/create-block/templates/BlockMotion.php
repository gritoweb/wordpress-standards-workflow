<?php

namespace App\Blocks;

/**
 * Site-wide entrance defaults (Appearance > Customize > Motion) and the head
 * wiring that entrance.css / entrance.js need. A block field left empty (null)
 * inherits these values through the --e-* custom properties.
 */
class BlockMotion
{
    // theme_mod => [min, max, fallback], the same limits as BlockEntrance.
    private const NUMBERS = [
        'motion_duration' => [0, 3000, 600],
        'motion_delay'    => [0, 3000, 0],
        'motion_stagger'  => [0, 1000, 120],
        'motion_distance' => [0, 2000, 32],
    ];

    private const UNITS = ['px', 'vw'];

    public static function register(): void
    {
        add_action('customize_register', [self::class, 'customize']);

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
    }

    public static function customize(\WP_Customize_Manager $wp_customize): void
    {
        $wp_customize->add_section('motion_section', [
            'title'       => __('Motion', '__TEXT_DOMAIN__'),
            'description' => __('Entrance animation defaults. A block field left empty uses these.', '__TEXT_DOMAIN__'),
            'priority'    => 160,
        ]);

        $labels = [
            'motion_duration' => __('Duration (ms)', '__TEXT_DOMAIN__'),
            'motion_delay'    => __('Delay (ms)', '__TEXT_DOMAIN__'),
            'motion_stagger'  => __('Stagger (ms)', '__TEXT_DOMAIN__'),
            'motion_distance' => __('Distance', '__TEXT_DOMAIN__'),
        ];

        foreach (self::NUMBERS as $key => [$min, $max, $fallback]) {
            $wp_customize->add_setting($key, [
                'default'           => $fallback,
                'sanitize_callback' => fn ($value) => BlockEntrance::clamp($value, $min, $max) ?? $fallback,
            ]);
            $wp_customize->add_control($key, [
                'label'       => $labels[$key],
                'section'     => 'motion_section',
                'type'        => 'number',
                'input_attrs' => ['min' => $min, 'max' => $max],
            ]);
        }

        $wp_customize->add_setting('motion_distance_unit', [
            'default'           => 'px',
            'sanitize_callback' => fn ($value) => in_array($value, self::UNITS, true) ? $value : 'px',
        ]);
        $wp_customize->add_control('motion_distance_unit', [
            'label'   => __('Distance unit', '__TEXT_DOMAIN__'),
            'section' => 'motion_section',
            'type'    => 'select',
            'choices' => array_combine(self::UNITS, self::UNITS),
        ]);
    }

    /**
     * The --e-* custom properties, every value clamped or whitelisted.
     *
     * @return array<string, string>
     */
    public static function properties(): array
    {
        $number = function (string $key): int {
            [$min, $max, $fallback] = self::NUMBERS[$key];

            return BlockEntrance::clamp(get_theme_mod($key, $fallback), $min, $max) ?? $fallback;
        };

        $unit = get_theme_mod('motion_distance_unit', 'px');
        $unit = in_array($unit, self::UNITS, true) ? $unit : 'px';

        return [
            '--e-duration' => $number('motion_duration').'ms',
            '--e-delay'    => $number('motion_delay').'ms',
            '--e-stagger'  => $number('motion_stagger').'ms',
            '--e-distance' => $number('motion_distance').$unit,
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
}

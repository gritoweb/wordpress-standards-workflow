<?php

namespace App\Blocks;

/**
 * Site-wide motion settings (Appearance > Customize > Motion): entrance
 * defaults, easing and hover effects. Same options and defaults as the White
 * Summers reference. A block field left empty (null) inherits these values
 * through the --e-* custom properties.
 */
class BlockMotion
{
    // theme_mod => [min, max, default], the same limits as BlockEntrance.
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
        add_action('customize_register', [self::class, 'customize']);

        // Runs before any stylesheet (wp_print_styles is 8), so parts are hidden from
        // first paint; the timeout un-hides everything if entrance.js never loads.
        add_action('wp_head', function () {
            echo "<script>var h=document.documentElement;h.classList.add('entrance');"
                ."setTimeout(function(){h.hasAttribute('data-entrance-ready')||h.classList.remove('entrance')},5000)</script>\n";
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
            $classes[] = 'hover-btn-'.self::choice('hover_button', self::HOVER_BUTTON, 'fade');
            $classes[] = 'hover-link-'.self::choice('hover_link', self::HOVER_LINK, 'underline');

            return $classes;
        });
    }

    public static function customize(\WP_Customize_Manager $wp_customize): void
    {
        $wp_customize->add_section('motion_section', [
            'title'       => __('Motion', '__TEXT_DOMAIN__'),
            'description' => __('Entrance animations and hover effects. A block field left empty uses these.', '__TEXT_DOMAIN__'),
            'priority'    => 160,
        ]);

        $number = function (string $key, string $label) use ($wp_customize) {
            [$min, $max, $default] = self::NUMBERS[$key];
            $wp_customize->add_setting($key, [
                'default'           => $default,
                'sanitize_callback' => fn ($value) => BlockEntrance::clamp($value, $min, $max) ?? $default,
            ]);
            $wp_customize->add_control($key, [
                'label'       => $label,
                'section'     => 'motion_section',
                'type'        => 'number',
                'input_attrs' => ['min' => $min, 'max' => $max],
            ]);
        };

        $select = function (string $key, string $label, array $choices, string $default) use ($wp_customize) {
            $wp_customize->add_setting($key, [
                'default'           => $default,
                'sanitize_callback' => fn ($value) => array_key_exists($value, $choices) ? $value : $default,
            ]);
            $wp_customize->add_control($key, [
                'label'   => $label,
                'section' => 'motion_section',
                'type'    => 'select',
                'choices' => $choices,
            ]);
        };

        $number('motion_duration', __('Animation duration (ms)', '__TEXT_DOMAIN__'));
        $number('motion_delay', __('Start delay (ms)', '__TEXT_DOMAIN__'));
        $number('motion_stagger', __('Delay between items (ms)', '__TEXT_DOMAIN__'));
        $number('motion_distance', __('Travel distance', '__TEXT_DOMAIN__'));
        $select('motion_distance_unit', __('Distance unit', '__TEXT_DOMAIN__'), [
            'px' => __('Pixels', '__TEXT_DOMAIN__'),
            'vw' => __('Screen width', '__TEXT_DOMAIN__'),
        ], 'px');
        $select('motion_ease', __('Easing', '__TEXT_DOMAIN__'), [
            'ease-out'    => __('Ease out', '__TEXT_DOMAIN__'),
            'ease-in-out' => __('Ease in and out', '__TEXT_DOMAIN__'),
            'ease'        => __('Ease', '__TEXT_DOMAIN__'),
        ], 'ease-out');
        $select('hover_button', __('Button hover effect', '__TEXT_DOMAIN__'), [
            'lift' => __('Fade and lift', '__TEXT_DOMAIN__'),
            'fade' => __('Fade', '__TEXT_DOMAIN__'),
            'none' => __('None', '__TEXT_DOMAIN__'),
        ], 'fade');
        $select('hover_link', __('Link hover effect', '__TEXT_DOMAIN__'), [
            'underline' => __('Underline', '__TEXT_DOMAIN__'),
            'fade'      => __('Fade', '__TEXT_DOMAIN__'),
            'none'      => __('None', '__TEXT_DOMAIN__'),
        ], 'underline');
        $number('hover_duration', __('Hover speed (ms)', '__TEXT_DOMAIN__'));
    }

    /**
     * The motion custom properties, every value clamped or whitelisted.
     *
     * @return array<string, string>
     */
    public static function properties(): array
    {
        $number = function (string $key): int {
            [$min, $max, $default] = self::NUMBERS[$key];

            return BlockEntrance::clamp(get_theme_mod($key, $default), $min, $max) ?? $default;
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
        $value = get_theme_mod($key, $default);

        return is_string($value) && in_array($value, $allowed, true) ? $value : $default;
    }
}

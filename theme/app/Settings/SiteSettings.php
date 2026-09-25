<?php

namespace App\Settings;

/**
 * The one accessor for Site Settings (ACF options page group
 * `group___PREFIX___site_settings`, the Motion tab). Every getter falls back
 * to a sane default when ACF is inactive or a field was never saved; nothing
 * outside this class calls get_field() for these values.
 *
 * A site adds the fields its own design needs as another ACF group on the
 * same options page, and reads them through a subclass whose getters call
 * static::field() (see examples/app/Settings/HeaderFooterSettings.php and
 * _docs/site-settings.md).
 */
class SiteSettings
{
    /**
     * [min, max, default] for every clamped number field. These must equal
     * the matching field's "min"/"max" in
     * acf-json/group___PREFIX___site_settings.json — see
     * SiteSettings.test.mjs and _docs/site-settings.md.
     */
    private const LIMITS = [
        'motion_duration' => [0, 3000, 1000],
        'motion_delay' => [0, 3000, 250],
        'motion_stagger' => [0, 1000, 250],
        'motion_distance' => [0, 2000, 32],
        'hover_duration' => [0, 1000, 250],
    ];

    /**
     * Entrance animation defaults: duration, delay, stagger, distance, unit,
     * and ease, every number clamped to LIMITS.
     */
    public static function motion(): array
    {
        $unit = static::field('motion_distance_unit');
        $unit = in_array($unit, ['px', 'vw'], true) ? $unit : 'px';

        return [
            'duration' => static::clamp('motion_duration'),
            'delay' => static::clamp('motion_delay'),
            'stagger' => static::clamp('motion_stagger'),
            'distance' => static::clamp('motion_distance'),
            'unit' => $unit,
            'ease' => static::ease(),
        ];
    }

    /**
     * Hover effects: the button and link style, and the shared duration.
     */
    public static function hover(): array
    {
        $choice = function (string $field, array $allowed, string $default): string {
            $value = static::field($field);

            return is_string($value) && in_array($value, $allowed, true) ? $value : $default;
        };

        return [
            'button' => $choice('hover_button', ['lift', 'fade', 'none'], 'fade'),
            'link' => $choice('hover_link', ['underline', 'fade', 'none'], 'underline'),
            'duration' => static::clamp('hover_duration'),
        ];
    }

    /**
     * The [min, max, default] declared for a LIMITS field, so a test can
     * assert it against the ACF group's own min/max.
     */
    public static function limits(string $field): array
    {
        return self::LIMITS[$field];
    }

    // Literal, not var(--ease-out): Tailwind v4 defines its own --ease-out, which shadowed ours.
    private const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

    /**
     * A named easing keyword or a valid cubic-bezier(); 'ease-out' and anything else print EASE_OUT.
     */
    private static function ease(): string
    {
        $value = trim((string) static::field('motion_ease'));
        $named = ['ease', 'ease-in', 'ease-in-out', 'linear'];
        $n = '-?\d*\.?\d+';

        if (in_array($value, $named, true) || preg_match("/^cubic-bezier\(\s*{$n}\s*,\s*{$n}\s*,\s*{$n}\s*,\s*{$n}\s*\)$/", $value)) {
            return $value;
        }

        return self::EASE_OUT;
    }

    private static function clamp(string $field): int
    {
        [$min, $max, $default] = self::LIMITS[$field];
        $value = static::field($field);

        return is_numeric($value) ? (int) max($min, min($max, (float) $value)) : $default;
    }

    /**
     * The one ACF guard. Every other method reads a Site Settings field
     * through here, never through get_field() directly.
     */
    protected static function field(string $name): mixed
    {
        return function_exists('get_field') ? get_field($name, 'option') : null;
    }
}

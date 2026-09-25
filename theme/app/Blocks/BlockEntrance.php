<?php

namespace App\Blocks;

/**
 * Validates a block's `entrance` attribute and prints the data attributes the
 * @entrance and @entrancePart directives put on the section root and its parts.
 *
 * Nothing here trusts its input: the attribute is saved JSON that anyone with
 * WP-CLI or an import can change, so every value is whitelisted or clamped
 * before it reaches markup.
 */
class BlockEntrance
{
    private const TYPES = ['none', 'fade', 'slide', 'fade-slide'];
    private const DIRECTIONS = ['up', 'down', 'left', 'right'];
    private const UNITS = ['px', 'vw'];
    private const TRIGGERS = ['section', 'item'];

    // [min, max], the same limits as EntranceControl.jsx.
    private const LIMITS = [
        'distance' => [0, 2000],
        'duration' => [0, 3000],
        'delay' => [0, 3000],
        'stagger' => [0, 1000],
    ];

    /**
     * A number clamped into [$min, $max], or null when it is not a number.
     */
    public static function clamp(mixed $value, int $min, int $max): ?int
    {
        if (! is_numeric($value)) {
            return null;
        }

        return max($min, min($max, (int) round((float) $value)));
    }

    /**
     * The normalized entrance array. A null number means "site default".
     */
    public static function sanitize(mixed $raw): array
    {
        $raw = is_array($raw) ? $raw : [];
        $number = fn (string $key) => self::clamp($raw[$key] ?? null, ...self::LIMITS[$key]);

        return [
            'type' => self::pick($raw['type'] ?? null, self::TYPES, 'fade-slide'),
            'direction' => self::pick($raw['direction'] ?? null, self::DIRECTIONS, 'up'),
            'distance' => $number('distance'),
            'unit' => self::pick($raw['unit'] ?? null, self::UNITS, 'px'),
            'duration' => $number('duration'),
            'delay' => $number('delay'),
            'stagger' => $number('stagger'),
            'trigger' => self::pick($raw['trigger'] ?? null, self::TRIGGERS, 'section'),
        ];
    }

    /**
     * The entrance a block renders: the block.json default, the saved object
     * over it, sanitized. WordPress keeps a saved object whole, so a key it
     * lacks fills from the block's own preset rather than the site-wide one,
     * and an explicit null stays "site default".
     */
    public static function fromBlock(array $attributes, string $blockDir): array
    {
        $json = json_decode((string) file_get_contents($blockDir.'/block.json'), true);
        $preset = $json['attributes']['entrance']['default'] ?? [];
        $saved = $attributes['entrance'] ?? null;

        return self::sanitize(array_merge($preset, is_array($saved) ? $saved : []));
    }

    /**
     * Attributes for the section root, or '' when there is no entrance.
     */
    public static function root(mixed $entrance): string
    {
        if (! is_array($entrance)) {
            return '';
        }

        $entrance = self::sanitize($entrance);

        if ($entrance['type'] === 'none') {
            return '';
        }

        $overrides = array_filter([
            '--e-distance' => $entrance['distance'] === null ? null : $entrance['distance'].$entrance['unit'],
            '--e-duration' => $entrance['duration'] === null ? null : $entrance['duration'].'ms',
            '--e-delay' => $entrance['delay'] === null ? null : $entrance['delay'].'ms',
            '--e-stagger' => $entrance['stagger'] === null ? null : $entrance['stagger'].'ms',
        ], fn ($value) => $value !== null);

        $out = 'data-entrance="'.$entrance['type'].'" data-entrance-dir="'.$entrance['direction'].'"';

        if ($entrance['trigger'] === 'item') {
            $out .= ' data-entrance-trigger="item"';
        }

        if ($overrides) {
            $style = implode('; ', array_map(
                fn ($property, $value) => "{$property}: {$value}",
                array_keys($overrides),
                $overrides,
            ));
            $out .= ' style="'.$style.'"';
        }

        return $out;
    }

    /**
     * Attributes for one part. Index 0 carries no custom property, because the
     * stylesheet already defaults --e-i to 0.
     */
    public static function part(mixed $index = 0): string
    {
        $index = self::clamp($index, 0, 1000) ?? 0;

        return $index > 0
            ? 'data-entrance-part style="--e-i: '.$index.'"'
            : 'data-entrance-part';
    }

    private static function pick(mixed $value, array $allowed, string $fallback): string
    {
        return is_string($value) && in_array($value, $allowed, true) ? $value : $fallback;
    }
}

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

    // [min, max], the same limits as EntranceControl.jsx and entranceCanvas.js.
    public const LIMITS = [
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
     * Attributes for the section root, or '' when there is no entrance and no
     * extra style. $extraStyle is a caller's own "property: value" pair(s),
     * merged into the same style attribute this prints rather than left for
     * the caller to splice in by hand. $entrance defaults to null so a bare
     * @entrance() (Blade compiles that to a call with no arguments) means
     * "no entrance" instead of a fatal ArgumentCountError.
     */
    public static function root(mixed $entrance = null, string $extraStyle = ''): string
    {
        $out = '';
        $entranceStyle = '';

        if (is_array($entrance)) {
            $entrance = self::sanitize($entrance);

            if ($entrance['type'] !== 'none') {
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
                    $entranceStyle = implode('; ', array_map(
                        fn ($property, $value) => "{$property}: {$value}",
                        array_keys($overrides),
                        $overrides,
                    ));
                }
            }
        }

        $style = implode('; ', array_filter([$extraStyle, $entranceStyle], fn ($part) => $part !== ''));

        if ($style !== '') {
            $out .= ($out !== '' ? ' ' : '').'style="'.esc_attr($style).'"';
        }

        return $out;
    }

    /**
     * Attributes for one part. Index 0 carries no custom property, because the
     * stylesheet already defaults --e-i to 0. $extraStyle merges into the
     * same style attribute (a caller with its own inline style, like a
     * logo cell's own sizing, must not print a second `style=` — HTML keeps
     * only the first one an element carries).
     */
    public static function part(mixed $index = 0, string $extraStyle = ''): string
    {
        $index = self::clamp($index, 0, 1000) ?? 0;
        $indexStyle = $index > 0 ? "--e-i: {$index}" : '';

        $style = implode('; ', array_filter([$extraStyle, $indexStyle], fn ($part) => $part !== ''));

        return $style !== ''
            ? 'data-entrance-part style="'.esc_attr($style).'"'
            : 'data-entrance-part';
    }

    /**
     * Part indexes for the parts a block actually renders, in reading order.
     * $present maps a part name to whether it renders; a part that doesn't
     * render gets null and takes no index, so the stagger has no gap. Twin
     * of partIndexes() in components/backend/entranceCanvas.js.
     *
     * @param array<string, bool> $present
     * @return array<string, int|null>
     */
    public static function partIndexes(array $present): array
    {
        $next = 0;
        $indexes = [];

        foreach ($present as $name => $renders) {
            $indexes[$name] = $renders ? $next++ : null;
        }

        return $indexes;
    }

    private static function pick(mixed $value, array $allowed, string $fallback): string
    {
        return is_string($value) && in_array($value, $allowed, true) ? $value : $fallback;
    }
}

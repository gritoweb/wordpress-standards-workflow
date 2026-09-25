<?php

namespace App\View\Composers;

use Roots\Acorn\View\Composer;

/**
 * Reads resources/css/global/variables.css so the style guide's swatches and
 * type specimens can't drift from the tokens: no hand-kept palette array to
 * fall out of sync (see _docs/site-settings.md's sibling design-system notes
 * and the kit audit, "Style guide drift").
 */
class StyleGuide extends Composer
{
    /**
     * List of views served by this composer.
     *
     * @var array
     */
    protected static $views = [
        'template-styleguide',
    ];

    private const TYPE_SUFFIXES = [
        '--line-height' => 'lineHeight',
        '--font-weight' => 'fontWeight',
        '--letter-spacing' => 'letterSpacing',
    ];

    /**
     * Data to be passed to view before rendering.
     */
    public function with(): array
    {
        // Our contract splits tokens by owner: color/shape, type, container.
        $tokens = array_merge(
            static::parseTokens(static::variablesPath()),
            static::parseTokens(static::themePath('resources/css/global/typography.css')),
            static::parseTokens(static::themePath('resources/css/global/container.css')),
        );

        return [
            'colorGroups' => static::colorGroupsFromMap($tokens, static::readJson(static::themePath('resources/css/styleguide-colors.json'))),
            'typeGroups' => static::typeGroups(static::typeSteps($tokens)),
            'fontFamilies' => static::fontFamilies($tokens),
            'spacingTokens' => static::tokensByPrefix($tokens, ['--container-']),
            'radiusTokens' => static::tokensByPrefix($tokens, ['--radius-']),
            'shadowTokens' => static::tokensByPrefix($tokens, ['--shadow-']),
        ];
    }

    protected static function variablesPath(): string
    {
        return static::themePath('resources/css/global/variables.css');
    }

    protected static function themePath(string $relative): string
    {
        return function_exists('get_theme_file_path') ? get_theme_file_path($relative) : '';
    }

    /**
     * A JSON file as an array, or an empty array when it is missing or
     * malformed, so the page still renders without it.
     */
    public static function readJson(string $path): array
    {
        if ($path === '' || ! is_readable($path)) {
            return [];
        }

        $data = json_decode((string) file_get_contents($path), true);

        return is_array($data) ? $data : [];
    }

    /**
     * Every `--custom-property: value;` declared in the file, in source
     * order, as `name => declared value` (the raw CSS text, not resolved).
     */
    public static function parseTokens(string $path): array
    {
        if ($path === '' || ! is_readable($path)) {
            return [];
        }

        $css = (string) file_get_contents($path);
        $tokens = [];

        if (preg_match_all('/(--[a-z0-9-]+)\s*:\s*([^;]+);/i', $css, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $tokens[$match[1]] = trim($match[2]);
            }
        }

        return $tokens;
    }

    /**
     * The tokens whose name starts with any of the prefixes, in declaration
     * order, as `{token, value}` rows for the spacing, radius and shadow
     * specimens.
     */
    public static function tokensByPrefix(array $tokens, array $prefixes): array
    {
        $rows = [];

        foreach ($tokens as $name => $value) {
            foreach ($prefixes as $prefix) {
                if (str_starts_with($name, $prefix)) {
                    $rows[] = ['token' => $name, 'value' => $value];
                    break;
                }
            }
        }

        return $rows;
    }

    /**
     * `--color-*` tokens, grouped by ramp (`--color-yellow-500` -> "yellow")
     * or "semantic" for an alias with no numbered step (`--color-primary`).
     */
    public static function colorGroups(array $tokens): array
    {
        $groups = [];

        foreach ($tokens as $name => $value) {
            if (! str_starts_with($name, '--color-')) {
                continue;
            }

            $group = preg_match('/^--color-([a-z]+)-\d+$/', $name, $m) ? $m[1] : 'semantic';
            $groups[$group][] = ['token' => $name, 'value' => $value];
        }

        return $groups;
    }

    /**
     * `--text-*` tokens collapsed into one row per step: its font-size token
     * plus any line-height, font-weight, and letter-spacing siblings.
     */
    public static function typeSteps(array $tokens): array
    {
        $steps = [];

        foreach ($tokens as $name => $value) {
            if (! str_starts_with($name, '--text-')) {
                continue;
            }

            $base = $name;
            $field = 'size';

            foreach (self::TYPE_SUFFIXES as $suffix => $key) {
                if (str_ends_with($name, $suffix)) {
                    $base = substr($name, 0, -strlen($suffix));
                    $field = $key;
                    break;
                }
            }

            $step = substr($base, strlen('--text-'));
            $steps[$step]['step'] ??= $step;
            $steps[$step]['token'] ??= $base;
            $steps[$step][$field] = $value;
        }

        // A mobile heading step declares only its size, line height and
        // tracking; base.css keeps the desktop weight at every width.
        foreach ($steps as $step => $row) {
            $base = preg_replace('/-mobile$/', '', $step);

            if ($base !== $step && isset($steps[$base]['fontWeight'])) {
                $steps[$step]['fontWeight'] ??= $steps[$base]['fontWeight'];
            }
        }

        ksort($steps);

        return array_values($steps);
    }

    /**
     * Color groups as the Figma Color board draws them (Brand Primary, Brand
     * Secondary, and so on). `$map` is resources/css/styleguide-colors.json,
     * which the figma-design-system skill writes from the token mapping. A
     * token the map doesn't list still shows, under "Semantic aliases" when
     * it points at another token and under "Other" when it doesn't, so a
     * token added later can't go missing. With no map the page falls back to
     * colorGroups().
     */
    public static function colorGroupsFromMap(array $tokens, array $map): array
    {
        if (empty($map['groups'])) {
            return static::colorGroups($tokens);
        }

        $groups = [];
        $listed = [];

        foreach ($map['groups'] as $group) {
            foreach ($group['swatches'] ?? [] as $swatch) {
                $token = $swatch['token'] ?? '';

                if (! isset($tokens[$token])) {
                    continue;
                }

                $groups[$group['name']][] = [
                    'token' => $token,
                    'name' => $swatch['name'] ?? $token,
                    'figma' => $swatch['figma'] ?? '',
                    'value' => $tokens[$token],
                ];
                $listed[$token] = true;
            }
        }

        foreach ($tokens as $token => $value) {
            if (! str_starts_with($token, '--color-') || isset($listed[$token])) {
                continue;
            }

            $bucket = str_starts_with($value, 'var(') ? 'Semantic aliases' : 'Other';
            $groups[$bucket][] = ['token' => $token, 'name' => $token, 'figma' => '', 'value' => $value];
        }

        return $groups;
    }

    private const TYPE_GROUPS = [
        'Headings' => '/^h[1-6]$/',
        'Subtitles' => '/^subtitle/',
        'Body text' => '/^(body|body-md|body-xl|body-emphasis|lead|small|caption)$/',
        'Links, nav and labels' => '/^(link|link-sm|nav-link|label|label-regular|overline)$/',
        'Interactive' => '/^(button|button-lg|button-sm|button-xs|input)$/',
    ];

    /**
     * typeSteps() rows grouped by kind of text. A `-mobile` step folds into
     * its desktop row as `mobile`, and a heading row carries its level so the
     * page can print the real tag.
     */
    public static function typeGroups(array $steps): array
    {
        $byName = [];

        foreach ($steps as $row) {
            $byName[$row['step']] = $row;
        }

        $groups = [];

        foreach ($steps as $row) {
            if (str_ends_with($row['step'], '-mobile')) {
                continue;
            }

            $row['mobile'] = $byName[$row['step'].'-mobile'] ?? null;
            $row['level'] = preg_match('/^h([1-6])$/', $row['step'], $m) ? (int) $m[1] : null;
            $name = 'Other';

            foreach (self::TYPE_GROUPS as $label => $pattern) {
                if (preg_match($pattern, $row['step'])) {
                    $name = $label;
                    break;
                }
            }

            $groups[$name][] = $row;
        }

        $ordered = [];

        foreach ([...array_keys(self::TYPE_GROUPS), 'Other'] as $label) {
            if (isset($groups[$label])) {
                $ordered[$label] = $groups[$label];
            }
        }

        return $ordered;
    }

    /**
     * The first family of each font token, as `display => DM Sans`.
     */
    public static function fontFamilies(array $tokens): array
    {
        $families = [];

        foreach (['display' => '--font-display', 'body' => '--font-body'] as $role => $token) {
            if (isset($tokens[$token]) && preg_match('/^\s*["\']?([^",\']+)/', $tokens[$token], $m)) {
                $families[$role] = trim($m[1]);
            }
        }

        return $families;
    }
}

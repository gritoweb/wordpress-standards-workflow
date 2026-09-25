<?php

namespace App\View\Composers;

use Roots\Acorn\View\Composer;

/** Feeds the dev style guide page from the live tokens in resources/css/global/, so it can't drift from the CSS. */
class StyleGuide extends Composer
{
    /** Views served by this composer. */
    protected static $views = [
        'template-styleguide',
    ];

    private const TYPE_SUFFIXES = [
        '--line-height' => 'lineHeight',
        '--font-weight' => 'fontWeight',
        '--letter-spacing' => 'letterSpacing',
    ];

    /** Data passed to the view. */
    public function with(): array
    {
        $tokens = [];

        foreach (['variables', 'typography', 'container'] as $file) {
            $tokens += static::parseTokens(static::themePath("resources/css/global/{$file}.css"));
        }

        return [
            'colorGroups' => static::colorGroupsFromMap($tokens, static::readJson(static::themePath('resources/css/styleguide-colors.json'))),
            'typeGroups' => static::typeGroups(static::typeSteps($tokens)),
            'fontFamilies' => static::fontFamilies($tokens),
            'spacingTokens' => static::tokensByPrefix($tokens, ['--container-', '--spacing-']),
            'radiusTokens' => static::tokensByPrefix($tokens, ['--radius-']),
            'shadowTokens' => static::tokensByPrefix($tokens, ['--shadow-']),
        ];
    }

    protected static function themePath(string $relative): string
    {
        return function_exists('get_theme_file_path') ? get_theme_file_path($relative) : '';
    }

    /** A JSON file as an array, or [] when it is missing or malformed. */
    public static function readJson(string $path): array
    {
        if ($path === '' || ! is_readable($path)) {
            return [];
        }

        $data = json_decode((string) file_get_contents($path), true);

        return is_array($data) ? $data : [];
    }

    /** Every `--custom-property: value;` in the file, in source order, as name => raw value. */
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

    /** Tokens whose name starts with one of the prefixes, as {token, value} rows. */
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

    /** `--color-*` tokens grouped by ramp (`--color-yellow-500` → yellow), or "semantic" when unnumbered. */
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

    /** `--text-*` tokens as one row per step: size plus line-height, weight and tracking. */
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

        // A -mobile step inherits its desktop weight.
        foreach ($steps as $step => $row) {
            $base = preg_replace('/-mobile$/', '', $step);

            if ($base !== $step && isset($steps[$base]['fontWeight'])) {
                $steps[$step]['fontWeight'] ??= $steps[$base]['fontWeight'];
            }
        }

        ksort($steps);

        return array_values($steps);
    }

    /** Color groups from styleguide-colors.json (written by figma-design-system); unlisted tokens still show. */
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

    /** typeSteps() rows grouped by kind of text, with the -mobile step folded into its desktop row. */
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

    /** The first family of each font token, as display => DM Sans. */
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

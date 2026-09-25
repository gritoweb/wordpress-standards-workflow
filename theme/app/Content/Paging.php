<?php

namespace App\Content;

/**
 * Paging for a collection block (a card grid backed by a post type query,
 * such as `post-grid`).
 *
 * Each block instance reads its own query argument, so two paged blocks on one
 * page move independently: the first reads `<base>-page`, a second one
 * `<base>-page-2`. The key is also the list's id, so every link lands back on
 * the list instead of the top of the page.
 *
 * Numbered pages render one page of items. Load more renders every item up to
 * the requested page, which is what makes it work without JavaScript: the
 * button is a link to the next page. `collection-paging.js` fetches that same
 * URL and appends only the new items.
 */
class Paging
{
    public const MODES = ['pager', 'loadMore'];

    /** @var array<string, int> */
    protected static array $instances = [];

    public static function paginate(array $items, int $perPage, string $mode, string $base, string $label): array
    {
        $count = static::$instances[$base] = (static::$instances[$base] ?? 0) + 1;
        $key = $count > 1 ? "{$base}-{$count}" : $base;

        $mode = in_array($mode, self::MODES, true) ? $mode : 'loadMore';
        $pages = $perPage > 0 ? max(1, (int) ceil(count($items) / $perPage)) : 1;

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- a read-only page number.
        $page = min(max(absint(wp_unslash($_GET[$key] ?? 1)), 1), $pages);

        $url = fn (int $n): string => esc_url_raw(
            ($n > 1 ? add_query_arg($key, $n) : remove_query_arg($key)) . "#{$key}"
        );

        $paging = [
            'key' => $key,
            'mode' => $mode,
            'label' => $label,
            'items' => $mode === 'pager' && $perPage > 0
                ? array_slice($items, ($page - 1) * $perPage, $perPage)
                : array_slice($items, 0, $perPage > 0 ? $page * $perPage : null),
            'more' => null,
            'prev' => null,
            'next' => null,
            'pages' => [],
        ];

        if ($pages < 2) {
            return $paging;
        }

        if ($mode === 'loadMore') {
            $paging['more'] = $page < $pages ? $url($page + 1) : null;

            return $paging;
        }

        // ponytail: every page number is listed; add ellipses if a list ever
        // runs past a dozen pages.
        $paging['prev'] = $page > 1 ? $url($page - 1) : null;
        $paging['next'] = $page < $pages ? $url($page + 1) : null;
        $paging['pages'] = array_map(
            fn (int $n): array => ['number' => $n, 'url' => $url($n), 'current' => $n === $page],
            range(1, $pages)
        );

        return $paging;
    }
}

<?php

namespace App\View\Composers;

use Roots\Acorn\View\Composer;

/**
 * Whether the page title renders as a real header, and (only when it does)
 * the line under it. Scoped to partials.page-header alone — Sage's stock
 * Post composer, unchanged, already supplies $title and $pagination for
 * this and every other view that needs them.
 */
class PageHeader extends Composer
{
    /**
     * List of views served by this composer.
     *
     * @var array
     */
    protected static $views = [
        'partials.page-header',
    ];

    /**
     * Data to be passed to view before rendering.
     */
    public function with(): array
    {
        // True on the templates that render a query — the blog index, an
        // archive, search results, the 404 — where nothing else on the page
        // is a heading. Everywhere else the design supplies the visible
        // headings and the title is present for crawlers and assistive tech
        // only.
        $visibleTitle = ! is_singular();

        return [
            'visibleTitle' => $visibleTitle,
            'subtitle' => $visibleTitle ? $this->subtitle() : '',
        ];
    }

    /**
     * The line under a visible page title. Only a post type archive
     * (get_the_archive_description()) says anything here; a search or date
     * archive has no description to show.
     */
    protected function subtitle(): string
    {
        return is_archive() ? trim(wp_strip_all_tags((string) get_the_archive_description())) : '';
    }
}

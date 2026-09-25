<?php

namespace App\View\Composers;

use Roots\Acorn\View\Composer;

class App extends Composer
{
    /**
     * List of views served by this composer.
     *
     * @var array
     */
    protected static $views = [
        '*',
    ];

    /**
     * Retrieve the site name.
     *
     * get_bloginfo('name', 'display') already runs through WordPress's
     * display filters (esc_html among them), so decode here — {{ }} in
     * Blade encodes again on print, and without this an "&" prints as
     * "&#038;".
     */
    public function siteName(): string
    {
        return html_entity_decode(get_bloginfo('name', 'display'), ENT_QUOTES);
    }

    /**
     * Whether the current singular view should open flush under the header.
     *
     * WP_Query::is_singular() treats an empty $post_types list as "any
     * singular view", not "none" — so the filter's default (an empty array)
     * must short-circuit here instead of reaching is_singular() directly.
     */
    public function mainUnderHeader(): bool
    {
        $postTypes = apply_filters('__PREFIX__/main_under_header', []);

        return $postTypes !== [] && is_singular($postTypes);
    }
}

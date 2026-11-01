<?php

namespace App\View\Composers;

use App\Blocks\BlockManager;
use Roots\Acorn\View\Composer;

/** Tells the page title and the content partials whether the content is plain prose or a page built from this theme's blocks. Sage's Post composer still supplies $title and $pagination. */
class PlainContent extends Composer
{
    /** Views served by this composer. */
    protected static $views = [
        'partials.page-header',
        'partials.content-page',
        'partials.content-single',
    ];

    /** True when there's no theme block to set its own width and heading. Archives and search use the page title too, so anything not singular is plain. */
    public function isPlain(): bool
    {
        if (! is_singular()) {
            return true;
        }

        $namespace = preg_quote((new BlockManager())->getNamespace(), '#');

        return ! preg_match("#<!--\s+wp:{$namespace}/#", (string) get_post_field('post_content', get_queried_object_id()));
    }
}

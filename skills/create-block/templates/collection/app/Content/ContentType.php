<?php

namespace App\Content;

use WP_Post;

/**
 * What a collection block needs from a content type to query and card it.
 * Posts is the worked example; docs/patterns/collection-grid.md adds a type.
 */
interface ContentType
{
    /**
     * The registered post type slug this adapter reads.
     */
    public static function postType(): string;

    /**
     * The label post-grid's "Content type" control shows for this type.
     */
    public static function label(): string;

    /**
     * The posts one post-grid instance shows, in display order.
     *
     * An empty $include means everyone. Under 'manual' a non-empty $include
     * is also the display order; 'title' and 'date' sort whoever is
     * included. $exclude always wins. visibleRecords() in postPickerQuery.js
     * resolves the same set for the canvas.
     *
     * @param int[] $include
     * @param int[] $exclude
     * @param 'manual'|'title'|'date' $orderby
     * @return WP_Post[]
     */
    public static function selectedPosts(array $include, array $exclude, string $orderby): array;

    /**
     * One card's worth of data, for the block's Blade view.
     *
     * @return array{id: int, title: string, meta: string, excerpt: string, url: string, photoId: int, photoAlt: string}
     */
    public static function card(WP_Post $post): array;
}

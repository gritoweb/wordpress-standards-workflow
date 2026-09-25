<?php

namespace App\Content;

use WP_Post;

/**
 * What `post-grid` needs from a content type to query and card it.
 *
 * To add a type: register its post type, add an ACF group for its fields,
 * write a class that implements this (Person is the worked example), then
 * register it with ContentTypes::register(). See _docs/content-types.md.
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
     * included. $exclude always wins. block.jsx counts the same set for the
     * editor (see _docs/editor-contract.md, "Collection blocks").
     *
     * @param int[] $include
     * @param int[] $exclude
     * @param 'manual'|'title'|'date' $orderby
     * @return WP_Post[]
     */
    public static function selectedPosts(array $include, array $exclude, string $orderby): array;

    /**
     * One card's worth of data, shaped for a card partial (examples/views/partials/post-grid-card.blade.php):
     * id, title, meta, excerpt, url, photoId, photoAlt.
     *
     * @return array{id: int, title: string, meta: string, excerpt: string, url: string, photoId: int, photoAlt: string}
     */
    public static function card(WP_Post $post): array;
}

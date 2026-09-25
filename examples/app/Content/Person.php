<?php

namespace App\Content;

use WP_Post;
use WP_Query;

/**
 * The kit's documented example content type: a directory of people. Each
 * card shows a name, role, a short bio and an optional external link.
 *
 * Registered in app/content-types.php. This is the sample _docs/content-
 * types.md walks through — copy this file's shape, not its fields, when a
 * project adds its own type.
 */
class Person implements ContentType
{
    public static function postType(): string
    {
        return '__PREFIX___person';
    }

    public static function label(): string
    {
        return __('People', '__TEXT_DOMAIN__');
    }

    public static function selectedPosts(array $include, array $exclude, string $orderby): array
    {
        $include = self::ids($include);
        $exclude = self::ids($exclude);

        $args = [
            'orderby' => $orderby === 'date'
                ? ['date' => 'DESC', 'title' => 'ASC', 'ID' => 'ASC']
                : ['title' => 'ASC', 'ID' => 'ASC'],
        ];

        if ($exclude) {
            $args['post__not_in'] = $exclude;
        }

        if ($include) {
            $picked = array_values(array_diff($include, $exclude));

            // A list whose every record is hidden shows nothing, not everyone.
            if (! $picked) {
                return [];
            }

            $args['post__in'] = $picked;

            // Without `orderby => post__in` WP_Query falls back to date and
            // the picked order does nothing.
            if ($orderby === 'manual') {
                $args['orderby'] = 'post__in';
            }
        }

        return static::query($args);
    }

    public static function card(WP_Post $post): array
    {
        $photoId = (int) get_post_thumbnail_id($post->ID);

        return [
            'id' => $post->ID,
            // get_the_title() is already texturized/entity-encoded; decode
            // it once so Blade's {{ }} is the only encoding pass ("&" would
            // otherwise show as the literal text "&#038;", not the letter).
            'title' => html_entity_decode(get_the_title($post), ENT_QUOTES),
            'meta' => (string) get_post_meta($post->ID, 'role', true),
            'excerpt' => (string) get_post_meta($post->ID, 'bio', true),
            'url' => esc_url_raw((string) get_post_meta($post->ID, 'link_url', true)),
            'photoId' => $photoId,
            'photoAlt' => $photoId ? static::alt($photoId, $post) : '',
        ];
    }

    /**
     * @param array<int|string> $ids
     * @return int[]
     */
    protected static function ids(array $ids): array
    {
        return array_values(array_unique(array_filter(array_map('absint', $ids))));
    }

    /**
     * @return WP_Post[]
     */
    protected static function query(array $args): array
    {
        if (! post_type_exists(self::postType())) {
            return [];
        }

        // ponytail: posts_per_page => -1 loads every record and its meta on
        // every render, fine for a small directory. If a type grows into the
        // hundreds, move to a 'fields' => 'ids' query plus a slice, or a real
        // paged query in pager mode.
        $query = new WP_Query($args + [
            'post_type' => self::postType(),
            'post_status' => 'publish',
            'has_password' => false,
            'posts_per_page' => -1,
            'ignore_sticky_posts' => true,
            'no_found_rows' => true,
            'update_post_term_cache' => false,
        ]);

        return $query->posts;
    }

    /**
     * The attachment's own alt text, falling back to the person's name. A
     * photo with no alt is a card with no accessible description for it.
     */
    protected static function alt(int $attachmentId, WP_Post $post): string
    {
        $alt = trim((string) get_post_meta($attachmentId, '_wp_attachment_image_alt', true));

        return $alt !== '' ? $alt : html_entity_decode(get_the_title($post), ENT_QUOTES);
    }
}

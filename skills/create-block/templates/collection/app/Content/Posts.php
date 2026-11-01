<?php

namespace App\Content;

use WP_Post;
use WP_Query;

/**
 * The blog as a content type, and the shape to copy for another one: extend
 * this and override postType(), label() and card().
 */
class Posts implements ContentType
{
    public static function postType(): string
    {
        return 'post';
    }

    public static function label(): string
    {
        return __('Posts', '__TEXT_DOMAIN__');
    }

    public static function selectedPosts(array $include, array $exclude, string $orderby): array
    {
        $include = array_values(array_unique(array_filter(array_map('absint', $include))));
        $exclude = array_values(array_unique(array_filter(array_map('absint', $exclude))));

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

            // Without this WP_Query falls back to date and the picked order does nothing.
            if ($orderby === 'manual') {
                $args['orderby'] = 'post__in';
            }
        }

        if (! post_type_exists(static::postType())) {
            return [];
        }

        // shortcut: loads every record on every render, fine for hundreds. Past that, query IDs and slice.
        return (new WP_Query($args + [
            'post_type' => static::postType(),
            'post_status' => 'publish',
            'has_password' => false,
            'posts_per_page' => -1,
            'ignore_sticky_posts' => true,
            'no_found_rows' => true,
            'update_post_term_cache' => false,
        ]))->posts;
    }

    public static function card(WP_Post $post): array
    {
        $photoId = (int) get_post_thumbnail_id($post->ID);
        // get_the_title() is entity-encoded; decoded so Blade's {{ }} is the only encoding pass.
        $title = html_entity_decode(get_the_title($post), ENT_QUOTES);
        $alt = trim((string) get_post_meta($photoId, '_wp_attachment_image_alt', true));

        return [
            'id' => $post->ID,
            'title' => $title,
            'meta' => '',
            'excerpt' => html_entity_decode(get_the_excerpt($post), ENT_QUOTES),
            'url' => esc_url_raw((string) get_permalink($post)),
            'photoId' => $photoId,
            'photoAlt' => $alt !== '' ? $alt : $title,
        ];
    }
}

<?php

/**
 * Content type bootstrap.
 *
 * The sample content type for the post-grid example. A site that wants it
 * copies this file, Person.php, and the ACF group into its theme and adds
 * 'content-types' to functions.php's collect([...]) list (see
 * examples/README.md). Registers every post type a Content adapter reads
 * (see app/Content/) and hands each adapter to ContentTypes.
 *
 * A real project's content usually needs to survive a theme change; when
 * that matters, move the post type registration into a small mu-plugin
 * instead (see _docs/content-types.md, "Where post types live") — the
 * Content adapter and the block never change either way.
 */

namespace App;

use App\Content\ContentTypes;
use App\Content\Person;

ContentTypes::register(Person::class);

add_action('init', function () {
    register_post_type(Person::postType(), [
        'label' => __('People', '__TEXT_DOMAIN__'),
        'labels' => [
            'name' => __('People', '__TEXT_DOMAIN__'),
            'singular_name' => __('Person', '__TEXT_DOMAIN__'),
            'add_new_item' => __('Add New Person', '__TEXT_DOMAIN__'),
            'edit_item' => __('Edit Person', '__TEXT_DOMAIN__'),
            'new_item' => __('New Person', '__TEXT_DOMAIN__'),
            'search_items' => __('Search People', '__TEXT_DOMAIN__'),
            'not_found' => __('No people found.', '__TEXT_DOMAIN__'),
            'all_items' => __('All People', '__TEXT_DOMAIN__'),
        ],
        'description' => __('Sample content type for the post-grid block. Read _docs/content-types.md before shipping this on a real project.', '__TEXT_DOMAIN__'),

        // No page of its own: post-grid links out via the optional "link_url"
        // field, the same pattern a client or partner directory would use.
        'public' => false,
        'publicly_queryable' => false,
        'has_archive' => false,
        'exclude_from_search' => true,

        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_nav_menus' => false,
        'show_in_admin_bar' => true,
        'show_in_rest' => true,

        'menu_position' => 25,
        'menu_icon' => 'dashicons-groups',

        // No `editor`: the card only shows title, thumbnail and the ACF
        // fields below — nothing here is composed from blocks.
        'supports' => ['title', 'thumbnail', 'revisions'],

        'hierarchical' => false,
        'capability_type' => 'post',
        'map_meta_cap' => true,

        'rewrite' => false,
        'query_var' => false,

        'delete_with_user' => false,
    ]);
});

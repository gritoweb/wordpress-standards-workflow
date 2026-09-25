<?php

/**
 * Kit shell: the Site Settings options page, motion defaults, editor styles,
 * comments off, and Gravity Forms button classes when the plugin is active.
 *
 * Sage's own app/setup.php and app/filters.php are never edited (see
 * AGENTS.md, Kit layout) — this file is the kit's own home for this wiring.
 * Loaded from functions.php's
 * collect(['setup', 'filters', 'blocks', 'site']) — see project-init's
 * Phase 2 Step 5 ("Wire the theme").
 */

namespace App;

use App\Settings\SiteSettings;

/**
 * WordPress prints a block's viewStyle before app.css, so the first @layer
 * statement on the page would set the order for every layer. A block.css
 * with its own @layer, or any early layer, would then put components under
 * base. Stating the order first removes the dependency.
 */
const LAYER_ORDER = '@layer theme, base, components, utilities;';

add_action('wp_head', function () {
    echo '<style id="__PREFIX__-layer-order">'.LAYER_ORDER."</style>\n";
}, 0);

/**
 * The block editor canvas never runs wp_head(), so it gets the layer order
 * and the site's motion custom properties here. editor.css itself is already
 * injected by Sage's own stock app/setup.php (never edited here — see
 * AGENTS.md, Kit layout); adding it a second time would load the whole
 * editor bundle twice.
 */
add_filter('block_editor_settings_all', function ($settings) {
    array_unshift($settings['styles'], ['css' => LAYER_ORDER]);
    $settings['styles'][] = ['css' => ':root{'.motion_declarations().'}'];

    return $settings;
});

/**
 * EntranceControl.jsx reads window.__PREFIX__EntranceDefaults as its
 * siteDefaults fallback, so the inspector's placeholders match Site Settings
 * > Motion instead of the component's hard-coded fallback. 'editor' is
 * Sage 11's own Vite handle for resources/js/editor.js (see
 * blade-standards, "the theme's own app/editor handles").
 */
add_action('enqueue_block_editor_assets', function () {
    $motion = SiteSettings::motion();

    wp_add_inline_script(
        'editor',
        'window.__PREFIX__EntranceDefaults='.wp_json_encode([
            'distance' => $motion['distance'],
            'duration' => $motion['duration'],
            'delay' => $motion['delay'],
            'stagger' => $motion['stagger'],
        ]).';',
        'before'
    );
});

/**
 * Site Settings options page (acf-json/group___PREFIX___site_settings.json).
 */
add_action('acf/init', function () {
    if (! function_exists('acf_add_options_page')) {
        return;
    }

    acf_add_options_page([
        'page_title' => __('Site Settings', '__TEXT_DOMAIN__'),
        'menu_title' => __('Site Settings', '__TEXT_DOMAIN__'),
        'menu_slug' => 'site-settings',
        'capability' => 'manage_options',
        'position' => 61,
        'icon_url' => 'dashicons-admin-generic',
        'redirect' => false,
        'update_button' => __('Save settings', '__TEXT_DOMAIN__'),
    ]);
});

/**
 * Site Settings > Motion, as custom properties on :root. Every value already
 * comes from SiteSettings::motion()/hover(), clamped there, so nothing here
 * is printed straight from an option.
 */
function motion_declarations(): string
{
    $motion = SiteSettings::motion();
    $hover = SiteSettings::hover();

    $pairs = [
        '--e-duration' => $motion['duration'].'ms',
        '--e-delay' => $motion['delay'].'ms',
        '--e-stagger' => $motion['stagger'].'ms',
        '--e-distance' => $motion['distance'].$motion['unit'],
        '--e-ease' => $motion['ease'],
        '--hover-duration' => $hover['duration'].'ms',
    ];

    $declarations = [];

    foreach ($pairs as $property => $value) {
        $declarations[] = "{$property}:{$value}";
    }

    return implode(';', $declarations);
}

// html:root outranks a block's own entrance.css :root defaults, so the
// site's values win even though this prints after wp_head.
add_action('wp_head', function () {
    echo '<style id="__PREFIX__-motion-defaults">html:root{'.esc_html(motion_declarations())."}</style>\n";
}, 6);

/**
 * Every hidden-state rule in entrance.css needs html.entrance, which only
 * this snippet adds. The 5-second bail-out means a bundle that never runs
 * (blocked script, slow connection) still leaves the page readable — see
 * _docs/entrance.md "Fail-safes".
 */
add_action('wp_head', function () {
    echo <<<'HTML'
<script>
document.documentElement.classList.add('entrance');
window.setTimeout(function () {
    if (!document.documentElement.hasAttribute('data-entrance-ready')) {
        document.documentElement.classList.remove('entrance');
    }
}, 5000);
</script>

HTML;
}, 1);

/**
 * The hover effect is a body class because CSS cannot branch on the value of
 * a custom property. Only the whitelisted values SiteSettings::hover()
 * returns are ever printed.
 */
add_filter('body_class', function (array $classes): array {
    $hover = SiteSettings::hover();

    $classes[] = 'hover-btn-'.$hover['button'];
    $classes[] = 'hover-link-'.$hover['link'];

    return $classes;
});

/**
 * Button classes per form ground: on-light (paper or a light ground) and
 * on-dark (an ink or dark ground). A block sets the tone; it never restyles
 * the button by its own class name.
 */
const FORM_BUTTON_TONES = [
    'on-light' => 'btn btn-primary max-xl:w-full',
    'on-dark' => 'btn btn-on-dark max-xl:w-full',
];

/**
 * Gravity Forms is an optional add-on: these filters, and everything they
 * touch, are inert when the plugin isn't installed.
 */
if (class_exists('GFForms')) {
    // Gravity Forms ships its own stylesheets and a block theme framework;
    // the theme styles forms itself in resources/css/global/forms.css.
    add_filter('gform_disable_css', '__return_true');
    add_filter('gform_disable_form_theme_css', '__return_true');

    /**
     * Render the Gravity Forms submit as a <button> carrying the theme's
     * primary button classes, so forms.css doesn't need its own button
     * styles.
     */
    add_filter('gform_submit_button', function ($button, $form) {
        // Gravity Forms re-renders the form from admin-ajax after a submit,
        // where the block that set the tone never runs, so the tone also
        // travels as a hidden input and is read back from the request.
        $tone = apply_filters('__PREFIX__/form_button_tone', null, $form);
        $tone = is_string($tone) ? $tone : sanitize_key(wp_unslash($_POST['__PREFIX___form_button'] ?? ''));
        $tone = isset(FORM_BUTTON_TONES[$tone]) ? $tone : '';
        $classes = $tone !== '' ? FORM_BUTTON_TONES[$tone] : 'btn btn-primary';

        // Gravity Forms 3.x routes submissions through its own click handler
        // and logs "Unsupported submission flow detected" when a themed
        // button replaces the markup without it. Guarded, so a page where
        // the GF bundle hasn't loaded still submits as a plain button.
        return sprintf(
            '<button class="%s gform_button" id="gform_submit_button_%d" type="submit"'
                .' onclick="if (window.gform && gform.submission) { gform.submission.handleButtonClick(this); }">%s</button>%s',
            $classes,
            (int) $form['id'],
            esc_html($form['button']['text'] ?? __('Submit', '__TEXT_DOMAIN__')),
            $tone !== '' ? sprintf('<input type="hidden" name="__PREFIX___form_button" value="%s">', $tone) : ''
        );
    }, 10, 2);
}

/**
 * Comments are off site-wide. See AGENTS.md, WordPress Settings.
 */
add_filter('comments_open', '__return_false', 20);
add_filter('pings_open', '__return_false', 20);
add_filter('comments_array', '__return_empty_array', 20);
add_filter('feed_links_show_comments_feed', '__return_false');

/**
 * Priority 100: a post type a plugin registers on the default `init`
 * priority (10) must still lose comment support, so this runs after any
 * registration a plugin is likely to do.
 */
add_action('init', function () {
    foreach (get_post_types() as $type) {
        remove_post_type_support($type, 'comments');
        remove_post_type_support($type, 'trackbacks');
    }
}, 100);

add_action('admin_menu', function () {
    remove_menu_page('edit-comments.php');
});

add_action('wp_before_admin_bar_render', function () {
    global $wp_admin_bar;
    $wp_admin_bar->remove_menu('comments');
});

/**
 * Send anyone who reaches the comments screen by URL back to the dashboard.
 */
add_action('admin_init', function () {
    global $pagenow;

    if ($pagenow === 'edit-comments.php') {
        wp_safe_redirect(admin_url());
        exit;
    }
});

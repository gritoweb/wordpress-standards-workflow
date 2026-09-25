<?php

namespace App\Settings;

/**
 * The Site Settings the header and footer example reads: the header button
 * and scroll behavior, the footer's legal name, and the social links. The
 * fields live in acf-json/group___PREFIX___header_footer.json, an add-on
 * group on the same options page as the kit's Motion tab, and this class
 * reads them the way SiteSettings reads its own: through one guarded
 * accessor, with a default for every field.
 *
 * A site adds the fields its own header needs the same way (see
 * _docs/site-settings.md, "Adding the fields your header needs").
 */
class HeaderFooterSettings extends SiteSettings
{
    /**
     * Icon slug => [ACF field name, accessible name]. An empty name falls
     * back to the social_other_label field, then a generic label.
     */
    private const SOCIAL_NETWORKS = [
        'linkedin' => ['social_linkedin', 'LinkedIn'],
        'instagram' => ['social_instagram', 'Instagram'],
        'facebook' => ['social_facebook', 'Facebook'],
        'x' => ['social_x', 'X'],
        'other' => ['social_other', ''],
    ];

    /**
     * The header button, or null when the toggle is off, the link is empty,
     * or ACF is inactive.
     */
    public static function headerButton(): ?array
    {
        if (! static::field('header_cta_enabled')) {
            return null;
        }

        $link = static::field('header_cta_link');

        // esc_url_raw drops a scheme such as javascript:, which HTML escaping
        // in the view would keep.
        $url = esc_url_raw((string) ($link['url'] ?? ''));

        if ($url === '') {
            return null;
        }

        return [
            'title' => $link['title'] ?: __('Contact', '__TEXT_DOMAIN__'),
            'url' => $url,
            'target' => $link['target'] ?? '',
        ];
    }

    /**
     * The header's scroll behavior: normal, sticky, or scroll-up. Falls back
     * to normal for an empty or unrecognized value.
     */
    public static function headerScroll(): string
    {
        $value = static::field('header_scroll');

        return in_array($value, ['sticky', 'scroll-up'], true) ? $value : 'normal';
    }

    /**
     * The footer's legal name, falling back to the site title.
     */
    public static function footerLegalName(): string
    {
        $name = trim((string) static::field('footer_legal_name'));

        // get_bloginfo('name', 'display') already runs through WordPress's
        // display filters (esc_html among them); decode so Blade's {{ }}
        // only encodes once. The ACF field above is raw text and needs no
        // such treatment.
        return $name !== '' ? $name : html_entity_decode(get_bloginfo('name', 'display'), ENT_QUOTES);
    }

    /**
     * Social links that have a URL set, in SOCIAL_NETWORKS order.
     */
    public static function socials(): array
    {
        $links = [];

        foreach (self::SOCIAL_NETWORKS as $icon => [$option, $name]) {
            $url = esc_url_raw((string) static::field($option));

            if ($url === '') {
                continue;
            }

            $links[] = [
                'icon' => $icon,
                'name' => $name ?: (static::field('social_other_label') ?: __('Link', '__TEXT_DOMAIN__')),
                'url' => $url,
            ];
        }

        return $links;
    }
}

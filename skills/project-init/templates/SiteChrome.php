<?php

namespace App\View\Composers;

use App\Settings\SiteSettings;
use Roots\Acorn\View\Composer;

/** Site Settings › Header and Footer for the header and footer; without SiteSettings (an older site) every value is empty. */
class SiteChrome extends Composer
{
    /** Views served by this composer. */
    protected static $views = [
        'sections.header',
        'sections.footer',
    ];

    /** Plain values: a public method would reach the view as a lazy callable, not an array. */
    public function with(): array
    {
        return [
            'headerCta' => self::headerCta(),
            'legalName' => self::legalName(),
            'contact' => self::contact(),
        ];
    }

    /** The header button as ['text', 'url', 'newTab'], or null when it is off or incomplete. */
    private static function headerCta(): ?array
    {
        $link = self::setting('header_cta_show') ? self::setting('header_cta_link') : null;

        if (! is_array($link) || empty($link['title']) || empty($link['url'])) {
            return null;
        }

        return [
            'text' => (string) $link['title'],
            'url' => (string) $link['url'],
            'newTab' => ($link['target'] ?? '') === '_blank',
        ];
    }

    /** The name after © in the footer: the legal name, or the site title. */
    private static function legalName(): string
    {
        return (string) (self::setting('legal_name') ?: get_bloginfo('name', 'display'));
    }

    /** The footer contact lines (plus 'tel', the dialable phone); an empty one is left out. */
    private static function contact(): array
    {
        $phone = trim((string) self::setting('contact_phone'));

        return array_filter([
            'email' => sanitize_email((string) self::setting('contact_email')),
            'phone' => $phone,
            'tel' => preg_replace('/[^0-9+]/', '', $phone),
            'address' => trim((string) self::setting('contact_address')),
        ]);
    }

    private static function setting(string $name): mixed
    {
        return class_exists(SiteSettings::class) ? SiteSettings::field($name) : null;
    }
}

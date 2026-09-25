<?php

namespace App\Settings;

/**
 * The Site Settings the location example reads: the Google Maps key and the
 * map's look. The fields live in acf-json/group___PREFIX___maps.json, an
 * add-on group on the same options page as the kit's Motion tab, and this
 * class reads them the way SiteSettings reads its own: through one guarded
 * accessor, with a default for every field.
 */
class MapsSettings extends SiteSettings
{
    /**
     * The Google Maps JavaScript API key, or '' when none is set. An empty
     * key is what the `location` block reads to decide whether a map
     * container is drawn at all. See `_docs/site-settings.md`.
     */
    public static function mapsApiKey(): string
    {
        return trim((string) static::field('maps_api_key'));
    }

    /**
     * 'google' (Google's own palette) or 'branded' (the kit's quiet, neutral
     * JSON style, in the location example's block.js). Anything else,
     * including a field that was never saved, falls back to 'google'.
     */
    public static function mapsStyle(): string
    {
        return static::field('maps_style') === 'branded' ? 'branded' : 'google';
    }

    /**
     * Whether a map hides shop/business points of interest and transit. A
     * true_false field with no saved value reads as ON, the same as every
     * map before this setting existed. Only an explicit off turns it off.
     */
    public static function mapsHideBusiness(): bool
    {
        $value = static::field('maps_hide_business');

        return $value !== false && $value !== '0' && $value !== 0;
    }
}

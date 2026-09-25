# Site Settings Pattern

Global values an editor changes without a deploy live on one **Site Settings**
page, built on **Secure Custom Fields** (SCF, the free ACF fork).

## What ships by default

- The plugin: `project-init` runs `lando wp plugin install secure-custom-fields --activate`.
- An **empty** Site Settings page: `app/Settings/SiteSettings.php`, registered
  from `app/blocks.php`. No tab, no field.
- Motion (entrance and hover defaults) works without a tab: `BlockMotion`
  uses the code's defaults.

**A tab is added only when someone asks for it**, with `site-settings-wizard`.
Motion has a ready-made tab; any other tab (Branding, Header, Footer,
Integrations…) is built from the fields that were asked for.

## How a tab is built

- One SCF group per tab in `acf-json/group_site_settings_<tab>.json`, located
  on the `site-settings` options page. SCF loads it from the theme on its own;
  commit the JSON with the code.
- Every read goes through `SiteSettings::field($name, $default)`. It returns
  the default when SCF is off or the field was never saved, so the site never
  breaks without the plugin. Nothing calls `get_field()` directly.

## What belongs here

| Belongs | Doesn't |
|---|---|
| Site-wide values: header button, legal name, support email, social links, an API key, motion defaults | Design tokens → `resources/css/global/` |
| Changed by an editor, one value at a time | A block's own content or choice → block attributes |
| | Repeatable records (team, clients) → a post type |

## The block-override pattern

A block attribute left empty (`null`) inherits the Site Settings value, and
the reader always carries a final default:

```php
$label = $attributes['ctaLabel'] ?? SiteSettings::field('header_cta_label', __('Contact us', '<text-domain>'));
```

The block stores its own content; Site Settings only supplies defaults.

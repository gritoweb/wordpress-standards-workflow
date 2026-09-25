# Site Settings Pattern

Global values an editor changes without a deploy live on one **Site Settings**
page, built on **Secure Custom Fields** (SCF, the free ACF fork).

## Nothing ships by default

A new project has no Site Settings page and no SCF. **The first tab someone
asks for** installs Secure Custom Fields and adds the page
(`app/Settings/SiteSettings.php`, registered from `app/blocks.php`), through
`site-settings-wizard`. Nothing is installed that the site doesn't use.

Motion (entrance and hover defaults) is not part of this: it stays in
**Appearance › Customize › Motion** (`BlockMotion`), unchanged, so older
sites keep their saved values.

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
| Site-wide values: header button, legal name, support email, social links, an API key | Design tokens → `resources/css/global/` |
| Changed by an editor, one value at a time | A block's own content or choice → block attributes |
| | Repeatable records (team, clients) → a post type |

## The block-override pattern

A block attribute left empty (`null`) inherits the Site Settings value, and
the reader always carries a final default:

```php
$label = $attributes['ctaLabel'] ?? SiteSettings::field('header_cta_label', __('Contact us', '<text-domain>'));
```

The block stores its own content; Site Settings only supplies defaults.

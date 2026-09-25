---
name: site-settings-wizard
description: >
  Adds a tab of fields to a Sage 11 theme's Site Settings page, built on Secure Custom Fields (SCF, the free ACF fork):
  one SCF field group in acf-json/ and reads through App\Settings\SiteSettings::field(). Only runs when the dev asks for
  a tab (Branding, Header, Footer, Integrations…); nothing is installed before that.
---

# site-settings-wizard — add a tab to Site Settings (SCF)

A project has **no Site Settings page and no SCF** until the dev asks for a
tab. The first tab installs both; every tab after that only adds its own
group. This skill adds the tab that was asked for, and nothing else. The
pattern is `_docs/site-settings-pattern.md`.

Motion (entrance and hover defaults) is **not** a Site Settings tab: it stays
in **Appearance › Customize › Motion** (`app/Blocks/BlockMotion.php`), as it
always has.

Never runs `npm` / `composer` / `git` — the dev does that themselves. The
only `lando` command is the plugin install above, on a local site.

---

## Pre-conditions

- Working directory = active Sage 11 theme root. If unsure, **ask** — don't guess.
- **First tab only** (no `app/Settings/SiteSettings.php` yet):
  1. Install the plugin: `lando wp plugin install secure-custom-fields --activate`
     (skip if ACF Pro is already active: same API).
  2. Copy `<skill>/templates/SiteSettings.php` to `app/Settings/SiteSettings.php`,
     replacing `__TEXT_DOMAIN__` with the theme's text domain. It registers
     the Site Settings page and is the one reader for its fields.
  3. Add `\App\Settings\SiteSettings::register();` to `app/blocks.php`, after
     `BlockMotion::register();`. Nothing else in the theme changes.

---

## Execution Flow

1. **Step 1** — Which tab and which fields (only what was asked)
2. **Step 2** — Does each field belong in Site Settings?
3. **Step 3** — The SCF field group in `acf-json/`
4. **Step 4** — Read the values
5. **Handoff**

---

## Step 1 — The tab the dev asked for

Ask which tab and which fields. Never add a tab or a field that wasn't asked
for — no "while we're here" Header/Footer/Socials. For each field: label,
`name` (snake_case), SCF type (`text`, `email`, `url`, `link`, `image`,
`number`, `true_false`, `select`), default, and for numbers `min`/`max`.

## Step 2 — Does it belong here?

Site Settings holds site-wide values an editor changes without a deploy, one
value at a time. Push back on:

- **Design tokens** (colors, fonts, spacing) → `resources/css/global/`.
- **Per-block choices** (a heading, a button, a background) → the block's own
  attributes. The block stores its content; Site Settings never does.
- **Repeatable records** (team, clients) → a post type, asked for separately.
- **Motion** (entrance, hover) → it stays in Appearance › Customize › Motion.

## Step 3 — Field group

Write `acf-json/group_site_settings_<tab>.json`: `key`
`group_site_settings_<tab>`, `title` `Site Settings — <Tab>`, one `tab` field
first, then the fields with keys `field_site_settings_<tab>_<name>`, and
`location` on the options page:

```json
"location": [[{ "param": "options_page", "operator": "==", "value": "site-settings" }]]
```

Never write `id` or `modified`; SCF fills them. SCF loads the JSON from the
theme's `acf-json/` on its own.

## Step 4 — Read the values

Always through `SiteSettings::field()`, with the default the site uses when
the field is empty or SCF is off — never `get_field()` directly:

```php
use App\Settings\SiteSettings;

$label = SiteSettings::field('header_cta_label', __('Contact us', '<text-domain>'));
```

Views get the value from a composer; `block.php` calls it directly. A number
with a range is clamped where it's read, with the same `min`/`max` as the JSON.

**Block-override pattern:** a block attribute left empty (`null`) inherits the
Site Settings value:

```php
$label = $attributes['ctaLabel'] ?? SiteSettings::field('header_cta_label', __('Contact us', '<text-domain>'));
```

## Handoff

The files written, then tell the dev to open **Site Settings**, check the new
tab, fill the values, and commit the JSON with the code.

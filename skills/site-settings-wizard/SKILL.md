---
name: site-settings-wizard
description: >
  Interactively add Site Settings fields to a Sage 11 theme built on the kit, using Secure Custom Fields (SCF, the free
  ACF fork): one SCF field group on the kit's Site Settings options page, a typed accessor that extends
  App\Settings\SiteSettings, and a test. Use when a theme needs global, editor-changeable values (header button,
  legal name, social links, a Maps key, a form ID).
---

# site-settings-wizard — add fields to Site Settings (SCF)

Turns a dev's list of global settings into the kit's Site Settings pattern:
the fields live in an SCF group on the **Site Settings** options page that
`app/site.php` already registers (next to the framework's **Motion** tab), and
the theme reads them only through a class that extends `SiteSettings`. The
full pattern, and what does and doesn't belong here, is
`_docs/site-settings-pattern.md` — read it first.

Never runs `npm` / `composer` / `git` — the dev does that themselves.

---

## Pre-conditions

- Working directory = active Sage 11 theme root. If unsure, **ask** — don't guess.
- The kit is installed: `app/site.php`, `app/Settings/SiteSettings.php` and
  `acf-json/group_<prefix>_site_settings.json` exist, and `functions.php`
  loads `'site'`. If not, stop and run `project-init`.
- **Secure Custom Fields** is the plugin (`wp plugin install secure-custom-fields --activate`,
  run by the dev). ACF Pro also works — same API — but the standard is SCF.
- `prefix` comes from `kit.config.json`.

---

## Execution Flow

1. **Step 1** — Fields: which values, which tab, which type
2. **Step 2** — Filter out what doesn't belong in Site Settings
3. **Step 3** — The SCF field group JSON
4. **Step 4** — The typed accessor class
5. **Step 5** — The test
6. **Handoff**

---

## Step 1 — Fields

Ask which sections (tabs) and fields the site needs; suggest from the design
(Header, Footer, Socials, Integrations) but don't hardcode them. For each
field: label, `name` (snake_case), SCF type (`text`, `email`, `url`, `link`,
`image`, `number`, `true_false`, `select`), default, and for numbers
`min`/`max`.

## Step 2 — Does it belong here?

Apply `_docs/site-settings-pattern.md` › "What belongs": site-wide, changed
by an editor without a deploy, one value at a time. Push back on design
tokens (they live in `variables.css`), per-block choices (block attributes)
and repeatable records (a post type).

## Step 3 — Field group

Write `acf-json/group_<prefix>_<group>.json` with `location` on the options
page `site-settings`, one `tab` field per section, and keys
`field_<prefix>_<name>`. Model it on the kit's
`<kitPath>/examples/acf-json/group___PREFIX___header_footer.json`. Never write
`id` or `modified`; SCF fills them on the next sync.

## Step 4 — Accessor

Write `app/Settings/<Group>Settings.php` extending `App\Settings\SiteSettings`.
Every getter reads through the inherited `static::field()` guard and returns a
typed default — never `null`, `false` or a raw field array:

```php
namespace App\Settings;

class HeaderFooterSettings extends SiteSettings
{
    public static function supportEmail(): string
    {
        return sanitize_email((string) static::field('support_email'));
    }
}
```

A number with a range gets its own `LIMITS` (`[min, max, default]`) and a
clamp, matching the field's `min`/`max`. Views read the value from a composer;
`block.php` calls the getter. Nothing calls `get_field()` directly.

## Step 5 — Test

Write `app/Settings/<Group>Settings.test.mjs` with `callKitPhp()` from
`app/test-support.mjs`: one case with no SCF (the default), one with a
fixture `get_field()` (the saved value), and, for ranged numbers, `LIMITS`
equal to the JSON's `min`/`max`. Model: the kit's
`examples/app/Settings/HeaderFooterSettings.test.mjs`.

## Handoff

A table of the files written, then tell the dev to: open
`wp-admin/edit.php?post_type=acf-field-group` and click **Sync** for the new
group, fill the values under **Site Settings**, and commit the JSON with the
code.

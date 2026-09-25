# Site Settings

Site Settings is the kit's one options page for values an editor changes
without a deploy, built on **Secure Custom Fields (SCF)** — the free,
WordPress.org-maintained fork of ACF. SCF keeps ACF's API (`acf_add_options_page()`,
`get_field()`, `acf-json`), repeaters and options pages, so everything below
says "ACF" where it means that API; the plugin every site installs is SCF. The framework ships one tab on it: **Motion** (the site's
entrance and hover defaults). A site adds the fields its own design needs as
one more SCF field group on the same page, and reads them through a small class that
extends `SiteSettings`. The header and footer example is the worked case: its
Header, Footer and Socials tabs live in
`<kitPath>/examples/acf-json/group___PREFIX___header_footer.json` and are read through
`<kitPath>/examples/app/Settings/HeaderFooterSettings.php`. The location example does
the same for the Google Maps key and style
(`<kitPath>/examples/acf-json/group___PREFIX___maps.json`,
`<kitPath>/examples/app/Settings/MapsSettings.php`).

`App\Settings\SiteSettings` is the accessor for the framework's own fields.
Nothing else in the theme calls `get_field()` for a Site Settings value.
`SiteSettings` guards ACF once (`function_exists('get_field')`) and returns a
typed, defaulted value either way, so a site with ACF deactivated, or a field
that was never saved, still renders correctly. An extension inherits that
guard.

## What belongs in Site Settings

A value belongs here when it meets all three:

- It's site-wide, not scoped to one page or block.
- An editor is expected to change it without a code deploy.
- It has one correct value at a time (not a repeatable list of records).

The framework's fields: the site's motion defaults (entrance timing and hover
style). Everything else is the site's own: a header button, a legal name,
social links, a Maps key, a newsletter form ID. Add each as its own
tab in an add-on group, in the same PR as the header, footer or block that
reads it.

## What doesn't belong in Site Settings

- **Design tokens.** Colors, type scale, spacing, and radii live in
  `resources/css/global/variables.css`, not an ACF field. A token changes the
  design system; Site Settings changes a site's configuration.
- **Per-section choices.** Whether one block sits on a light or dark ground,
  which alignment a section uses: these are block attributes, set per
  instance in the editor, not a global default.
- **Repeatable records.** A list of team members, locations, or testimonials
  is a post type (or an ACF repeater on one), not a Site Settings field. Site
  Settings holds single values only.

## Adding the fields your header needs

Say a site's design has a header button, a legal name in the footer, and a
support email. The framework has none of these fields, so the site adds them.
The kit's `examples/` (at `kitPath` in `kit.config.json`) has the same setup built and tested: read its files, then write the site's own.

1. **Add an ACF group on the Site Settings page.** Write
   `acf-json/group_<prefix>_header_footer.json` (the example's file is
   `group___PREFIX___header_footer.json` until `kit-setup.mjs` runs). Its
   `location` is the options page, so its tabs appear next to Motion. Give
   each field a key that follows the `field___PREFIX___<name>` pattern:

   ```json
   {
     "key": "group___PREFIX___header_footer",
     "title": "Header and footer",
     "menu_order": 1,
     "location": [[{ "param": "options_page", "operator": "==", "value": "site-settings" }]],
     "fields": [
       { "key": "field___PREFIX___tab_header", "label": "Header", "name": "", "type": "tab", "placement": "top" },
       { "key": "field___PREFIX___support_email", "label": "Support email", "name": "support_email", "type": "email" }
     ]
   }
   ```

2. **Add typed getters in a class that extends `SiteSettings`.** Create
   `app/Settings/HeaderFooterSettings.php`. Every getter reads through the
   inherited `field()` guard and returns a default, never `null`, `false`, or
   an ACF return-format quirk:

   ```php
   class HeaderFooterSettings extends SiteSettings
   {
       public static function supportEmail(): string
       {
           return sanitize_email((string) static::field('support_email'));
       }
   }
   ```

   A number field with a range clamps in the extension, with its own
   `LIMITS` constant and a test that asserts each entry against the field's
   `min` and `max`, the way `SiteSettings.test.mjs` does for the motion
   fields.

3. **Read it where it's needed**, through that class, never `get_field()`
   directly. A Blade view reads it from a composer (`app/View/Composers/`);
   a block's `block.php` calls
   `HeaderFooterSettings::supportEmail()` the same way.

4. **Add a test.** At minimum: the getter falls back cleanly with no ACF
   (`function_exists('get_field')` false, or a value that was never saved).
   See `<kitPath>/examples/app/Settings/HeaderFooterSettings.test.mjs`: `callKitPhp()`
   injects a fake `get_field()` backed by a fixture array, so a test can
   assert both the ACF-active and ACF-inactive paths without a real WordPress
   or ACF install.

To add one field to the framework's own tabs instead (a new motion setting),
edit `acf-json/group___PREFIX___site_settings.json` and add the getter to
`SiteSettings`, with its `[min, max, default]` in `LIMITS`.

## Syncing `acf-json` across environments

Each field group lives in version control as its own file:
`acf-json/group___PREFIX___site_settings.json` (after setup,
`acf-json/group_<prefix>_site_settings.json`) and any add-on groups beside it.
SCF's local JSON sync (the same `acf-json/` mechanism as ACF) picks these up automatically on every environment:
local, Test, and Live all read the same field definitions from the files, not
from each environment's own database.

- **After editing a field in wp-admin**, ACF writes the updated JSON back to
  this file. Commit that change like any other code change.
- **After pulling a change to this file**, visit
  `wp-admin/edit.php?post_type=acf-field-group` once. ACF shows a "Sync
  available" notice for the group; click Sync. Nothing in the front end
  reads the field group directly, so this step only matters for editing the
  fields in wp-admin, not for `SiteSettings`' own getters, which read
  `get_field()` values that ACF already resolves from whichever field group
  is active.
- **Never hand-edit `id`, `modified`, or ACF's internal bookkeeping fields**
  in the JSON. Edit through wp-admin and let ACF write the file, or edit the
  `label`/`name`/`type`/`instructions`/`min`/`max`/`choices` keys directly
  for a field that doesn't need a UI round trip (a rename, a new field with
  no options to test) and let the next wp-admin visit reconcile it.

## Tests

`app/Settings/SiteSettings.test.mjs` covers:

- Every getter's ACF-inactive fallback (the guard short-circuits to a default
  without touching the network or a database).
- The ACF-active path, with a fixture `get_field()` standing in for ACF.
- `LIMITS` matching the `min`/`max` declared for the same field in
  `acf-json/group___PREFIX___site_settings.json`, so a number's PHP clamp and
  its ACF field can't drift apart.

The worked example has its own tests in the kit's `examples/`:
`HeaderFooterSettings.test.mjs` for the getters.

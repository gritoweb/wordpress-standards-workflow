---
name: motion
description: >
  /motion — adds the Motion tab (entrance and hover defaults) to the Site Settings page, so an editor can change them in
  the admin. Only when the dev asks; without it the theme uses BlockMotion's defaults.
---

# /motion — add the Motion tab to Site Settings

Runs only when the dev asks for it. Without the tab the site already animates
with `BlockMotion`'s defaults (1000ms duration, 250ms delay, 250ms stagger,
32px distance, ease out, fade button hover, underline link hover, 250ms hover
speed); the tab only lets an editor change them in **Site Settings › Motion**.

1. Check `app/Settings/SiteSettings.php` exists and Secure Custom Fields is
   active. If not, stop: the kit isn't installed (`project-init`).
2. Copy `.claude/skills/site-settings-wizard/templates/group_site_settings_motion.json`
   to `acf-json/group_site_settings_motion.json` as is (ask before
   overwriting). Its field names are the ones `app/Blocks/BlockMotion.php`
   already reads, with the same defaults, so no PHP changes.
3. Tell the dev to open **Site Settings › Motion** in the admin, check the
   values, and commit the JSON with the code.

Never adds another tab, and never runs `npm` / `composer` / `git`.

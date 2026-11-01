# Footer

## When it applies

Every site has one. `project-init` Phase 1c installs a footer with the native logo, the Footer menu and the legal line. Phase 3 of `figma-design-system`, or the comp, restyles it. Add the fields the comp needs to the existing Footer tab in Site Settings, never a new tab for the same section.

## Built from

- `resources/views/sections/footer.blade.php`, from the `project-init` template
- `get_custom_logo()`, `wp_nav_menu()`
- `SiteChrome`, which reads the Footer tab

## Rules that matter most

- ESC-1, ESC-2: URLs and text print safely.
- I18N-1: every visible string goes through `__()`.
- A11Y-5: an icon-only link has an accessible name, and a decorative mark is `aria-hidden`.
- CTA-6, A11Y-6: `target="_blank"` only on a link that should open one.
- VIEW-6: colors come from tokens.

## Adapt per design

- The number of columns and which menus they use.
- The legal row's layout and any extra rows.
- The band it sits on.

## Do not change

- The legal name and contact details read through `SiteSettings::field()`, never hard-coded.
- `wp_date('Y')` for the year.
- An accessible name on every social link.

## Example

The `project-init` template `footer.blade.php`.

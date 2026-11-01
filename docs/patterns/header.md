# Header

## When it applies

Every site has one. `project-init` Phase 1c installs a responsive header with the native logo, the `primary_navigation` menu and a mobile toggle. With no menu assigned it lists the published pages, so it's never empty. Phase 3 of `figma-design-system`, or the comp, restyles it. The look comes from the comp, and the behaviors below don't change.

## Built from

- `resources/views/sections/header.blade.php`, from the `project-init` template
- `resources/js/modules/navigation.js`, for the toggle and dropdown
- `get_custom_logo()`, `wp_nav_menu()`
- `SiteChrome`, for Site Settings values

## Rules that matter most

- ESC-1, ESC-2: URLs and text print safely.
- I18N-1: every visible string goes through `__()`.
- CTA-6, A11Y-6: `target="_blank"` only when the link is flagged.
- A11Y-5: a decorative icon is `aria-hidden`, and an icon-only link has an `aria-label`.
- JS-5, JS-6, JS-7: the page works without JavaScript, reduced motion drops the transitions, and scroll code measures fixed chrome at click time.

## Adapt per design

- The logo's size, the type, colors and spacing, from tokens.
- The dropdown's shape.
- The phone panel's layout and the desktop breakpoint.

## Do not change

- The toggle's accessibility: `aria-expanded` flips, and Escape closes.
- The logo and menus staying WordPress's own, never Site Settings fields.
- The admin-bar offset, checked logged in and logged out.

## Example

The `project-init` template `header.blade.php`.

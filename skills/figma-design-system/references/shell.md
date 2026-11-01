# Phase 3: shell (header and footer)

Builds the site's persistent chrome: the header with its navigation, the footer, the logo and social icons exported from Figma, and the first JavaScript the theme needs: the mobile menu. Every page renders this, so a mistake here is visible everywhere.

The header and footer are **design, not design system**. You build both from the comp, restyling the header, footer and `navigation.js` that `project-init` Phase 1c installed, with `docs/patterns/header.md` and `docs/patterns/footer.md` as the checklist of behavior to keep. The design system (tokens, button roles, `container`) is what you build them on.

The shell is the first phase that writes Blade, PHP, and JavaScript rather than only CSS. Follow `blade-standards` for the views and `css-standards` for the CSS; this file covers the Figma side and the parts those skills don't reach.

## Contents

- Inputs
- Pick the header source
- Export the assets
- Header Blade
- Navigation markup
- Mobile menu and the theme's first JavaScript
- Footer Blade
- Layout CSS
- Wiring
- Manual steps the dev has to do
- Verify
- What rendering catches that the build can't
- Common mistakes
- Handoff

## Inputs

From `docs/figma-map.md`: the **Canonical nodes** for the header, footer, and logo, plus any social-icon board deferred from phase 2. Read each node with `get_design_context` (after invoking `figma:figma-design-to-code`), one at a time. Read `docs/patterns/header.md` and `docs/patterns/footer.md` before writing anything, and `docs/site-settings-pattern.md` for the header button, scroll mode, footer, and socials fields.

Before reading, ask for the mobile (and any tablet) header and footer comps (`SKILL.md` › **Gap policy**).

Give the read estimate first (which nodes, how many calls) and wait for the go-ahead. A typical shell phase is four to six reads: one header, one footer, one or two logo boards, one social-icon board, plus `download_assets` on the header and footer.

Tokens and components already exist. The header and footer compose what phases 1 and 2 built: `var(--...)` for every value, `.btn` classes for buttons, the `container` utility for width. If the shell needs a value no token covers, add the token to `variables.css` and say so in the confirmation batch: don't inline a hex.

## Pick the header source

Figma files usually carry more than one header board: a desktop menu, an expanded or mobile menu, a scrolled state, a stale copy. **Never pick silently.** List every candidate with its board name, size, and MCP link, say which one you'd build from and why, and ask.

| Board | Node | Size | Read as |
| --- | --- | --- | --- |
| Desktop Menu | `1000:1001` | 1440 × 96 | The default header |
| Menu | `1000:1002` | 1440 × 900 | The expanded overlay |

Once the user picks, record the choice in the map's **Canonical nodes** row with the date, so the next session doesn't ask again.

Watch for boards that are states of the same header rather than alternatives: a default and an expanded overlay are both in scope, and together they define the mobile menu. Say so instead of dropping one.

## Export the assets

Run `download_assets` on the header node, the footer node, and any dedicated logo board. Save the icons in `resources/images/icons/` under plain names (`facebook.svg`, `instagram.svg`). **The logo is WordPress's own** (Appearance › Customize › Site Identity): export it for the user to upload there, never as a Site Settings field or a bundled header image.

- **Never redraw an asset.** If an export comes back empty or rasterized, say so and ask for an SVG export from the designer rather than hand-writing the path data.
- The logo usually needs more than one file: a full lockup and a mark, sometimes in two colors. Export what the comps actually use; don't collect the whole logo board.
- Social icons come from the footer read, not from a generic icon library: take the networks the footer actually shows.
- Check each SVG has a `viewBox`, no hardcoded `width`/`height` that fights the CSS, and no embedded `<style>` block. Strip Figma's `id` clutter if it collides across inlined files.
- **Never strip `fill` while cleaning an export.** A filled icon whose root or paths lose their `fill` renders as nothing under a `fill="none"` root, and it renders as nothing *silently*, because the build is perfectly happy. Stroke-based icons survive the same edit, so a mixed set fails in a way that looks like only some icons are broken. If a file is destined for a `mask-image`, give its root an opaque `fill` (`#000`) so the mask is solid and the color comes from CSS.

How you reference an asset depends on where it's used, and both forms already exist in the theme from phase 2:

```css
/* CSS: the @images alias, resolved by Vite */
mask-image: url('@images/icons/facebook.svg');
```

Use a `mask-image` when the icon has to take a color from CSS (hover states, a color-per-context set). Inline the SVG in Blade only when you need to animate or style its internals.

## Header Blade

**Restyle the installed header from the comp.** `docs/patterns/header.md` gives the behaviors that must not change: the toggle's accessibility contract and the dropdown and its Escape handling. Change `resources/views/sections/header.blade.php` and its classes; keep `navigation.js`. If the comp needs a structure the pattern doesn't describe (a mega-menu panel, say), build it, keep the contract, and log it in `docs/kit-log.md`.

Rules:

- One root class named for the component (`.header`), BEM for its parts. No generic `.wrapper` or `.inner` at the top level.
- Wrap the header's contents in the `container` class from `container.css` so the shell lines up with page content. If the comp runs the header full-bleed with only padding, use the padding token instead and say why.
- `role="banner"` on the header and an `aria-label` on the nav, taken from the menu name.
- Always guard `wp_nav_menu` with `has_nav_menu`: an unassigned menu location must render nothing, not WordPress's page-list fallback.
- If the comp shows a call-to-action button in the header, use the `.btn` classes from phase 2 and read its text and link from Site Settings through `SiteChrome`, never hardcoded.
- Never call `get_field` directly in this view or its composer. Everything Site Settings owns goes through `SiteSettings::field()` (`docs/site-settings-pattern.md`).

## Navigation markup

WordPress emits its own markup for a menu. Style that output; don't invent markup it can't produce.

In order of preference:

1. **`wp_nav_menu` arguments.** `menu_class`, `container`, and `items_wrap` cover most comps.
2. **Filters.** `nav_menu_css_class` to add a class to each `<li>`, `nav_menu_link_attributes` to add one to each `<a>`. Put them in `app/filters.php`.
3. **A custom walker.** Only when the comp needs structure WordPress won't emit: a mega-menu panel, an icon inside each item, a description line. A walker is a class under `app/`, not Blade.

Style the states WordPress gives you: `.current-menu-item`, `.current-menu-ancestor`, `.menu-item-has-children`. The comp's "active" nav item maps to `.current-menu-item`; if the comp doesn't show one, infer it from the hover treatment, cite the node, and mark it `inferred`.

Dropdowns need both hover and keyboard access: `:hover`, `:focus-within`, and `aria-expanded` on a real toggle button if the submenu is click-driven. A submenu reachable only by hover is keyboard-dead.

## Mobile menu and the theme's first JavaScript

`project-init` installed `resources/js/navigation.js` and wired it in `app.js`. Keep that one initialization and add only what the site needs.

- Vanilla ES modules. No jQuery, no framework, no CDN dependency.
- Guard every module against a missing element, so a page without the header doesn't throw.
- No inline `onclick`, no `<script>` in Blade. `@vite` in the layout already loads `app.js`.

The accessibility contract for the toggle is not optional:

- A real `<button type="button">`, never a `<div>` or a bare `<a href="#">`.
- `aria-expanded` reflecting state, and `aria-controls` pointing at the panel's `id`.
- <kbd>Esc</kbd> closes the panel and returns focus to the toggle.
- Focus moves into the panel when it opens and doesn't escape behind it while it's open.
- The panel and collapsed submenus are inert and `aria-hidden` immediately on close, including during the closing animation.
**When the user says no mobile artboard exists** (a common tier-3 gap), don't block the phase and don't invent a look. Derive the mobile menu from what the file does give you: the desktop nav's type and colors, the file's breakpoints, and a full-screen or slide-in panel matching the brand's density. Mark it `derived`, list it under **Built without Figma**, add "no mobile header or menu design" to **Questions for design**, and tell the user in the handoff that the mobile menu is a derivation waiting on a comp.

## Footer Blade

**Same rule as the header:** restyle the installed footer with `docs/patterns/footer.md` as the checklist. Read the footer node and build the comp's real structure (columns, a menu, social icons, a form, a legal row) on the pattern's rules, rather than starting from Sage's empty `.content-info`.

- **No widget area unless the comp shows one.** If the theme has `register_sidebar` calls and `dynamic_sidebar` output that no comp supports, say so and propose removing them rather than styling an empty region.
- The footer menu is the second nav location `project-init` registered. A comp with columns adds one location per column in `app/setup.php`, and the editor assigns each menu (add it to the manual steps).
- Social links are a list of `<a>` elements with the exported icons and an accessible name each (`aria-label="Facebook"` or visually hidden text): an icon with no name is a bare link to a screen reader. Their URLs are Site Settings fields, added with `site-settings-wizard`.
- Render the copyright year with `wp_date('Y')` (never `date()`, it ignores the site's timezone) and never a literal.
- Contact details, the legal/business name, and any newsletter or CTA copy in the comp are content, not design: read them through `SiteChrome` (`docs/site-settings-pattern.md`), never hardcode them in the Blade or the composer.

## Layout CSS

The kit builds the header and footer with Tailwind utilities on the foundation's tokens. Add a `resources/css/layout/header.css` or `footer.css` only for what utilities can't express, with one root class per file.

- Tokens only. Colors, type, spacing, and radii all come from the foundation.
- Breakpoints come from the file's artboard widths, per `derivation-rules.md`: the same ones phase 1 used. Don't introduce a new breakpoint for the header alone.
- No `!important`, and no styles that reach outside the shell (`body`, `main`, `#app` belong to `base.css`).

Three cascade traps that the foundation sets for the shell, all of which render wrong while compiling clean:

- **`base.css`'s link color beats a mask's `currentColor`.** A logo or icon drawn with `mask-image` takes its color from `color`, and a global `a { color: var(--color-link) }` sets that on every link the mask sits inside, so a footer wordmark on a dark ground comes out dark-on-dark and invisible. Set `color: inherit` on the masked element, or give it an explicit token color.
- **`forms.css` beats a component's sizing.** A global `input { min-height: 48px; padding: 12px }` wins over a footer field's `height: 2rem`. Override `min-height` and `padding-block` in the shell's own rule rather than shrinking the global.
- **A plugin's own grid overflows a narrow column.** Gravity Forms lays its fields out in a 12-column grid whose items default to `min-width: auto`, so a form in a 438px column widens its track and pushes the page into horizontal scroll on phones. Set `min-width: 0` on the flex or grid children that hold the form, and switch the plugin's field grid to `display: block` when the comp shows a single field.

## Wiring

If you added layout files, import them in `app.css` below the component imports. Don't add them to `editor.css`: the header and footer never render inside the block editor. Show the `app.css` diff and wait, same as every other phase.

## Manual steps the dev has to do

The shell can't finish itself. List these explicitly in the handoff, because the header looks broken until they're done:

1. Create the menus in **Appearance > Menus** and assign them to Primary Navigation (and the footer location, if one was added).
2. Add the menu items the comp shows, in the comp's order.
3. Upload the logo in Appearance › Customize › Site Identity.

Say plainly that an unassigned menu means the nav renders nothing: otherwise an empty header reads as a bug in the CSS.

## Verify

Build first: ask the dev to run `npm run build` and confirm it exits clean. **That is not verification.**

The header and footer render on every page, so verify on a real front-end page, not on the styleguide (see **Verify by rendering** in `SKILL.md`):

1. Load the site's home page with the menu assigned. Compare the header and footer against the node screenshots (`get_screenshot`) side by side.
2. Check every breakpoint the design defines (at minimum the desktop comp width and a phone width), measuring per `SKILL.md` › **Verify by rendering** › **The method**: range boxes for the text, and the space above and below the label in every bar and button. The mobile menu opens, closes, and traps focus.
3. Keyboard only: tab from the top of the page. The skip link comes first, the logo is reachable, every nav item is reachable, the current item is visible, dropdowns open on focus, <kbd>Esc</kbd> closes the mobile panel and returns focus.
4. Check the console for JavaScript errors on a page with and without the menu present.
5. Add the social icon set to the styleguide page as a specimen: it's the one shell piece with no other home.
6. Hover every dropdown with real pointer travel from the link into the panel and across its items (**The method**, step 5). A panel that opens below its trigger's own edge needs something bridging the gap.
7. Run the gates in `SKILL.md` › **Automated gates**, adding a contrast pair for every new combination.

Report what you saw at each step. If the menu wasn't assigned yet, the shell is unverified: say so rather than calling the phase done.

## What rendering catches that the build can't

Every defect below came out of one real phase 3 run, after `npm run build` had exited 0. Read the list as evidence for why the browser pass isn't optional, and as the specific things to look for:

| Defect | Symptom in the browser | Cause |
| --- | --- | --- |
| Footer wordmark and social icons invisible | Nothing where the logo should be | `base.css` link color set `currentColor` on the masks |
| Newsletter field 48px instead of 32px | Field taller than the comp | `forms.css` `min-height` beat the component |
| Field spilled past its column; page scrolled sideways on a phone | Horizontal overflow | Gravity Forms' 12-column grid with `min-width: auto` |
| Phone panel hidden behind the admin bar | Top of the menu cut off, logged in only | Panel offset used the header height alone |
| Four of five social icons rendered blank | Only the stroke-based icon appeared | SVG cleaning stripped `fill` from the filled exports |
| Subscribe button wrapped under the field early | Cramped layout below ~330px | Flex basis too wide for the narrowest case |

Six defects, one clean build. Report each check with what you saw, and if a check couldn't run, say the phase is unverified.

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Picking one of several header boards without asking | List them all with links, recommend one, wait |
| Hand-writing SVG because the export looked wrong | Re-export or ask design; never redraw |
| Hardcoding menu markup in Blade | Style `wp_nav_menu` output; use a walker only when the markup is impossible otherwise |
| A `<div>` with a click handler as the mobile toggle | A `<button>` with `aria-expanded` and `aria-controls` |
| Building a mobile menu that matches no comp and saying nothing | Derive it, mark it `derived`, add the question for design |
| Styling a widget area no comp supports | Propose removing it |
| Importing `layout/*.css` into `editor.css` | The shell doesn't render in the editor |
| Reporting the phase done with no menu assigned | Unverified until the nav renders |
| Cleaning an SVG export by stripping attributes wholesale | Keep `fill`; a fill-less filled icon renders as nothing and the build says fine |
| Verifying only while logged in | The admin bar shifts fixed panels; check a logged-out view too |

## Handoff

Summarize in one table: what was built (header, footer, mobile menu, assets) → file → source node. List the `app.css`, `app/setup.php`, and `app/filters.php` edits. List the manual steps above. Note anything marked `derived` or `pending` and the questions added to the map.

Update `docs/figma-map.md`: the shell rows, the asset inventory, the canonical header choice, and the **Current status / Next step** section.

Propose the CHANGELOG entry and the version bump; the user commits with `commit-rules`. Then propose phase 4 (blocks).

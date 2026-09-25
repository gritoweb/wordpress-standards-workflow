# Phase 3: shell (header and footer)

Builds the site's persistent chrome: the header with its navigation, the footer, the logo and social icons exported from Figma, and the first JavaScript the theme needs: the mobile menu. Every page renders this, so a mistake here is visible everywhere.

The header is the one `project-init` installs (Phase 1c: `sections/header.blade.php`, `components/header.css`, `modules/navigation.js`) — this phase **adapts it to the comp**, keeping its accessibility contract (toggle, `aria-expanded`, Escape), rather than writing a second header. The footer is built from the comp, with `_docs/patterns/footer.md` as the checklist. The design system (tokens, button roles, `container`) is what both sit on.

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

From `_docs/figma-map.md`: the **Canonical nodes** for the header, footer, and logo, plus any social-icon board deferred from phase 2. Read each node with `get_design_context` (after invoking `figma:figma-design-to-code`), one at a time. Read `_docs/patterns/header.md` and `_docs/patterns/footer.md` before writing anything, and `_docs/site-settings-pattern.md` for the header button, scroll mode, footer, and socials fields.

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

Run `download_assets` on the header node, the footer node, and any dedicated logo board. Save the results under `resources/images/`, with icons in `resources/images/icons/`, using the kit's **fixed file names**: `logo.svg` for the header lockup, `logo-stacked.svg` for a stacked or mark variant, `facebook.svg`/`instagram.svg`/etc. for socials, never a client or file name. A project-init setup step expects these exact names; inventing `logo-final-v2.svg` or `logo-<client>.svg` breaks it silently.

- **Never redraw an asset.** If an export comes back empty or rasterized, say so and ask for an SVG export from the designer rather than hand-writing the path data.
- The logo usually needs more than one file: a full lockup and a mark, sometimes in two colors. Export what the comps actually use as `logo.svg` and `logo-stacked.svg`; don't collect the whole logo board or keep the designer's own file name.
- Social icons come from the footer read, not from a generic icon library: take the networks the footer actually shows.
- Check each SVG has a `viewBox`, no hardcoded `width`/`height` that fights the CSS, and no embedded `<style>` block. Strip Figma's `id` clutter if it collides across inlined files.
- **Never strip `fill` while cleaning an export.** A filled icon whose root or paths lose their `fill` renders as nothing under a `fill="none"` root, and it renders as nothing *silently*, because the build is perfectly happy. Stroke-based icons survive the same edit, so a mixed set fails in a way that looks like only some icons are broken. If a file is destined for a `mask-image`, give its root an opaque `fill` (`#000`) so the mask is solid and the color comes from CSS.

How you reference an asset depends on where it's used, and both forms already exist in the theme from phase 2:

```css
/* CSS: the @images alias, resolved by Vite */
mask-image: url('@images/icons/facebook.svg');
```

```blade
{{-- Blade: hashed through the manifest --}}
<img src="{{ Vite::asset('resources/images/logo.svg') }}" alt="{{ get_bloginfo('name') }}" width="220" height="48">
```

Use a `mask-image` when the icon has to take a color from CSS (hover states, a color-per-context set). Use an `<img>` when the asset is the brand mark and its colors are fixed. Inline the SVG in Blade only when you need to animate or style its internals.

## Header Blade

**Start from the installed header, not from Sage's stock placeholder.** `_docs/patterns/header.md` lists the behaviors that must not change (the toggle's accessibility contract, Escape, the primary menu location). Change the installed `sections/header.blade.php`, `components/header.css` and `navigation.js` to the comp's structure and tokens. If the comp needs a structure the installed header doesn't have (a dropdown, a mega-menu, a scrolled state), add it, keep the contract, and log it in `_docs/kit-log.md`.

```blade
<header class="header" role="banner">
  <div class="header__inner container">
    <a class="header__logo" href="{{ home_url('/') }}" aria-label="{{ get_bloginfo('name') }}">
      <img src="{{ Vite::asset('resources/images/logo.svg') }}" alt="{{ get_bloginfo('name') }}" width="220" height="48">
    </a>

    @if (has_nav_menu('primary_navigation'))
      <nav class="header__nav" aria-label="{{ wp_get_nav_menu_name('primary_navigation') }}">
        {!! wp_nav_menu([
          'theme_location' => 'primary_navigation',
          'container' => false,
          'menu_class' => 'nav',
          'echo' => false,
        ]) !!}
      </nav>
    @endif

    @if ($ctaText = $siteSettings->headerCtaText())
      <a class="btn btn-primary header__cta" href="{{ $siteSettings->headerCtaUrl() }}">{{ $ctaText }}</a>
    @endif
  </div>
</header>
```

Rules:

- One root class named for the component (`.header`), BEM for its parts. No generic `.wrapper` or `.inner` at the top level.
- Wrap the header's contents in the `container` utility from `container.css` so the shell lines up with page content. If the comp runs the header full-bleed with only padding, use the padding token instead and say why.
- `role="banner"` on the header and an `aria-label` on the nav, taken from the menu name.
- Always guard `wp_nav_menu` with `has_nav_menu`: an unassigned menu location must render nothing, not WordPress's page-list fallback.
- If the comp shows a call-to-action button in the header, use the `.btn` classes from phase 2 (`.btn-primary`, not a color name) and read its text/link/visibility from `SiteSettings`, never hardcode it. Same for the scroll mode (`normal`, `sticky`, `scroll-up`) if the comp shows one: it's a `SiteSettings` › Header tab field, documented in `_docs/site-settings-pattern.md`, not a value baked into the Blade or the CSS.
- Never call `get_field` directly in this view or its composer. Everything Site Settings owns goes through the `SiteSettings` accessor's typed getters (`_docs/site-settings-pattern.md` says which fields exist and what falls back when ACF is missing).

## Navigation markup

WordPress emits its own markup for a menu. Style that output; don't invent markup it can't produce.

In order of preference:

1. **`wp_nav_menu` arguments.** `menu_class`, `container`, and `items_wrap` cover most comps.
2. **Filters.** `nav_menu_css_class` to add a class to each `<li>`, `nav_menu_link_attributes` to add one to each `<a>`. Put them in `app/site.php`: the kit's own file, never Sage's stock `app/filters.php`.
3. **A custom walker.** Only when the comp needs structure WordPress won't emit: a mega-menu panel, an icon inside each item, a description line. A walker is a class under `app/`, not Blade.

Style the states WordPress gives you: `.current-menu-item`, `.current-menu-ancestor`, `.menu-item-has-children`. The comp's "active" nav item maps to `.current-menu-item`; if the comp doesn't show one, infer it from the hover treatment, cite the node, and mark it `inferred`.

Dropdowns need both hover and keyboard access: `:hover`, `:focus-within`, and `aria-expanded` on a real toggle button if the submenu is click-driven. A submenu reachable only by hover is keyboard-dead.

## Mobile menu and the theme's first JavaScript

The shell is usually where a Sage theme gets its first JavaScript, and `resources/js/app.js` starts empty. Keep it small and framework-free.

- Vanilla ES modules. No jQuery, no framework, no CDN dependency.
- One module per behavior under `resources/js/`, imported into `app.js`.
  `resources/js/WIRING.md` is the single source for the wiring block. Wire the
  header behaviors the site's header uses (the header pattern names them: the
  mobile menu, the scroll modes, the admin-bar measurement), plus the
  Gravity-Forms-only pair on a project that has the plugin.
- Guard every module against a missing element, so a page without the header doesn't throw.
- No inline `onclick`, no `<script>` in Blade. `@vite` in the layout already loads `app.js`.

The accessibility contract for the toggle is not optional:

- A real `<button type="button">`, never a `<div>` or a bare `<a href="#">`.
- `aria-expanded` reflecting state, and `aria-controls` pointing at the panel's `id`.
- <kbd>Esc</kbd> closes the panel and returns focus to the toggle.
- Focus moves into the panel when it opens and doesn't escape behind it while it's open.
- The panel is hidden from assistive tech when closed (`hidden`, or `display: none`, not just moved offscreen).
- Animations respect `prefers-reduced-motion`.
- **A fixed or absolutely positioned panel must offset the WordPress admin bar.** Logged in, the bar occupies the top 32px (46px on phones), so a panel pinned to the header's height slides underneath it. Use `calc(<header height> + var(--wp-admin--admin-bar--height, 0px))`, which resolves to the header height for logged-out visitors. This one only shows up while you're logged in, which is exactly how you'll be viewing the site.

**When the file has no mobile artboard** (a common tier-3 gap), don't block the phase and don't invent a look. Derive the mobile menu from what the file does give you: the desktop nav's type and colors, the file's breakpoints, and a full-screen or slide-in panel matching the brand's density. Mark it `derived`, list it under **Built without Figma**, add "no mobile header or menu design" to **Questions for design**, and tell the user in the handoff that the mobile menu is a derivation waiting on a comp.

A sticky or scrolled header state is the same call: build it only if a board shows it. Don't add `position: sticky` because headers are usually sticky.

## Footer Blade

**Build from `_docs/patterns/footer.md`.** Read the footer node and build the comp's real structure (columns, a menu, social icons, a form, a legal row) on the pattern's rules, rather than starting from Sage's empty `.content-info`.

- **No widget area unless the comp shows one.** If the theme has `register_sidebar` calls and `dynamic_sidebar` output that no comp supports, say so and propose removing them rather than styling an empty region.
- A footer menu is a second nav location, registered in `app/site.php` (never Sage's stock `app/setup.php`) alongside the primary one. Register generic `footer_column_*` locations: as many as the comp has columns, with generic names, guard each with `has_nav_menu`, and add assigning them to the manual steps.
- Social links are a list of `<a>` elements with the exported icons and an accessible name each (`aria-label="Facebook"` or visually hidden text): an icon with no name is a bare link to a screen reader. The list of possible networks is code (a fixed set plus `other`, for a network outside it), not config: which networks show and their URLs are Site Settings values, added for the site by following `_docs/site-settings-pattern.md`.
- Render the copyright year with `wp_date('Y')` (never `date()`, it ignores the site's timezone) and never a literal.
- Contact details, the legal/business name, and any newsletter or CTA copy in the comp are content, not design: read them through `SiteSettings` (`_docs/site-settings-pattern.md` says which footer fields exist), never hardcode them in the Blade or the composer.

## Layout CSS

Two files, in the site's `components/` folder:

```
resources/css/components/
  header.css
  footer.css
```

- Root class per file (`.header`, `.footer`), everything nested under it, BEM for parts.
- Tokens only. Colors, type, spacing, and radii all come from `variables.css`.
- Breakpoints come from the file's artboard widths, per `derivation-rules.md`: the same ones phase 1 used. Don't introduce a new breakpoint for the header alone.
- The mobile-menu panel's styles live in `header.css` with the rest of the header, not in a separate file.
- No `!important`, and no styles that reach outside the shell (`body`, `main`, `#app` belong to `base.css` and `layout.css`).

Three cascade traps that the foundation sets for the shell, all of which render wrong while compiling clean:

- **`base.css`'s link color beats a mask's `currentColor`.** A logo or icon drawn with `mask-image` takes its color from `color`, and a global `a { color: var(--color-link) }` sets that on every link the mask sits inside, so a footer wordmark on a dark ground comes out dark-on-dark and invisible. Set `color: inherit` on the masked element, or give it an explicit token color.
- **`forms.css` beats a component's sizing.** A global `input { min-height: 48px; padding: 12px }` wins over a footer field's `height: 2rem`. Override `min-height` and `padding-block` in the shell's own rule rather than shrinking the global.
- **A plugin's own grid overflows a narrow column.** Gravity Forms lays its fields out in a 12-column grid whose items default to `min-width: auto`, so a form in a 438px column widens its track and pushes the page into horizontal scroll on phones. Set `min-width: 0` on the flex or grid children that hold the form, and switch the plugin's field grid to `display: block` when the comp shows a single field.

## Wiring

Append the imports to `app.css` below the component imports:

```css
@import './components/header.css';
@import './components/footer.css';
```

Don't add them to `editor.css`: the header and footer never render inside the block editor. Show the `app.css` diff and wait, same as every other phase.

## Manual steps the dev has to do

The shell can't finish itself. List these explicitly in the handoff, because the header looks broken until they're done:

1. Create the menus in **Appearance > Menus** and assign them to Primary Navigation (and the footer location, if one was added).
2. Add the menu items the comp shows, in the comp's order.
3. Upload or confirm the site logo if the theme reads it from the customizer rather than a bundled file.

Say plainly that an unassigned menu means the nav renders nothing: otherwise an empty header reads as a bug in the CSS.

## Verify

Build first: ask the dev to run `npm run build` and confirm it exits clean. **That is not verification.**

The header and footer render on every page, so verify on a real front-end page, not on the styleguide (see **Verify by rendering** in `SKILL.md`):

1. Load the site's home page with the menu assigned. Compare the header and footer against the node screenshots (`get_screenshot`) side by side.
2. Check every breakpoint the design defines (at minimum the desktop comp width and a phone width). The mobile menu opens, closes, and traps focus.
3. Keyboard only: tab from the top of the page. The skip link comes first, the logo is reachable, every nav item is reachable, the current item is visible, dropdowns open on focus, <kbd>Esc</kbd> closes the mobile panel and returns focus.
4. Check the console for JavaScript errors on a page with and without the menu present.
5. Add the social icon set to the styleguide page as a specimen: it's the one shell piece with no other home.
6. Write the tests the header and footer pattern pages list under **Tests to write** (cascade and render-harness tests for `header.css`/`footer.css` and the Blade views, plus the script tests for the behaviors the header uses; `SKILL.md` › **Automated gates**) and run `node --test`. The dropdown's Escape handler and the mobile toggle's accessible name are exactly the kind of behavior a cascade or render-harness test catches on the next unrelated CSS change, where a one-time manual pass won't.

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
| Copying the example header or footer into the theme and editing it | Build from the comp with the pattern page as the checklist |
| Picking one of several header boards without asking | List them all with links, recommend one, wait |
| Hand-writing SVG because the export looked wrong | Re-export or ask design; never redraw |
| Hardcoding menu markup in Blade | Style `wp_nav_menu` output; use a walker only when the markup is impossible otherwise |
| A `<div>` with a click handler as the mobile toggle | A `<button>` with `aria-expanded` and `aria-controls` |
| Building a mobile menu that matches no comp and saying nothing | Derive it, mark it `derived`, add the question for design |
| Adding `position: sticky` because headers are usually sticky | Only if a board shows the scrolled state |
| Styling a widget area no comp supports | Propose removing it |
| Importing `components/header.css`/`footer.css` into `editor.css` | The shell doesn't render in the editor |
| Reporting the phase done with no menu assigned | Unverified until the nav renders |
| Cleaning an SVG export by stripping attributes wholesale | Keep `fill`; a fill-less filled icon renders as nothing and the build says fine |
| Verifying only while logged in | The admin bar shifts fixed panels; check a logged-out view too |

## Handoff

Summarize in one table: what was built (header, footer, mobile menu, assets) → file → source node. List the `app.css`, `app/setup.php`, and `app/filters.php` edits. List the manual steps above. Note anything marked `derived` or `pending` and the questions added to the map.

Update `_docs/figma-map.md`: the shell rows, the asset inventory, the canonical header choice, and the **Current status / Next step** section.

Propose the CHANGELOG entry and the version bump; the user commits with `commit-rules`. Then propose phase 4 (blocks).

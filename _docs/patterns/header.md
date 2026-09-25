# Header

## When it applies

Every site. `project-init` (Phase 1c) installs the kit's responsive header:
`resources/views/sections/header.blade.php`, `resources/css/components/header.css`
and `resources/js/modules/navigation.js`, on the style guide's tokens. A site
**adapts that header to its comp**; it never writes a second one.

## Blade skeleton (installed)

```blade
<header class="site-header">
  <div class="site-header__inner">
    <a class="site-header__brand" href="{{ home_url('/') }}">…</a>
    <button class="site-header__toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle>
      <span class="sr-only">{{ __('Menu', '__TEXT_DOMAIN__') }}</span>
      <span class="site-header__toggle-bar" aria-hidden="true"></span>
    </button>
    <nav id="site-nav" class="site-nav" aria-label="{{ __('Primary', '__TEXT_DOMAIN__') }}" data-nav>
      {{-- primary_navigation, or the page list while no menu is assigned --}}
    </nav>
  </div>
</header>
```

## Built from

- Sage's `primary_navigation` location (assigned by `project-init`'s menu step
  or `scripts/wp/menus.sh`).
- `navigation.js` (`initNavigation()` in `app.js`).
- Style guide tokens only: `container` gutter, `--color-*`, `btn` roles for a
  header CTA.

## Do not change

- The toggle's contract: a real `<button>`, `aria-expanded` kept in sync,
  `aria-controls` pointing at the nav, Escape closes and returns focus to the
  toggle, a link click inside the open panel closes it, and growing past the
  breakpoint clears the open state.
- The `<nav>` has an accessible name; the brand link goes home.
- No styles reach outside the header (`body`, `main` belong to `base.css` and
  `layout.css`).

## Adapt per design

Logo (exported from the comp), menu structure (a dropdown or mega-menu is
added to the installed markup, keeping the contract above), a header CTA
(`btn btn-primary` or `btn-secondary`, its label and link from Site Settings
through a `SiteSettings` subclass — never hard-coded), a sticky or scrolled
state only when a board shows one, and the breakpoint from the comp.

## Tests to write

- A Blade render: the toggle has `aria-expanded="false"` and
  `aria-controls="site-nav"`, and the nav has an `aria-label`.
- The CTA's URL is escaped and a new-tab CTA includes `partials.new-tab-hint`.
- Anything added (a dropdown, a scroll state) gets its own behavior test.

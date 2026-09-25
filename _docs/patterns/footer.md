# Footer

## When it applies

Every site has one. The footer is design, not design system: phase 3 of
`figma-design-system` builds it per site from the comp. Read the comp for its
real structure (columns, a menu, socials, a form, a legal row) and keep the
rules below.

## Blade skeleton

```blade
<footer class="footer" role="contentinfo">
  <div class="footer__inner container">
    <div class="footer__top">
      @if ($menus)
        <div class="footer__columns">
          @foreach ($menus as $location)
            <nav class="footer__column" aria-label="{{ html_entity_decode(wp_get_nav_menu_name($location), ENT_QUOTES) }}">
              <p class="footer__heading">{{ html_entity_decode(wp_get_nav_menu_name($location), ENT_QUOTES) }}</p>
              {!! wp_nav_menu(['theme_location' => $location, 'container' => false, 'menu_class' => 'footer__links', 'depth' => 1, 'echo' => false]) !!}
            </nav>
          @endforeach
        </div>
      @endif
    </div>

    <a class="footer__logo" href="{!! esc_url(home_url('/')) !!}" aria-label="{{ $siteName }}"></a>

    <div class="footer__bottom">
      <p class="footer__copyright">&copy; {{ $legalName }} {{ wp_date('Y') }}</p>
      @if ($social)
        <ul class="footer__social">
          @foreach ($social as $link)
            <li><a class="social-icon social-icon-{{ $link['icon'] }}" href="{!! esc_url($link['url']) !!}" aria-label="{{ $link['name'] }}" target="_blank">@include('partials.new-tab-hint', ['new' => true])</a></li>
          @endforeach
        </ul>
      @endif
    </div>
  </div>
</footer>
```

- **Menu columns.** The columns are the `footer_column_*` locations in `Footer::LOCATIONS`. The composer lists only the locations that have a menu assigned, in that order, so an unassigned menu leaves no empty column. A column's heading is its menu's name. If the comp needs a location the constant lacks, add it there, not ad hoc.
- **Socials.** A list of `<a>` elements with the exported icons and an accessible name each. The networks a site can show are the kit's fixed set (plus `other`). Which ones show, and their URLs, are Site Settings values.
- **Legal line.** The legal name comes from Site Settings, and the year from `wp_date('Y')`, which follows the site's timezone. Never a literal year, and never `date()`.
- **No widget area** unless the comp shows one. If the theme registers a sidebar that no comp supports, propose removing it.
- **Newsletter or contact form.** A footer form is a form embed placed by the site. It plays no part in the composer, and a site adds it as a recipe, not as shipped code.

## Canvas skeleton

None. The footer never renders in the block editor, so it has no canvas and its
stylesheet stays out of `editor.css`.

## Built from

- `SiteSettings`, the accessor the footer's fields are read through
- `new-tab-hint`, the partial a new-tab link includes

The composer and the socials helper are the example's, not the framework's. A
site writes its own from the comp. See **Example**.

## Rules that matter most

- ESC-1, ESC-2: URLs print as `{!! esc_url($url) !!}` and text with `{{ }}`. An `&` in a menu name or the legal name is encoded once, not twice.
- I18N-1: every visible string goes through `__()` with the text domain.
- A11Y-5: an icon-only link has an accessible name, and a decorative mark is `aria-hidden`.
- A11Y-6, CTA-6: a social link that opens a new tab says so, and `target="_blank"` appears only on a link that should open one.
- CTA-4: a button in the footer follows the ground it sits on, through the `btn-on-dark` role or its light twin.
- VIEW-6: colors come from tokens, never hex values.

## Adapt per design

- The number of columns and which locations they use.
- The logo asset, the socials that show, and the icon set.
- The legal row's layout, and any extra rows (an address, a badge).
- The ground the footer sits on, from the site's grounds.

## Do not change

- `has_nav_menu` guarding on every column, and `depth => 1` unless the comp shows nested links.
- The legal name and contact details read through `SiteSettings`, never hard-coded in the view or the composer.
- `wp_date('Y')` for the year.
- An accessible name on every social link.
- Assets exported from Figma with fixed names (`logo.svg`, `logo-stacked.svg`, `facebook.svg`), never redrawn or renamed after the client.

## Tests to write

- Render-harness test of the view: no menus means no columns block but the footer still renders, one column per assigned location headed by its menu name, and the copyright line carries the legal name and the year.
- Social links render an accessible name and an escaped URL, and a query string isn't double-encoded.
- Composer test: `menus` lists only assigned locations in constant order, and with no SCF the legal name falls back and the socials are empty.
- Cascade tests: a masked logo or icon takes its color from the ground, not from `base.css`'s link color, and a form field in a narrow column doesn't overflow.
- Contrast pair in `contrast-pairs.json` for footer text and links on the footer's ground.

## Example

None in the kit: the footer is built from the comp with this page as the
checklist. Its Site Settings fields follow `_docs/site-settings-pattern.md`
(the worked `HeaderFooterSettings` example has the footer getters).

---
name: blade-standards
description: >
  Apply the team's Blade/PHP standards for a Sage 11 + Acorn theme
  whenever creating or editing a .blade.php view, or any PHP code that
  prepares data for one (e.g. a block's block.php). Use this skill
  before writing new Blade/PHP view code and when reviewing existing
  Blade files for standard compliance — view-only boundary, attachment
  image sizing, query patterns, input sanitization, output escaping,
  and vendor script/style registration vs. enqueue.
---

# blade-standards — Sage 11 Blade/PHP conventions

**Blade is view-only.** No business logic, queries, or data fetching.
Only render-control logic (conditionals, loops over already-prepared
data).

- `wp_get_attachment_image($id, 'large')` — always include the size
  argument (enables native `srcset`); never omit it.
- Avoid nested `WP_Query` inside loops.

---

## Sanitize input, escape output

```php
// Input (saving data)
sanitize_text_field($_POST['name']);
sanitize_email($_POST['email']);
wp_kses_post($_POST['content']);  // safe HTML
absint($_POST['count']);

// Output (rendering data)
esc_html($value);        // plain text
esc_attr($value);        // HTML attributes
esc_url($url);           // URLs
wp_kses_post($content);  // trusted HTML
```

---

## Scripts & Styles

Third-party scripts/styles: **register globally** in `app/setup.php` (on
`init`), then **enqueue per-block** inside that block's `block.php`
render. Never enqueue vendor libs globally.

```php
add_action('init', function () {
    wp_register_script('swiper', 'https://cdn.example.com/swiper.min.js', [], '11.0', true);
});

// Inside the block render callback
wp_enqueue_script('swiper');
```

This is the rule `create-block`'s Phase 0 "global-enqueue smell" check
(#0.14) warns about — a `wp_enqueue_script(`/`wp_enqueue_style(` call
found outside `resources/blocks/*/block.php` (excluding the theme's own
`app`/`editor` handles) is the smell this section forbids.

---

## Padding and image position

Every block resolves its padding attributes via `@paddingClasses(...)`
(a Blade directive backed by `App\Blocks\BlockPadding::resolve()`) and
any `imagePosition` attribute via `App\Blocks\BlockImagePosition::objectClass()`
(or `::cssValue()` for an inline style) — never hardcode a padding/position
class or leave the attribute unapplied in the Blade view.

```blade
<section class="hero @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop)">
    <img
        src="{{ $imageUrl }}"
        class="absolute inset-0 h-full w-full object-cover {{ \App\Blocks\BlockImagePosition::objectClass($imagePosition) }}"
    >
</section>
```

See `create-block`'s Phase 0 checks #0.15/#0.16 for how these classes and
the directive get bootstrapped into a theme.

---

## When NOT to use

- Editing PHP that has nothing to do with rendering a view (e.g. a CLI
  script, a WP-CLI command class).
- Editing block.json / block.jsx (JS side) — those aren't Blade/PHP.

(Global rules — English language, no assumptions, push back on flawed
asks — live in `CLAUDE.md` and apply automatically.)

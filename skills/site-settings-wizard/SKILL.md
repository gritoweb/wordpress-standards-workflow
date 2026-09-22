---
name: site-settings-wizard
description: >
  Interactively scaffold Site Settings for a Sage 11 theme using only WordPress core APIs (Customizer and Settings API).
  Zero ACF or third-party dependencies. Use this when a theme needs global settings like Branding, Header, Footer, or Motion.
---

# site-settings-wizard — interactive Site Settings scaffolding

Turns a dev's requirement for global site settings into a clean, ACF-free implementation using WordPress core APIs. It asks which sections and fields are needed, helps decide between the Customizer (for live-previewable fields) and the Settings API (for back-office configuration), and generates the necessary PHP classes, service providers, and helper functions.

Never runs `npm` / `composer` / `git` — the dev does that themselves.

---

## Pre-conditions

- Working directory = active Sage 11 theme root. If unsure, **ask** — don't guess.
- Must be a 100% WordPress core implementation. **Zero references to ACF, SCF, `get_field`, `acf-json`, or any external plugin.**

---

## Execution Flow

1. **Step 1** — Sections & Fields Gathering
2. **Step 2** — API Decision (Customizer vs Settings API)
3. **Step 3** — Generation of PHP Classes (`app/Customizer/*.php` and ServiceProvider)
4. **Step 4** — Generation of Options Page (Settings API)
5. **Step 5** — Helpers & CSS Variables (`wp_head` emission)
6. **Handoff** — Summary of what was created

---

## Step 1 — Sections & Fields Gathering

1. Ask the dev what settings sections they need. Suggest common examples (e.g., Branding, Header, Footer, Motion) but do not hardcode them.
2. For each section, ask what specific fields are required (e.g., Logo, CTA Label, Primary Color).

---

## Step 2 — API Decision (Customizer vs Settings API)

1. For each gathered field, ask the dev whether it requires live-preview functionality or if it's better suited as a backend option.
2. **Rule of thumb**:
   - Visual/Layout changes (Colors, Typography, Layout choices) → **Customizer**
   - API Keys, Integration toggles, Hidden settings → **Settings API**

---

## Step 3 — Customizer PHP Classes

1. Generate a PHP class for each Customizer section in `app/Customizer/<Name>.php`.
2. Each class must have a `boot()` method that hooks into `customize_register` and uses native `add_section`, `add_setting`, and `add_control`.

```php
<?php

namespace App\Customizer;

class Header
{
    public static function boot(): void
    {
        add_action('customize_register', function ($wp_customize) {
            $wp_customize->add_section('header_section', [
                'title' => __('Header', 'sage'),
                'priority' => 30,
            ]);

            $wp_customize->add_setting('header_cta_label', [
                'default' => 'Subscribe',
                'transport' => 'refresh',
            ]);

            $wp_customize->add_control('header_cta_label', [
                'label' => __('CTA Label', 'sage'),
                'section' => 'header_section',
                'type' => 'text',
            ]);
        });
    }
}
```

3. Generate `app/Providers/CustomizerServiceProvider.php` that calls `::boot()` on each of these section classes:

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Customizer\Header;
// ...

class CustomizerServiceProvider extends ServiceProvider
{
    public function boot()
    {
        Header::boot();
        // ...
    }
}
```
Ask the dev to ensure this ServiceProvider is registered in `config/app.php` (providers array).

---

## Step 4 — Settings API (Non-Customizer Fields)

1. If any fields were designated for the Settings API, generate a class (e.g., `app/Admin/SiteSettings.php`) that uses `add_options_page` and `register_setting`.
2. Wire this class in a ServiceProvider or directly in `setup.php`/`admin.php`.

---

## Step 5 — Helpers & CSS Variables Emission

1. Explain how to consume these values. Always require a fallback when reading:
   - `get_theme_mod('header_cta_label', 'Subscribe')`
   - `get_option('my_api_key', '')`
2. If any fields are CSS-related (like Motion settings or Colors), generate an action hooked to `wp_head` that emits CSS custom properties inline.

```php
add_action('wp_head', function () {
    $reduced_motion = get_theme_mod('motion_reduced', false);
    ?>
    <style>
        :root {
            --motion-duration: <?= $reduced_motion ? '0s' : '0.3s' ?>;
        }
    </style>
    <?php
});
```

3. **Block-Override Pattern**: Document for the dev that when building blocks, if an attribute is `null`, it means "use Site Settings default".
   - Example: `$cta_label = $attributes['ctaLabel'] ?? get_theme_mod('header_cta_label', 'Subscribe');`

---

## Handoff

End with a summary table of the generated files and the next steps (e.g., registering the ServiceProvider, using the fallback pattern in blocks).

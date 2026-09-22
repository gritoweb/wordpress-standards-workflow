# Site Settings Pattern

A lightweight, ACF-free approach to managing global site settings in a Sage 11 theme using WordPress Core APIs.

## 1. The Decision Tree: Customizer vs Settings API

When adding a global setting, choose the right API:

- **Use the Customizer (`get_theme_mod`) if:**
  - The setting affects the visual appearance of the site (Colors, Layout, Typography, Motion).
  - The client benefits from seeing a live preview of the change before publishing.
  - It relates to the frontend experience.
- **Use the Settings API (`get_option`) if:**
  - The setting is functional or backend-only (API keys, tracking IDs, integration toggles).
  - It does not affect visual layout directly.
  - Live preview adds no value.

## 2. Wiring Customizer Classes & ServiceProvider

Instead of a massive `setup.php` file, encapsulate Customizer logic into domain-specific classes.

**`app/Customizer/Header.php`**
```php
<?php

namespace App\Customizer;

class Header
{
    public static function boot(): void
    {
        add_action('customize_register', function ($wp_customize) {
            $wp_customize->add_section('header_section', [
                'title' => __('Header Settings', 'sage'),
                'priority' => 30,
            ]);

            $wp_customize->add_setting('header_cta_label', [
                'default' => 'Subscribe',
                'transport' => 'refresh', // or 'postMessage' for JS-driven live updates
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

**`app/Providers/CustomizerServiceProvider.php`**
```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Customizer\Header;
use App\Customizer\Footer;
use App\Customizer\Motion;

class CustomizerServiceProvider extends ServiceProvider
{
    public function boot()
    {
        Header::boot();
        Footer::boot();
        Motion::boot();
    }
}
```
*Don't forget to register `App\Providers\CustomizerServiceProvider::class` in `config/app.php`.*

## 3. Emitting CSS Custom Properties

For visual settings (like colors or motion preferences), emit them as CSS variables in the `<head>` so your stylesheet can consume them seamlessly.

**`app/setup.php` or a dedicated provider:**
```php
add_action('wp_head', function () {
    $primary_color = get_theme_mod('primary_color', '#000000');
    $reduce_motion = get_theme_mod('reduce_motion', false);
    
    $transition_duration = $reduce_motion ? '0s' : '0.3s';
    ?>
    <style id="site-settings-vars">
        :root {
            --color-primary: <?= esc_attr($primary_color) ?>;
            --motion-duration-default: <?= esc_attr($transition_duration) ?>;
        }
    </style>
    <?php
});
```

## 4. The Block-Override Pattern

Global settings should act as the default fallback for block-level attributes. 
When defining block attributes, treat `null` or an empty string as a signal to use the global Site Setting.

**Example in a block's controller/view:**
```php
// If the block attribute 'ctaLabel' is not set, fallback to the Site Setting, 
// and always provide a final hardcoded fallback.
$cta_label = $attributes['ctaLabel'] ?? get_theme_mod('header_cta_label', 'Subscribe');
```

This ensures the user can override the global setting on a specific block instance if needed, but defaults to the single source of truth otherwise.

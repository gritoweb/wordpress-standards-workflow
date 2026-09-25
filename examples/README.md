# Examples

Tested reference builds of the parts of a site that are **design**: eleven
blocks, the 404, the post card, a sample content type, and the Site Settings
(SCF) groups a site adds. An agent or a developer reads a finished,
conforming version of a pattern here before building the site's own.

This folder is **kit-only**: `project-init` never copies it and a project never
imports from it. `theme/` is the framework every project gets; everything here
is built per site from its own comp. The header is the one `project-init`
installs, so there is no header or footer example.

Every example is built on this kit's decisions (`docs/merge-decisions.md`):
content edited on the canvas, never in the sidebar (conformance INSP-7);
background media in the sidebar's **Background Media** panel; carousels on
Swiper; padding from `PaddingControls`' presets; our token contract.

## Layout

The folder mirrors a theme's `resources/` and `app/` folders.

| Path | What it holds |
| --- | --- |
| `blocks/<slug>/` | One block: `block.json`, `block.php`, `block.jsx`, `block.test.mjs`, `preview.svg`, and any `block.css`/`block.js` |
| `blocks/components` | A symlink to `theme/resources/blocks/components`, so `../components/...` imports resolve as in a project |
| `views/blocks/<slug>.blade.php` | A block's view; `views/blocks/partials/` holds a partial two blocks share |
| `views/partials/` | The post card partial |
| `views/404.blade.php` | The 404 template |
| `css/components/` | `post-card.css`, with its test |
| `js/modules/` | `form-busy.js` (Gravity Forms submit state), with its test |
| `app/Settings/HeaderFooterSettings.php` | The worked SCF example: typed getters over a Site Settings group, extending `SiteSettings` |
| `app/Settings/MapsSettings.php` | The Google Maps key and map style, extending `SiteSettings` |
| `app/maps.php` | The Google Maps script registration the location block enqueues |
| `app/Content/Person.php`, `app/content-types.php` | The sample content type and its bootstrap |
| `acf-json/` | The SCF groups: `header_footer`, `maps`, `person` |
| `test-support.mjs` | What the tests here share: `exampleEnv()` and `exampleResources()` |

## How the tests run

`npm test` at the kit root runs every `examples/**/*.test.mjs` file, and
`tests/examples-conformance.test.mjs` runs block conformance over every folder
in `examples/blocks/` (errors fail; warnings print as diagnostics).
`test-support.mjs` assembles the `resources/` root the PHP render reads, in a
temp folder, and adds `examples/app` to the autoloader.

## The blocks

| Block | Pattern (`_docs/patterns/`) |
| --- | --- |
| `section-intro` | Section intro |
| `cta-split` | CTA band |
| `cta-banner` | Background-photo band (photo in the sidebar's Background Media) |
| `text-media` | Media and text split |
| `hero` | Carousel (Swiper) |
| `statement-hero` | Opening statement |
| `post-grid` | Collection grid |
| `logo-wall` | Logo row |
| `location` | Location with map |
| `contact-form` | Form embed |
| `faq` | Disclosure list |

A block is never copied into a project. Build the site's own with
`create-block`, which reads the closest pattern and composes the shared
components. Read the files here at `<kitPath>/examples/...` (`kitPath` in
`kit.config.json`).

## Wire an example's setup into a site

### The hero's carousel

Swiper is a vendor library (`CLAUDE.md` › Block assets): commit
`resources/js/vendor/swiper-bundle.min.js` and
`resources/css/vendor/swiper-bundle.min.css`, register both as `swiper` in
`app/setup.php` (see `_docs/examples.md` › `app/setup.php`), and let the block's
`block.php` enqueue them only when it has more than one slide.

### The 404

Write `resources/views/404.blade.php` from the 404 pattern.

### The post card and a content type

1. Write the card partial and its CSS from the collection-grid pattern, and
   import the CSS in `app.css` and `editor.css`.
2. Add a content type through `_docs/content-types.md`, and add
   `'content-types'` to `functions.php`'s `collect([...])` list.

### Site Settings fields (SCF)

Add an SCF group on the Site Settings page and a class extending
`SiteSettings` that reads it — `site-settings-wizard` does it; the pattern is
`_docs/site-settings-pattern.md`, and `HeaderFooterSettings` is the worked case.

### The location block's map

1. Add an SCF group for the key and the map style, and a `MapsSettings`-shaped
   class that extends `SiteSettings`.
2. Register the Google Maps script the way `app/maps.php` does, and add
   `'maps'` to `functions.php`'s `collect([...])` list. The block's `block.php`
   enqueues the handle only when it has a key and coordinates.
3. Sync the SCF field groups in wp-admin.

### Copying a file

`js/modules/form-busy.js` holds behavior and no design, so a site that uses
Gravity Forms may copy it and add `initFormBusy()` and `initValidationFocus()`
to `app.js`. After any copy, run `node scripts/kit-setup.mjs` and its
`--check`, so no placeholder ships.

## Changing an example

Change the example and its tests together, then run `npm test`. A change that
should apply to every project belongs in `theme/` and the conventions, not
here. Log a workaround found while wiring one in the project's
`_docs/kit-log.md`.

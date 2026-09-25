# create-block — Phase 0 infrastructure files, entrance animation wiring, the editor fidelity report, and the Sage wiring (ThemeServiceProvider, functions.php, editor.js, app.css, package.json, vendor libs)

Part of the `create-block` skill (`../SKILL.md`); read it only when the task needs it.

### Infra bootstrap templates (Phase 0)

#### `app/Blocks/BlockManager.php`

Copy from `<skill>/templates/BlockManager.php`. The template is the source of truth — no inline duplicate.

#### `app/Blocks/BlockCategories.php`

Copy from `<skill>/templates/BlockCategories.php`. Edit `TITLE` and `SLUG` if the dev picked a non-default category name (see check 0.11).

#### `app/blocks.php`

Copy from `<skill>/templates/blocks.php`.

#### `app/Blocks/BlockPadding.php` and `app/Blocks/BlockImagePosition.php`

Copy from `<skill>/templates/BlockPadding.php` and
`<skill>/templates/BlockImagePosition.php`. Both resolve an attribute
value (padding numbers/booleans, or an `imagePosition` string) to a
literal Tailwind class string, so Tailwind's build-time scanner picks the
classes up — never interpolate a class dynamically.

#### `app/Blocks/BlockEntrance.php`, `app/Blocks/BlockMotion.php`, `entrance.css`, `entrance.js`

Copy from `<skill>/templates/` (destinations in the templates directory tree).
Then wire them — each piece is required, the system fails **silently** when
one is missing (no console error, just no animation):

```css
/* resources/css/app.css AND resources/css/editor.css */
@import './components/entrance.css';

/* resources/css/app.css only */
@import './components/hover.css';
```

```js
// resources/js/app.js
import { initEntrance } from './modules/entrance';

// app.js loads as type="module" (deferred), so the DOM is already parsed.
initEntrance();
```

`BlockMotion::register()` is called from `app/blocks.php` (template already
does it). It adds **Appearance › Customize › Motion** — the same options and
defaults as the White Summers reference — plus the `html.ws-entrance` head
script and the same values inside the editor canvas:

| Option | Default | Prints |
|---|---|---|
| Animation duration | 1000 ms | `--e-duration` |
| Start delay | 250 ms | `--e-delay` |
| Delay between items | 250 ms | `--e-stagger` |
| Travel distance + unit | 32 px (`px` / `vw`) | `--e-distance` |
| Easing | Ease out = `cubic-bezier(0.22, 0.61, 0.36, 1)` (`ease-out` / `ease-in-out` / `ease`) | `--e-ease` |
| Button hover effect | Fade (`lift` / `fade` / `none`) | `body.ws-hover-btn-*` |
| Link hover effect | Underline (`underline` / `fade` / `none`) | `body.ws-hover-link-*` |
| Hover speed | 250 ms | `--hover-duration` |

Never hard-code these values in a block — a block field left empty inherits
them, so changing the Customizer changes the whole site.

#### Entrance animation wiring (every block)

The contract is shared by `BlockEntrance.php`, `entranceCanvas.js`,
`entrance.css` and `entrance.js` — never invent other attribute names:

| Where | Root (the `<section>`) | Each part |
|---|---|---|
| Blade | `@entrance($entrance)` | `@entrancePart(<index>)` |
| block.jsx canvas | `{...entranceRootProps(entrance)}` (merge its `style` with `blockProps.style`) | `{...entrancePartProps(entrance, <index>)}` |
| Sidebar | `<EntranceControl attributes setAttributes clientId={clientId} />` | — |

- Only **parts** move; the section never gets a transform. A block with no
  `@entrancePart` animates nothing.
- Indexes run 0, 1, 2… in reading order (heading, subtitle, body, CTA row,
  then each repeater item); the stagger multiplies them.
- `{...entrancePartProps(...)}` goes **inside the opening tag**, as an
  attribute. Placed after the `>` it becomes a spread *child*; React then
  tries to iterate the object and the whole block dies with
  `TypeError: … is not iterable` / "This block has encountered an error".
- **Every block declares its preset** in `block.json` → `attributes.entrance`
  (`"type": "object"`, `"default": {…}`), picked from this table by what the
  block *is* — copy the row, don't invent numbers. `null` = inherit
  Customizer › Motion. These are the White Summers presets:

  | Block kind | `default` |
  |---|---|
  | Home / page hero (big heading over media) | `{"type":"fade","direction":"up","distance":24,"unit":"px","duration":700,"delay":null,"stagger":150}` |
  | Text sections — intro, text+media split, statement, CTA/banner, news, contact | `{"type":"fade-slide","direction":"up","distance":null,"unit":"px","duration":null,"delay":null,"stagger":100}` |
  | Grid of cards / team / features / testimonials (a repeater) | `{"type":"fade-slide","direction":"up","distance":null,"unit":"px","duration":null,"delay":null,"stagger":100,"trigger":"item"}` |
  | Horizontal highlights row | `{"type":"fade-slide","direction":"right","distance":48,"unit":"px","duration":600,"delay":null,"stagger":150,"trigger":"item"}` |
  | Logo wall (many small items) | `{"type":"fade","direction":"up","distance":null,"unit":"px","duration":500,"delay":null,"stagger":60}` |

  With `"trigger":"item"` each part animates as **it** scrolls in. Unsure →
  the "Text sections" row.
- **What is a part** (gets `@entrancePart` / `entrancePartProps`): the
  eyebrow, the heading, the body copy, **each** button/CTA row, each image or
  `<figure>`, and **each** repeater item. Never the section, a background, a
  decorative blob, or a wrapper that contains other parts.
- **Buttons:** every CTA `<a>` gets the `btn` class next to its Tailwind
  classes, and **no** `transition-*`, `duration-*`, `hover:scale-*` or
  `hover:-translate-*` utilities — the hover motion comes from `hover.css`
  (Customize › Motion › Button hover effect). Colour changes on hover
  (`hover:bg-*`) stay on the button.
- Only the values in `entranceCanvas.js` exist: types `none | fade | slide |
  fade-slide`, directions `up | down | left | right`, units `px | vw`,
  triggers `section | item`. Anything else (`load`, `scroll`, `zoom`…) is
  silently replaced by the default.
- **Don't save entrance values while building a page** (WP-CLI post content,
  or clicking fields in the panel): the block.json preset is the default and
  a saved object freezes that block against future preset changes.
- **Verify** before calling the block done, after `npm run build`: run
  `node scripts/check-css-foundation.mjs` (exit 0 — the block uses only the
  style guide's tokens and `heading-*` classes, never `slate-*`/`text-3xl`)
  and `scripts/editor-fidelity.mjs` for the block (see "Editor fidelity
  report") and fix what they list; open the page in the editor — no block shows "This
  block has encountered an error" (console clean); clicking the sidebar **Preview** hides and replays the
  parts; on the front end the section has `data-entrance` and gains
  `data-entered` on scroll.

#### Editor fidelity report (`scripts/editor-fidelity.mjs`)

The Blade view and `block.jsx` are written separately; nothing keeps them in
sync by itself. This tool **measures** the drift — it never edits a file, so
it can't break the editor. The dev (or the AI, when asked) fixes what it
lists.

```bash
WP_URL=https://<site>.lndo.site WP_USER=<local admin> WP_PASS=<password> \
  node scripts/editor-fidelity.mjs [slug ...] [--json]
```

It opens headless Chrome, inserts the theme's blocks (default attributes) into
a temporary draft, reads every visible text on the canvas, opens the draft's
preview **at the canvas's width** (same Tailwind breakpoints) and compares the
same texts' font size, weight, family, line height, colour, alignment,
transform and letter spacing, plus each block root's background and top
padding. The draft is deleted at the end. Output, per block:

```
✗ vision-accordion
   "How the kit is built": color rgba(31, 35, 40, 255) → rgba(26, 115, 232, 255)   (editor → page)
      page class:   heading-2 text-primary
      editor class: … heading-2 text-ink
   "Frequently asked": shown on the page, missing in the editor
      page class:   font-eyebrow text-primary
```

- **Run it** after creating or changing a block, before calling it done, and
  whenever the dev asks. Exit code 0 = every block matches.
- **Fix only what it lists**, reading the two class lists it prints — no need
  to re-read the whole block. `· only in the editor` lines are editor
  controls ("+ Add link") and are fine.
- Needs Node 22+ and Chrome on the dev machine, and a local admin login (never
  a production URL). No npm packages.

#### `app/Providers/ThemeServiceProvider.php` — register the Blade directives

Add to the existing `boot()` method (this file is scaffolded by Sage
itself — don't create it, edit it):

```diff
 public function boot()
 {
     parent::boot();
+
+    Blade::directive('paddingClasses', function (string $expression) {
+        return "<?php echo \App\Blocks\BlockPadding::resolve($expression); ?>";
+    });
+
+    // <section @entrance($entrance)> — prints its own style attribute.
+    Blade::directive('entrance', function (string $expression) {
+        return "<?php echo \App\Blocks\BlockEntrance::root($expression); ?>";
+    });
+
+    // <h2 @entrancePart(0)>, <article @entrancePart($loop->index + 1)>.
+    Blade::directive('entrancePart', function (string $expression) {
+        return "<?php echo \App\Blocks\BlockEntrance::part($expression); ?>";
+    });
 }
```

Requires `use Illuminate\Support\Facades\Blade;` at the top of the file
(add it if missing). If `boot()` doesn't exist or the file doesn't match
Sage's stock provider shape, **bail out** — ask the dev to wire it
manually.

#### `functions.php` — add `'blocks'` to the collect array

```diff
-collect(['setup', 'filters'])
+collect(['setup', 'filters', 'blocks'])
     ->each(function ($file) {
         if (! locate_template($file = "app/{$file}.php", true, true)) {
             // ...
         }
     });
```

If `functions.php` doesn't use the `collect([...])` pattern (heavily customized theme), **bail out** — needs manual wiring.

#### Vendor libs — registered in `app/blocks.php`, only when a block needs one

`app/setup.php` stays Sage's. When a block needs a library, self-host it under
`resources/vendor/<lib>/` and append its registration to `app/blocks.php`.
Registration != enqueue: nothing loads until a `block.php` enqueues the handle.
Splide (the kit's carousel library) ships in `<skill>/templates/vendor/splide/`:

```php
// Splide self-hosted in resources/vendor/splide/ (no CDN); enqueued per-block in each block.php.
add_action('init', function () {
    wp_register_style('splide', get_theme_file_uri('resources/vendor/splide/css/splide-core.min.css'), [], '4.1.4');
    wp_register_script('splide', get_theme_file_uri('resources/vendor/splide/js/splide.min.js'), [], '4.1.4', true);
});
```

#### `vite.config.js` — no block changes

Vite is **not** involved in front-end block assets. `block.js`/`block.css` are
declared in `block.json` via `file:` and served straight from source — see
"Block asset loading" below. Leave `vite.config.js` as-is (it still builds
`app.*` and `editor.*`; the editor's `block.jsx` is compiled via the
`editor.js` glob).

#### `resources/js/editor.js` — add the glob

```js
import.meta.glob('../blocks/*/block.jsx', { eager: true });
```

Place near the top, alongside other imports. The eager glob ensures every block's `registerBlockType()` runs when editor JS loads.

#### `resources/css/app.css` — extend `@source`

```css
@source "../blocks/**/*.{php,jsx}";
```

#### `package.json` — required deps

If `react` / `react-dom` aren't in `devDependencies`, tell the dev to run:

```bash
npm install --save-dev react@^18.0.0 react-dom@^18.0.0
```

(Skill does **not** run `npm` itself.)

**React pinned to `^18`**, not the latest. `^19` resolves to React 19 which breaks Gutenberg via element-symbol mismatch (WP ships React 18; React 19's `Symbol.for("react.transitional.element")` ≠ React 18's `Symbol.for("react.element")`).

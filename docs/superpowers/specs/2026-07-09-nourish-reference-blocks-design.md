# Design: bring real production blocks in as canonical reference examples

Date: 2026-07-09

## Problem

`_docs/examples.md` currently documents exactly one reference block
(`testimonial-carousel`, a synthetic example) — a repeater with an image
and RichText fields. It doesn't show: an icon-driven repeater, a
zero-JS/CSS-only interaction pattern, a fixed (non-add/remove) array of
cards, or how the padding/image-position attributes every block already
receives (`paddingVertDesktop`, `paddingXMobile`, etc. via
`BlockManager::globalAttributes()`, and `imagePosition` via
`ImagePositionControl.jsx`) actually turn into rendered CSS in Blade —
today they're passed through and never resolved to a class anywhere in
the kit, including in the existing `testimonial-carousel` reference.

A real project (`nourish`) has 20 production blocks, two shared PHP
helper classes (`BlockPadding`, `BlockImagePosition`) that fill exactly
this gap, and an `IconPicker.jsx` component the `create-block` skill's
attribute-inference table already anticipates ("icon" → `<IconPicker>`
if the project ships one) but that has never actually been added to the
kit's templates.

## Goal

Pull two of those 20 blocks into `_docs/examples.md` as additional
canonical reference patterns, correcting the standards deviations found
in the source so the kit doesn't end up teaching its own exceptions.
Bring in the two missing infrastructure classes and wire them into
`create-block`'s bootstrap checks and `blade-standards`' rules. Add
`IconPicker.jsx` as the kit's 8th canonical shared component. Bring the
existing `testimonial-carousel` reference up to the same new padding/
image-position standard so the kit's one example doesn't contradict its
own new rule.

## Scope

In scope:
1. `app/Blocks/BlockPadding.php` — new create-block template; resolves
   `(paddingVertMobile, paddingVertDesktop, paddingXMobile, paddingXDesktop)`
   to a Tailwind class string via literal lookup tables (so Tailwind's
   scanner picks up the classes at build time — no dynamic class
   interpolation).
2. `app/Blocks/BlockImagePosition.php` — new create-block template;
   resolves an `imagePosition` string (`top-left`, `center`, …) to an
   `object-*` Tailwind class via `objectClass()`, and to a raw CSS
   `background-position` value via `cssValue()` (for cases that need an
   inline style rather than a class).
3. A Blade directive `@paddingClasses(...)` — registered in the theme's
   own `app/Providers/ThemeServiceProvider.php` (a file Sage/Acorn
   already scaffolds; the skill edits it, never creates it from
   scratch), expanding to
   `\App\Blocks\BlockPadding::resolve($expression)`.
4. `create-block/SKILL.md` Phase 0 gains:
   - A Group A check: `app/Blocks/BlockPadding.php` and
     `app/Blocks/BlockImagePosition.php` exist (copy from templates if
     missing).
   - A Group B check: `app/Providers/ThemeServiceProvider.php`'s `boot()`
     method registers the `paddingClasses` Blade directive (idempotent
     per-file divergence heuristic, same style as the existing Group B
     checks — skip if present, apply the documented edit if partially
     there, bail if the file diverges from Sage's stock shape).
   - Component check (currently #0.12, "7 canonical shared components")
     becomes 8, adding `IconPicker.jsx`.
5. `blade-standards/SKILL.md` gains a rule: every block resolves its
   padding via `@paddingClasses(...)` and any `imagePosition` attribute
   via `BlockImagePosition::objectClass()` — never hardcoded or left
   unapplied.
6. `skills/create-block/templates/components/backend/IconPicker.jsx` —
   new shared component (icon `<SelectControl>` + live SVG preview),
   adapted from the real one to generalize the hardcoded
   `/wp-content/themes/nourish/public/icons/` path into a documented
   per-project convention (a comment, not a new abstraction — no config
   system invented).
7. `_docs/examples.md`:
   - `testimonial-carousel`'s Blade view is corrected to actually apply
     `@paddingClasses(...)` on the section wrapper and
     `BlockImagePosition::objectClass($bgImagePosition)` if/where it
     renders the background image — bringing the kit's one existing
     example in line with the new rule from item 5.
   - New section: **Reference block 2 — `vision-accordion`**. Demonstrates:
     an array repeater where each item carries an icon (via
     `IconPicker`), and a checkbox-driven accordion needing no JS
     framework (`accordion.js` only closes sibling items in the same
     group — the open/closed visual state is pure CSS off `:checked`).
   - New section: **Reference block 3 — `image-card-grid`**. Demonstrates:
     a *fixed* array of cards (no add/remove, no `TabSelector`/active-item
     state — a direct `.map()`), and a zero-JS hover/tap-reveal pattern
     using native `<details>/<summary>` + CSS `group-open`.
   - Both new reference blocks are adapted from the real `nourish` source
     with these corrections applied (not copied as-is):
     - `block.php` sanitizes every input at the boundary
       (`sanitize_text_field`, `wp_kses_post` for repeater body/card
       body, `absint` for image IDs, `esc_url_raw` where a raw URL must
       survive) instead of raw `(int)`/`(bool)` casts and passthrough
       strings.
     - Icon allow-listing (currently done inside the real project's
       Blade view — a `$allowedChakras`/`$allowedOther` array filter) is
       moved into `block.php`, since validating input against an
       allow-list is data preparation, not view-only render-control
       logic (`blade-standards`' "Blade is view-only" rule).
     - Background/card images render via
       `wp_get_attachment_image($imageId, 'large', false, [...])` with
       an explicit size, instead of a raw `<img src="{{ $imageUrl }}">`
       — matching the rule already followed by `testimonial-carousel`'s
       avatar image and `CLAUDE.md`'s `wp_get_attachment_image` rule.

Out of scope (explicitly not doing now):
- The other 18 blocks in the zip — not being added as reference
  material now.
- `components/backend/model` and `components/frontend/icon-list` (real
  nested/inner-block components found in the zip) — a different,
  more advanced pattern (parent/child blocks) not covered by
  `create-block` at all today; noted as a possible future addition, not
  part of this task.
- The `screenshot`/`previewImage`/`preview` `block.json` fields the real
  blocks use for real `.webp` inserter previews (vs. the kit's
  placeholder `preview.svg` + `isPreview` flag convention) — the
  existing convention is kept as-is; not switching mechanisms.
- Any change to `services-grid` or the other grid/list blocks — only
  `vision-accordion` and `image-card-grid` are being adapted.
- Any change to `README.md`'s import manifest — `_docs/examples.md` is
  already listed there; no new top-level file is being added.

## Design

### 1. `app/Blocks/BlockPadding.php` (new create-block template)

```php
<?php

namespace App\Blocks;

class BlockPadding
{
    // All class strings are literals so Tailwind's scanner includes them at build time.
    private const PY_MOBILE  = [0 => 'py-0',    56 => 'py-14',    96 => 'py-24',    112 => 'py-28'];
    private const PY_DESKTOP = [0 => 'md:py-0', 56 => 'md:py-14', 112 => 'md:py-28', 218 => 'md:py-[13.625rem]'];
    private const PX_MOBILE  = [false => 'px-0',    true => 'px-5'];
    private const PX_DESKTOP = [false => 'lg:px-0', true => 'lg:px-[6rem]'];

    public static function resolve(
        int  $vertMobile,
        int  $vertDesktop,
        bool $horizMobile,
        bool $horizDesktop
    ): string {
        return implode(' ', [
            self::PY_MOBILE[$vertMobile]    ?? 'py-14',
            self::PY_DESKTOP[$vertDesktop]  ?? 'md:py-28',
            self::PX_MOBILE[$horizMobile]   ?? 'px-0',
            self::PX_DESKTOP[$horizDesktop] ?? 'md:px-0',
        ]);
    }
}
```

Usage in Blade: `<section class="... @paddingClasses($paddingVertMobile, $paddingVertDesktop, $paddingXMobile, $paddingXDesktop)">`.

### 2. `app/Blocks/BlockImagePosition.php` (new create-block template)

```php
<?php

namespace App\Blocks;

class BlockImagePosition
{
    // All strings are literals so Tailwind's scanner includes them at build time.
    private const OBJECT_CLASSES = [
        'top-left'      => 'object-left-top',
        'top-center'    => 'object-top',
        'top-right'     => 'object-right-top',
        'middle-left'   => 'object-left',
        'center'        => 'object-center',
        'middle-right'  => 'object-right',
        'bottom-left'   => 'object-left-bottom',
        'bottom-center' => 'object-bottom',
        'bottom-right'  => 'object-right-bottom',
    ];

    private const CSS_VALUES = [
        'top-left'      => 'left top',
        'top-center'    => 'center top',
        'top-right'     => 'right top',
        'middle-left'   => 'left center',
        'center'        => 'center center',
        'middle-right'  => 'right center',
        'bottom-left'   => 'left bottom',
        'bottom-center' => 'center bottom',
        'bottom-right'  => 'right bottom',
    ];

    public static function objectClass(string $position): string
    {
        return self::OBJECT_CLASSES[$position] ?? 'object-center';
    }

    public static function cssValue(string $position): string
    {
        return self::CSS_VALUES[$position] ?? 'center center';
    }
}
```

### 3. `@paddingClasses` Blade directive

Registered in the theme's own `app/Providers/ThemeServiceProvider.php`
(Sage/Acorn's stock scaffolded provider), inside `boot()`:

```php
Blade::directive('paddingClasses', function (string $expression) {
    return "<?php echo \App\Blocks\BlockPadding::resolve($expression); ?>";
});
```

`create-block`'s idempotency table gains a row for this file: expected
shape = `boot()` calls `parent::boot()` and registers the
`paddingClasses` directive; skip if present, apply the documented edit
if `boot()` exists but lacks the directive, bail if the file doesn't
match Sage's stock provider shape (custom providers are common enough
that guessing is risky).

### 4. `create-block/SKILL.md` changes

- Phase 0 table gains two rows (numbered following the existing 0.x
  sequence, appended after the current last check):
  - Group A: `app/Blocks/BlockPadding.php` and
    `app/Blocks/BlockImagePosition.php` exist — copy from
    `<skill>/templates/BlockPadding.php` /
    `<skill>/templates/BlockImagePosition.php` if missing.
  - Group B: `app/Providers/ThemeServiceProvider.php` registers the
    `paddingClasses` directive (see idempotency notes above).
- Check `#0.12` (canonical shared components) is updated from "7
  canonical shared components" to "8", adding `IconPicker.jsx` to the
  list and to the Templates directory listing at the bottom of the doc.

### 5. `blade-standards/SKILL.md` addition

New bullet under the existing rules:
> Every block resolves its padding attributes via `@paddingClasses(...)`
> and any `imagePosition` attribute via
> `BlockImagePosition::objectClass()` (or `::cssValue()` for inline
> styles) — never hardcode a padding/position class or leave the
> attribute unapplied in the Blade view.

### 6. `IconPicker.jsx` (new shared component)

Adapted from the real component: a `<SelectControl>` (icon dropdown) +
a live SVG preview `<img>`. The hardcoded
`/wp-content/themes/nourish/public/icons/` URL becomes
`/wp-content/themes/<theme>/public/icons/` with a comment noting the
icon folder path is a per-project convention (icons ship as static SVGs
under the theme's `public/` directory, served as-is — same mechanism
Vite already uses for other static assets). No new config abstraction is
introduced; the component keeps its existing `iconFolder` prop for
subfolder scoping (e.g., `iconFolder="chakras"` in the source project).

### 7. `_docs/examples.md` restructure

- **`testimonial-carousel`fix**: its Blade view's `<section>` wrapper
  gains `@paddingClasses($paddingVertMobile, $paddingVertDesktop,
  $paddingXMobile, $paddingXDesktop)` in its `class` attribute. Since
  this reference block doesn't currently render a background image
  element (only an avatar, sized via `wp_get_attachment_image`, which
  has no position attribute), `BlockImagePosition` isn't exercised here
  — the "How to read this reference" bullets gain a line pointing readers
  to Reference block 2/3 for the image-position pattern instead of
  forcing an unused example into block 1.
- **Reference block 2 — `vision-accordion`**: full `block.json`,
  `block.php` (corrected: sanitize every field, allow-list the icon
  value against the same enum the source Blade used, `absint` the image
  ID), `block.jsx` (IconPicker + TabSelector repeater, largely as-is —
  the editor side had no standards deviation), `accordion.js` (as-is —
  it's already minimal, framework-free, and comment-documented), `.css`
  if any, and the corrected Blade view (icon allow-listing removed from
  Blade since it moves to `block.php`; `wp_get_attachment_image` replaces
  the raw `<img>`; `@paddingClasses`/`BlockImagePosition::objectClass()`
  applied).
- **Reference block 3 — `image-card-grid`**: same treatment — `block.php`
  sanitizes `headingSerif`/`headingSans` (`sanitize_text_field`) and each
  card's `title`/`body` (`wp_kses_post` for body, matching the RichText
  content it holds) and image id (`absint`); Blade swaps the raw `<img>`
  for `wp_get_attachment_image($card['imageId'], 'large', false, [...])`
  and applies `@paddingClasses`/`BlockImagePosition::objectClass()`.
- Both new sections follow the exact same sub-structure as the existing
  `testimonial-carousel` section (`block.json` → `block.php` → `block.jsx`
  → `block.js`/`.css` if present → Blade view), each with a short intro
  sentence naming what pattern it demonstrates that block 1 doesn't.

## Testing / verification

No automated test suite (documentation/skills repo). Verification is
manual:
- Every code sample in the new/edited `_docs/examples.md` sections is
  read back and checked for: no raw casts where sanitization functions
  are called for in `blade-standards`, no business logic left in a
  Blade `.blade.php` sample, explicit image sizes on every
  `wp_get_attachment_image` call.
- `grep` for `BlockPadding`/`BlockImagePosition`/`paddingClasses` across
  `create-block/SKILL.md`, `blade-standards/SKILL.md`, and
  `_docs/examples.md` to confirm every cross-reference resolves to real
  content added in this change.
- Confirm `create-block/templates/` contains `BlockPadding.php`,
  `BlockImagePosition.php`, and `components/backend/IconPicker.jsx`
  after the change.

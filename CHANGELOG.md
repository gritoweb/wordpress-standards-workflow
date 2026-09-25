# Changelog

Notable changes to the GritoWeb WordPress standards.

## 2026-09-25 — Reference blocks as real files to copy

### Changed
- **`_docs/examples/<slug>/` holds the block's real files** (`block.json`,
  `block.php`, `block.jsx`, `block.js`/`block.css` where used,
  `preview.svg`, the Blade view) plus a short `README.md` with what it
  teaches and a two-line copy command (`cp -r` + `sed` for the placeholders).
  An agent copies and adapts instead of retyping ~250 lines per block from a
  markdown file: fewer tokens, less time, and no drift from the tested code.
  The `.md`-with-code files are gone; `_docs/examples/README.md` (rules +
  index) and `home.md` stay.

### Verified
- Round trip: running each README's copy command in an empty folder and
  filling the placeholders gives files byte-identical to the ten blocks
  tested on the local site (10/10), with no placeholder left.

## 2026-09-25 — Section buttons as shared components

### Added
- **`ButtonPair.jsx`** (editor) and **`<x-button-link>`**
  (`resources/views/components/button-link.blade.php`): the section button
  once, instead of ~25 lines re-typed in each block. `ButtonPair` shows the
  preview with the button's classes and opens `ActionEditor` on click, never
  on select; `<x-button-link>` prints the `btn btn-<variant>` link only when
  it has text and a link. Shipped with `create-block` (check 0.12).
- `hero`, `section-intro`, `media-text` and `cta-band` use them; the rule is
  in `_docs/examples/README.md` and `create-block` › Buttons.

### Verified
- On a local site with the four buttons filled: the page prints the four
  links with `btn-primary` / `btn-secondary` and `target="_blank"` only on the
  new-tab one; in the editor each button's editor is closed on select and
  opens on click, no block error, no JS error. `check-css-foundation` exits 0.

## 2026-09-25 — Header in Tailwind, no header.css

### Changed
- **The header is Tailwind utilities and design-system classes only.**
  `header.css` (198 lines) is gone: the sticky bar, the admin-bar offset, the
  inline desktop menu with hover/focus submenus, the mobile toggle and panel,
  and reduced motion are classes in `header.blade.php`; the menu's `<li>`/`<a>`
  are styled from the `<ul>` with `[&_a]:` variants, since WordPress prints
  them. `navigation.js` is unchanged. The submenu uses `rounded-button` +
  `shadow-card` (the CSS check reserves the full card surface for `.card`).
  Older themes keep their `header.css`.

### Verified
- On a local site with a Primary menu and a submenu: at 1440px the toggle is
  hidden, the menu is inline and the submenu shows only on hover; at 390px
  the toggle opens the panel (`aria-expanded` true, submenu visible) and Esc
  closes it. `check-css-foundation` exits 0.

## 2026-09-25 — Native logo and menus in the header and a Tailwind footer

### Added
- **Footer.** `project-init` Phase 1c installs `footer.blade.php`: the site
  logo, the "Footer" menu and the legal line, in Tailwind utilities and
  design-system classes only (no CSS file). It replaces Sage's footer
  widget area, where the stray Archives/Categories widgets came from.
- **Native logo.** The header and footer show the logo set in Appearance ›
  Customize › Site Identity (`add_theme_support('custom-logo')`), and the
  site name until one is set. `setup.php` gets only that and the
  `footer_navigation` menu location, next to Sage's own menu registration.
- Phase 3 creates the "Footer" menu next to "Primary".

### Removed
- **Site Settings by default.** The Header/Footer link lists (and
  `SiteSettings::links()`) duplicated WordPress menus. No project installs
  SCF until someone asks for a Site Settings tab.

### Verified
- On a local site: with no logo the header shows the site name; with a
  logo set, both header and footer print `custom-logo-link`; the footer
  lists the "Footer" menu's links and "© 2026 <site name>", with no widget.
  Screenshots at 1440px and 390px; `check-css-foundation` exits 0.

## 2026-09-25 — Ten reference blocks and a whole Home example

### Added
- **Seven new reference blocks** in `_docs/examples/`: `hero`,
  `section-intro`, `media-text`, `cta-band`, `number-grid`, `logo-wall` and
  `gallery` (a second Splide carousel). Each reuses the shared components
  (`ActionEditor` button pair opened on click, `AttachmentImageControl`,
  `ItemList`, `AutoGrowingTextarea`, the `Background Media` panel) and only
  the design system's tokens and classes: no `block.css` except the two
  carousels' bullet colors. Neutral copy, same shape as the first three.
- **`home.md`**: a whole Home built from the ten blocks, in order, with its
  serialized content.
- The index in `_docs/examples/README.md` lists all ten; an agent still
  reads only the one it needs.

### Verified
- Built and run on a fresh local site (Sage 11 + the kit): all ten blocks
  render on the page with real images; at 1440px and 390px both carousels
  mount (2 and 3 bullets), no part stays hidden after scrolling, no
  horizontal scroll, no console error, no 404, no PHP warning; the editor
  loads all ten with no block error, and the hero's button editor is closed
  on select and opens on click. `check-css-foundation` exits 0. The example
  files are generated from the tested files with the kit placeholders.

## 2026-09-25 — Carousels on Splide, vendor libraries out of setup.php

### Changed
- **Splide replaces Swiper** in the carousel reference block. Splide 4.1.4
  (`splide.min.js` + `splide-core.min.css`) ships in
  `create-block/templates/vendor/splide/` and is copied to
  `resources/vendor/splide/` only when a block needs a carousel: self-hosted,
  no CDN. `perMove: 1` keeps the bullet count equal to the editor canvas's.
- **Vendor libraries are registered in `app/blocks.php`**, not
  `app/setup.php` (as on Bright Minds); `setup.php` stays Sage's. Updated in
  `CLAUDE.md`, `create-block`, `blade-standards`, `css-standards` and
  `prettierignore.example`. Older themes that register in `setup.php` keep
  working; nothing tells them to move.

### Verified
- On a fresh local site: 3 slides show 2 bullets at 1440px (two per view)
  and 3 at 390px, `is-initialized` on the slider, no console error and no
  404; the editor loads the block with no error.

## 2026-09-25 — project-init: a new project's order on one screen

### Added
- **"New local project, in order".** A nine-line list after the execution
  flow names each step and the one section it lives in, so an agent follows
  it instead of reading the whole skill; the commands stay in their
  sections (no copy). Step 7 reads `_docs/examples/README.md` once and only
  the closest block file.

## 2026-09-25 — Reference blocks split into one file each

### Changed
- **`_docs/examples.md` → `_docs/examples/`.** `README.md` holds the intro,
  the rules every block follows and an index; `accordion.md`, `card-grid.md`
  and `testimonial-carousel.md` hold one block each. An agent reads the
  README and only the block it's building (about 400 lines) instead of all
  1,311 lines in chunks: a test run re-read the old file 12 times.
  `create-block`, `project-init` and the README point at the folder.

### Verified
- A script checked that every non-heading line of the old file is in the new
  files: 0 missing. `grep` finds no reference left to `_docs/examples.md`.

## 2026-09-25 — Figma design system skill (phases 0 to 2)

### Added
- **`figma-design-system`.** Builds the design system from a Figma file:
  phase 0 inventories the file into `_docs/figma-map.md` (the cache later
  phases read first), phase 1 writes `css-foundation-wizard`'s files with
  Figma's values (same token names), phase 2 the buttons, the card and the
  components the file defines. Each phase proposes one batch, waits for a
  yes, and is verified on the private Styleguide page. Adapted from the Sage
  Site Kit, without its grounds, contrast gate, Gravity CSS, test harnesses
  and header/footer/blocks phases. `project-init` imports it.

### Verified
- No reference left to pieces this kit doesn't have (grounds,
  `contrast-pairs.json`, `kit.config.json`, Gravity, conformance, patterns):
  `grep -rn` over the skill returns nothing. 753 lines, down from 2015.

## 2026-09-25 — New projects' Site Settings: Header and Footer link lists

### Added
- **Two basic tabs.** `project-init` now also copies
  `site-settings-wizard/templates/group_site_settings.json`: a **Header** and a
  **Footer** tab, each a repeater of SCF Link fields. Nothing else (no social
  links, no motion); any other field is added only when asked.
- **`SiteSettings::links($name)`** returns the rows as `url` / `title` /
  `target`, skipping empty rows and falling back to the URL as the title.

### Verified
- On a local Lando site with SCF 6.9.5 (`wp eval-file`): an empty list
  returns `[]`; saving three rows (one empty, one with no title and
  `_blank`) returns two links, the second titled with its URL and target
  `_blank`.

## 2026-09-25 — The CSS check fails on a font nothing loads

### Added
- **Font loading check.** `check-css-foundation.mjs` fails when
  `--font-display` or `--font-body` names a font (not a system font) that has
  no `@font-face` and no `@import url(...)` in both `app.css` and
  `editor.css`. Without it the page and the canvas silently fall back to the
  browser's font, as one test site did.

### Verified
- On a copy of a test theme: exit 0 with the Google Fonts import; with the
  import removed from `app.css`, exit 1 naming Poppins and Inter.

## 2026-09-25 — Kit log and harvest: each site improves the kit

### Added
- **Kit log.** `project-init` copies `_docs/kit-log.md` (only if absent), and
  `CLAUDE.md` › Kit log asks for one line each time the kit was wrong or
  lacking: what happened and the file. Nobody fixes the kit mid-project.
- **Harvest checklist.** `docs/kit-harvest.md` (kit repo only): after a site
  ships, sort its log into fix / lesson / wait-for-a-second-site /
  site-specific, and Luis approves each item before it becomes a commit.
  Adapted from the Sage Site Kit, without its conformance tooling.

## 2026-09-25 — New projects get an empty Site Settings; cleanup runs after the theme

### Changed
- **Site Settings: new project yes, existing site only on request.**
  `project-init` (both scenarios, right after activating the theme) installs
  Secure Custom Fields and copies `SiteSettings.php`: an empty Site Settings
  page. `app/blocks.php` registers it only `if (class_exists(...))`, so an
  older theme without the class runs as before. An existing site gets SCF and
  the page only with its first tab (`site-settings-wizard`).
- **Install defaults are cleared after the theme is active.** The cleanup is
  now its own section, run right after `theme activate`, one command per line
  (no `&&`, no `|| true`), and ends with three counts that must print 0
  (both sidebars' widgets, posts with comments open). A test run that reset
  widgets *before* activating Sage kept Archives/Categories in the footer and
  left "Hello world" open.

### Verified
- `app/blocks.php` run in plain PHP with stub classes: without
  `SiteSettings` it prints categories, motion, init hook (no error); with it,
  it also registers Site Settings.
- The count commands printed 2 and 3 widgets on the test site that reset too
  early, and 0 on the one that reset after activation.

## 2026-09-25 — Motion stays in the Customizer; SCF only with the first tab

### Changed
- **Older sites stay safe.** The previous entry moved Motion to Site Settings,
  so copying the updated kit into an existing site would have lost its saved
  Customizer motion values, or failed with `Class App\Settings\SiteSettings
  not found` when only `BlockMotion.php` was copied. `BlockMotion.php`,
  `blocks.php`, `BlockManager.php`, `entrance.css`, `hover.css` and
  `create-block` are back to their previous versions: Motion stays in
  **Appearance › Customize › Motion**.
- **Nothing installed by default.** `project-init` no longer installs SCF.
  The first Site Settings tab someone asks for installs SCF and copies
  `SiteSettings.php` (now a `site-settings-wizard` template), through
  `site-settings-wizard`.

### Verified
- `git diff master -- skills/create-block` is empty.

## 2026-09-25 — Site Settings on Secure Custom Fields, empty by default

### Changed
- **Site Settings runs on SCF.** `project-init` installs and activates
  Secure Custom Fields. `app/Settings/SiteSettings.php` (copied by
  `create-block`, check 0.15, registered from `app/blocks.php`) adds an
  **empty** Site Settings page and is the one reader for its fields
  (`SiteSettings::field($name, $default)`). With SCF off it returns the
  default, so the site never breaks without the plugin.
- **A tab is added only when asked.** `site-settings-wizard` builds the tab
  the dev asked for as `acf-json/group_site_settings_<tab>.json`, and nothing
  else. Motion has a ready-made tab (`group_site_settings_motion.json`).
- **Motion leaves the Customizer.** `BlockMotion` reads `SiteSettings`; with
  no Motion tab it prints the same White Summers defaults as before.

### Verified
- On a local Lando site with SCF (`wp eval-file`): with no Motion tab,
  `--e-duration:1000ms` and the other defaults; with the Motion group loaded
  and `motion_duration` 500 / unit `vw` saved, `--e-duration:500ms` and
  `--e-distance:32vw`. With no `get_field()` (plain PHP) the defaults print
  without an error.

## 2026-09-25 — The alert component keeps its props

### Fixed
- **No PHP warning on the alert.** The wizard's `alert.blade.php` dropped
  Sage's `@props(['type' => null, 'message' => null])`, so every alert
  printed `Warning: Undefined variable $type`. The snippet keeps it now.

### Verified
- On a local Lando site, the Styleguide page rendered with the old snippet
  printed `Warning: Undefined variable $type`; with the new one it printed no
  warning and all four alert variants.

## 2026-09-25 — Every project gets a private Styleguide page

### Added
- **Styleguide page.** `css-foundation-wizard` copies
  `template-styleguide.blade.php` and the `StyleGuide` view composer (adapted
  from the Sage Site Kit). The composer reads the tokens from
  `global/variables.css`, `typography.css` and `container.css`, so the page
  shows the live type scale, colors, spacing, radius and shadow with no
  hand-kept list. Its six sections are fixed: typography, color, spacing,
  buttons, forms, components.
- **project-init creates it private.** Phase 1b step 4 creates the
  "Styleguide" page (`post_status=private`, slug `styleguide`) only when the
  slug doesn't exist yet. Logged-in editors see it; visitors get a 404.
  `launch-list.md` checks it's still private before launch.

### Verified
- On a local Lando site: running the command twice created one page
  (`Created post 18`), private; `/styleguide/` returned 404 logged out and
  200 logged in, with all six sections, 18 color swatches, 9 type rows and no
  PHP warning.

## 2026-09-25 — Comments close on drafts and private pages too

### Fixed
- **project-init step 12 closes every post's comments.** `post list --post_type=any`
  only returns published posts, so drafts and private pages kept comments open;
  it now passes `--post_status=any`. `xargs -I{}` also passed every ID as one
  argument (`15 12 13`), which fails as soon as two posts are open; plain
  `xargs` passes one ID per argument.

### Verified
- On a local Lando site, a published page and a draft with comments open:
  the new command closed both (`Updated post 2`, `Updated post 3`), and a
  second `post list --comment_status=open --format=count` returned 0.

## 2026-09-24 — The canvas adapts to its width instead of forcing one

With list view and settings open on a laptop the editor canvas is
phone-width (394px on a 1024px screen). The canvas still forced desktop
values, so blocks touched the canvas edges, the hero title was clipped and
the carousel author rows had 0px.

### Fixed
- **Padding follows breakpoints.** `editorPaddingStyle()` wrote the desktop
  padding as an inline style (96px each side at any width). It's replaced by
  `editorPaddingClasses()`, which returns the same responsive classes
  `BlockPadding` prints on the page (`py-14 md:py-28 px-5 lg:px-[6rem]` by
  default); the canvas iframe's own width drives the breakpoints.
- **Carousel slides per view follow Swiper.** The canvas forced 2 slides at
  any width; it now reads Swiper's breakpoint (1 below 768px, 2 from 768px)
  on the canvas iframe.
- **Minimum gutter.** `editor/canvas.css` gives the block list and the post
  title the container's side padding (`--container-padding-x`), so nothing
  touches the canvas edges.

### Verified
- `luistestenovo`, list view + settings open, 1920 / 1366 / 1024px screens
  (canvas 1290 / 736 / 394px): 24px minimum gap, no section overflowing, no
  clipped field, carousel 2 / 1 / 1 slides; post title aligned with the
  blocks; check and editor-fidelity exit 0.
- The three example `block.jsx` parse; `editorPaddingClasses` returns the
  same strings as `BlockPadding::resolve` for defaults and custom values.

## 2026-09-24 — Words never split on the editor canvas

A generated theme showed "Frequently Asked Questions" split mid-word in the
editor ("Frequent / ly") while the page kept every word whole.

### Fixed
- **Editor column as wide as the site container.** Sage's `theme.json` sets
  `contentSize: 48rem`, so every block was laid out in 768px on the canvas
  but in the full 1280px container on the page (the FAQ title had 217px in the
  editor, 490px on the page). The wizard now sets
  `"contentSize": "var(--container-max-width)"` — the one value in
  `container.css`; blocks stay centered and aligned, no `align: full`.
- **No mid-word breaks on the canvas.** WordPress's `block-editor/content.css`
  sets `overflow-wrap: break-word` on every block, and browsers default
  `textarea` and `contenteditable` (RichText) to the same. The new
  `resources/css/editor/canvas.css` (imported by `editor.css` only) sets
  `overflow-wrap: normal` for those three, matching the page.

### Added
- The check refuses a `theme.json` whose `contentSize` isn't the container
  token and an `editor.css` that doesn't import `editor/canvas.css`;
  `editor-fidelity.mjs` compares `overflow-wrap`, so the canvas can't hide an
  overflowing word by splitting it.

### Verified
- On the generated theme (`luistestenovo`): all five blocks 1280px wide and
  aligned in the editor, the FAQ title in two whole lines, check and
  editor-fidelity exit 0 (fidelity now comparing `overflow-wrap`). Before the
  canvas rule, fidelity flagged every RichText (`break-word → normal`).
- The check exits 1 with Sage's stock `48rem` and without the canvas import;
  a theme built only from the wizard's code blocks passes.

## 2026-09-23 — One card class, no copied class strings in the examples

A second agent test (vague prompt, 5 blocks) built every block on the style
guide, but re-typed the card surface 8 times across 4 blocks, copied the
wizard's example colors and fonts as the client's, and its card links opened
fields with no panel around them.

### Added
- `components/card.css` (`.card`) in the wizard's contract; the check
  requires it and refuses `rounded-card` / `shadow-card` / `border-border`
  re-typed together outside it.
- The wizard stops at Step 1 until the dev gives a style guide; its example
  values are marked as format illustrations, never defaults.

### Changed
- `_docs/examples.md`: the six card surfaces use `card` (+ layout only);
  canvas fields drop `w-full bg-transparent` (now in `AutoGrowingTextarea`
  itself) and redundant `text-ink` (the body sets it once).
- `ActionEditor` `stacked` draws the same white panel as the two-column mode
  — it had no background, so a card's link fields sat bare on the card; the
  card-grid example's wrapper lost its extra top margin.

### Verified
- Theme rebuilt from the wizard's code blocks + the examples: check exits 0;
  Tailwind builds `.card` in the components layer with
  `open:border-primary/30` after it; the only 3-class combos shared across
  example blocks are layout/role (`card flex flex-col`, `flex gap-4
  items-center`, `mt-4 text-body text-muted`).

## 2026-09-23 — Style guide foundation first, each value in one place

Two test themes built from the kit had no `resources/css/global/` at all:
`project-init` copied `css-foundation-wizard` but never ran it, `create-block`
didn't require it, and `_docs/examples.md` styled every block with Tailwind's
stock palette and scale (`text-slate-900`, `text-3xl`). Bright Minds and
Nourish, built without a complete foundation, reworked blocks afterwards (34 +
24 files; 5 commits "to match design tokens").

### Added
- **Token contract** in `css-foundation-wizard`: fixed names, the client's
  values. `variables.css` — colors (`ink`, `muted`, `light`, `surface`,
  `border`, `primary`, `primary-light`, `success`, `warning`, `danger`),
  radius, shadow. `typography.css` — fonts, `--text-h1…h6` with `-mobile`
  pairs, `lead`, `body`, `small`, and `h1, .heading-1` … `h6, .heading-6`
  (tag and class share one rule, mobile → desktop at `lg`), `.font-eyebrow`,
  body text. `container.css` — its own tokens + `@utility container`.
- **`components/button.css`** (`.btn`, `.btn-primary`, `.btn-secondary`) —
  `create-block` already rendered `btn btn-primary`, but nothing defined it.
- Font loading (self-hosted `@font-face`, or a web-font `@import` on the first
  line of `app.css`/`editor.css`), Sage's `alert` component on state tokens,
  and "a repeated treatment is a class before it's a second block".
- **`scripts/check-css-foundation.mjs`**: exits 1 when a foundation file,
  contract token or class is missing, a token sits in the wrong file, an
  entrypoint doesn't import the foundation, a raw color / font size / family
  or a token fallback appears outside its owner file, or a view/block uses
  the stock palette or scale, `text-hN` or an arbitrary size. Runs at the end
  of the wizard, as blocking check 0.21 in `create-block`, and in the
  pre-commit hook (fails closed when the script is missing).
- `project-init` Phase 1b runs the wizard before the header and any block;
  Theme assets adds the `prepare` script, `lint-staged` key and dev
  dependencies (without them the hook never installed).

### Changed
- The three example blocks and `create-block`'s attribute table use
  `heading-N`, `text-ink/muted/primary`, `bg-light/surface`,
  `border-border`, `rounded-card`, `shadow-card`, `text-body/small/lead`;
  canvas fields carry the page's classes instead of a white-card form wrapper.
- `header.css` reads the tokens with no fallback copies (`--color-ink` instead
  of the duplicate `--color-dark`); `hover.css` derives its shadow from ink.
- `layout.css` uses `overflow-x: clip` (hidden broke the sticky header) and
  `container` is an `@utility` (a plain class lost to Tailwind's: 1536px
  instead of 80rem).

### Verified
- A theme built only from the wizard's own code blocks plus the three example
  blocks, header, hover and entrance CSS: check exits 0; Tailwind 4.3.3 builds
  `app.css` and `editor.css` with all 20 style guide classes, `h2, .heading-2`
  as one rule with the `lg` switch, and no stock palette class.
- The check exits 1 on each of: a color token in `typography.css`, type or
  container tokens in `variables.css`, a hex in a `block.css`, a raw
  `font-size` in `components/`, a `var(--color-ink, #111)` fallback,
  `text-[2rem] md:text-h2 leading-[0.95]` in a view, a missing
  `.btn-secondary`; `text-[length:var(--text-small)]` passes.
- A Sonnet agent built `test-skill2` from the kit with no hints: all three
  blocks were written once, on the style guide; check, editor-fidelity and
  `npm run build` exit 0. Its two rework loops (web-font import placement,
  missing `prepare`/`lint-staged`) are the gaps fixed above. The Vite build
  keeps a first-line web-font `@import` first in the output CSS.
- Pre-commit hook in a throwaway repo: clean theme commits; a stock class or
  a missing script blocks the commit.

## 2026-09-23 — Sidebar rule up front

### Changed
- The "no content editing in the sidebar" rule sat mid-way through
  `create-block/SKILL.md`, and a generated `cta` / `hero` still mounted
  `ActionEditor` in `InspectorControls`. It now opens the skill as a hard
  rule and is in `CLAUDE.md` › Blocks — the two files agents read first —
  naming the components that must never be in the sidebar.

## 2026-09-23 — CTA link field and sidebar buttons

A project generated from the kit put button editing in the sidebar and showed
a broken link field on the canvas (squashed LinkControl icon row, stray ↗).

### Fixed
- **Broken link field on the canvas.** `ActionEditor` passed
  `fullWidth={stacked}` to `LinkPicker`, which renders `LinkControl` inline;
  inline on the canvas the theme CSS breaks its preview row. White Summers
  only ever rendered it inline in the sidebar. `ActionEditor` now always uses
  `LinkPicker`'s trigger + `Popover` (as the older projects did), which renders
  outside the canvas and looks like core.
- **Button editing in the sidebar.** The skill and `ActionEditor`'s comments
  called `stacked` "the sidebar treatment", which led an agent to mount
  `ActionEditor` inside `InspectorControls`. That wording is gone, the skill
  states `ActionEditor` / `LinkPicker` never go in the sidebar, and
  `scripts/editor-fidelity.mjs` now reports any text, link or button field
  inside `<InspectorControls>` (checked against the generated project: it
  flags its `cta` and `hero`; the kit's examples and template are clean).
- The layout-only wrapper rule now covers both `ActionEditor` modes.

## 2026-09-23 — CTA editor wrapper is layout only

### Fixed
- A project built from the kit showed the CTA editor as a card inside a
  card: the agent styled the wrapper around `ActionEditor` (`bg-white p-4
  rounded-xl shadow-lg mt-3`), and `ActionEditor` already draws its own
  panel. The skill showed the wrapper as `w-full max-w-xl text-left ...`,
  and the `...` read as "add classes here". It now names the exact wrapper
  and forbids background, padding, radius, shadow, border and top margin on
  it.

## 2026-09-23 — Editor fidelity report

The Blade view and `block.jsx` are written separately, so a front-end change
could leave the editor canvas behind with nothing to flag it.

### Added
- **`scripts/editor-fidelity.mjs`** (report only, never edits a file):
  headless Chrome inserts the theme's blocks into a temporary draft, compares
  every visible text's computed styles in the canvas and on the page at the
  same width, and lists per block what differs and what the page shows that
  the editor lacks, with both class lists. No npm packages (Node 22+ and
  Chrome). Verified on test-skill: 3 reference blocks match; a title colour
  and a new text changed only in Blade were both reported.

### Fixed
- **Canvas used the system font.** `css-foundation-wizard` built
  `editor.css` without `base.css`, where the body and heading fonts live;
  the report showed `-apple-system` in the editor vs the theme font on the
  page for every text. `editor.css` now imports `base.css`, and the heading
  rule covers `[data-heading]` — set by `AutoGrowingTextarea`'s new
  `heading` prop — so a title typed in a textarea takes the heading font.
- Reference block titles lacked `sm:text-4xl` in `block.jsx` (30px in the
  editor, 36px on the page), found by the report.

## 2026-09-23 — Carousel canvas, install defaults, source of truth

QA of a site built from the kit (`luis`): every block loaded without errors,
but the agent had copied an earlier test theme instead of the kit, the
carousel showed a scrollbar in the editor and never advanced on the page, the
footer showed WordPress's default widgets and comments were open.

### Changed
- **Carousel reference:** the editor canvas now looks like the front end —
  two slides and the same pagination bullets, no scrollbar; the sidebar list
  brings an off-screen slide into view and editing a visible slide never
  moves the track. Autoplay on the front end is set in the sidebar
  (on/off + seconds), pauses on hover and stays off for reduced motion.
- `create-block`: blocks come only from the kit's templates and
  `_docs/examples.md`, never from another project on the machine; sidebar
  panels follow one order (items → background media → block settings →
  Spacing → Entrance animation).
- `project-init`: a new step clears the install's default widgets and closes
  comments; the smoke check covers stray widgets and editor errors.

## 2026-09-23 — Repeaters, remove controls and tested reference blocks

A second project built with the kit (Gemini) came out with an accordion and
card grid that could not reorder items, a red "Delete" pill and a `✕` on the
canvas, a form-like canvas, and Spacing classes printed outside `class`. The
agent's transcript shows it copied `_docs/examples.md`, which still taught the
pre-refactor patterns (`TabSelector`, "no trash icon", labelled canvas
fields); `SKILL.md` repeated `TabSelector` for accordions and sliders.

### Changed
- **One repeater pattern:** `ItemList` in the sidebar reorders, deletes and
  adds; the canvas renders items in array order and edits them inline;
  one-open-at-a-time widgets share `activeItem` with the list.
- **`_docs/examples.md` rewritten** from three blocks tested end to end on a
  live site: accordion (`<details name>` — opening one closes the others, no
  JS), card grid, and a Swiper testimonial carousel (vendor lib registered in
  `setup.php`, enqueued only by its `block.php`).
- **Remove controls are components:** `RemoveImageButton` (core close icon)
  removes an image; `RemoveButton` (core trash, `isDestructive`) deletes
  anything else. `ItemList` arrows and drag handle use core icons. Every
  editor icon button is `size="compact"` (32px). Icons live in
  `coreIcons.jsx`, copied from core so no extra npm package is needed.
- `AttachmentImageControl` shows core's image icon when empty (no text).
- **Spacing:** `BlockPadding::resolve()` also accepts the attributes array,
  `fromAttributes()` feeds the view, the Blade template shows the directive
  inside `class`, the canvas previews it (`editorPaddingStyle`), and check
  0.9 requires Tailwind to scan `app/`.

### Removed
- `TabSelector.jsx` and `ImageUploadWithHover.jsx` templates.

### Fixed
- Two `setAttributes` calls in a row (e.g. `imageId` then `imageUrl`) lost
  the first write; the rule and the examples now use one patch per change.

## 2026-09-23 — Motion matches White Summers

Blocks built by the kit animated differently from the White Summers
reference: other global defaults, a sharper curve, one preset for every block
and no hover options. Compared the two homes in the browser (computed
transition timings, presets, body classes) and aligned the kit.

### Changed
- **Global defaults** now match the reference: duration 1000 ms, delay 250 ms,
  stagger 250 ms, distance 32 px, easing `cubic-bezier(0.22, 0.61, 0.36, 1)`.
  The curve is written literally — Tailwind v4 defines its own `--ease-out`
  (`0, 0, .2, 1`), which the previous `var(--ease-out)` picked up.
- **Per-block presets** — `create-block` now has the White Summers preset table
  by block kind (hero, text section, card grid with `trigger: item`, highlights
  row, logo wall), and every `block.json` declares its row.

### Added
- **Customize › Motion** gains Easing, Button hover effect (lift / fade /
  none), Link hover effect (underline / fade / none) and Hover speed, the same
  options White Summers has. New `hover.css` template; CTAs carry the `btn`
  class and no Tailwind transition/scale utilities.

### Fixed
- **Preview skipped parts with their own transition** (e.g. Tailwind
  `transition-all` on a canvas button): the replay's hidden state now sets
  `transition: none`, so the part vanishes before replaying.

## 2026-09-23 — Working entrance animations and site header

A project scaffolded with the kit shipped with dead entrance animations, a
Preview button that did nothing and Sage's bare header. Verified end to end on
a fresh Lando + Sage 11 project with 5 blocks (editor + front end, 1280px and
mobile).

### Fixed
- **Entrance animations never ran.** The kit shipped only the editor half
  (`EntranceControl` / `entranceCanvas.js`); `BlockEntrance.php` was an older
  copy with a different contract (`data-entrance-type`, `zoom`/`flip`,
  `load`/`scroll`) and there was no front-end CSS/JS. Ported the complete
  system: `BlockEntrance.php` (`fromBlock`/`root`/`part`), `entrance.css`,
  `entrance.js`, the `@entrance` / `@entrancePart` Blade directives, and the
  canvas wiring (`entranceRootProps` / `entrancePartProps`) in the block
  templates.
- **Sidebar Preview did nothing.** It looks for a `[data-entrance]` root by
  `clientId`; blocks now pass `clientId` and spread the root props, and
  `editor.css` imports `entrance.css`.
- **Stray "Home" under the header** looked like a broken menu: it was Sage's
  `page-header` `<h1>`. `project-init` now adds a `front-page.blade.php` that
  renders only the blocks.

### Added
- **Global animation defaults** — `BlockMotion.php` adds Appearance ›
  Customize › Motion (duration, delay, stagger, distance, unit); block fields
  left empty inherit it. `entrance` is now a global block attribute in
  `BlockManager` with null numbers.
- **Site header** — `project-init` Phase 1b replaces Sage's bare header with a
  responsive header (inline menu on desktop, toggle panel on mobile, `Esc`
  closes), falls back to a page list when no menu is assigned, and Phase 3
  creates and assigns the "Primary" menu.

## 2026-09-22 — Brand Refactor

Major update backporting patterns evolved in the White Summers project into the
canonical kit. The editor experience shifts from a dashed-border admin form to a
canvas with real data, inline editing, and theme-styled controls.

### Added
- **`AttachmentImageControl`** — new default image component replacing
  `ImageUploadWithHover`. Resolves URLs by attachment ID via `useAttachmentUrls`
  (no stale URL stored). Shows a **× icon on hover** (top-right corner) to
  remove the image directly — no `window.confirm`, no text button below. Rendered
  unconditionally on hover whenever a media reference exists, allowing image removal
  even if the preview is unavailable or broken. States: ready, loading (Spinner),
  unavailable, empty. `noStylesheet` prop for sidebar.
- **`ActionEditor`** — combined CTA editor (text field + `LinkPicker` + new-tab
  checkbox + optional icon). Two modes: `stacked` (sidebar inline styles) and
  default (2-column grid on canvas). **Button/link editing happens inline on the
  canvas**, never in the sidebar.
- **`AutoGrowingTextarea`** — auto-resizing textarea for inline heading/subtitle
  editing on the canvas. Uses native `field-sizing: content` with `resize: none`,
  `overflow: hidden`, and zero inline height overrides, guaranteeing 100% of the
  text is always fully visible on render without vertical clipping or scrollbars.
  Normalizes `onChange` to always pass the string value (`event.target.value`),
  preventing React `SyntheticEvent` serialization crashes in Gutenberg block attributes.
- **`ImagePositionControl`** — exports `focalCss(position)` and `FOCAL_POSITIONS`
  for resolving 9-point anchor values to CSS `object-position`/`background-position`.
- **`EntranceControl`** — accepts both `{ attributes, setAttributes }` and
  `{ value, onChange }` props defensibly to prevent undefined crashes.
- **`LinkPicker`** — supports `fullWidth` prop for inline sidebar rendering and
  safe `HTMLElement` Symbol.hasInstance check.
- **`ParagraphsField`** — multi-paragraph `RichText` editor preserving HTML
  segments, for inline body copy editing.
- **`ItemList`** — vertical list repeater with drag handles + keyboard arrows
  (up/down). Replaces `TabSelector` + `RemoveButton` for new blocks.
- **`EntranceControl`** — sidebar panel for scroll/entrance animations (Type,
  Trigger, Direction, Duration, Delay, Stagger) with a **Preview** button that
  replays the animation directly on the canvas.
- **`DividerControl`** — section divider selector (none/below/above/both).
- **`editorCanvas.js`** — canvas constants: `EDITOR_TYPE` tiers, `emptyLink()`,
  `BACKGROUND_MEDIA_PANEL` (bounded corner thumbnail panel for canvas background media controls),
  and `EDITOR_BLOCK_FRAME` (the signature White Summers 1px dashed boundary:
  `mb-10 overflow-hidden rounded-[var(--radius-card,1rem)] outline outline-1 outline-offset-[-1px] outline-dashed outline-[color:var(--color-ink,#000)]/30`).
- **`entranceCanvas.js`** / **`moveItem.js`** / **`useAttachmentUrls.js`** —
  supporting helpers.
- **`BlockEntrance.php`** — resolves entrance-animation attributes into
  `data-entrance-*` attributes for the front end. Registered as a global
  attribute via `BlockManager` (same mechanism as `BlockPadding`).
- **`skills/fotos/`** — block screenshot generator (Chrome headless → webp + svg
  fallback), bundled into the kit from the global skill.
- **`skills/site-settings-wizard/`** — interactive wizard for Site Settings using
  only WordPress core (Customizer + Settings API). Zero ACF/SCF.
- **`_docs/site-settings-pattern.md`** — reference doc for the Customizer +
  Settings API pattern.
- **`_docs/editor-fidelity-checklist.md`** — optional 8-step canvas fidelity
  contract.

### Changed
- **`create-block/SKILL.md`** — template `block.jsx` rewritten: root wrapper uses
  canonical White Summers dashed frame (`EDITOR_BLOCK_FRAME`) for block boundaries,
  `InspectorControls` limited to config-only controls (padding, entrance, layout,
  focal point, dividers), text edited inline via `AutoGrowingTextarea`/`ParagraphsField`,
  images via `AttachmentImageControl`, CTA via `ActionEditor` popover on canvas.
  Background media strictly prohibited in the sidebar; rendered directly on canvas via
  `BACKGROUND_MEDIA_PANEL` with hover `×` remove button.
- **Keyword lookup table** — image maps to `AttachmentImageControl` (ID-first,
  single attribute); button/CTA maps to `ActionEditor` popover on canvas.
- **Per-attribute generation rules** — image stores only `<name>Id` (URL
  resolved at render); array uses `ItemList` by default.
- **Templates directory** — 11 new components + `BlockEntrance.php`; 3 legacy
  components (`ImageUploadWithHover`, `TabSelector`, `RemoveButton`) kept for
  backward compatibility.
- **`project-init/SKILL.md`** — import table includes `skills/fotos/` and
  `skills/site-settings-wizard/`.
- **CSS Foundation modularization** (`css-standards` + `css-foundation-wizard`) —
  standardized the 5 essential foundation files in `resources/css/global/`:
  `variables.css` (tokens), `layout.css` (root structure/app), `base.css` (unclassed tags),
  `typography.css` (semantic text), and `container.css` (max-width/gutters). Replaces the
  generic catch-all `global.css`. `editor.css` now mirrors `variables`, `typography`,
  `layout`, and `container` for complete visual parity on the canvas. Excludes any
  project-specific or third-party bloat.
- **`project-init/SKILL.md` & `README.md`** — explicitly designated `wp-content/themes/<theme>/` as
  the canonical target destination for all `.claude/skills/`, `CLAUDE.md`, and `_docs/`.
  Strictly prohibited leaving cloned kit repository copies in the WordPress root (must delete
  any temporary clone folder immediately). Added explicit Apache `.htaccess` rewrite rules
  to eliminate REST API 404 errors during image preview resolution, and formalized the sample
  home page blocks creation flow.
- **`README.md`** — "What's here" table includes new skills.
- **`create-block/SKILL.md`, repeaters section** — documented that
  `<ItemList>`/`moveItem.js` reordering only works when array position is the
  block's *only* source of order: a per-item `order`/`row` field layered on
  top for custom layout tuning must be resynced inside `onMove`, or the
  sidebar reorder silently stops affecting the render. Also scoped
  `<TabSelector>` + `<RemoveButton>` down from "legacy, avoid" to "still
  correct when the block's own front end is a one-active-item widget (real
  tabs, accordion, slider)".

### How verified
- All new files created and exist on disk.
- `create-block/SKILL.md` template has no `dashed-border`, no `ActionEditor` in
  `InspectorControls`, CTA editing is inline on canvas.
- `AttachmentImageControl.jsx` has `data-attachment-remove` × button.
- `site-settings-wizard` contains zero references to ACF.
- The `<ItemList>` dual-source-of-truth warning was verified against a live
  post in a sibling project (not modified — see that project's own
  changelog/notes if a fix is wanted there): every item already carries an
  explicit `desktop.order`/`row`, and dragging a row in the sidebar changes
  the array without moving one rendered pixel, in the editor or on the
  front end.
- Built a fresh test project (`test-wordpress`) against the updated skill:
  a `logo-strip` block using `<ItemList>` + `moveItem` with no parallel
  order field reorders correctly end to end (`render_block()` with a
  reordered `logos[]` array produced markup in that same order), and a
  `tabs` block exercises `<TabSelector>` + `<RemoveButton>` for the first
  time with real front-end interactive tabs.
- Branch is `refactor`; `master` is untouched.

## 2026-09-22 — Sidebar background media

Reverses the "Background Media is NEVER in the sidebar" rule this same kit shipped
earlier today (see `Brand Refactor` above, commit `5988e1a`). Explicit decision:
background images move to the sidebar; only foreground/inline images and
repeater-item images stay on the canvas.

### Changed
- **`create-block/SKILL.md`** — "What goes where" section: background media
  (`<AttachmentImageControl noStylesheet />` + `<ImagePositionControl />`) now lives
  in a sidebar `PanelBody title="Background Media"`. The canvas keeps only the
  passive full-bleed preview, no click target. The keyword lookup table and the
  "Image (ID-first)" special expansion rule split into two rows/paths — foreground
  (canvas) vs. background/cover (sidebar). The `block.jsx` template example updated
  to match.
- **`_docs/editor-fidelity-checklist.md`**, item 2 — same reversal.
- **Templates** — removed the now-dead `BACKGROUND_MEDIA_PANEL` export from
  `templates/components/backend/editorCanvas.js` (its only consumer was the pattern
  just removed).

### How verified
- Applied to `test-wordpress`'s `home-hero` block (its only background-image
  block): `bgImageId` select/replace/remove and `bgImagePosition` focal point both
  now live in one sidebar panel; canvas backdrop preview is unchanged and
  non-interactive. `npm run build` clean.
- Grepped both the skill repo and `test-wordpress` for `BACKGROUND_MEDIA_PANEL`
  after the edit — no live references left (only historical mentions in this
  changelog, which record what happened, not current state).
- Branch is `refactor`; `master` is untouched.

### Fixed
- **`ActionEditor` CTA popovers now float instead of expanding inline.** The
  featured-grid card link fixed earlier today used a real `<Popover>`; the
  block.jsx template's own CTA example, and `test-wordpress`'s `home-hero`
  (×2), `banner-cta` (×2) and `text-media-split` (×1) still opened
  `ActionEditor` in-flow, pushing content down and reflowing the canvas each
  toggle. All now wrap the trigger `<span>` in its own
  `position: 'relative'` container and open `ActionEditor` inside a
  `<Popover>` anchored to it. Updated the keyword table, the "Button pair"
  special expansion rule, the "What goes where" Buttons/CTAs bullet, and the
  `block.jsx` template's commented CTA example to match, so a block
  scaffolded from now on gets the floating popover by default.

### How verified
- `npm run build` clean in `test-wordpress` after converting all five CTA
  triggers.
- Rendered home page still HTTP 200 with no PHP errors (this is an
  editor-only change; `block.php`/Blade views were untouched).
- Branch is `refactor`; `master` is untouched.

## 2026-09-22 — Revert the "always Popover" overcorrection

The entry above was itself wrong, caught the same day it shipped: it applied the
floating-`Popover` treatment to every `ActionEditor` CTA trigger "for consistency" — but
only featured-grid's card link actually needed it (the grid column is too narrow for the
inline layout). `home-hero`, `banner-cta` and `text-media-split` were never broken; their
original inline `ActionEditor` grows the block to contain it and never overlaps a
neighboring block. A `Popover` is a floating overlay — it doesn't grow anything — so on a
shorter block it spilled past the block's own bottom edge into whatever rendered next.
Caught by comparing a fresh screenshot against the original (working) behavior.

### Fixed
- **`create-block/SKILL.md`** — "Button pair" rule, keyword table, and "What goes where"
  Buttons/CTAs bullet all corrected: the treatment is picked by the trigger's available
  width, not applied uniformly. Full-width/single CTA → inline, directly below the button.
  CTA inside a narrow per-item container (grid card, repeater item) → floating `Popover`.
  The reasoning for why "always Popover" was wrong is now written into the rule itself, not
  just this changelog, so a future edit of this file doesn't reintroduce it.
- **`block.jsx` template** — the commented CTA example reverted to the inline treatment as
  the default, with the narrow-container `Popover` variant kept as a clearly-labeled
  alternative right below it.
- **`test-wordpress`** — `home-hero`, `banner-cta`, `text-media-split` reverted to inline
  `ActionEditor`; `featured-grid` keeps the `Popover` (the one case that needed it).

### How verified
- `npm run build` clean in `test-wordpress` after the revert (also caught and fixed two
  stray extra `</div>` closing tags left over from the original conversion, in `home-hero`
  and `banner-cta` — the build failed on JSX fragment mismatch until those were removed).
- Rendered home page still HTTP 200, no PHP errors.
- Branch is `refactor`; `master` is untouched.

## 2026-09-22 — Drop Popover for repeater-item links entirely

Caught by the person testing: featured-grid's `Popover` (kept in the revert above as "the
one case that needed it") still overlapped the card row below it in the 3-up grid. A
`Popover`'s built-in collision handling keeps it inside the *viewport*; it has no concept
of a sibling grid row and no way to avoid it. This is true structurally, not a tuning
problem — no `position`/`placement` value fixes it, because the thing it needs to dodge
isn't a viewport edge.

### Fixed
- **`create-block/SKILL.md`** — "Button pair" rule, keyword table, "What goes where", and
  the `block.jsx` template's commented example all corrected again: a repeater item's link
  **text** stays inline-editable on canvas; the link **destination** moves to a **sidebar**
  panel tied to whichever item is "active" (`<LinkPicker fullWidth />` bound to
  `items[activeItem].link`, same state shape `<ItemList>` already uses). `Popover` is no
  longer recommended anywhere in this skill for CTA/link editing — its commented-out import
  was removed from the template.
- **`test-wordpress`** — `featured-grid` reworked to match: click a card to select it
  (highlighted with a ring), its link text is still typed inline, its destination is set in
  a new "Card Link" sidebar panel. No block in the project imports `Popover` any more.

### How verified
- `npm run build` clean.
- Grepped `resources/blocks/*/block.jsx` for `Popover` — zero imports left; the one string
  match left is inside an explanatory code comment, not a usage.
- Rendered home page still HTTP 200, no PHP errors (`block.php`/Blade views untouched —
  `featured-grid`'s `items[].link` shape didn't change, only the editor UI around it).
- Branch is `refactor`; `master` is untouched.

## 2026-09-22 — featured-grid: stacked ActionEditor, not sidebar

The sidebar fix in the entry above was itself wrong — never asked for, and inconsistent
with every other button in the theme (which opens its editor inline, on the canvas, right
where you clicked). The actual fix was already sitting in `ActionEditor`: its `stacked`
prop, built for sidebar-width contexts, renders the same fields in one vertical column
instead of two side by side. `featured-grid` needed `stacked={true}`, not a `Popover` and
not a trip to the sidebar.

### Fixed
- **`create-block/SKILL.md`** — "Button pair" rule, keyword table, "What goes where", and
  the `block.jsx` template corrected a third time: a repeater item's CTA opens
  `ActionEditor` **inline** like every other button, just with `stacked={true}` instead of
  `stacked={false}`. `Popover` and the sidebar are both off the table for CTA/link editing
  now, for any context.
- **Default `link.url` of `"#"` replaced with `""`.** `LinkControl` treats any non-empty
  URL as real and tries to preview it; a bare `#` has no fetchable title, so it falls back
  to showing the raw `#` in both its title and info slots — reads as duplicated/broken the
  moment an editor opens the link picker. An empty string gets `LinkControl`'s normal
  empty "search for a link" state instead. Noted in the "Button pair" rule so a future
  scaffold doesn't seed example content with `"#"` again.
- **`test-wordpress`** — `featured-grid` back to inline (matching home-hero/banner-cta/
  text-media-split's interaction exactly), just `stacked={true}`; `block.json`'s seed
  items and the already-saved home page content both had their `link.url` cleared from
  `"#"` to `""`.

### How verified
- `npm run build` clean.
- Rendered home page still HTTP 200, no PHP errors.
- Checked `test-wordpress`'s saved home page content directly (`wp post get 5`) —
  `featured-grid`'s items all show `"url":""`, no stray `"#"` left.
- Branch is `refactor`; `master` is untouched.

## 2026-09-17

### Changed
- **CSS files live in folders, never at the root of `resources/css/`.** The
  foundation moved to `resources/css/global/{variables,base,typography,global}.css`,
  and `css-standards` gained a **CSS folder layout** section: `global/`,
  `components/` (one file per reusable component), `pages/` (template-specific),
  `editor/` (block-editor-only, imported from `editor.css`) and `vendor/`,
  imported in that order, one group per folder.
  This is the layout every recent project already used by hand; the wizard kept
  writing the four files to the root, so each new theme had to be fixed.

### Fixed
- **`create-block` no longer writes `sage` into renamed themes.** The July fix
  stopped hardcoding the theme *folder* in docs, but the code templates still
  shipped the `sage` text domain (`block.json` `textdomain`, every `__()` call),
  `BlockManager::$namespace = 'sage'` and `IconPicker`'s `THEME_SLUG = 'sage'` —
  which 404s every icon in a theme not named `sage`. Surfaced on a real project
  whose first block came out with `'sage'` throughout. Now:
  - Phase 0 reads **Theme identity** first — `Text Domain` from `style.css` and
    the theme folder name — and bails if either is missing or still `sage`.
  - Copied templates use placeholders (`__TEXT_DOMAIN__`, `__THEME_SLUG__`,
    `__BLOCK_NAMESPACE__`, alongside the existing `__BLOCK_TITLE__`) that must
    be replaced on copy; block templates use `<text-domain>`.
  - Check 0.1 asks for the block namespace on first bootstrap (suggesting the
    theme slug), since it's stored in post content and can't change later.
  - New warning **0.17** flags leftover `sage` identity in themes bootstrapped by
    older kit versions (warn only — no auto-fix).
  - `_docs/examples.md` uses `acme` / `acme-2026` instead of `sage`.
- **`prettierignore.example` now covers `resources/{js,css}/vendor/`.** Vendor
  libs are committed there per `CLAUDE.md` › Blocks, which puts them inside the
  `{app,resources}` lint-staged glob — the first commit touching a vendor bundle
  would have reformatted third-party code (seen with `swiper-bundle.min.js/.css`).

## 2026-09-16

### Added
- **`css-standards` › Interactive element sizing.** Buttons, button-like links,
  tags/badges and similar controls are sized by padding + font
  size/line-height, never `height`/`min-height`/`width`/`min-width` (or
  `h-*`/`w-*`). Nothing in the kit said this, and a first button built from a
  Figma kit pinned `min-height` to match drawn heights that included 24px icon
  boxes the implementation did not have. Copy the Figma padding literally and
  accept a few px of difference. Form fields (input, textarea, select) are the
  one exception on width: they take `width: 100%` and follow their container.

## 2026-09-15

### Fixed
- **`lint-staged` no longer reformats third-party code.** The documented glob
  was `*.{css,blade.php,js,jsx}`, which is safe on Bedrock (where `vendor/` is
  never committed) but wrong for the layout this kit actually targets: on the
  plain Pantheon upstream both `vendor/` and `public/build/` are committed, so
  the pre-commit hook handed Prettier every third-party and build-output file
  that was staged. Surfaced on a real first commit, where **119 of 145 matched
  files** were `vendor/` or `public/build/` — Laravel's own Blade views under
  `vendor/illuminate/pagination/` among them — which breaks `CLAUDE.md` ›
  Critical Rules ("never modify third-party files"). The glob is now scoped to
  `{app,resources}/**/*.{css,blade.php,js,jsx}`.

### Added
- **`prettierignore.example`** → `<theme>/.prettierignore`, covering `/vendor/`,
  `/public/` and `/node_modules/`. Second guard behind the narrowed glob, and it
  also protects a manual `npx prettier --write .`. Added to the import manifest
  in `README.md` and to `project-init`'s Phase 1 table.
- **Verification step** in README › Code formatting — a `git diff --cached`
  one-liner that must print `0` before the first commit.

## 2026-07-20

Block asset-loading convention reworked after building the first real block
(a Swiper image carousel on a Pantheon + Sage 11 project).

### Changed
- **A block's own front-end CSS/JS is now declared in `block.json` via `file:`**
  (`viewStyle: file:./block.css`, `viewScript: file:./block.js`) and served
  straight from source — WordPress enqueues them conditionally, only where the
  block renders. Consequences: `block.css` is **plain CSS** (no
  `@apply`/`@reference`) and `block.js` is **plain vanilla** (no `import`).
  Vite now compiles only the editor's `block.jsx`.
- **`create-block` skill:** dropped the `discoverBlockAssets()` Vite wiring
  (removed check 0.7, the `vite.config.js` idempotency row, and the
  vite.config additions section); `block.json`/`block.css`/`block.php`/`block.js`
  templates updated; new **"Block asset loading"** section documents the two
  mechanisms (block-owned assets via `file:` vs. third-party vendor libs via
  `wp_register_*` in `setup.php` + `wp_enqueue_*` in `block.php`).
- **`CLAUDE.md`:** **Blocks** section gained the canonical asset rule; **CSS**
  section notes the block-scoped-CSS-is-plain-CSS exception.
- **`create-block` comment hygiene:** new Behavior Rule — emitted files follow
  `CLAUDE.md`'s comment standard (why-not-what, no boilerplate "what" comments,
  no leftover commented-out scaffolding). Blade template's `{{-- View-only --}}`
  boilerplate removed; template guidance comments relabeled as scaffolding.
- **`create-block` Tailwind-first / optional block assets:** new Behavior Rule —
  one-off layout goes in the Blade as Tailwind utilities; `block.css` (+
  `viewStyle`) is generated **only** for reusable/semantic CSS or lib overrides,
  and `block.js` (+ `viewScript`) **only** when the block has real behavior. A
  presentational block ships neither. Files list split into always/optional;
  `block.css` example changed from a layout rule to a scoped vendor override;
  Blade template models base spacing via `py-16`.

## 2026-07-18

Hardening pass driven by the first real-world import (a Pantheon + Lando + Sage
11.2.1 project). Each item below is a gap a dev following the kit literally would
hit.

### Fixed
- **Pantheon deploy no longer white-screens.** `gitignore.example` stopped
  ignoring the theme's `vendor/` and `public/build/`. On the plain Pantheon
  upstream the kit targets (WP core committed, no build step) the platform serves
  exactly what's pushed, so those must be committed — otherwise Sage's
  `functions.php` `wp_die()`s on the missing autoloader and there's no compiled
  CSS/JS. New README section **"Deploying to Pantheon"** documents the theme
  `.gitignore` edit and the Integrated Composer + Build Tools alternative.
- **`ImageUploadWithHover` i18n.** `placeholder` and `buttonText` were passed
  through `__()` a second time (`__(__())`) and, being `__()` on a variable,
  weren't extractable by `make-pot` — no placeholder text was translatable. Props
  now hold already-localized strings; the defaults carry the `__()`.
- **`css-foundation-wizard` wiring example** no longer opens with a bare
  `@import "tailwindcss";` (which read as "replace Sage's stock line"). It shows
  only the four foundation `@import`s, appended below Sage's stock
  `@import`/`@source` lines, with an explicit "don't touch what's above".

### Changed
- **PHP requirement raised 8.2 → 8.3+** in the README prerequisites and
  troubleshooting (Sage 11.2.1 declares `>=8.3`; latest stable recommended).
- **Theme name no longer hardcoded as `sage`.** The scaffold step states the
  convention (name the theme after the project) and every downstream path uses
  `<theme>`; ties to the launch-list Theme-identity blocker.
- **Scaffold step hardened** — set Vite's `base:` to the real theme path (Sage's
  stock Bedrock path 404s every asset) and claim the theme identity in `style.css`
  (`Theme Name`/`Author`/`Text Domain`, `Version` → `1.0.0`) + `package.json`
  `name`.
- **npm/pnpm is the dev's call** — the README/`project-init` now say to stay
  consistent per project (Sage ships a `pnpm-lock.yaml`; don't commit both
  lockfiles) instead of prescribing npm.

### Added
- **`mu-plugins/acorn-pantheon-storage.php`** — new kit artifact and Pantheon
  blocker. Acorn compiles Blade views into `wp-content/cache/acorn` by default,
  which is read-only on Pantheon Test/Live — so every request `wp_die`s. This
  drop-in mu-plugin defines `ACORN_STORAGE_PATH` = `wp-content/uploads/acorn`
  (writable everywhere) and creates the tree before the theme boots Acorn, with
  no theme edit. Added to the import manifest and the `project-init` deploy step;
  must land in a project's first commits. Verified end-to-end on a live Pantheon
  site.

### Removed
- **The Critical Rule gating `lando pull`.** It only affects the local
  environment, so the dev decides. The workflow steps that use it (the initial
  DB/uploads pull) stay.

## 2026-07-16

### Added
- **`skills/create-block/SKILL.md`** — image fields suggest recommended upload
  dimensions (per-role table) in the field label and the picker placeholder, so
  editors upload correctly-sized media.
- **`CLAUDE.md` › WordPress Settings** — new rule to disable WordPress comments
  entirely (all post types, admin UI, existing content) rather than leaving an
  unused, unmoderated attack surface.

### Changed
- **`global-skills/commit-rules.md`** — default commit messages to subject-only;
  add a one-line body only when the *why* isn't obvious from subject + diff.

### Fixed
- **`css-foundation-wizard` / `css-standards`** — foundation files live in
  `resources/css/`, not `resources/styles/`, so the `@import`s resolve and the
  path stops colliding with Sage's stock `@styles` → `resources/css` alias.

## 2026-07-09

### Added
- **`skills/css-foundation-wizard/SKILL.md`** — new skill: an interactive 4-step
  wizard (variables → base → typography → global, each depending on the previous)
  that writes a theme's CSS foundation from a free-text style guide and wires the
  files into `resources/css/app.css`.

## 2026-06-15

### Added
- **`CLAUDE.md` › CSS › Theme CSS foundation** — documents the three foundation
  files every theme starts with: `variables.css` (design tokens via Tailwind v4
  `@theme`, so tokens become utilities), `base.css` (unclassed defaults for HTML
  primitives in `@layer base`), and `typography.css` (semantic type classes like
  `.heading-1` in `@layer components`). Includes the base-vs-typography distinction.
- **`_docs/launch-list.md` › Theme identity** — new section: `Theme Name`,
  `Author`, `Author URI` and `screenshot.png` must be defined and non-generic
  before delivery (never ship as Sage/Roots). Author identity is left to the dev;
  the rule only blocks undefined/default values.
- **`skills/html-qa-smoketest/SKILL.md`** — new check `SEO-6` flags generic
  WordPress/Sage branding leaking into rendered HTML (meta `generator`, default
  tagline, starter names), plus a note that theme author/screenshot are verified
  via the launch list, not the smoke test.

### Fixed
- Blade Tailwind class sorting: enable `@shufo/prettier-plugin-blade`'s
  `sortTailwindcssClasses` (the tailwindcss plugin can't wrap the Blade parser).

### Changed
- Replace `husky init` with a git-root-aware `prepare` hook installer
  (`install-git-hooks.example.mjs`) so the pre-commit hook works when the theme
  is a subdirectory (Pantheon / full-site repos), not just a standalone theme
  repo. Drop the `husky` dependency.
- **Changelog policy** — entries are now for *notable, release-level* changes
  tied to a version bump, not a line per file/commit. The `commit-rules` skill
  decides when an entry is warranted and asks before adding one. Trimmed the
  `CLAUDE.md` rules to a principle, moved the procedure into the skill, and
  softened the matching PR Checklist items.

## 2026-06-04

### Added
- **`prettier.config.example.js`** — new kit artifact: a Prettier config wiring
  `prettier-plugin-tailwindcss` + `@shufo/prettier-plugin-blade` so Tailwind
  class order is sorted automatically in **both** Blade markup and `@apply`
  bodies (tailwind plugin listed last, Blade parser override for `*.blade.php`).
- **`README.md` › Code formatting (enforced for every dev)** — new section: copy
  the Prettier config into the theme, then enforce it repo-wide with a
  `husky` + `lint-staged` pre-commit hook that reformats staged Blade/CSS/JS.
  Because husky installs via the `prepare` script, every dev who clones the repo
  gets the same hook on `npm install` — no per-machine config. Added a matching
  import-manifest row and "What's here" entry.
- **`CLAUDE.md` › CSS** — two rules: class order is automated (never hand-sort;
  pre-commit enforces it), and a minimal idiomatic guide for the rare
  hand-written CSS (one declaration per line, lowercase short hex, unitless zero,
  leading zero).
- **`global-skills/commit-rules.md`** — new user-level skill holding the commit
  convention (message format, the `FEAT`/`FIX`/`REFACTOR`/`CHORE`/`DOCS`/`STYLE`
  types, and a step-by-step commit flow). Lives in the new `global-skills/`
  folder: flat files meant to be installed once to `~/.claude/skills/` and
  shared across every project — distinct from per-project `skills/`. Carries
  its own guard-rails (never push, no co-author, English, one subject per
  commit).
- **`README.md` › Global skills (user-level)** — new section instructing the AI
  assistant to inspect `global-skills/` after a project import, recommend each
  skill, and install it **only with the user's consent** (converting the flat
  `.md` to the `~/.claude/skills/<name>/SKILL.md` layout; never overwriting an
  existing skill). Mirrored in the manual-copy section.

### Changed
- **`CLAUDE.md` › Git** — replaced the inline commit format + types block with a
  pointer to the `commit-rules` SKILL, plus a fallback to the **Critical Rules**
  guard-rails when the skill isn't installed. The push/co-author/English
  guard-rails remain in **Critical Rules** so they stay in context regardless of
  whether the skill is loaded.

## 2026-06-01

### Added
- **`skills/create-block/SKILL.md` › Anchor support (every block).** Every
  scaffolded block now wires Gutenberg's HTML anchor support by default:
  - `block.json` template gains `"supports": { "anchor": true }` (registers
    the `anchor` attribute automatically — not declared under `attributes`).
  - `block.php` template passes
    `'anchor' => sanitize_html_class($attributes['anchor'] ?? '')` to the
    view, since server-rendered blocks don't auto-emit the id on the front
    end.
  - Blade template renders the id **only on the `<section>` wrapper**
    (`<section @if ($anchor) id="{{ $anchor }}" @endif class="<slug>">`).
  - `block.jsx` needs nothing — `useBlockProps()` already applies the anchor
    id in the editor preview.
  - New "Anchor support" subsection in Phase 2 + a matching Behavior Rule
    documenting the **dynamic-id rule**: any unique id a block needs at render
    time (e.g. a Swiper instance id targeted by `block.js`) goes on an inner
    `<div>` (generated via `wp_unique_id(...)`), never on the `<section>` —
    otherwise it would collide with and overwrite the editor's anchor id.
    Reason: editors must be able to deep-link to any section (`#my-section`),
    and reusing the section id for instance-level identifiers breaks that.

## 2026-05-24

### Added
- **`CLAUDE.md` › Critical Rules** — three new rules:
  - "Never modify WordPress core files or third-party plugin files."
    The only exception is plugins we own (built in-house); if uncertain
    about ownership, stop and ask before editing. Rationale: any change
    inside core or vendored plugins is wiped at the next update.
  - "Always maintain a `CHANGELOG.md` in every theme and in every
    plugin we own that we touch." Create it on first change if missing;
    append an entry every subsequent change. Format = [Keep a
    Changelog](https://keepachangelog.com) — header
    `## [version] - YYYY-MM-DD`, subsections `Added` / `Changed` /
    `Fixed` / `Removed`.
  - "Always version the theme and every plugin we own" following SemVer
    (`MAJOR.MINOR.PATCH`). MAJOR for breaking changes, MINOR for
    backwards-compatible additions, PATCH for fixes. Version declared
    in the theme's `style.css` header / the plugin's main PHP file
    header; every bump corresponds to a new dated entry in the
    `CHANGELOG.md`. Note: this versioning rule applies to
    **downstream themes/plugins** that import these standards — this
    standards repo itself is not versioned (no formal releases).
  - Three matching items added to the PR Checklist (`CHANGELOG.md`
    updated, version bumped, core/plugin files untouched).
- **`_docs/launch-list.md`** — pre-launch checklist for WordPress site
  go-lives. Static markdown (no AI automation) with checkboxes grouped
  into 11 categories: content cleanup, WordPress core settings, security,
  SEO & indexing, performance, analytics & legal pages, email & forms,
  required pages & layouts, validation (a11y + HTML validator),
  Sage/Pantheon pre-deploy, last-mile manual smoke (including site
  search, broken-link scan, cross-browser + device matrix). Items
  tagged by severity: 🚫 Blocker (must fix before launch), ⚠️ Important
  (fix ASAP after), 💡 Nice to have. Copied per project into
  `<project>/_docs/launch-list.md`. README updated with the new file
  location + the copy step for new projects.

### Changed
- **`CLAUDE.md` trimmed 168 → ~135 lines** (~20%) in a context-efficiency
  pass — CLAUDE.md auto-loads on every conversation, so every cut
  saves tokens repeatedly. Critical Rules tightened by removing
  rationale tails ("the goal is…", "guessing wrong wastes…") and
  inlining the SemVer sub-list; CSS section dropped the trivial
  `.card-title` `@apply` example (basic knowledge for any Sage dev);
  PHP/Blade replaced the standalone `wp_get_attachment_image` code
  block with a one-line bullet; merged the 1-bullet `Performance`
  section into PHP/Blade (the `WP_Query` rule joined the image rule).
  Sanitization and `wp_register_*`/`wp_enqueue_*` code blocks were
  **kept** — they're WP-specific patterns where exact function names
  and ordering matter. No semantic changes; every rule preserved.
- **`EXAMPLES.md` moved to `_docs/examples.md`** (lowercase, inside `_docs/`).
  Root of a freshly-initialized project should only carry files that
  *must* live there (`CLAUDE.md` for Claude auto-discovery; `.gitignore`
  for git). Reference docs that the AI loads on demand belong in
  `_docs/`. Updates:
  - `README.md` rewrote the "How to use it on a new project" section
    as an **import manifest table** (From / To / Notes) so an AI told
    *"access this repo and import the kit"* can execute the placement
    deterministically — no bash script required. Manual bash flow kept
    as a fallback for devs who prefer it. Top-level file tree updated.
  - `skills/create-block/SKILL.md` updated the two `EXAMPLES.md`
    references to `_docs/examples.md`.
  - Memory `project-init-kit.md` aligned.
- **`skills/create-block/SKILL.md` trimmed 962 → ~620 lines** without
  losing semantics, after a context-efficiency review:
  - Fixed 3 stale references to `@wordpress/icons` — the package is no
    longer required (RemoveButton was refactored to a plain `<button>`
    pill). Removed from check 0.10, `npm install` command, and the
    package.json notes. Memory `project-init-kit.md` aligned.
  - Deleted Phase 3.2 ("no longer applicable" placeholder section).
  - Deduped infra templates: `BlockManager.php` moved out of the
    inline SKILL.md doc to `<skill>/templates/BlockManager.php`; the
    `blocks.php` inline duplicate removed (template is the single
    source of truth). SKILL.md just references `<skill>/templates/<file>`.
  - Consolidated 5 idempotency tables into one decision table.
  - Trimmed verbose "how to ask" / "show the plan" / "vendor libs"
    duplications down to one mention each.
  - Trimmed Behavior Rules to only the skill-specific items; the rules
    that duplicate `CLAUDE.md` (English, no co-author, no production
    writes, no assumptions, push back) are now referenced as a
    one-line "live in CLAUDE.md and apply automatically".
- **`skills/create-block/templates/BlockManager.php`** added (new file).
  Moved out of the SKILL.md doc body to live alongside the other infra
  templates — matches the pattern already used for `BlockCategories.php`,
  `blocks.php`, `preview.svg`, and the 7 shared components.

- **`LinkPicker` switched to native Gutenberg `LinkControl` shape.**
  Dropped the `#opensInNewTab` URL-marker hack — the link attribute is
  now declared as `"type": "object"` (default `{ "url": "",
  "opensInNewTab": false }`) and the component passes `value`/`onChange`
  straight through to `<LinkControl>`. `settings` prop forwarded
  unchanged (default = WP's built-in `[opensInNewTab]`; callers can
  pass `[{id:'nofollow',title:'Mark as nofollow'},...]` to extend).
  Render side now emits **only `target="_blank"`** when the flag is
  true — `rel="noopener"` is no longer hardcoded because WP core's
  `wp_targeted_link_rel()` filter (priority 15 on `the_content`)
  injects it automatically into any rendered link with `target="_blank"`.
  Removes the stringly-typed flag bag, aligns the attribute with what
  Gutenberg natively expects, and opens the door to `nofollow` / other
  toggles without growing the URL. `block.php` reads
  `$attributes['ctaLink']['url']` + `['opensInNewTab']` directly;
  inference tables in `SKILL.md` + per-attr generation rules updated;
  `EXAMPLES.md` description aligned.
- **`RemoveButton` reworked** — now a red pill button matching the
  exact visual style of the `ImageUploadWithHover` "Remove image"
  button (white text on `#dc2626`, 4×8 padding, 4px radius, 12px /
  weight 500 font), so the destructive surfaces in the editor share
  one consistent look. Default label "Delete Item". Replaces the
  earlier trash-icon button. Caller no longer fights the component's
  sizing/positioning. Canonical placement for repeater items is the
  **top-right of the active item's panel**
  (`<div className="flex justify-end"><RemoveButton .../></div>`,
  gated by `items.length > 1`), not inline with the field row. Reason:
  the trash icon was visually noisy and competed with field controls
  for attention; a pill-styled "Delete Item" pinned to the top-right
  reads as a panel-level action and frees up the bottom of the form
  for content fields.
- **`LinkPicker` button sized to match the white-card input height**
  (`!min-h-[46px] !px-3 !bg-white !border !border-gray-300 !rounded`).
  A `CTA text` (plain input) + `CTA link` (LinkPicker) pair sitting
  in a `flex gap-3` row now lines up at exactly the same height,
  instead of the LinkPicker's WP-default ~36px sitting visibly
  shorter than the wrapped input.
- **Field control rule documented** in `SKILL.md` (Phase 1 attribute
  inference) and `EXAMPLES.md` (editor layout pattern): **long copy
  uses `<RichText>`**, **headings / labels / simple short text use a
  plain `<input type="text">`** inside the same white-card wrapper.
  Inline bold/italic/link in a heading or button label is almost
  always wrong, and a single-line `<input>` has better placeholder
  and accidental-newline behavior than `RichText`. The keyword
  lookup table now routes `title`/`heading`/`subtitle`/`label` and
  the button-pair text → plain input; only
  `description`/`body`/`content`/`paragraph`/`quote`/`copy` keeps
  `RichText`. Per-attribute-type table split `string` into two rows
  (heading-style vs description-style) so the generated `block.jsx`
  picks the right control per field.
- The reference `testimonial-carousel` block in `EXAMPLES.md` updated
  to demonstrate the new pattern end-to-end: heading + author as
  plain inputs, quote as RichText, delete button at the top-right of
  the active slide's panel.
- End-to-end validated in `test-workflow` — `hero` (heading, subtitle,
  cta text as plain inputs; cta link via LinkPicker aligned at same
  height) and `feature-list` (heading + item title as plain inputs,
  item description as RichText, "Delete" button top-right of the
  active feature's panel) rebuilt and visually checked in the
  Gutenberg editor.

## 2026-05-20

### Added
- `skills/create-block/SKILL.md` — scaffolds a new Gutenberg block in the
  canonical layout. Phase 0 verifies and (with dev consent) bootstraps the
  block infrastructure: `BlockManager`, folders, `vite.config.js`
  `discoverBlockAssets()`, `editor.js` glob, `app.css` `@source`,
  React 18 deps, vendor folders, **custom block category filter**
  (`block_categories_all` — first-run asks for the name, default
  "Custom Blocks"). Phase 0 also runs a **global-enqueue smell detector**
  (warns when vendor-lib enqueues appear outside `block.php`). Phase 1
  pre-extracts info from the dev's request, auto-derives the slug from
  the title (WP convention: lowercase + hyphens), picks the Dashicon
  itself based on context, batches missing-info questions, and never
  asks about vendor libs. Phase 2–4 generates files, registers in
  `BlockManager::$blocks`, and hands off `npm run dev|build`.
  Validations are cheap-only (slug regex, folder existence, duplicate
  in `$blocks`) — clash with `core/*` is left to fail at build.

### Changed
- `EXAMPLES.md` rewritten around the canonical team layout:
  - `app/Blocks/BlockManager.php` owns the manual blocks list, global
    attributes (padding presets), and a `$libs` registry that registers
    vendored libs once and enqueues them per block via `render_block` —
    no global loads.
  - Block folder is `resources/blocks/<slug>/` with files literally named
    `block.json`, `block.php`, `block.jsx`, `block.js`, `block.css`.
  - `block.json` uses `"render": "file:./block.php"`; no `render_callback`
    is passed to `register_block_type`. `block.php` shapes data and calls
    `\Roots\view('blocks.<slug>', $data)->render()`.
  - Local block assets (`block.js`, `block.css`) are discovered by
    `vite.config.js` (`discoverBlockAssets()`); no `viewScript`/`style`
    keys in `block.json`.
  - Vendor libs live in `resources/{js,css}/vendor/` as pre-built
    distributables and are served directly via `get_theme_file_uri()` —
    not shipped through the Vite build.
- `BlockManager` simplified: no longer owns vendor libs.
  `wp_register_script`/`wp_register_style` moved to `app/setup.php`
  (single source for URL + version). Each `block.php` that needs a lib
  calls `wp_enqueue_script`/`wp_enqueue_style` directly. `$blocks`
  reverted to flat array of slugs; the `render_block` filter is gone.
- `BlockManager::$namespace` comment clarified — it's the Gutenberg
  block prefix, not the PHP namespace or text domain.
- `block.php` example switched to the global `view()` helper (instead
  of `\Roots\view()`) and applies `absint()` / `(bool)` / `sanitize_text_field()`
  consistently with `CLAUDE.md › PHP/Blade`.
- `EXAMPLES.md` `app/setup.php` example now registers a `custom-blocks`
  Gutenberg category via `block_categories_all`, so every scaffolded
  block lands in the same place in the inserter. The testimonial-carousel
  reference block's `block.json` `category` updated from `design` to
  `custom-blocks` to match.
- **Block category refactored to a class** (`app/Blocks/BlockCategories.php`)
  with consts `SLUG` / `TITLE` and static `register()` — replaces the
  inline `add_filter('block_categories_all', ...)` previously documented.
  Adds dedupe + priority 5. Called from `setup.php` as
  `\App\Blocks\BlockCategories::register();`.
- **Canonical `block.jsx` layout** documented in `EXAMPLES.md` and shipped
  as the Phase 2 template in the `create-block` skill:
  - `<PaddingControls />` (sidebar) rendered outside the wrapper.
  - Editor body wrapped in `<section>` with `mb-10 bg-gray-50 border-2
    border-dashed border-gray-600 rounded-lg p-6` — dashed border + light
    bg color + margin to visually separate blocks in the editor.
  - Header `"<Title> Preview"` in muted uppercase.
  - Each content field in a labeled white card
    (`<div className="p-3 border border-gray-300 rounded bg-white">`).
  - Inspector = configuration; body = content (split documented in skill).
- **Shared backend components** added under
  `skills/create-block/templates/components/backend/` and documented in
  `EXAMPLES.md`. Phase 0 of the `create-block` skill copies them into the
  project as part of bootstrap: `ImageUploadWithHover.jsx`, `LinkPicker.jsx`
  (wraps Gutenberg's `LinkControl` for internal/external + new-tab),
  `RemoveButton.jsx`, `TabSelector.jsx` (tab-based array repeater),
  `PaddingControls.jsx`, `padding-presets.js`, `ImagePositionControl.jsx`.
- `skills/create-block/templates/BlockCategories.php` added — class template
  copied during Phase 0 bootstrap when the category isn't registered yet.
- The reference testimonial-carousel block in `EXAMPLES.md` now demonstrates
  the full canonical pattern: bg image (`ImageUploadWithHover` +
  `ImagePositionControl`), heading (RichText in white card), slides
  (`TabSelector` repeater + `RemoveButton`).
- **Inserter-hover preview** (`preview.svg`) baked into the canonical
  block layout. Every block scaffolded by the `create-block` skill gets:
  a `preview.svg` in its folder (string-substituted from
  `<skill>/templates/preview.svg`, with `__BLOCK_TITLE__` replaced by the
  block's `<Title>`); an `isPreview` boolean attribute + an `example`
  field in `block.json`; and a short-circuit at the top of `edit()` that
  returns only the SVG when `isPreview === true`. Devs can swap the file
  for a real `.webp`/`.png` later — the wiring stays.
- **Block bootstrap centralized in `app/blocks.php`** — replaces putting
  `BlockCategories::register()` and the `BlockManager` `init` action in
  `setup.php`/`filters.php`. Loaded by `functions.php`'s
  `collect(['setup', 'filters', 'blocks'])` (Sage's "categorically named
  theme files" mechanism). `setup.php` and `filters.php` go back to their
  vanilla Sage roles. Vendor libs still live in `setup.php` since they're
  theme-level asset registration, not block bootstrap. The new
  `skills/create-block/templates/blocks.php` is copied during Phase 0
  bootstrap; Phase 0 also edits `functions.php` to add `'blocks'` to the
  `collect` array, or bails if `functions.php` doesn't use that pattern.
- **Phase 0 idempotency + per-file divergence heuristic** documented in
  `SKILL.md`. Each create/modify target (`app/blocks.php`,
  `functions.php`, `vite.config.js`, `editor.js`, `app.css`) has an
  explicit table of detected states → action (skip if already wired;
  apply if missing and stock-Sage shape; bail with diagnostic if shape
  diverges). Makes re-invocation safe (no duplicate code) and prevents
  silent breakage when the dev's files have unusual shapes.
- **`@wordpress/icons` added to required devDeps** (Phase 0 check 0.10).
  Surfaced during end-to-end test of the skill: `RemoveButton.jsx`
  (shared component) imports `trash` from `@wordpress/icons`, and
  `@roots/vite-plugin`'s `wordpressPlugin()` doesn't externalize the
  `icons` package (only `blocks`, `block-editor`, `components`, `element`,
  `i18n`, `dom-ready`, `hooks`). Build fails with `failed to resolve
  import "@wordpress/icons"` until installed. Templates section's
  `npm install` command updated; Group B description in Bootstrap UX
  updated; Phase 0 check 0.10 expanded with the rationale.
- **End-to-end skill validation** in `test-workflow` — created `hero`
  (heading, subtitle, bg image, CTA link) and `feature-list` (heading +
  array of items via TabSelector) blocks following the canonical
  pattern; inserted into the Sample Page via `wp post update`. All 3
  blocks (`hero`, `feature-list`, `test-block`) render server-side
  correctly; Chrome accessibility tree confirms markup; no console
  errors; inserter shows "Custom Blocks" category with preview SVGs on
  hover. Confirms the whole pipeline (Phase 0 infra → block files →
  BlockManager registration → Vite build → server render via Blade) is
  consistent end-to-end.
- **Attribute type inference** documented in Phase 1 of `SKILL.md`.
  New subsection "Attribute type inference (description → type +
  control)" with: (a) keyword lookup table covering string / number /
  boolean / array / image / link / color / video / alignment / layout
  attributes plus the editor control to render for each; (b) special
  expansion rules (image keyword → `Id`+`Url` pair; "bg image" → also
  `Position`; "button"/"cta" alone → `Text`+`Link` pair; array with
  sub-fields → recurse inference per sub-field); (c) ambiguity rule —
  ask before guessing when the description hits multiple categories or
  none; (d) "show the inferred plan" pre-write gate so the dev can
  override any inference without back-and-forth.

## 2026-05-18

### Added
- `README.md` — the start-a-project workflow (Pantheon + local-only) and how
  to consume this repo.
- `CLAUDE.md` — the dev standard (seeded verbatim from the team good-practices
  gist). This repo is now the source of truth.
- `skills/html-qa-smoketest/SKILL.md` — authoritative QA skill (table-based
  checklist with per-item severity).
- `EXAMPLES.md` — one complete reference block (code in fenced blocks)
  showing the `CLAUDE.md` rules composed in context, for AI grounding.
- `gitignore.example` — base ignore rules for WP + Sage 11 + Lando.

### Changed
- `CLAUDE.md` › Critical Rules: added "never make assumptions — ask when
  unsure" and "don't just agree — push back on flawed requests".
- `CLAUDE.md` › Critical Rules: replaced the generic "never push a database to
  production" with "never alter anything in production/remote without explicit
  request" (read-only remote commands free; writes and `lando pull` gated).
  PR checklist line aligned.

### Notes
- Standards source of truth moved from the gists to this repo.
- Dropped the earlier automation script approach in favor of a plain
  documentation/reference repo (the bring-up is interactive anyway).

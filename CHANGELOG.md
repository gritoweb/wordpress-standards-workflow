# Changelog

Notable changes to the GritoWeb WordPress standards.

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
- **`editorCanvas.js`** — canvas constants: `EDITOR_TYPE` tiers, `emptyLink()`.
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
- **`create-block/SKILL.md`** — template `block.jsx` rewritten: canvas with real
  data (no `dashed-border` wrapper), `InspectorControls` limited to config-only
  controls (padding, entrance, layout, focal point, dividers), text edited inline
  via `AutoGrowingTextarea`/`ParagraphsField`, images via
  `AttachmentImageControl`, CTA via `ActionEditor` popover on canvas.
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
- **`README.md`** — "What's here" table includes new skills.

### How verified
- All new files created and exist on disk.
- `create-block/SKILL.md` template has no `dashed-border`, no `ActionEditor` in
  `InspectorControls`, CTA editing is inline on canvas.
- `AttachmentImageControl.jsx` has `data-attachment-remove` × button.
- `site-settings-wizard` contains zero references to ACF.
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

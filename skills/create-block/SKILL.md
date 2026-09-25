---
name: create-block
description: >
  Scaffold a new Gutenberg block for a Sage 11 + Acorn theme following the
  team's canonical layout. Use this skill whenever the user asks to create,
  add, scaffold, or generate a new block — variations include "create a hero
  block", "new block for X", "add a testimonials section as a block",
  "scaffold a custom block", etc. Handles the full lifecycle: verifies the
  theme has the block infrastructure (BlockManager, folders, Vite config,
  editor.js glob, React 18 deps, Tailwind `@source`), bootstraps any missing
  pieces with explicit dev confirmation, then generates the block folder
  (`block.json`/`block.php`/`block.jsx`/`preview.svg`, plus `block.js`/`block.css`
  only when the block needs them), the Blade view, and wires the block into
  `BlockManager`.
---

# create-block — Sage 11 Gutenberg block scaffolder

Generates a new block folder under `resources/blocks/<slug>/` plus a Blade
view, following the canonical layout. Before generating, verifies the theme
has the block infrastructure in place; bootstraps it if missing, with the
dev's explicit consent (two gates — creations vs. modifications).

Never runs `npm` / `composer` / `lando` / `git` commands. The dev does
that themselves.

> **Hard rule — no content editing in the sidebar.** A button (label +
> link), a link or any text is edited on the **canvas**: click the button
> preview → `<ActionEditor>` opens inline right under it. `<InspectorControls>`
> holds configuration only (item list, background media, block settings,
> Spacing, Entrance animation) and must never contain `ActionEditor`,
> `LinkPicker`, `LinkControl`, `TextControl`, `RichText` or
> `AutoGrowingTextarea` (a numeric `TextControl type="number"` setting is
> fine). `scripts/editor-fidelity.mjs` reports a block that breaks this; fix
> it before calling the block done.

---

## Pre-conditions

- Working directory = active Sage 11 theme root (must contain `vite.config.js`,
  `app/setup.php`, `composer.json`, `resources/`). If unsure, **ask** — don't guess.
- Composer/Node run on the host (Lando only serves WP).
- Standards = `CLAUDE.md` + `docs/examples/` (older projects: `_docs/`) (read its `README.md`, then only the closest block's folder, whose files you copy). If those aren't in the project,
  treat this skill as the standard.

---

## Execution Flow

1. **Phase 0** — Verify infra; bootstrap missing pieces (with dev consent).
2. **Phase 1** — Collect block requirements.
3. **Phase 2** — Generate the block files (always: `block.json`/`block.php`/`block.jsx`/`preview.svg` + Blade view; `block.js`/`block.css` only when needed).
4. **Phase 3** — Register the block in `BlockManager`.
5. **Phase 4** — Hand off with next-step instructions.

---

## Phase 0 — Infrastructure check

Run every check below; show the dev a status table before doing anything else.

### Theme identity (read before any check)

Templates and generated blocks are theme-specific. Read these two values first
and substitute them everywhere — **never write a literal `sage`** into a
project:

| Value | Source | Used as |
|---|---|---|
| `<text-domain>` | `Text Domain:` header in the theme's `style.css` | `__TEXT_DOMAIN__` in copied components, `<text-domain>` in block templates |
| `<theme-slug>` | the theme root's folder name (e.g. `acme-2026` in `wp-content/themes/acme-2026`) | `__THEME_SLUG__` in `IconPicker.jsx` |

If `Text Domain` is missing, or either value is still `sage`, **bail out**: the
theme's identity hasn't been claimed yet (`project-init` › Phase 3,
`docs/launch-list.md` › Theme identity). Anything scaffolded now would bake the
wrong domain/path into every file.

### Required infra (skill bootstraps if missing)

| # | Check |
|---|-------|
| 0.1 | `app/Blocks/BlockManager.php` exists. Template at `<skill>/templates/BlockManager.php`. **First-run only**: ask `"Qual namespace pros blocos? Sugiro '<theme-slug>'. Ele vai no nome de cada bloco salvo no conteúdo, então não dá pra trocar depois sem migrar os posts."`, then replace `__BLOCK_NAMESPACE__` with the answer (lowercase, `[a-z0-9-]`). |
| 0.2 | `resources/blocks/` exists |
| 0.3 | `resources/views/blocks/` exists |
| 0.4 | (removed: vendor libs live in `resources/vendor/<lib>/`, created only when a block needs one) |
| 0.5 | (removed, see 0.4) |
| 0.6 | `app/blocks.php` is the **central block-bootstrap file** — must (a) exist, (b) contain top-level `BlockCategories::register();` and `BlockMotion::register();`, (c) contain `add_action('init', function () { (new BlockManager())->register(); });`, (d) be loaded by `functions.php`'s `collect([...])` array (see 0.6.1). Template at `<skill>/templates/blocks.php`. |
| 0.6.1 | `functions.php`'s `collect([...])` array includes `'blocks'`. Without it, `app/blocks.php` never loads. If `functions.php` doesn't use the `collect([...])` pattern at all, **bail out** — needs manual wiring. |
| 0.8 | `resources/js/editor.js` calls `import.meta.glob('../blocks/*/block.jsx', { eager: true });` (Vite compiles the **editor** JSX only — front-end `block.js`/`block.css` are served from source via `file:`, see `references/assets-and-anchors.md`) |
| 0.9 | `resources/css/app.css` has `@source "../blocks/**/*.{php,jsx}";` **and** scans `app/` (`@source "../../app/";` — Sage's stock line). The padding / image-position classes are literals in `app/Blocks/*.php`; without that source Tailwind never generates them and Spacing silently does nothing. |
| 0.10 | `package.json` `devDependencies` has `react@^18` AND `react-dom@^18`. **React pinned to ^18, not ^19** — React 19 breaks Gutenberg (element-symbol mismatch with WP's React 18). |
| 0.11 | `app/Blocks/BlockCategories.php` exists. Template at `<skill>/templates/BlockCategories.php`. **First-run only**: ask `"Vou criar uma categoria pros seus blocos. Quer chamar de 'Custom Blocks' (default) ou outro nome?"`, copy template, edit `TITLE` and `SLUG` (lowercase + hyphens) if dev picked a different name. The actual `BlockCategories::register();` call lives in `app/blocks.php` (check 0.6). Subsequent runs: grep `const SLUG = '...'` from the existing file. |
| 0.12 | `resources/blocks/components/backend/` contains the canonical shared components: `AttachmentImageControl.jsx`, `useAttachmentUrls.js`, `ActionEditor.jsx`, `AutoGrowingTextarea.jsx`, `editorCanvas.js`, `EntranceControl.jsx`, `entranceCanvas.js`, `DividerControl.jsx`, `ItemList.jsx`, `moveItem.js`, `RemoveButton.jsx`, `RemoveImageButton.jsx`, `coreIcons.jsx`, `ParagraphsField.jsx`, `LinkPicker.jsx`, `PaddingControls.jsx`, `padding-presets.js`, `ImagePositionControl.jsx`, `IconPicker.jsx`, `ButtonPair.jsx`. And `resources/views/components/button-link.blade.php` (template `<skill>/templates/button-link.blade.php`). If missing: copy from `<skill>/templates/components/backend/*`, replacing `__TEXT_DOMAIN__` with `<text-domain>` and `__THEME_SLUG__` with `<theme-slug>` in every copied file. |
| 0.15 | `app/Blocks/BlockPadding.php`, `app/Blocks/BlockImagePosition.php`, `app/Blocks/BlockEntrance.php` and `app/Blocks/BlockMotion.php` exist. Templates at `<skill>/templates/`. `BlockEntrance.php` must expose `fromBlock()`, `root()` and `part()` — an older copy that only has `resolve()` (it prints `data-entrance-type`) is **incompatible** with `EntranceControl`/`entranceCanvas.js`: replace it. |
| 0.16 | `app/Providers/ThemeServiceProvider.php`'s `boot()` registers three Blade directives: `paddingClasses` → `\App\Blocks\BlockPadding::resolve(...)`, `entrance` → `\App\Blocks\BlockEntrance::root(...)` and `entrancePart` → `\App\Blocks\BlockEntrance::part(...)` (see "Infra bootstrap templates"). |
| 0.18 | `resources/css/components/entrance.css` exists (template `<skill>/templates/entrance.css`) and is `@import`ed by **both** `resources/css/app.css` (front end) and `resources/css/editor.css` (canvas — without it the sidebar **Preview** does nothing visible). `resources/css/components/hover.css` exists (template `<skill>/templates/hover.css`) and is `@import`ed by `resources/css/app.css` — **not** inside `@layer`, it must beat Tailwind's transition utilities. |
| 0.19 | `resources/js/modules/entrance.js` exists (template `<skill>/templates/entrance.js`) and `resources/js/app.js` has `import { initEntrance } from './modules/entrance';` plus a top-level `initEntrance();` call (module scripts are deferred). Without it the front end never adds `data-entered` and the head script's 5s safety net is the only thing that un-hides the page. |
| 0.20 | `scripts/editor-fidelity.mjs` exists (template `<skill>/templates/editor-fidelity.mjs`). It is a report-only dev tool — see `references/infra.md` › "Editor fidelity report". |
| 0.21 | **CSS foundation — blocking.** `node scripts/check-css-foundation.mjs` exits 0. If the script is missing, or `resources/css/global/` is missing, **stop and run the `css-foundation-wizard` skill first** — never create a block on a theme without the style guide foundation (every block would fall back to browser fonts and Tailwind's stock palette). Exit 1 on an existing theme: show the listed problems and fix them before Phase 1. |

### Compatibility warnings (do NOT auto-fix)

| # | Check |
|---|-------|
| 0.13 | `vite.config.js` `base:` points to the theme's actual path (e.g. `/wp-content/themes/<active-theme>/public/build/`). Sage's default ships with `/app/themes/sage/public/build/` (Bedrock) which **breaks asset URLs** in standard WP. **Warn**, don't auto-fix. |
| 0.14 | **Global-enqueue smell.** Scan `app/**.php` + `functions.php` for `wp_enqueue_script(`/`wp_enqueue_style(` *outside* `resources/blocks/*/block.php`. Theme handles (`app`, `editor`) are fine; vendor-lib-looking handles (`splide`, `swiper`, `gsap`, …) loaded globally are a smell — warn with file:line, recommend the canonical pattern from `.claude/skills/blade-standards/SKILL.md` (register in `app/blocks.php`, enqueue in `block.php`). |
| 0.17 | **Leftover `sage` identity.** Scan `app/`, `resources/blocks/` and `resources/views/` (excluding `resources/vendor/` and an older theme's `resources/{js,css}/vendor/`) for the text domain `'sage'`, `"textdomain": "sage"`, `THEME_SLUG = 'sage'`, or unsubstituted `__TEXT_DOMAIN__` / `__THEME_SLUG__` / `__BLOCK_NAMESPACE__`. Themes bootstrapped by older kit versions carry these (and `IconPicker` 404s every icon). **Warn** with file:line and the replacement (`<text-domain>` / `<theme-slug>`); don't auto-fix. Never flag `$namespace` itself — an existing block namespace is stored in post content and must not change. |

### Bootstrap UX

If any check 0.1–0.20 (incl. 0.6.1) fails (0.21 is not bootstrapped here — it hands off to `css-foundation-wizard`):

1. Show the dev a status table of failed checks.
2. Split fixes into **(A) Creations** (new files/folders) and **(B) Modifications** (edits to `functions.php`, `editor.js`, `app.css`). `package.json` is not edited — tell the dev to run `npm install --save-dev react@^18.0.0 react-dom@^18.0.0` themselves.
3. Confirm A and B separately. For B, show inline diffs (affected hunks only). Stop if the dev declines either.

### Idempotency (per-file divergence heuristic)

Phase 0 must be re-runnable. Before each create/modify, Read the target and check the expected shape:

| Target | Expected shape | If matches | If partial | If diverges from stock |
|---|---|---|---|---|
| `app/blocks.php` (Group A) | Has `BlockCategories::register()`, `BlockMotion::register()` and `add_action('init', ...)` referencing `BlockManager` | **Skip** | Only `BlockMotion::register()` missing → insert it (plus its `use`) after `BlockCategories::register();`. Anything else missing → **Bail** — name the missing piece | **Bail** — content unrecognized; ask dev to move/rename |
| `functions.php` (Group B) | `collect([...])->each(...)` array includes `'blocks'` | **Skip** | Edit the array (insert `'blocks'`); preserve formatting | **Bail** — pattern not found / dynamic array |
| `resources/js/editor.js` | `import.meta.glob('../blocks/*/block.jsx'` | **Skip** | apply documented edit | **Bail** |
| `resources/css/app.css` | `@source "../blocks/**` and `@import './components/entrance.css'` | **Skip** | apply documented edit | **Bail** |
| `resources/css/editor.css` | `@import './components/entrance.css'` | **Skip** | append the import | **Bail** |
| `resources/js/app.js` | imports and calls `initEntrance` | **Skip** | add the import + call | **Bail** |
| `app/Providers/ThemeServiceProvider.php` (Group B) | `boot()` calls `parent::boot()` and registers the `paddingClasses`, `entrance` and `entrancePart` directives | **Skip** | `boot()` exists but lacks some — insert the missing `Blade::directive(...)` calls | **Bail** — provider doesn't match Sage's stock shape (custom providers are common; ask the dev to wire it manually) |

**Bailing > guessing.** Each bail message must name (a) the file, (b) expected shape, (c) what was found, (d) the manual fix the dev would apply.

Infra templates live in `references/infra.md`; block file templates in `references/templates.md`.

---

## Phase 1 — Collect block requirements

> **Source of truth: this skill's templates and `docs/examples/` only.**
> Never copy a block, component or CSS from another project on the machine
> (a sibling theme, an earlier test site): those were built with an older
> kit and carry the bugs the kit has since fixed. Verified 2026-09-23: an
> agent copied an earlier test theme's blocks and shipped its stale canvas
> spacing, carousel and panel order.

> **Styling: the style guide only.** Headings take `heading-1`…`heading-6`,
> text takes `text-body` / `text-lead` / `text-small`, colors take the
> contract tokens (`text-ink`, `text-muted`, `bg-light`, `bg-surface`,
> `border-border`, `text-primary`), a card/item surface takes `card`, a CTA
> takes `btn btn-primary` — on the canvas and in the Blade view alike.
> Never Tailwind's stock palette or type scale. Full table: `css-standards` ›
> **Style guide only**; check 0.21 enforces it.

### How the skill asks

1. **Pre-extract** title, slug, attribute names from the user's initial request.
2. **Slug auto-derived** from title (lowercase + hyphens). Don't ask.
3. **Title required.** If missing, ask what the block is *for* and propose a name. Never default to `new-block`.
4. **Batch** all remaining gap-questions in one round (`AskUserQuestion` for closed lists).
5. **Free text for attributes** — see inference table below.
6. **Show inferred plan + 'ajustar?' gate** before writing.

### What the skill asks for

| Item | How |
|---|---|
| **Title** | Required. Ask if not derivable. |
| **Slug** | Auto-derived. Surface in the inferred plan; dev can override. |
| **Attributes** | Free text — dev describes naturally; skill infers types (`references/attribute-inference.md`), expands pairs (image, button), asks only on ambiguity. |

### Show the inferred plan before writing

After inference, surface a compact plan and ask "ajustar algo (nome, tipo, controle)?" — last gate before writing:

```
Slug:     hero
Title:    Hero
Icon:     format-image
Category: custom-blocks
Attributes:
  - heading           string             → AutoGrowingTextarea (heading-2)
  - subtitle          string             → AutoGrowingTextarea (text-lead text-muted)
  - bgImageId         image              → AttachmentImageControl (sidebar) + ImagePositionControl
  - ctaText/Link      button pair        → btn btn-primary preview + ActionEditor on click
```

### What the skill picks itself (no question)

| Item | How |
|---|---|
| **Category** | Custom category from Phase 0 check #11 (default `custom-blocks`). Never ask per-block. |
| **Icon** | Pick a [Dashicon](https://developer.wordpress.org/resource/dashicons/) that fits intent (use title + description + any visual the dev shared). Examples: testimonial → `format-quote`, hero with image → `format-image`, steps list → `editor-ol`, CTA → `megaphone`. Unclear → default `smiley`. Tell the dev which icon you chose in the inferred plan. |

### What goes where in the editor (sidebar vs canvas)

- **InspectorControls (sidebar)** = block **configuration**, plus
  **background media** — always `<PaddingControls />` and
  `<EntranceControl />`; plus layout/variant selects, `<DividerControl />`,
  ground/surface selects, toggles.
  - **CRITICAL**: **NO text fields, NO link editors, and NO button editing in the sidebar.**
  - **Background Media lives in the sidebar** (decision reversed
    2026-09-22, see the `2026-09-22 — Sidebar background media` changelog
    entry for the reasoning and what it replaced): a
    `PanelBody title="Background Media"` holding
    `<AttachmentImageControl imageId={bgImageId} onSelect={...}
    onRemove={...} noStylesheet />` for select/replace/remove, then
    `<ImagePositionControl />` right under it for the focal point. The
    `noStylesheet` prop matters — the sidebar renders in the admin
    document, which never loads `editor.css`, so the control's Tailwind
    resets (`bg-transparent`, `border-0`) would otherwise resolve to
    nothing and the browser's default button face would cover the preview.
  - **Foreground/inline images and repeater-item images do NOT move** —
    they stay on the canvas per the rule below. Only a block's own
    full-bleed background image relocated.

- **Canvas (inline)** = block **content** — real data rendered with theme
  styling, bounded by `EDITOR_BLOCK_FRAME`:
  - **Headings / subtitles:** `<AutoGrowingTextarea>` styled with
    `EDITOR_TYPE` tokens, positioned where the text appears visually. A
    field that is an `h1`–`h6` on the page gets the `heading` prop, so it
    takes the theme's heading font.
  - **Body copy:** `<ParagraphsField>` or `<RichText>`, inline.
  - **Inline Images (foreground):** `<AttachmentImageControl>` with the **X button on hover** (top-right
    corner) to remove. Clicking the image opens Media Library in browse mode.
  - **Background Media (hero, banner, cards):** the canvas shows only the
    **passive** full-bleed preview — `<img>` or `backgroundImage` with
    `focalCss(bgImagePosition)` underneath the copy, no click target.
    Selecting/replacing/removing the image happens in the sidebar (see
    above). Nothing here needs to be clickable, so there is no risk of an
    image dropzone swallowing clicks meant for selecting the block.
  - **Buttons / CTAs:** a single section button is `<ButtonPair text link
    onTextChange onLinkChange className="btn btn-secondary" />` on the canvas
    and `<x-button-link :text :url :new-tab variant />` on the page — never
    re-type the pair. See the "Button pair" rule in `references/attribute-inference.md` for the full
    reasoning (including three same-day mistakes worth reading before
    touching this again). Styled `<span>` preview on canvas; clicking it
    always opens `<ActionEditor>` **inline**, directly below the button —
    never the sidebar, never a floating `Popover`. Only the `stacked` prop
    changes:
    - Full-width/single CTA → `stacked={false}` (two-column layout); the
      block grows to contain it, on its own.
    - CTA inside a repeater item (grid card, list item) → `stacked={true}`
      (the same single-column layout `ActionEditor` already has for
      sidebar use) — fits a narrow column without leaving the canvas.
  - **Repeaters (any array: cards, slides, accordion items, tabs, logos,
    team…) — ONE pattern, no exceptions:**
    - **Sidebar:** a `PanelBody` ("Items" / "Slides" / "Cards") holding
      `<ItemList>` — every item listed in array order with the drag handle,
      move up / move down and the trash button (all WordPress core icons,
      one 32px size), plus "+ Add". **Reordering, deleting and adding
      happen only here.**
    - **Canvas:** the block as it looks on the page, items in array order,
      each sub-field edited inline (`AutoGrowingTextarea`, `RichText`,
      `AttachmentImageControl`, `ActionEditor stacked`). **No delete, add or
      reorder buttons on the canvas** — no `✕`, no "Delete" pill.
    - **One-open-at-a-time widgets** (accordion, tabs): pass `activeItem` /
      `setActiveItem` to `ItemList`; the canvas opens that item and clicking
      an item on the canvas selects it. The front end uses native
      `<details name="<group>">` so opening one closes the others — no JS.
    - **Carousels:** the canvas looks like the front end — the same slides
      per view and the same pagination bullets, **never a scrollbar**. The
      track moves with the bullets and with the sidebar list (selecting an
      off-screen slide brings it into view; editing a visible slide never
      moves it). The slider library runs only on the front end (`block.js`),
      with autoplay set in the sidebar (on/off + seconds), paused on hover
      and off for `prefers-reduced-motion`. The canvas never autoplays.
    - Every write is **one** `setAttributes` built from the current array
      (`items.map(...)` with a patch object). Two `setAttributes` calls in a
      row both start from the same stale array and the second erases the
      first (e.g. `imageId` then `imageUrl`).
    - **CRITICAL — array position must be the ONLY source of order.** Never
      store a per-item `order` / `position` number: `ItemList` reorders the
      array, and a second order field makes the sidebar move nothing on the
      canvas or the page (verified on a sibling project's logo wall, where
      `desktop.order` froze the render while the array moved).
    - `TabSelector` and the red "Delete Item" pill were **removed from the
      kit**: one-item-at-a-time editing hid the order and made reordering
      impossible. If an old project still has them, migrate the block to
      `ItemList`.
    - Reference code, tested end to end: `docs/examples/` — its `README.md`
      (rules every block follows and the index of the ten reference
      blocks), then only the closest block's folder: copy its files with
      the command in its `README.md` and adapt them.
  - **Sidebar panel order**, the same in every block: the item list
    ("Items" / "Slides" / "Cards") → Background Media → the block's own
    settings (e.g. Autoplay, layout) → Spacing → Entrance animation.
  - **Editor controls are components, never hand-written:**
    - **Removing an image** is `<RemoveImageButton>` — core's close ("X")
      icon in a dark round button that reads over any photo.
      `AttachmentImageControl` already shows it on hover.
    - **Deleting anything else** (an item, a row, a field's content) is
      `<RemoveButton>` — core's trash icon, `isDestructive`.
    - Both are `size="compact"` (32px), like every other icon button. Every icon comes from `coreIcons.jsx` (core's own SVGs); never
    type a glyph (`×`, `✕`, `↑`, `⠿`) or paste an SVG into a block. Every
    icon button in the editor is a WordPress `<Button size="compact">`, so
    they are all one size. Swapping an icon is a one-line change in
    `coreIcons.jsx`.

### What the skill does NOT ask

**Vendor libs** are a deliberate dev decision, not block scaffolding. The skill generates blocks without lib boilerplate; if the dev adds a carousel etc. afterward, they follow the pattern in `docs/examples/testimonial-carousel/` (`wp_register_*` in `app/blocks.php` + `wp_enqueue_*` in `block.php`). Phase 0's smell detector watches for the wrong pattern over time.

### Validations (cheap, fail fast)

Before generating, check:

- Slug matches `/^[a-z][a-z0-9-]*$/`.
- `resources/blocks/<slug>/` does **not** already exist.
- `<slug>` is **not** already in `BlockManager::$blocks`.

If any fails: stop, ask for an alternative. Cheap-only by design — clash with `core/*` block names is left to fail at build (rare + expensive to detect).

### Read the existing block namespace

Read `$namespace` from `app/Blocks/BlockManager.php` (via `getNamespace()`). Use it as the prefix in each block.json's `name` (`<namespace>/<slug>`). It's chosen once, when `BlockManager.php` is bootstrapped (check 0.1) — never rename it on an existing project.

---

## Phase 2 — Generate the block files

Create `resources/blocks/<slug>/` plus the Blade view. Templates at the bottom of this doc. Substitute `<slug>`, `<Title>`, `<category>`, `<icon>`, `<namespace>` with Phase 1 values and `<text-domain>` with the value read in Phase 0 › Theme identity.

**Files — always:**

1. `resources/blocks/<slug>/block.json`
2. `resources/blocks/<slug>/block.php`
3. `resources/blocks/<slug>/block.jsx`
4. `resources/blocks/<slug>/preview.svg`
5. `resources/views/blocks/<slug>.blade.php`

**Files — only when needed** (see the Tailwind-first rule in **Behavior Rules**):

- `resources/blocks/<slug>/block.js` — only if the block has real front-end behavior. When present, add `"viewScript": "file:./block.js"` to block.json.
- `resources/blocks/<slug>/block.css` — only for reusable/semantic CSS or third-party lib overrides (never one-off layout — that's Tailwind in the Blade). When present, add `"viewStyle": "file:./block.css"` to block.json.

**`preview.svg`** — static image Gutenberg shows on the right-side panel when the dev hovers the block card in the `+` inserter. Generate from `<skill>/templates/preview.svg` by replacing `__BLOCK_TITLE__` with the block's `<Title>`. block.json gets an `isPreview` attribute + an `example` field; block.jsx short-circuits at the top of `edit()` to return only the SVG when `isPreview === true` (see template). Dev can swap for a real `.webp`/`.png` later — wiring stays.

## Phase 3 — Wire up

Edit `app/Blocks/BlockManager.php`: add `'<slug>',` to `$blocks`. Keep existing entries; match the existing style (append or alphabetize).

---

## Phase 4 — Hand off to the dev

Tell the dev, in this order:

1. **Build**: `npm run dev` (HMR) or `npm run build`.
2. **Activate theme** if needed: `lando wp theme activate <theme-slug>`.
3. **Hard-refresh editor** (`Cmd+Shift+R`) if it was already open.
4. **Insert the block** via the `+` inserter (search by title or browse the `<category>` category).

End with a summary table listing every file created/modified.

---

## References — read only when the task needs it

| File | Read it when | Sections moved there |
| --- | --- | --- |
| `references/attribute-inference.md` | turning the dev's description into attributes and controls | Attribute type inference, Keyword lookup table, Special expansion rules (incl. **Button pair**), Ambiguity → ask |
| `references/assets-and-anchors.md` | a block has its own CSS/JS or a vendor library, or needs an anchor | Block asset loading, Anchor support |
| `references/templates.md` | writing a block from scratch (no example in `docs/examples/` is close) | Templates directory, Block file placeholders, every block file template |
| `references/infra.md` | Phase 0 finds missing infrastructure, or the block needs entrance animation or the fidelity report | Infra bootstrap templates, Entrance animation wiring, Editor fidelity report, ThemeServiceProvider, functions.php, Vendor libs, vite.config.js, editor.js, app.css, package.json |

A block close to a reference block starts from `docs/examples/<slug>/` (copy its files), not from `references/templates.md`.


## Behavior Rules

- **Tailwind-first; `block.css` / `block.js` are optional** — put one-off styling (padding, flex, sizing, positioning) as Tailwind utilities in the **Blade markup**. Generate `block.css` + wire `viewStyle` **only** when the block needs genuinely reusable/semantic CSS or a third-party lib override (e.g. re-coloring Splide's bullets) — never for one-off layout. Likewise generate `block.js` + wire `viewScript` **only** when the block has real front-end behavior. A purely presentational block ships neither file and neither `view*` field.
- **Comments follow `CLAUDE.md` in every emitted file** — comment the *why*, never the *what*. Ship **no** boilerplate "what" comments (`{{-- View-only --}}`, `// gets the title`) and **no** leftover commented-out example code. The inline `//` / `{{-- --}}` guidance and commented-out snippets in the templates below are **scaffolding for you** — replace them with real code or delete them; they must not survive verbatim into the generated block. Keep only genuine, non-obvious "why" notes (e.g. the anchor-id rationale).
- **Anchor support on every block** — `supports.anchor: true`, id emitted on the `<section>` wrapper only; dynamic/unique ids (carousel, etc.) go on an inner `<div>` so they never collide with the anchor (see `references/assets-and-anchors.md` › "Anchor support").
- **Use `view()`** (global Acorn helper), not `\Roots\view()`.
- **Sanitization**: `absint()` for unsigned numerics, `(bool)` for booleans, `sanitize_text_field()` for plain strings, `wp_kses_post()` only for trusted HTML.
- **Don't reformat existing files** — keep diffs minimal.
- **Don't touch `composer.json`**.
- **Don't run shell commands** (`npm`/`composer`/`lando`/`git`).
- **Don't auto-edit `vite.config.js`'s `base:`** — flag and let the dev decide.
- **Cheap validations only** — prevention is ~1 check, repair after a wrong scaffold is 5–10× the cost.
- **Bail on divergence** — when modifying infra files, halting is better than silently breaking the build.

(Global rules — English language, no co-author, no production writes, no assumptions, push back on flawed asks — live in `CLAUDE.md` and apply automatically.)

---

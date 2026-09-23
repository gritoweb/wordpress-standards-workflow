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

---

## Pre-conditions

- Working directory = active Sage 11 theme root (must contain `vite.config.js`,
  `app/setup.php`, `composer.json`, `resources/`). If unsure, **ask** — don't guess.
- Composer/Node run on the host (Lando only serves WP).
- Standards = `CLAUDE.md` + `_docs/examples.md`. If those aren't in the project,
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
`_docs/launch-list.md` › Theme identity). Anything scaffolded now would bake the
wrong domain/path into every file.

### Required infra (skill bootstraps if missing)

| # | Check |
|---|-------|
| 0.1 | `app/Blocks/BlockManager.php` exists. Template at `<skill>/templates/BlockManager.php`. **First-run only**: ask `"Qual namespace pros blocos? Sugiro '<theme-slug>'. Ele vai no nome de cada bloco salvo no conteúdo, então não dá pra trocar depois sem migrar os posts."`, then replace `__BLOCK_NAMESPACE__` with the answer (lowercase, `[a-z0-9-]`). |
| 0.2 | `resources/blocks/` exists |
| 0.3 | `resources/views/blocks/` exists |
| 0.4 | `resources/js/vendor/` exists |
| 0.5 | `resources/css/vendor/` exists |
| 0.6 | `app/blocks.php` is the **central block-bootstrap file** — must (a) exist, (b) contain top-level `BlockCategories::register();` and `BlockMotion::register();`, (c) contain `add_action('init', function () { (new BlockManager())->register(); });`, (d) be loaded by `functions.php`'s `collect([...])` array (see 0.6.1). Template at `<skill>/templates/blocks.php`. |
| 0.6.1 | `functions.php`'s `collect([...])` array includes `'blocks'`. Without it, `app/blocks.php` never loads. If `functions.php` doesn't use the `collect([...])` pattern at all, **bail out** — needs manual wiring. |
| 0.8 | `resources/js/editor.js` calls `import.meta.glob('../blocks/*/block.jsx', { eager: true });` (Vite compiles the **editor** JSX only — front-end `block.js`/`block.css` are served from source via `file:`, see "Block asset loading") |
| 0.9 | `resources/css/app.css` has `@source "../blocks/**/*.{php,jsx}";` |
| 0.10 | `package.json` `devDependencies` has `react@^18` AND `react-dom@^18`. **React pinned to ^18, not ^19** — React 19 breaks Gutenberg (element-symbol mismatch with WP's React 18). |
| 0.11 | `app/Blocks/BlockCategories.php` exists. Template at `<skill>/templates/BlockCategories.php`. **First-run only**: ask `"Vou criar uma categoria pros seus blocos. Quer chamar de 'Custom Blocks' (default) ou outro nome?"`, copy template, edit `TITLE` and `SLUG` (lowercase + hyphens) if dev picked a different name. The actual `BlockCategories::register();` call lives in `app/blocks.php` (check 0.6). Subsequent runs: grep `const SLUG = '...'` from the existing file. |
| 0.12 | `resources/blocks/components/backend/` contains the canonical shared components: `AttachmentImageControl.jsx`, `useAttachmentUrls.js`, `ActionEditor.jsx`, `AutoGrowingTextarea.jsx`, `editorCanvas.js`, `EntranceControl.jsx`, `entranceCanvas.js`, `DividerControl.jsx`, `ItemList.jsx`, `moveItem.js`, `ParagraphsField.jsx`, `LinkPicker.jsx`, `PaddingControls.jsx`, `padding-presets.js`, `ImagePositionControl.jsx`, `IconPicker.jsx`. Legacy components (`ImageUploadWithHover.jsx`, `RemoveButton.jsx`, `TabSelector.jsx`) also copied for backward compat. If missing: copy from `<skill>/templates/components/backend/*`, replacing `__TEXT_DOMAIN__` with `<text-domain>` and `__THEME_SLUG__` with `<theme-slug>` in every copied file. |
| 0.15 | `app/Blocks/BlockPadding.php`, `app/Blocks/BlockImagePosition.php`, `app/Blocks/BlockEntrance.php` and `app/Blocks/BlockMotion.php` exist. Templates at `<skill>/templates/`. `BlockEntrance.php` must expose `fromBlock()`, `root()` and `part()` — an older copy that only has `resolve()` (it prints `data-entrance-type`) is **incompatible** with `EntranceControl`/`entranceCanvas.js`: replace it. |
| 0.16 | `app/Providers/ThemeServiceProvider.php`'s `boot()` registers three Blade directives: `paddingClasses` → `\App\Blocks\BlockPadding::resolve(...)`, `entrance` → `\App\Blocks\BlockEntrance::root(...)` and `entrancePart` → `\App\Blocks\BlockEntrance::part(...)` (see "Infra bootstrap templates"). |
| 0.18 | `resources/css/components/entrance.css` exists (template `<skill>/templates/entrance.css`) and is `@import`ed by **both** `resources/css/app.css` (front end) and `resources/css/editor.css` (canvas — without it the sidebar **Preview** does nothing visible). `resources/css/components/hover.css` exists (template `<skill>/templates/hover.css`) and is `@import`ed by `resources/css/app.css` — **not** inside `@layer`, it must beat Tailwind's transition utilities. |
| 0.19 | `resources/js/modules/entrance.js` exists (template `<skill>/templates/entrance.js`) and `resources/js/app.js` has `import { initEntrance } from './modules/entrance';` plus a top-level `initEntrance();` call (module scripts are deferred). Without it the front end never adds `data-entered` and the head script's 5s safety net is the only thing that un-hides the page. |

### Compatibility warnings (do NOT auto-fix)

| # | Check |
|---|-------|
| 0.13 | `vite.config.js` `base:` points to the theme's actual path (e.g. `/wp-content/themes/<active-theme>/public/build/`). Sage's default ships with `/app/themes/sage/public/build/` (Bedrock) which **breaks asset URLs** in standard WP. **Warn**, don't auto-fix. |
| 0.14 | **Global-enqueue smell.** Scan `app/**.php` + `functions.php` for `wp_enqueue_script(`/`wp_enqueue_style(` *outside* `resources/blocks/*/block.php`. Theme handles (`app`, `editor`) are fine; vendor-lib-looking handles (`swiper`, `gsap`, …) loaded globally are a smell — warn with file:line, recommend the canonical pattern from `.claude/skills/blade-standards/SKILL.md` (register in `setup.php`, enqueue in `block.php`). |
| 0.17 | **Leftover `sage` identity.** Scan `app/`, `resources/blocks/` and `resources/views/` (excluding `resources/{js,css}/vendor/`) for the text domain `'sage'`, `"textdomain": "sage"`, `THEME_SLUG = 'sage'`, or unsubstituted `__TEXT_DOMAIN__` / `__THEME_SLUG__` / `__BLOCK_NAMESPACE__`. Themes bootstrapped by older kit versions carry these (and `IconPicker` 404s every icon). **Warn** with file:line and the replacement (`<text-domain>` / `<theme-slug>`); don't auto-fix. Never flag `$namespace` itself — an existing block namespace is stored in post content and must not change. |

### Bootstrap UX

If any check 0.1–0.19 (incl. 0.6.1) fails:

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

Infra templates live in **Templates** at the bottom of this doc.

---

## Phase 1 — Collect block requirements

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
| **Attributes** | Free text — dev describes naturally; skill infers types (table below), expands pairs (image, button), asks only on ambiguity. |

### Attribute type inference (description → type + control)

When the dev describes attributes naturally ("hero with a heading, subtitle,
background image and CTA button"), map each described field using the table
below. Output feeds Phase 2 directly.

**Rich text vs plain text rule.** `RichText` is for **long copy** —
paragraphs, descriptions, quotes, anything where bold/italic/links matter
inline. **Headings, labels, simple short text** (subtitles, button labels,
item titles) use a **plain `<input type="text">`** in the white-card
wrapper. A heading or button label with inline formatting invites bold/link
injection where it doesn't belong; a single-line `<input>` also has cleaner
placeholder + accidental-newline behavior than RichText.

#### Keyword lookup table

| Dev's wording contains | Inferred type | Generated attribute(s) | Editor control |
|---|---|---|---|
| `title`, `heading`, `headline`, `name`, `label` | string | `<name>` | **plain input** in white-card wrapper (`<div className="p-3 border border-gray-300 rounded bg-white"><input type="text" ... /></div>`) |
| `subtitle`, `subheading`, `tagline`, `eyebrow` | string | `<name>` | **plain input** (same wrapper) |
| `description`, `body`, `content`, `paragraph`, `quote`, `excerpt`, `long text`, `copy` | string (multi-line / formatted) | `<name>` | `<RichText tagName="p" className="!m-0 min-h-[80px]">` in white-card wrapper |
| `image`, `photo`, `picture`, `thumbnail`, `cover` (foreground/inline) | image (ID-first) | `<name>Id` (number) | On the **canvas**: `<AttachmentImageControl imageId={...} onSelect={(media) => setAttributes({ <name>Id: media.id })} onRemove={() => setAttributes({ <name>Id: 0 })} />` — URL resolved at render via `useAttachmentUrls`. × on hover to remove. |
| `bg`/`background image`/`cover image` (fills the block behind other content) | image (ID-first) | `<name>Id` (number) | In the **sidebar**, inside a `PanelBody title="Background Media"`: `<AttachmentImageControl imageId={...} onSelect={...} onRemove={...} noStylesheet />` + `<ImagePositionControl />` right under it for the focal point. The canvas keeps only the **passive** full-bleed preview (`backgroundImage`/`<img>` with `focalCss(<name>Position)`) — no click target there. |
| `icon` | string (Dashicon slug or arbitrary name) | `<name>` | `<TextControl>` (or `<IconPicker>` if the project ships one) |
| `link`, `url`, `cta link`, `href` | link (Gutenberg `LinkControl` object: `{url, opensInNewTab}`) | `<name>` | `<LinkPicker label="..." value={...} onChange={...} />` — sized to match the white-card input height so it lines up next to a sibling text field |
| `button`, `cta` (alone, no "link") | button **PAIR** | `<name>Text` (string) + `<name>Link` (object) | Styled `<span>` preview on canvas reflecting the button label. **Click opens `<ActionEditor>` inline**, directly below the button — always on canvas, never in the sidebar, never a floating `Popover`. `stacked={false}` (two-column layout) for a full-width/single CTA; `stacked={true}` (single vertical column, the same treatment `ActionEditor` uses in a sidebar) when the trigger sits inside a narrow per-item container (grid card, list item) — see the "Buttons / CTAs" rule below. |
| `color`, `bg color`, `text color` | string (hex / palette slug) | `<name>` | `<ColorPalette>` or `<PanelColorSettings>` |
| `size`, `width`, `height`, `count`, `amount`, plain `number` | number (unsigned) | `<name>` | `<TextControl type="number">` or `<RangeControl>` |
| `show X`, `enable X`, `visible`, `active`, `toggle`, "is X" boolean | boolean | `<name>` | `<ToggleControl>` |
| `list of X`, `X list`, `items`, `slides`, `cards`, `testimonials`, `features`, `points`, `steps`, `accordion items` | array | `<name>` (`items` is the conventional default for the array attr) | `<TabSelector>` + `useState(0)` for active index + per-item form (recurse: infer sub-field types from the same table) |
| `video` + url/embed | string (URL) | `<name>Url` | `<TextControl type="url">` |
| `alignment`, `align`, `text alignment` | string enum | `<name>` (default `"left"`) | `<AlignmentToolbar>` or `<SelectControl>` |
| `layout`, `variant`, `style` + descriptor (e.g. "compact/full") | string enum | `<name>` | `<SelectControl options={...}>` (config — put in `InspectorControls`) |

#### Special expansion rules (apply BEFORE the keyword lookup)

1. **Image (ID-first)**: any image-like mention generates a **single
   attribute** — `<name>Id` (number). The URL is resolved at render time
   via the `useAttachmentUrls` hook (calls `@wordpress/data`'s `getMedia`)
   — no stale URL stored in the block. Render via `<AttachmentImageControl>`
   (× on hover to remove, Spinner while loading, "unavailable" state when
   attachment is deleted). **Foreground/inline image → canvas.**
   **Background/cover image → sidebar** (`<AttachmentImageControl
   noStylesheet />` inside `PanelBody title="Background Media"`), and if
   the wording mentions "background" or "bg", also add a second attribute
   `<name>Position` (string, default `"center"`) and render
   `<ImagePositionControl />` in that same sidebar panel, right under the
   image control.

   **Always show a suggested dimension hint** next to the field label (e.g.
   `Background Image — recommended 1920×1080px`), so the editor knows what
   to upload before the image looks stretched/pixelated on the front end.
   Pick the suggested size from context — don't ask unless genuinely
   ambiguous:

   | Image role (from wording / block context) | Suggested dimensions |
   |---|---|
   | hero / background / cover (full-width section bg) | 1920×1080px |
   | card / thumbnail / feature image | 800×600px |
   | avatar / author / testimonial photo | 200×200px |
   | logo / partner / brand mark | 300×150px |
   | icon (raster, not Dashicon) | 64×64px |
   | gallery / carousel slide | 1200×800px |
   | unclear | 1200×800px (safe general default) |

2. **Button pair**: "button" / "CTA" alone (without "link") generates **two
   attributes** — `<name>Text` (string) + `<name>Link` (Gutenberg
   `LinkControl` object: `{url, opensInNewTab}`). **Default `link.url` to
   `""`, never `"#"`** — a bare `#` isn't empty to `LinkControl`, it's a
   real (bad) URL it tries to preview; with no fetchable title it falls
   back to showing the raw `#` in both the title and info slots of its
   preview, reading as a duplicated/broken value the moment an editor opens
   it. An empty string renders `LinkControl`'s normal "search for a link"
   empty state instead — this is true anywhere `LinkControl`/`LinkPicker`
   appears, not just in `ActionEditor`. **Always canvas, never the
   sidebar, never a floating `Popover`** — clicking the styled `<span>`
   preview opens `<ActionEditor>` **inline**, directly below the button, in
   both cases. The only thing that changes with context is the `stacked`
   prop:
   - **Full-width / single CTA** (hero, banner, one button per block):
     `<ActionEditor stacked={false}>` (two-column layout — label field
     beside the link picker), inside
     `<div className="w-full max-w-xl text-left ...">`. The block already
     has the width and naturally grows to contain it.
   - **CTA inside a repeater item** (a grid card, a list item):
     `<ActionEditor stacked={true}>` — the SAME component, just the single
     vertical-column layout it already has for sidebar use (label, then
     the link picker, then the checkbox, each full width). A ~280px grid
     column has no room for `stacked={false}`'s two-column layout, but
     easily fits one stacked field at a time — no separate mechanism
     needed, just the prop `ActionEditor` was already built with.
   - **Why not `Popover`, twice**: floating a `Popover` around
     `ActionEditor` for consistency, then again only for the narrow-item
     case, both got reverted the same day. A `Popover` doesn't participate
     in layout, so it never grows its own block/card to fit; on a shorter
     block it spilled into whatever rendered next, and inside a grid it
     spilled into the row below — its collision handling only avoids the
     *viewport* edge, never a sibling element a few inches away. There is
     no `position`/`placement` value that fixes that, because the problem
     isn't positioning, it's that a floating overlay is the wrong tool
     here at all.
   - **Why not the sidebar either**: moving the repeater-item's link
     **destination** into a sidebar panel tied to an "active" item (mirror
     of `<ItemList>`'s pattern) does avoid every overlap — sidebar and
     canvas never touch — but it was never what was asked for, and it
     reads as inconsistent with every other button in the theme, which
     opens inline on the canvas right where you clicked. `stacked={true}`
     gets the same "fits a narrow column" property without leaving the
     canvas.

3. **Array recursion**: when the dev says "list of X with title, image, and description", recurse the inference for each sub-field (`title` → string, `image` → pair, `description` → string). The final shape is one array attribute whose items are objects with typed sub-fields. Sanitize per-sub-field in `block.php`'s `array_map(...)`.

#### Ambiguity → ask (batched with Phase 1's gap-filling round — don't drip-feed)

- "image link" — linked image (pair + link) or URL of an image (string)?
- "X" with no matching keyword.
- An attribute named like a verb ("highlight") — likely boolean, but confirm.

### Show the inferred plan before writing

After inference, surface a compact plan and ask "ajustar algo (nome, tipo, controle)?" — last gate before writing:

```
Slug:     hero
Title:    Hero
Icon:     format-image
Category: custom-blocks
Attributes:
  - heading           string             → plain input (heading)
  - subtitle          string             → plain input (simple text)
  - bgImageId/Url     image pair         → ImageUploadWithHover + ImagePositionControl
  - ctaText/Link      button pair        → plain input + LinkPicker (flex row)
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
    `EDITOR_TYPE` tokens, positioned where the text appears visually.
  - **Body copy:** `<ParagraphsField>` or `<RichText>`, inline.
  - **Inline Images (foreground):** `<AttachmentImageControl>` with **× on hover** (top-right
    corner) to remove. Clicking the image opens Media Library in browse mode.
  - **Background Media (hero, banner, cards):** the canvas shows only the
    **passive** full-bleed preview — `<img>` or `backgroundImage` with
    `focalCss(bgImagePosition)` underneath the copy, no click target.
    Selecting/replacing/removing the image happens in the sidebar (see
    above). Nothing here needs to be clickable, so there is no risk of an
    image dropzone swallowing clicks meant for selecting the block.
  - **Buttons / CTAs:** see the "Button pair" rule above for the full
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
  - **Repeaters / lists:** `<ItemList>` (sidebar) with drag handles +
    keyboard arrows (up/down), driven by `onMove` calling `moveItem(items,
    from, to)`. The image inside each item still follows the media rule
    above and stays on the **canvas** (`<AttachmentImageControl>` per item,
    in array order) — only the item's non-media fields (name, link,
    reorder) live in the sidebar list.
    - **CRITICAL — array position must be the ONLY source of order.** Do
      not also store a per-item `order`/`row`/`position` number unless the
      block genuinely needs independent layout tuning (custom width/height/
      gap per row, the way a logo-wall-style block might). If it does, the
      `onMove` callback MUST update that field on every affected item in the
      same call, or reordering silently stops changing anything: both the
      canvas render and `block.php` will keep sorting by the stored field
      and ignore the array `ItemList` just spliced. **Verified against a
      live post** (a sibling project's logo-wall block, post 154): every
      item already carried an explicit `desktop.order`, so dragging a row
      in the sidebar changed the `logos[]` array while the rendered order —
      editor and front end alike — never moved. `<ItemList>` and
      `moveItem.js` are not the bug; a second, unsynced order field
      layered on top of them is. Simplest fix for a new block: don't add
      that field at all.
  - **Paginated one-at-a-time editing (`<TabSelector>` + `<RemoveButton>`):
    legacy for generic repeaters** (superseded by `<ItemList>` above,
    which shows every row and lets you reorder without leaving the sidebar).
    Still the right call for a block whose **front end is itself a
    one-active-item widget** — real tabs, an accordion, a slider — where
    "which item is being edited" is naturally the same question as "which
    item is showing." There the front end needs its own interactive
    `block.js` (plain vanilla, ARIA `tablist`/`tab`/`tabpanel` or
    equivalent) in addition to the `<TabSelector>`-driven canvas.

### What the skill does NOT ask

**Vendor libs** are a deliberate dev decision, not block scaffolding. The skill generates blocks without lib boilerplate; if the dev adds Swiper etc. afterward, they follow the pattern in `_docs/examples.md` (`wp_register_*` in `setup.php` + `wp_enqueue_*` in `block.php`). Phase 0's smell detector watches for the wrong pattern over time.

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

### Block asset loading (the canonical rule)

Two kinds of asset, two mechanisms — never mix them:

1. **The block's own front-end CSS/JS** (`block.css` / `block.js`) — **each
   optional** (see the Tailwind-first rule): declared in `block.json` via
   **`file:./block.css`** (`viewStyle`) and **`file:./block.js`** (`viewScript`).
   WordPress enqueues them **conditionally** — only on pages where the block
   renders — and dedupes automatically. Served **straight from source**, not
   Vite-built, so:
   - `block.css` exists only for reusable/semantic CSS or lib overrides; it's
     **plain CSS** (no `@apply`/`@reference`). One-off layout goes in the Blade
     as Tailwind utilities, not here.
   - `block.js` exists only when the block has behavior; it's **plain vanilla**
     (no `import`), gated on `DOMContentLoaded`.
   - Never register these in `setup.php`. `block.json` is the whole wiring.

2. **Third-party vendor libs** (Swiper, GSAP, …): **`wp_register_script` /
   `wp_register_style` in `app/setup.php`** (declare only — nothing loads), then
   **`wp_enqueue_script` / `wp_enqueue_style` in the block's `block.php`** (only
   the blocks that use it; WP dedupes by handle so N blocks share one copy).
   Vendor bundles are committed under `resources/{js,css}/vendor/` and referenced
   with `get_theme_file_uri(...)` — not a CDN. The block's `block.js` consumes
   the lib via its global (e.g. `window.Swiper`), which is guaranteed available
   because classic vendor scripts execute before the block's `DOMContentLoaded`
   handler.

The editor's `block.jsx` is the **only** block file Vite compiles (via the
`editor.js` glob). Vite never touches front-end `block.js`/`block.css`.

**Per-attribute generation rules:**

| Attribute type | `block.json` schema | `block.php` sanitization | `block.jsx` editor control |
|---|---|---|---|
| `string` (heading / label / simple short text) | `{"type":"string","default":""}` | `sanitize_text_field($attributes['<name>'] ?? '')` | Plain `<input type="text" value={...} onChange={(e) => setAttributes({ <name>: e.target.value })} />` in the white-card wrapper |
| `string` (description / long copy) | `{"type":"string","default":""}` | `wp_kses_post($attributes['<name>'] ?? '')` if formatting is allowed; otherwise `sanitize_text_field(...)` | `<RichText tagName="p" value={...} onChange={(value) => setAttributes({ <name>: value })} className="!m-0 min-h-[80px]" />` in the white-card wrapper |
| `number` | `{"type":"number","default":0}` | `absint($attributes['<name>'] ?? 0)` (unsigned) — use `(int)` only if negatives are valid | `<TextControl type="number" ... />` or `<NumberControl ... />` |
| `boolean` | `{"type":"boolean","default":false}` | `(bool) ($attributes['<name>'] ?? false)` | `<ToggleControl ... />` |
| `array` | `{"type":"array","default":[]}` | `array_map(...)` with per-item sanitization | **List repeater**: `<ItemList>` with drag handles + keyboard arrows for reordering. Alternative (legacy): `<TabSelector>` + `<RemoveButton>` |
| image (ID-first) | `{"<name>Id":{"type":"number","default":0}}` | `absint($attributes['<name>Id'] ?? 0)` — URL resolved at render via `wp_get_attachment_url()` or `wp_get_attachment_image()` | `<AttachmentImageControl imageId={...<name>Id} onSelect={(media) => setAttributes({ <name>Id: media.id })} onRemove={() => setAttributes({ <name>Id: 0 })} />` — × on hover to remove, Spinner while loading, `useAttachmentUrls` resolves URL in the editor |
| link (Gutenberg `LinkControl` object) | `{"type":"object","default":{"url":"","opensInNewTab":false}}` | `esc_url($attributes['<name>']['url'] ?? '')` + `(bool) ($attributes['<name>']['opensInNewTab'] ?? false)` | `<LinkPicker label="..." value={attributes.<name>} onChange={(value) => setAttributes({ <name>: value })} />`. Blade emits `target="_blank"` only when the flag is true; **don't hardcode `rel="noopener"`** — WP's `wp_targeted_link_rel()` filter (priority 15 on `the_content`) adds it automatically |

**Always include the 4 global padding attrs** in `block.php`'s `view(...)` data array, even if the block doesn't use them visually — they're injected by `BlockManager::globalAttributes()` and should be available to Blade:

```php
'paddingVertDesktop' => absint($attributes['paddingVertDesktop'] ?? 112),
'paddingVertMobile'  => absint($attributes['paddingVertMobile']  ?? 56),
'paddingXDesktop'    => (bool) ($attributes['paddingXDesktop']   ?? true),
'paddingXMobile'     => (bool) ($attributes['paddingXMobile']    ?? true),
```

### Anchor support (every block)

Every block **must** support the Gutenberg HTML anchor so editors can link to
it (`#my-section`). It's free and consistent — wire it on every block, no need
to ask.

1. **`block.json`** — add `"supports": { "anchor": true }`. This surfaces the
   "HTML anchor" field in the block's *Advanced* panel and registers the
   `anchor` attribute automatically (don't declare `anchor` in `attributes`).
2. **`block.jsx`** — nothing to do. `useBlockProps()` already applies the
   anchor `id` in the editor preview.
3. **`block.php`** — pass `'anchor' => sanitize_html_class($attributes['anchor'] ?? '')`
   to the view (server-rendered blocks don't auto-emit the id on the front end).
4. **Blade** — render the id **on the `<section>` wrapper, and only there**:
   `<section @if ($anchor) id="{{ $anchor }}" @endif class="<slug>">`.

**Dynamic ids go on an inner element — never the section.** When a block needs
its own unique id at render time (e.g. a Swiper instance: `id="swiper-{$block_id}"`
targeted by `block.js`), putting it on the `<section>` would collide with — and
overwrite — the editor's anchor id. Always emit dynamic ids on a nested `<div>`
so the section's `id` stays reserved for the anchor:

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif class="<slug>">
    <div id="swiper-{{ $uid }}" class="<slug>__carousel swiper">
        {{-- slides --}}
    </div>
</section>
```

(Generate `$uid` in `block.php` — e.g. `wp_unique_id('swiper-')` — and pass it
to the view; never reuse the anchor for it.)

---

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

## Behavior Rules

- **Tailwind-first; `block.css` / `block.js` are optional** — put one-off styling (padding, flex, sizing, positioning) as Tailwind utilities in the **Blade markup**. Generate `block.css` + wire `viewStyle` **only** when the block needs genuinely reusable/semantic CSS or a third-party lib override (e.g. re-coloring Swiper's bullets) — never for one-off layout. Likewise generate `block.js` + wire `viewScript` **only** when the block has real front-end behavior. A purely presentational block ships neither file and neither `view*` field.
- **Comments follow `CLAUDE.md` in every emitted file** — comment the *why*, never the *what*. Ship **no** boilerplate "what" comments (`{{-- View-only --}}`, `// gets the title`) and **no** leftover commented-out example code. The inline `//` / `{{-- --}}` guidance and commented-out snippets in the templates below are **scaffolding for you** — replace them with real code or delete them; they must not survive verbatim into the generated block. Keep only genuine, non-obvious "why" notes (e.g. the anchor-id rationale).
- **Anchor support on every block** — `supports.anchor: true`, id emitted on the `<section>` wrapper only; dynamic/unique ids (Swiper, etc.) go on an inner `<div>` so they never collide with the anchor (see "Anchor support").
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

## Templates

### Templates directory

```
<skill>/templates/
├── BlockManager.php                → copied to app/Blocks/BlockManager.php (check 0.1)
├── BlockCategories.php             → copied to app/Blocks/BlockCategories.php (check 0.11)
├── BlockPadding.php                → copied to app/Blocks/BlockPadding.php (check 0.15)
├── BlockImagePosition.php          → copied to app/Blocks/BlockImagePosition.php (check 0.15)
├── BlockEntrance.php               → copied to app/Blocks/BlockEntrance.php (check 0.15)
├── BlockMotion.php                 → copied to app/Blocks/BlockMotion.php (check 0.15)
├── entrance.css                    → copied to resources/css/components/entrance.css (check 0.18)
├── hover.css                       → copied to resources/css/components/hover.css (check 0.18)
├── entrance.js                     → copied to resources/js/modules/entrance.js (check 0.19)
├── blocks.php                      → copied to app/blocks.php (check 0.6)
├── preview.svg                     → copied per block (with __BLOCK_TITLE__ substituted)
└── components/backend/             → copied to resources/blocks/components/backend/ (check 0.12)
    ├── AttachmentImageControl.jsx   ← default image control (× on hover)
    ├── useAttachmentUrls.js         ← hook for resolving attachment URLs
    ├── ActionEditor.jsx             ← CTA label + link editor (canvas popover)
    ├── AutoGrowingTextarea.jsx      ← inline heading/subtitle editor
    ├── editorCanvas.js              ← canvas constants (EDITOR_TYPE, emptyLink)
    ├── EntranceControl.jsx          ← entrance animation sidebar panel
    ├── entranceCanvas.js            ← entrance animation canvas helpers
    ├── DividerControl.jsx           ← section divider selector
    ├── ItemList.jsx                 ← list repeater with drag + keyboard
    ├── moveItem.js                  ← reorder helper for ItemList
    ├── ParagraphsField.jsx          ← multi-paragraph RichText editor
    ├── ImageUploadWithHover.jsx     ← legacy (kept for backward compat)
    ├── LinkPicker.jsx
    ├── RemoveButton.jsx             ← legacy (kept for backward compat)
    ├── TabSelector.jsx              ← legacy (kept for backward compat)
    ├── PaddingControls.jsx
    ├── padding-presets.js
    ├── ImagePositionControl.jsx
    └── IconPicker.jsx
```

Copied infra files carry placeholders that must be replaced on copy — none may survive into the project:

| Placeholder | File(s) | Replace with |
|---|---|---|
| `__BLOCK_TITLE__` | `preview.svg` | the block's `<Title>` |
| `__BLOCK_NAMESPACE__` | `BlockManager.php` | the namespace confirmed in check 0.1 |
| `__TEXT_DOMAIN__` | `RemoveButton.jsx`, `ImageUploadWithHover.jsx`, `BlockMotion.php` | `<text-domain>` |
| `__THEME_SLUG__` | `IconPicker.jsx` | `<theme-slug>` |

Every generated `block.jsx` imports `PaddingControls`; image / link / array blocks add the matching imports as needed.

### Block file placeholders

All block-file templates below use these — substitute throughout:

- `<slug>` — kebab-case (e.g. `testimonial-carousel`)
- `<Title>` — human-readable (e.g. `Testimonial Carousel`)
- `<category>` — custom category from check #11 (default `custom-blocks`)
- `<icon>` — Dashicon picked from context (e.g. `format-quote`)
- `<namespace>` — value of `BlockManager::$namespace` (e.g. `acme`)
- `<text-domain>` — `Text Domain` from the theme's `style.css` (e.g. `acme-2026`)

### Block files (Phase 2)

#### `resources/blocks/<slug>/block.json`

Include `"viewScript"` only when a `block.js` exists, and `"viewStyle"` only
when a `block.css` exists (both optional — see the Tailwind-first rule). A
presentational block omits both lines.

```json
{
    "apiVersion": 3,
    "name": "<namespace>/<slug>",
    "title": "<Title>",
    "category": "<category>",
    "icon": "<icon>",
    "description": "<one-line description>",
    "textdomain": "<text-domain>",
    "render": "file:./block.php",
    "viewScript": "file:./block.js",
    "viewStyle": "file:./block.css",
    "supports": {
        "anchor": true
    },
    "attributes": {
        "isPreview": {
            "type": "boolean",
            "default": false
        },
        // Preset: copy the row for this block's kind from "Entrance animation wiring".
        "entrance": {
            "type": "object",
            "default": { "type": "fade-slide", "direction": "up", "distance": null, "unit": "px", "duration": null, "delay": null, "stagger": 100 }
        }
        // Expand from Phase 1 attributes. Examples:
        // "heading": { "type": "string", "default": "" },
        // "items":   { "type": "array",  "default": [] }
    },
    "example": {
        "attributes": {
            "isPreview": true
        }
    }
}
```

#### `resources/blocks/<slug>/block.php`

```php
<?php

if (!defined('ABSPATH')) {
    exit;
}

// The block's own block.css/block.js are auto-enqueued by WordPress via
// block.json's file: fields — nothing to do here for those.
// Only third-party vendor libs get enqueued here (registered in app/setup.php):
// wp_enqueue_script('<handle>');
// wp_enqueue_style('<handle>');

$attributes = $attributes ?? [];

echo view('blocks.<slug>', [
    // Per-attribute sanitization (see Phase 2 table).
    // 'heading' => sanitize_text_field($attributes['heading'] ?? ''),

    // Gutenberg HTML anchor → id on the section wrapper (see "Anchor support").
    'anchor' => sanitize_html_class($attributes['anchor'] ?? ''),

    // Entrance animation: block.json preset + saved object, sanitized. Consumed
    // by @entrance / @entrancePart in the view (see "Entrance animation wiring").
    'entrance' => \App\Blocks\BlockEntrance::fromBlock($attributes, __DIR__),

    // Always include the global padding attrs.
    'paddingVertDesktop' => absint($attributes['paddingVertDesktop'] ?? 112),
    'paddingVertMobile'  => absint($attributes['paddingVertMobile']  ?? 56),
    'paddingXDesktop'    => (bool) ($attributes['paddingXDesktop']   ?? true),
    'paddingXMobile'     => (bool) ($attributes['paddingXMobile']    ?? true),
])->render();
```

#### `resources/blocks/<slug>/block.jsx`

```jsx
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { PaddingControls } from '../components/backend/PaddingControls.jsx';
import { EntranceControl } from '../components/backend/EntranceControl.jsx';
import { resolveEntrance, entranceRootProps, entrancePartProps } from '../components/backend/entranceCanvas.js';
// Uncomment the imports your attributes actually need:
// import { PanelBody } from '@wordpress/components'; // needed if this block has a Background Media panel
// import { AttachmentImageControl } from '../components/backend/AttachmentImageControl.jsx';
// import { ActionEditor }           from '../components/backend/ActionEditor.jsx';
// import { AutoGrowingTextarea }     from '../components/backend/AutoGrowingTextarea.jsx';
// import { ParagraphsField }         from '../components/backend/ParagraphsField.jsx';
// import { ItemList }                from '../components/backend/ItemList.jsx';
// import { ImagePositionControl }    from '../components/backend/ImagePositionControl.jsx';
// import { DividerControl }          from '../components/backend/DividerControl.jsx';
// import { LinkPicker }              from '../components/backend/LinkPicker.jsx';
// import { EDITOR_TYPE, EDITOR_BLOCK_FRAME, emptyLink } from '../components/backend/editorCanvas.js';
import previewImage from './preview.svg';
import metadata from './block.json';

registerBlockType(metadata, {
    edit({ attributes, setAttributes, clientId }) {
        const blockProps = useBlockProps();
        const { isPreview } = attributes;
        // Same resolution as BlockEntrance::fromBlock, so canvas == front end.
        const entrance = resolveEntrance(attributes.entrance, metadata.attributes.entrance?.default ?? {});
        const rootEntrance = entranceRootProps(entrance);
        // Destructure your block's other attributes here.
        // Example: const { heading, bgImageId, bgImagePosition, ctaText, ctaLink } = attributes;
        // const [isEditingButton, setIsEditingButton] = useState(false);

        // Static preview for the Gutenberg inserter hover panel.
        if (isPreview) {
            return (
                <div {...blockProps}>
                    <img
                        src={previewImage}
                        alt={__('<Title> preview', '<text-domain>')}
                        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
                    />
                </div>
            );
        }

        return (
            <>
                {/* Sidebar (InspectorControls) — configuration, plus background media.
                    No text fields, no link editors, no button editing here. */}
                <InspectorControls>
                    {/* Background media panel — only if this block has a bgImageId attribute:
                    <PanelBody title={__('Background Media', '<text-domain>')} initialOpen={true}>
                        <AttachmentImageControl
                            imageId={bgImageId}
                            label={__('Background image', '<text-domain>')}
                            onSelect={(media) => setAttributes({ bgImageId: Number(media.id) || 0 })}
                            onRemove={() => setAttributes({ bgImageId: 0 })}
                            noStylesheet
                        />
                        <ImagePositionControl value={bgImagePosition} onChange={(pos) => setAttributes({ bgImagePosition: pos })} />
                    </PanelBody>
                    */}

                    <PaddingControls attributes={attributes} setAttributes={setAttributes} />
                    {/* clientId is REQUIRED: Preview finds this block's canvas root by it. */}
                    <EntranceControl attributes={attributes} setAttributes={setAttributes} clientId={clientId} />
                    {/* Add other config-only controls here:
                        <DividerControl value={sectionDivider} onChange={...} />
                        <SelectControl label="Layout" options={[...]} ... />
                    */}
                </InspectorControls>

                {/* Canvas — White Summers format:
                    Root wrapper uses EDITOR_BLOCK_FRAME for the signature 1px dashed outline boundary,
                    rounded card corners, and mb-10 separation between blocks.
                    Inside: real data, inline editing, theme typography, no form clutter. */}
                <section
                    {...blockProps}
                    {...rootEntrance}
                    className={`${blockProps.className || ''} <slug>-editor ${EDITOR_BLOCK_FRAME}`}
                    style={{ ...blockProps.style, ...rootEntrance.style }}
                >
                    {/* Every visible part (heading, subtitle, body, CTA row, each
                        repeater item) spreads entrancePartProps with a running
                        index — same order as @entrancePart in the Blade view:
                    <div {...entrancePartProps(entrance, 0)}>…heading…</div>
                    <div {...entrancePartProps(entrance, 1)}>…subtitle…</div>
                    {items.map((item, i) => <article key={i} {...entrancePartProps(entrance, 2 + i)}>…</article>)}
                    */}
                    {/* Background Media — passive preview only, canvas has no click target.
                        Selecting/replacing/removing the image happens in the sidebar (above):
                    {bgUrl && (
                        <div
                            className="absolute inset-0 -z-10 bg-cover bg-no-repeat opacity-40"
                            style={{ backgroundImage: `url(${bgUrl})`, backgroundPosition: focalCss(bgImagePosition) }}
                        />
                    )}
                    */}

                    {/* Heading — inline editing via AutoGrowingTextarea:
                    <AutoGrowingTextarea
                        value={heading}
                        onChange={(value) => setAttributes({ heading: value })}
                        placeholder={__('Enter heading…', '<text-domain>')}
                        className={EDITOR_TYPE.display}
                    />
                    */}

                    {/* Inline Image — AttachmentImageControl with × on hover:
                    <AttachmentImageControl
                        imageId={imageId}
                        onSelect={(media) => setAttributes({ imageId: media.id })}
                        onRemove={() => setAttributes({ imageId: 0 })}
                        height="380px"
                    />
                    */}

                    {/* Body copy — inline ParagraphsField or RichText:
                    <ParagraphsField
                        value={description}
                        onChange={(value) => setAttributes({ description: value })}
                        placeholder={__('Enter description…', '<text-domain>')}
                    />
                    */}

                    {/* CTA button — styled preview on canvas.
                        DEFAULT: a full-width/single CTA opens ActionEditor INLINE,
                        directly below the button — the block already has the room and
                        naturally grows to contain it, so it never overlaps whatever
                        renders next:
                    <span
                        role="button"
                        tabIndex={0}
                        aria-label={__('Edit button', '<text-domain>')}
                        className="btn btn-primary"
                        onClick={() => setIsEditingButton(!isEditingButton)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setIsEditingButton(!isEditingButton);
                            }
                        }}
                    >
                        {ctaText || __('Button', '<text-domain>')}
                    </span>
                    {isEditingButton && (
                        <div className="w-full max-w-xl text-left">
                            <ActionEditor
                                groupLabel={__('Button editing', '<text-domain>')}
                                label={__('Button label', '<text-domain>')}
                                linkLabel={__('Button destination', '<text-domain>')}
                                text={ctaText}
                                link={ctaLink}
                                stacked={false}
                                onTextChange={(value) => setAttributes({ ctaText: value })}
                                onLinkChange={(value) => setAttributes({ ctaLink: value })}
                            />
                        </div>
                    )}
                    */}

                    {/* ONLY for a button/link that belongs to a REPEATER ITEM (a grid
                        card, a list item) — SAME inline pattern as the default above,
                        SAME component, just stacked={true} instead of stacked={false}.
                        stacked renders ActionEditor's fields in one vertical column
                        (the layout it already uses inside a sidebar), which is what
                        fits a ~280px grid column — no separate mechanism, no sidebar,
                        no Popover:
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={() => setEditingLink(editingLink === index ? null : index)}
                    >
                        {item.linkText || __('Learn more', '<text-domain>')}
                    </span>
                    {editingLink === index && (
                        <div className="mt-3 text-left">
                            <ActionEditor
                                groupLabel={`${__('Item link editing', '<text-domain>')} ${index + 1}`}
                                label={__('Link text', '<text-domain>')}
                                linkLabel={__('Link destination', '<text-domain>')}
                                text={item.linkText}
                                link={item.link}
                                stacked={true}
                                onTextChange={(value) => updateItem(index, 'linkText', value)}
                                onLinkChange={(value) => updateItem(index, 'link', value)}
                            />
                        </div>
                    )}
                    */}
                </section>
            </>
        );
    },

    // Server-rendered via block.php; nothing to save on the client.
    save: () => null,
});
```

#### `resources/blocks/<slug>/block.js`

Plain vanilla — **no `import`**. Consume vendor libs via their global (e.g.
`window.Swiper`); gate init on `DOMContentLoaded` so vendor scripts have run.

```js
// No frontend behavior yet. Example when a vendor lib is used:
// document.addEventListener('DOMContentLoaded', () => {
//   document.querySelectorAll('.<slug>').forEach((el) => {
//     if (typeof window.Swiper !== 'undefined') new window.Swiper(el, { /* ... */ });
//   });
// });
```

#### `resources/blocks/<slug>/block.css` — optional

Create this file **only** for reusable/semantic CSS or third-party lib
overrides. One-off layout (padding, flex, sizing) belongs in the Blade as
Tailwind utilities — not here. If the block has none of that, don't create the
file and don't add `viewStyle` to block.json.

When you do create it: plain CSS — **no `@apply` / `@reference`** (it's served
from source, not Vite-compiled, so Tailwind directives would ship uncompiled and
break). Use `var(--...)` tokens. Example of a legitimate use — overriding a
vendor lib's internals, scoped under the block's root class:

```css
.<slug> .swiper-pagination-bullet-active {
    background-color: var(--color-primary);
}
```

#### `resources/views/blocks/<slug>.blade.php`

```blade
<section @if ($anchor) id="{{ $anchor }}" @endif class="<slug> py-16" @entrance($entrance)>
    {{-- @entrance prints its own style="" — never put a second style attribute
         on this element. Each visible part gets @entrancePart(<running index>),
         in the same order block.jsx uses (see "Entrance animation wiring"). --}}
    {{-- Anchor id stays on this <section>; any dynamic/unique id (e.g. a Swiper
         instance id) goes on an INNER element so it can't collide — see
         "Anchor support". This note is guidance: keep it only if the block
         actually emits a dynamic id, else drop it. --}}
    {{-- Scaffolding — replace with the real render. Example:
        @if ($heading)
            <h2 class="<slug>__heading" @entrancePart(0)>{{ $heading }}</h2>
        @endif
        @foreach ($items as $item)
            <article @entrancePart($loop->index + 1)>…</article>
        @endforeach
    --}}
</section>
```

---

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
- **Verify** before calling the block done, after `npm run build`: open the
  page in the editor — no block shows "This block has encountered an error"
  (console clean); clicking the sidebar **Preview** hides and replays the
  parts; on the front end the section has `data-entrance` and gains
  `data-entered` on scroll.

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

#### `app/setup.php` — vendor libs only (vanilla Sage role, no block bootstrap)

```php
/**
 * Register vendor libs. Registration != enqueue — nothing loads here.
 * Each block.php that needs a lib calls wp_enqueue_script/style for the handle.
 */
add_action('init', function () {
    // Example (Swiper):
    // wp_register_script('swiper',
    //     get_theme_file_uri('resources/js/vendor/swiper-bundle.min.js'),
    //     [], '11.0', true);
    // wp_register_style('swiper',
    //     get_theme_file_uri('resources/css/vendor/swiper-bundle.min.css'),
    //     [], '11.0');
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

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

### Required infra (skill bootstraps if missing)

| # | Check |
|---|-------|
| 0.1 | `app/Blocks/BlockManager.php` exists. Template at `<skill>/templates/BlockManager.php`. |
| 0.2 | `resources/blocks/` exists |
| 0.3 | `resources/views/blocks/` exists |
| 0.4 | `resources/js/vendor/` exists |
| 0.5 | `resources/css/vendor/` exists |
| 0.6 | `app/blocks.php` is the **central block-bootstrap file** — must (a) exist, (b) contain top-level `BlockCategories::register();`, (c) contain `add_action('init', function () { (new BlockManager())->register(); });`, (d) be loaded by `functions.php`'s `collect([...])` array (see 0.6.1). Template at `<skill>/templates/blocks.php`. |
| 0.6.1 | `functions.php`'s `collect([...])` array includes `'blocks'`. Without it, `app/blocks.php` never loads. If `functions.php` doesn't use the `collect([...])` pattern at all, **bail out** — needs manual wiring. |
| 0.8 | `resources/js/editor.js` calls `import.meta.glob('../blocks/*/block.jsx', { eager: true });` (Vite compiles the **editor** JSX only — front-end `block.js`/`block.css` are served from source via `file:`, see "Block asset loading") |
| 0.9 | `resources/css/app.css` has `@source "../blocks/**/*.{php,jsx}";` |
| 0.10 | `package.json` `devDependencies` has `react@^18` AND `react-dom@^18`. **React pinned to ^18, not ^19** — React 19 breaks Gutenberg (element-symbol mismatch with WP's React 18). |
| 0.11 | `app/Blocks/BlockCategories.php` exists. Template at `<skill>/templates/BlockCategories.php`. **First-run only**: ask `"Vou criar uma categoria pros seus blocos. Quer chamar de 'Custom Blocks' (default) ou outro nome?"`, copy template, edit `TITLE` and `SLUG` (lowercase + hyphens) if dev picked a different name. The actual `BlockCategories::register();` call lives in `app/blocks.php` (check 0.6). Subsequent runs: grep `const SLUG = '...'` from the existing file. |
| 0.12 | `resources/blocks/components/backend/` contains the 8 canonical shared components: `ImageUploadWithHover.jsx`, `LinkPicker.jsx`, `RemoveButton.jsx`, `TabSelector.jsx`, `PaddingControls.jsx`, `padding-presets.js`, `ImagePositionControl.jsx`, `IconPicker.jsx`. If missing: copy from `<skill>/templates/components/backend/*`. |
| 0.15 | `app/Blocks/BlockPadding.php` and `app/Blocks/BlockImagePosition.php` exist. Templates at `<skill>/templates/BlockPadding.php` and `<skill>/templates/BlockImagePosition.php`. |
| 0.16 | `app/Providers/ThemeServiceProvider.php`'s `boot()` registers a `paddingClasses` Blade directive expanding to `\App\Blocks\BlockPadding::resolve(...)` (see `.claude/skills/blade-standards/SKILL.md`). |

### Compatibility warnings (do NOT auto-fix)

| # | Check |
|---|-------|
| 0.13 | `vite.config.js` `base:` points to the theme's actual path (e.g. `/wp-content/themes/<active-theme>/public/build/`). Sage's default ships with `/app/themes/sage/public/build/` (Bedrock) which **breaks asset URLs** in standard WP. **Warn**, don't auto-fix. |
| 0.14 | **Global-enqueue smell.** Scan `app/**.php` + `functions.php` for `wp_enqueue_script(`/`wp_enqueue_style(` *outside* `resources/blocks/*/block.php`. Theme handles (`app`, `editor`) are fine; vendor-lib-looking handles (`swiper`, `gsap`, …) loaded globally are a smell — warn with file:line, recommend the canonical pattern from `.claude/skills/blade-standards/SKILL.md` (register in `setup.php`, enqueue in `block.php`). |

### Bootstrap UX

If any check 0.1–0.16 (incl. 0.6.1) fails:

1. Show the dev a status table of failed checks.
2. Split fixes into **(A) Creations** (new files/folders) and **(B) Modifications** (edits to `functions.php`, `editor.js`, `app.css`). `package.json` is not edited — tell the dev to run `npm install --save-dev react@^18.0.0 react-dom@^18.0.0` themselves.
3. Confirm A and B separately. For B, show inline diffs (affected hunks only). Stop if the dev declines either.

### Idempotency (per-file divergence heuristic)

Phase 0 must be re-runnable. Before each create/modify, Read the target and check the expected shape:

| Target | Expected shape | If matches | If partial | If diverges from stock |
|---|---|---|---|---|
| `app/blocks.php` (Group A) | Has both `BlockCategories::register()` and `add_action('init', ...)` referencing `BlockManager` | **Skip** | **Bail** — name the missing piece | **Bail** — content unrecognized; ask dev to move/rename |
| `functions.php` (Group B) | `collect([...])->each(...)` array includes `'blocks'` | **Skip** | Edit the array (insert `'blocks'`); preserve formatting | **Bail** — pattern not found / dynamic array |
| `resources/js/editor.js` | `import.meta.glob('../blocks/*/block.jsx'` | **Skip** | apply documented edit | **Bail** |
| `resources/css/app.css` | `@source "../blocks/**` | **Skip** | apply documented edit | **Bail** |
| `app/Providers/ThemeServiceProvider.php` (Group B) | `boot()` calls `parent::boot()` and registers a `Blade::directive('paddingClasses', ...)` | **Skip** | `boot()` exists but lacks the directive — insert the `Blade::directive(...)` call | **Bail** — provider doesn't match Sage's stock shape (custom providers are common; ask the dev to wire it manually) |

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
| `image`, `photo`, `picture`, `thumbnail`, `cover`, `bg`/`background image` | image **PAIR** | `<name>Id` (number) + `<name>Url` (string) | `<MediaUploadCheck><ImageUploadWithHover .../></MediaUploadCheck>`. If wording contains "background" / "bg" → also add `<name>Position` (string, default `"center"`) + render `<ImagePositionControl />` |
| `icon` | string (Dashicon slug or arbitrary name) | `<name>` | `<TextControl>` (or `<IconPicker>` if the project ships one) |
| `link`, `url`, `cta link`, `href` | link (Gutenberg `LinkControl` object: `{url, opensInNewTab}`) | `<name>` | `<LinkPicker label="..." value={...} onChange={...} />` — sized to match the white-card input height so it lines up next to a sibling text field |
| `button`, `cta` (alone, no "link") | button **PAIR** | `<name>Text` (string) + `<name>Link` (object) | **plain input** for text + `<LinkPicker>` for link, in a `flex gap-3` row so heights align |
| `color`, `bg color`, `text color` | string (hex / palette slug) | `<name>` | `<ColorPalette>` or `<PanelColorSettings>` |
| `size`, `width`, `height`, `count`, `amount`, plain `number` | number (unsigned) | `<name>` | `<TextControl type="number">` or `<RangeControl>` |
| `show X`, `enable X`, `visible`, `active`, `toggle`, "is X" boolean | boolean | `<name>` | `<ToggleControl>` |
| `list of X`, `X list`, `items`, `slides`, `cards`, `testimonials`, `features`, `points`, `steps`, `accordion items` | array | `<name>` (`items` is the conventional default for the array attr) | `<TabSelector>` + `useState(0)` for active index + per-item form (recurse: infer sub-field types from the same table) |
| `video` + url/embed | string (URL) | `<name>Url` | `<TextControl type="url">` |
| `alignment`, `align`, `text alignment` | string enum | `<name>` (default `"left"`) | `<AlignmentToolbar>` or `<SelectControl>` |
| `layout`, `variant`, `style` + descriptor (e.g. "compact/full") | string enum | `<name>` | `<SelectControl options={...}>` (config — put in `InspectorControls`) |

#### Special expansion rules (apply BEFORE the keyword lookup)

1. **Image pair**: any image-like mention generates **two attributes** — `<name>Id` (number) + `<name>Url` (string). Render via `ImageUploadWithHover`. WordPress's media library returns both pieces in one call; storing the URL alongside the ID avoids hitting `wp_get_attachment_url()` at render time. If the wording mentions "background" or "bg", add a third attribute `<name>Position` (string, default `"center"`) and render `<ImagePositionControl />` alongside.

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

   Also pass the same hint text as `ImageUploadWithHover`'s `placeholder`
   prop so it shows before an image is selected.

2. **Button pair**: "button" / "CTA" alone (without "link") generates **two attributes** — `<name>Text` (string) + `<name>Link` (Gutenberg `LinkControl` object: `{url, opensInNewTab}`). Render the text as a **plain input** (button labels are short, no inline formatting) and the link via `LinkPicker`, side-by-side in a `flex gap-3` row.

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

### What goes where in the editor (Inspector vs body)

- **InspectorControls (sidebar)** = block **configuration** — always `<PaddingControls />`; plus toggles for layout variants, color, breakpoints, anything visual/structural picked rarely.
- **Editor body** (dashed-border wrapper) = block **content** — labeled white cards holding **plain `<input>`** for headings / labels / short text, **`<RichText>`** for descriptions / long copy, `<ImageUploadWithHover />` for images, `<LinkPicker />` for links, `<TabSelector />` + per-item edit form for array repeaters (with `<RemoveButton />` at the top-right of the active item's panel).

When uncertain, prefer the body — Inspector is hidden by default.

### What the skill does NOT ask

**Vendor libs** are a deliberate dev decision, not block scaffolding. The skill generates blocks without lib boilerplate; if the dev adds Swiper etc. afterward, they follow the pattern in `_docs/examples.md` (`wp_register_*` in `setup.php` + `wp_enqueue_*` in `block.php`). Phase 0's smell detector watches for the wrong pattern over time.

### Validations (cheap, fail fast)

Before generating, check:

- Slug matches `/^[a-z][a-z0-9-]*$/`.
- `resources/blocks/<slug>/` does **not** already exist.
- `<slug>` is **not** already in `BlockManager::$blocks`.

If any fails: stop, ask for an alternative. Cheap-only by design — clash with `core/*` block names is left to fail at build (rare + expensive to detect).

### Read the existing block namespace

Read `$namespace` from `app/Blocks/BlockManager.php` (via `getNamespace()`). Use it as the prefix in each block.json's `name` (`<namespace>/<slug>`). Sage default: `sage`; teams may have changed it.

---

## Phase 2 — Generate the block files

Create `resources/blocks/<slug>/` plus the Blade view. Templates at the bottom of this doc. Substitute `<slug>`, `<Title>`, `<category>`, `<icon>`, `<namespace>` with Phase 1 values.

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
| `array` | `{"type":"array","default":[]}` | `array_map(...)` with per-item sanitization | **Tabs repeater**: `<TabSelector items={items} activeItem={activeIdx} setActiveItem={setActiveIdx} addItem={addItem} itemLabelPrefix="Slide" />` at top + `useState(0)` for active index + edit form below scoped to `items[activeIdx]`. Place `<RemoveButton onClick={() => removeItem(activeIdx)} />` in a `<div className="flex justify-end">` at the **top of the active item's panel** (right-aligned, before the fields) — gated by `items.length > 1` so the last item can't be removed |
| image (id + url) | `{"<name>Id":{"type":"number","default":0},"<name>Url":{"type":"string","default":""}}` | `absint($attributes['<name>Id'] ?? 0)` + `esc_url_raw($attributes['<name>Url'] ?? '')` | Label row shows `<name> — recommended <W>×<H>px` (see dimension table above); `<MediaUploadCheck><ImageUploadWithHover imageId={...Id} imageUrl={...Url} MediaUpload={MediaUpload} placeholder="Click to select an image (recommended <W>×<H>px)" onSelect={(media) => setAttributes({ <name>Id: media.id, <name>Url: media.url })} onRemove={() => setAttributes({ <name>Id: 0, <name>Url: '' })} /></MediaUploadCheck>` |
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
├── blocks.php                      → copied to app/blocks.php (check 0.6)
├── preview.svg                     → copied per block (with __BLOCK_TITLE__ substituted)
└── components/backend/             → copied to resources/blocks/components/backend/ (check 0.12)
    ├── ImageUploadWithHover.jsx
    ├── LinkPicker.jsx
    ├── RemoveButton.jsx
    ├── TabSelector.jsx
    ├── PaddingControls.jsx
    ├── padding-presets.js
    ├── ImagePositionControl.jsx
    └── IconPicker.jsx
```

`preview.svg` uses `__BLOCK_TITLE__` as its only placeholder. Every generated `block.jsx` imports `PaddingControls`; image / link / array blocks add the matching imports as needed.

### Block file placeholders

All block-file templates below use these — substitute throughout:

- `<slug>` — kebab-case (e.g. `testimonial-carousel`)
- `<Title>` — human-readable (e.g. `Testimonial Carousel`)
- `<category>` — custom category from check #11 (default `custom-blocks`)
- `<icon>` — Dashicon picked from context (e.g. `format-quote`)
- `<namespace>` — value of `BlockManager::$namespace` (e.g. `sage`)

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
    "textdomain": "sage",
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
import { useBlockProps, MediaUpload, MediaUploadCheck, RichText } from '@wordpress/block-editor';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { PaddingControls } from '../components/backend/PaddingControls.jsx';
// Uncomment the imports your attributes actually need:
// import { ImageUploadWithHover } from '../components/backend/ImageUploadWithHover.jsx';
// import { LinkPicker }           from '../components/backend/LinkPicker.jsx';
// import { TabSelector }          from '../components/backend/TabSelector.jsx';
// import { RemoveButton }         from '../components/backend/RemoveButton.jsx';
// import { ImagePositionControl } from '../components/backend/ImagePositionControl.jsx';
import previewImage from './preview.svg';
import metadata from './block.json';

registerBlockType(metadata, {
    edit({ attributes, setAttributes }) {
        const blockProps = useBlockProps();
        const { isPreview } = attributes;
        // Destructure your block's other attributes here.
        // Example: const { heading, items } = attributes;

        // Static preview for the Gutenberg inserter hover panel.
        if (isPreview) {
            return (
                <div {...blockProps}>
                    <img
                        src={previewImage}
                        alt={__('<Title> preview', 'sage')}
                        style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px' }}
                    />
                </div>
            );
        }

        return (
            <>
                {/* Sidebar (InspectorControls) — config attrs only. */}
                <PaddingControls attributes={attributes} setAttributes={setAttributes} />

                {/* Editor body — content attrs in the dashed wrapper. */}
                <section
                    {...blockProps}
                    className={`${blockProps.className} mb-10 bg-gray-50 border-2 border-dashed border-gray-600 rounded-lg p-6 relative overflow-hidden`}
                >
                    <h3 className="text-base font-sans! font-bold mb-8 uppercase tracking-widest text-gray-500 relative z-10">
                        <Title> Preview
                    </h3>

                    <div className="space-y-6 relative z-10">
                        {/* Each content field gets a labeled white card.

                            Heading / label / simple short text → plain <input>:
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Heading</label>
                            <div className="p-3 border border-gray-300 rounded bg-white">
                                <input
                                    type="text"
                                    value={attributes.heading}
                                    onChange={(e) => setAttributes({ heading: e.target.value })}
                                    placeholder={__('Enter heading…', 'sage')}
                                    className="w-full border-0 outline-none m-0 p-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400"
                                />
                            </div>
                        </div>

                            Image → ImageUploadWithHover with a dimension hint in the label:
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                                {__('Background Image', 'sage')}
                                <span className="normal-case font-normal text-gray-400"> — {__('recommended 1920×1080px', 'sage')}</span>
                            </label>
                            <MediaUploadCheck>
                                <ImageUploadWithHover
                                    imageId={attributes.bgImageId}
                                    imageUrl={attributes.bgImageUrl}
                                    MediaUpload={MediaUpload}
                                    placeholder={__('Click to select an image (recommended 1920×1080px)', 'sage')}
                                    onSelect={(media) => setAttributes({ bgImageId: media.id, bgImageUrl: media.url })}
                                    onRemove={() => setAttributes({ bgImageId: 0, bgImageUrl: '' })}
                                />
                            </MediaUploadCheck>
                        </div>

                            Description / long copy → RichText:
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Description</label>
                            <div className="p-3 border border-gray-300 rounded bg-white">
                                <RichText
                                    tagName="p"
                                    value={attributes.description}
                                    onChange={(value) => setAttributes({ description: value })}
                                    className="!m-0 min-h-[80px]"
                                    placeholder={__('Enter description…', 'sage')}
                                />
                            </div>
                        </div>

                            Repeater (array attribute) — RemoveButton at top-right of active panel:
                        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                            <TabSelector
                                items={safeItems}
                                activeItem={activeIdx}
                                setActiveItem={setActiveIdx}
                                addItem={addItem}
                                itemLabelPrefix={__('Item', 'sage')}
                            />
                            {active && (
                                <div className="space-y-4">
                                    {safeItems.length > 1 && (
                                        <div className="flex justify-end">
                                            <RemoveButton
                                                confirmMessage={__('Remove this item?', 'sage')}
                                                onClick={() => removeItem(activeIdx)}
                                            />
                                        </div>
                                    )}
                                    // per-item fields here
                                </div>
                            )}
                        </div>
                        */}
                    </div>
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
<section @if ($anchor) id="{{ $anchor }}" @endif class="<slug> py-16">
    {{-- Anchor id stays on this <section>; any dynamic/unique id (e.g. a Swiper
         instance id) goes on an INNER element so it can't collide — see
         "Anchor support". This note is guidance: keep it only if the block
         actually emits a dynamic id, else drop it. --}}
    {{-- Scaffolding — replace with the real render. Example:
        @if ($heading)
            <h2 class="<slug>__heading">{{ $heading }}</h2>
        @endif
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

#### `app/Providers/ThemeServiceProvider.php` — register the `paddingClasses` directive

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

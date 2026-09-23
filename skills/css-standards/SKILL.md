---
name: css-standards
description: >
  Apply the team's CSS/Tailwind standards for a Sage 11 theme whenever
  creating or editing CSS — theme foundation files (variables.css,
  base.css, typography.css), block-level CSS (.css files under
  resources/blocks/*), or Tailwind classes inside Blade/JSX. Use this
  skill before writing any new CSS/Tailwind code and when reviewing
  existing CSS for standard compliance.
---

# css-standards — Sage 11 CSS/Tailwind conventions

Tailwind utilities for one-off styles; `@apply` in a dedicated class for
reusable/semantic patterns.

---

## Theme CSS foundation (start here)

Every theme starts with the style guide foundation, generated **before any
block** by the `css-foundation-wizard` skill
(`.claude/skills/css-foundation-wizard/SKILL.md`):

| File | Holds |
|---|---|
| `global/variables.css` | Colors (incl. state), radius, shadow — **no type, no container** |
| `global/typography.css` | Fonts, the whole type scale, `body` text, `h1, .heading-1` … `h6, .heading-6` (one rule each), `.font-eyebrow`, shared text treatments — **everything about text** |
| `global/layout.css` | `html`/`body` structure, `.app` |
| `global/base.css` | How unclassed non-text tags look (`body` color/background, `a`, lists…) — **no type** |
| `global/container.css` | Container width tokens + `.container` (an `@utility`) |
| `components/button.css` | `.btn`, `.btn-primary`, `.btn-secondary` |
| `components/card.css` | `.card` — the shared card/item/panel surface |

If any is missing, run the wizard — don't hand-write a partial foundation.
Token **names** are the wizard's contract (fixed across projects); values are
the client's.

**Scope boundaries:**
**Each thing is defined in exactly one file** — color/radius/shadow in
`variables.css`, every font, size and text rule in `typography.css`, the
container in `container.css`. Every other file only reads them via
`var(--...)`: no raw hex or font size/family elsewhere, no fallback copy
(`var(--x, #hex)`), no RGB twin of a color "kept in sync". A second copy is
the one that drifts.
- **`layout.css`**: site-wide structure (e.g. `.app { overflow-x: clip; }`).
- **`base.css`**: how a non-text tag looks *by default, unclassed*.

Never put block-level classes (`.hero`, `.testimonials`) in these files.

---

## Style guide only

Everything the site shows takes its color, font, type size, radius and shadow
from the style guide:

| Instead of | Use |
|---|---|
| `text-slate-900`, `text-black` | `text-ink` |
| `text-slate-500/600/700` | `text-muted` (or `text-ink`) |
| `bg-white` / `bg-slate-50` | `bg-light` / `bg-surface` |
| `border-slate-200` | `border-border` |
| `text-blue-600`, `bg-blue-50` | `text-primary`, `bg-primary-light` |
| `text-red-600` (error) | `text-danger` (`success`, `warning` alike) |
| `text-3xl font-extrabold sm:text-4xl`, `text-h2`, `text-[2rem] md:text-h2` on a heading | `heading-2` (…`heading-6`) — family, weight and mobile → desktop size in one class |
| `text-sm` / `text-base` / `text-lg` | `text-small` / `text-body` / `text-lead` |
| `text-[10px]`, `leading-[0.95]`, `tracking-[-0.03em]` | a token, or a treatment class in `typography.css` |
| a hand-styled CTA (`bg-… px-6 py-3 rounded-…`) | `btn btn-primary` / `btn btn-secondary` |
| `rounded-card border border-border bg-light shadow-card` (a card re-typed) | `card` (+ the block's own layout: `card flex flex-col p-8`) |
| `rounded-2xl`, `shadow-sm` | `rounded-card` / `rounded-button`, `shadow-card` |

Tailwind's stock palette and type scale, `text-hN` utilities and arbitrary
sizes never appear in Blade views, blocks or `resources/css/{components,pages}/`.
Spacing, layout and weight utilities (`p-8`, `grid`, `font-bold`) stay
Tailwind. Editor-UI controls in `resources/blocks/components/backend/` mimic
wp-admin and are exempt.

**A repeated treatment is a class before it's a second block.** If a block
needs a look the foundation doesn't have, and another block will use it too
(a title decoration, a quote, a badge), add it **first** — a text treatment
to `typography.css`, a UI piece to `components/` — then use the class in
both blocks. A value the design needs that has no token becomes a token.
Never copy a class string from one block into another: that copy is the
rework (Bright Minds extracted one such title treatment from 24 files after
the fact).

`node scripts/check-css-foundation.mjs` enforces the foundation and this
table; `create-block` runs it (check 0.21) and so does the pre-commit hook.
Exit 1 lists `file:line`.

---

## CSS folder layout

Nothing we write lives at the root of `resources/css/`. The root holds only
Sage's Vite entrypoints (`app.css`, `editor.css`); everything else goes in a
folder by role:

| Folder | Holds | Example |
|---|---|---|
| `global/` | The foundation files (see above) | `global/variables.css`, `global/container.css` |
| `components/` | One file per reusable UI component used across blocks/pages | `components/button.css` |
| `pages/` | Styles that only apply to one template/page | `pages/single-project.css` |
| `editor/` | Styles only the block editor loads, imported from `editor.css` (never `app.css`) | `editor/blocks.css` |
| `vendor/` | Third-party CSS, committed as-is (never ours, never formatted) | `vendor/swiper-bundle.min.css` |

A block's own CSS is **not** here — it lives next to the block
(`resources/blocks/<slug>/block.css`, see **Block styles**).

### Front-end entrypoint: `resources/css/app.css`

`app.css` imports the foundation below Sage's stock lines, in this order:

```css
@import './global/variables.css';
@import './global/typography.css';
@import './global/layout.css';
@import './global/base.css';
@import './global/container.css';

@import './components/button.css';

@import './pages/single-project.css';
```

A web-font `@import url(...)` goes on the **first line**, above
`@import "tailwindcss"` — CSS drops an `@import` placed after other rules.

### Editor entrypoint: `resources/css/editor.css`

`editor.css` imports the same foundation so the Gutenberg canvas matches the front end (same web-font line first):

```css
@import "tailwindcss";

@import "./global/variables.css";
@import "./global/typography.css";
@import "./global/layout.css";
@import "./global/base.css";
@import "./global/container.css";

@import "./components/button.css";

@source "../blocks/**/*.{php,jsx,js}";
@source "../components/**/*.{jsx,js}";
```

New file → add its `@import` to its group (`editor/` files go in `editor.css`). Never create a new `.css` at the
root of `resources/css/`, and never import `vendor/` from `app.css` (vendor
libs are registered in `setup.php` and enqueued per block).

---

## Block styles

- Spacing sticks to Tailwind's default scale (`rem`); color, type, radius and
  shadow come from the style guide (see **Style guide only**). Arbitrary
  values only when strictly needed.
- Every block has a **unique root class** named after the block (`.hero`,
  `.testimonials`) — scopes all its styles.
- Nest selectors under the root. BEM (`__element--modifier`) only for
  complex blocks with many nested states.

```css
/* Simple block — clean classes */
.hero { ... }
.hero .title { ... }
.hero .subtitle { ... }

/* Complex block — BEM */
.accordion__item { ... }
.accordion__item--active { ... }
.accordion__trigger { ... }
```

- Never give a block its own generic class name (`.card`, `.box`,
  `.wrapper`) — block classes are prefixed (`.card-grid__card`). The shared
  `.card` / `.btn` come from `components/` and are meant to be reused.
- Tokens live in their foundation file (see **Theme CSS foundation**) —
  never redefine or re-type them in a block.
- **Class order is automated** — `prettier-plugin-tailwindcss` sorts
  non-Blade files and `@shufo/prettier-plugin-blade`
  (`sortTailwindcssClasses`) sorts Blade; a pre-commit hook enforces it
  (see README › "Code formatting"). Never hand-sort.
- **Hand-written CSS** (rare — `variables.css`, complex `@apply` bodies):
  one declaration per line, lowercase short hex (`#fff`), unitless zero
  (`0`), leading zero (`0.5rem`).

---

## Interactive element sizing

Buttons, button-like links, tags/badges and similar controls get their size
from **padding + font size/line-height** — never `height`, `min-height`,
`width` or `min-width` (nor `h-*`/`w-*` utilities). Copy the Figma padding
literally; a few px off the Figma height is acceptable. A fixed box breaks
with zoom, font swaps and longer or translated labels.

Figma kits usually draw fixed heights that include icon boxes — don't
compensate for a missing icon with `min-height`. Full-width in a specific
layout (`w-full` on a mobile CTA) is a layout decision made where the
component is used, not in the component itself.

**Form fields are the exception on width, not on height.** Inputs, textareas
and selects take `width: 100%` and fill their container — a text input's
intrinsic width (about 20 characters) is never the intended layout, so the
form's width is controlled by the container it sits in. Their height still
comes from padding + font, never `height`/`min-height`.

---

## When NOT to use

- Editing non-CSS files with no Tailwind classes involved.
- JS/PHP logic that doesn't touch styling.

(Global rules — English language, no assumptions, push back on flawed
asks — live in `CLAUDE.md` and apply automatically.)

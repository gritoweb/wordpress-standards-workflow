---
name: css-foundation-wizard
description: >
  Interactively set up a Sage 11 theme's CSS foundation from the client's
  style guide — resources/css/global/{variables,typography,layout,base,container}.css
  plus resources/css/components/{button,card}.css — then wire app.css / editor.css
  and prove it with scripts/check-css-foundation.mjs. Use when starting a new
  theme (project-init Phase 1c), or whenever a project is missing any of those
  files. Runs before any block exists, so blocks are built once on the style
  guide and never reworked.
---

# css-foundation-wizard — the style guide, built once, before any block

Turns the client's style guide into the theme's CSS foundation — one step at
a time, each gated by an "ajustar algo?" confirmation before writing, same as
`create-block`'s inferred-plan gate. Never runs `npm` / `composer` / `lando` /
`git` — the dev does that.

**Why it runs first:** blocks built before the foundation get restyled later.
Measured on two projects built without it: Bright Minds reworked 34 files
(`text-[2rem] md:text-h2` → a responsive token) and 24 more (a title treatment
copied into every block, later extracted to one class); Nourish added h4–h6
tokens on the day of its first block and then adjusted blocks "to match design
tokens" in four more commits. With every token and shared class in place
first, a block is written once.

This skill **generates** the foundation. `css-standards` **enforces** it day
to day (`.claude/skills/css-standards/SKILL.md` › **Style guide only**).

---

## Pre-conditions

- Working directory = active Sage 11 theme root (must contain
  `vite.config.js`, `resources/`). If unsure, **ask** — don't guess.
- It's built for first-time generation. If any file below already exists,
  tell the dev and ask whether to overwrite it or stop. Adding one token to an
  existing foundation later is a normal edit, not a wizard re-run.

---

## What it creates

| File | Holds |
|---|---|
| `global/variables.css` | Colors, radius, shadow — **no type, no container** |
| `global/typography.css` | Fonts, the whole type scale, `.heading-1…6`, `.font-eyebrow` and every shared text treatment — **everything about text** |
| `global/layout.css` | `html`/`body` structure, `.app` |
| `global/base.css` | How unclassed non-text tags look (`body` color/background, `a`, lists…) — **no type** |
| `global/container.css` | Container width tokens + `.container` — **the only place the container is defined** |
| `components/button.css` | `.btn`, `.btn-primary`, `.btn-secondary` |
| `components/card.css` | `.card` — the one card surface every block shares |

All paths under `resources/css/`. Never at the root of `resources/css/`
(folder layout: `css-standards` › **CSS folder layout**).

## Execution Flow

1. **Step 1** — style guide intake (one round of questions)
2. **Step 2** — `global/variables.css`
3. **Step 3** — `global/typography.css`
4. **Step 4** — `global/layout.css`
5. **Step 5** — `global/base.css`
6. **Step 6** — `global/container.css`
7. **Step 7** — `components/button.css` and `components/card.css`
8. **Step 8** — wiring: `app.css`, `editor.css`, Sage's `alert` component
9. **Step 9** — copy and run `scripts/check-css-foundation.mjs`; must exit 0
10. **Handoff**

Each step starts only once the previous file is confirmed and written.

---

## The token contract

The kit's components, header, examples and check read these token **names**.
The **values** are the client's; the names are fixed. Every project gets every
token — a missing one leaves a `var()` without a value and the page or canvas
silently falls back to browser defaults. The dev may add extra named colors
(`cream`, `accent`); never rename or drop a contract token.

| File | Group | Tokens | Utilities blocks use |
|---|---|---|---|
| `variables.css` | Color | `--color-ink` (text), `--color-muted` (secondary text), `--color-light` (page background), `--color-surface` (alternate section/card background), `--color-border`, `--color-primary`, `--color-primary-light` | `text-ink`, `text-muted`, `bg-light`, `bg-surface`, `border-border`, `text-primary`, `bg-primary-light` |
| `variables.css` | State | `--color-success`, `--color-warning`, `--color-danger` | `text-danger`, `border-danger`, … (form errors, notices) |
| `variables.css` | Shape | `--radius-card`, `--radius-button`, `--shadow-card` | `rounded-card`, `rounded-button`, `shadow-card` |
| `container.css` | Container | `--container-max-width`, `--container-padding-x` — in `:root`, not `@theme` (Tailwind's `--container-*` namespace would turn them into `max-w-*` utilities) | `container` |
| `typography.css` | Font | `--font-display` (headings), `--font-body` | `font-display`, `font-body` |
| `typography.css` | Headings | `--text-h1` … `--text-h6`, each with `--line-height` and `--font-weight`, plus `--text-hN-mobile` with `--line-height` | through `.heading-1…6` only |
| `typography.css` | Text | `--text-lead`, `--text-body`, `--text-small`, each with `--line-height` | `text-lead`, `text-body`, `text-small` |

Plus the contract **classes**: `.heading-1` … `.heading-6` and `.font-eyebrow`
(`typography.css`), `.btn`, `.btn-primary`, `.btn-secondary` (`button.css`),
`.card` (`card.css`).

**How blocks use it:** a heading takes `heading-N` — one class that carries
family, weight and the mobile → desktop size switch. Never `text-hN` (desktop
size only, no family: the source of Bright Minds' `text-[2rem] md:text-h2`),
never `text-3xl`. Text takes `text-lead` / `text-body` / `text-small`; color
takes the tokens above; a CTA takes `btn btn-primary`; a card, item or panel
surface takes `card` (plus its own layout: `flex`, `p-8`). Never Tailwind's stock
palette (`slate-*`, `blue-*`, `white`), stock type scale (`text-sm`,
`text-3xl`) or arbitrary sizes (`text-[2rem]`, `leading-[0.95]`). The check
(Step 9) refuses all of them.

---

## Step 1 — Style guide intake

1. Ask, open-ended: **"Me passa o styleguide: cores, fontes, escala de texto
   (Figma, PDF de marca ou texto)."** — and **stop until the dev answers**.
   No style guide in the request is not permission to proceed: the values in
   this skill's code blocks are illustrations of the format, **never
   defaults** — a theme shipped with them looks like every other kit test
   (measured: an agent given a vague prompt copied `#1a73e8` / Poppins /
   Inter verbatim). If the dev explicitly says to go on without one, use the
   derived defaults below and list every value as **provisional** in the
   Handoff.
2. Map what it gives onto the **contract**: which color is the text (`ink`),
   the brand (`primary`), the page and alternate backgrounds (`light`,
   `surface`); which font is display vs. body; the type scale; radius,
   shadow; container width and side padding. Also collect **where each font comes from**
   (Google Fonts, Adobe Fonts, self-hosted files) and the **recurring
   treatments** the design repeats across sections — an eyebrow, a title
   decoration (e.g. uppercase + tight tracking), a quote, a badge, a card.
3. Batch every contract value still missing into **one** `AskUserQuestion`
   round (don't drip-feed). Offer a derived default for each (e.g.
   `primary-light` = `primary` at ~10% on white, `muted` = `ink` at ~65%,
   mobile heading ≈ 70% of desktop, heading line-height 1.1–1.25, text
   line-height 1.5–1.6, state colors a readable red/amber/green) and let the
   dev override. Never invent a palette the client didn't give — defaults
   fill gaps only. Extra client colors keep their own names.

---

## Step 2 — `global/variables.css`

Every color, plus radius and shadow — the client's values, in `@theme` so
each becomes a utility. No type (Step 3), no container (Step 6). A color is
written here once, as hex: never a second copy of it elsewhere (an `rgb`
channel list "kept in sync", a `var(--x, #hex)` fallback) — derive variants
with `color-mix()` or Tailwind's `/opacity`.

```css
/* Color tokens — Tailwind v4 @theme. Type tokens live in typography.css. */
@theme {
  /* ── Brand & neutrals ───────────────────────────────────── */
  --color-ink: #1f2328;
  --color-muted: #59636e;
  --color-light: #fff;
  --color-surface: #f6f8fa;
  --color-border: #d1d9e0;
  --color-primary: #1a73e8;
  --color-primary-light: #e8f0fe;

  /* ── States ─────────────────────────────────────────────── */
  --color-success: #1a7f37;
  --color-warning: #9a6700;
  --color-danger: #cf222e;

  /* ── Shape ──────────────────────────────────────────────── */
  --radius-card: 1rem;
  --radius-button: 0.5rem;
  --shadow-card: 0 1px 3px rgb(0 0 0 / 0.08);
}
```

Show it; ask **"ajustar algo (cor, raio, sombra)?"** before writing.

---

## Step 3 — `global/typography.css`

Everything about text, in one file and nowhere else: the font and type-scale
tokens, the body text, the headings, the eyebrow, and each recurring treatment
from Step 1. A heading **tag** and its **class** share one rule (`h2,
.heading-2`), so an unclassed `<h2>` and `.heading-2` can't drift apart and no
other file restates a size. Write **every** heading level out in full — no
"same for h2–h5" shortcut; a level left implicit is a level a block later has
to patch.

**Font loading.** A token names a font; it doesn't load it:
- **Self-hosted** (preferred — no third-party request): files in
  `resources/fonts/`, one `@font-face` per weight/style at the top of this
  file, `font-display: swap`.
- **Google Fonts / Adobe Fonts:** an `@import url("…")` as the **first line**
  of both `app.css` and `editor.css` (Step 8) — never here and never after
  `@import "tailwindcss"`: CSS drops an `@import` that follows other rules
  (measured: the first build of a generated theme failed exactly there).

```css
/* Typography — fonts, type scale and text classes. Color tokens live in variables.css. */
@theme {
  /* ── Font ───────────────────────────────────────────────── */
  --font-display: "Poppins", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;

  /* ── Headings (desktop, then -mobile) ───────────────────── */
  --text-h1: 3.5rem;
  --text-h1--line-height: 1.05;
  --text-h1--font-weight: 800;
  --text-h1-mobile: 2.5rem;
  --text-h1-mobile--line-height: 1.1;

  --text-h2: 2.75rem;
  --text-h2--line-height: 1.1;
  --text-h2--font-weight: 800;
  --text-h2-mobile: 2rem;
  --text-h2-mobile--line-height: 1.15;

  --text-h3: 2rem;
  --text-h3--line-height: 1.2;
  --text-h3--font-weight: 700;
  --text-h3-mobile: 1.625rem;
  --text-h3-mobile--line-height: 1.25;

  --text-h4: 1.5rem;
  --text-h4--line-height: 1.3;
  --text-h4--font-weight: 700;
  --text-h4-mobile: 1.3125rem;
  --text-h4-mobile--line-height: 1.3;

  --text-h5: 1.25rem;
  --text-h5--line-height: 1.35;
  --text-h5--font-weight: 700;
  --text-h5-mobile: 1.125rem;
  --text-h5-mobile--line-height: 1.35;

  --text-h6: 1.125rem;
  --text-h6--line-height: 1.4;
  --text-h6--font-weight: 700;
  --text-h6-mobile: 1.0625rem;
  --text-h6-mobile--line-height: 1.4;

  /* ── Text ───────────────────────────────────────────────── */
  --text-lead: 1.25rem;
  --text-lead--line-height: 1.6;
  --text-body: 1rem;
  --text-body--line-height: 1.6;
  --text-small: 0.875rem;
  --text-small--line-height: 1.5;
}

@layer components {
  /* ── Body text ──────────────────────────────────────────── */
  body {
    font-family: var(--font-body);
    font-size: var(--text-body);
    line-height: var(--text-body--line-height);
  }

  /* [data-heading] is a heading typed in the block editor (a textarea, not an h2). */
  [data-heading] {
    font-family: var(--font-display);
  }

  /* ── Headings: tag and class share one rule; mobile size, desktop from lg ── */
  h1,
  .heading-1 {
    font-family: var(--font-display);
    font-size: var(--text-h1-mobile);
    line-height: var(--text-h1-mobile--line-height);
    font-weight: var(--text-h1--font-weight);

    @variant lg {
      font-size: var(--text-h1);
      line-height: var(--text-h1--line-height);
    }
  }

  h2,
  .heading-2 {
    font-family: var(--font-display);
    font-size: var(--text-h2-mobile);
    line-height: var(--text-h2-mobile--line-height);
    font-weight: var(--text-h2--font-weight);

    @variant lg {
      font-size: var(--text-h2);
      line-height: var(--text-h2--line-height);
    }
  }

  h3,
  .heading-3 {
    font-family: var(--font-display);
    font-size: var(--text-h3-mobile);
    line-height: var(--text-h3-mobile--line-height);
    font-weight: var(--text-h3--font-weight);

    @variant lg {
      font-size: var(--text-h3);
      line-height: var(--text-h3--line-height);
    }
  }

  h4,
  .heading-4 {
    font-family: var(--font-display);
    font-size: var(--text-h4-mobile);
    line-height: var(--text-h4-mobile--line-height);
    font-weight: var(--text-h4--font-weight);

    @variant lg {
      font-size: var(--text-h4);
      line-height: var(--text-h4--line-height);
    }
  }

  h5,
  .heading-5 {
    font-family: var(--font-display);
    font-size: var(--text-h5-mobile);
    line-height: var(--text-h5-mobile--line-height);
    font-weight: var(--text-h5--font-weight);

    @variant lg {
      font-size: var(--text-h5);
      line-height: var(--text-h5--line-height);
    }
  }

  h6,
  .heading-6 {
    font-family: var(--font-display);
    font-size: var(--text-h6-mobile);
    line-height: var(--text-h6-mobile--line-height);
    font-weight: var(--text-h6--font-weight);

    @variant lg {
      font-size: var(--text-h6);
      line-height: var(--text-h6--line-height);
    }
  }

  /* ── Eyebrow ────────────────────────────────────────────── */
  .font-eyebrow {
    font-family: var(--font-body);
    font-size: var(--text-small);
    line-height: var(--text-small--line-height);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}
```

Then one class per **recurring treatment** from Step 1 (e.g. `.title-caps`
for an uppercase tight-tracked title, `.quote`), in the same
`@layer components` block, built on the tokens above. A block combines them
(`heading-2 title-caps`); it never re-types the treatment.

Show it; ask **"ajustar algo (fonte, escala, tratamentos)?"** before writing.

---

## Step 4 — `global/layout.css`

```css
@layer base {
  /* clip, not hidden: hidden breaks the sticky header. */
  html,
  body {
    min-height: 100%;
    overflow-x: clip;
  }
}

@layer components {
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    overflow-x: clip;
  }
}
```

Ask **"ajustar algo?"** before writing.

---

## Step 5 — `global/base.css`

How the remaining unclassed tags look — the site's baseline **minus text
styling**, which is all in `typography.css`. `body`'s color and background
are always here; ask in **one** closed question which of `a`, `ul`/`ol`,
`blockquote`, `hr`, `img`/`svg`/`video`, `code`/`pre` to style too. Only
`var(--...)` tokens — never a font size, family, hex or px value (a missing
value becomes a token in Step 2/3).

```css
@layer base {
  body {
    color: var(--color-ink);
    background-color: var(--color-light);
  }

  a {
    color: var(--color-primary);
    text-underline-offset: 0.2em;
  }
}
```

Ask **"ajustar algo?"** before writing.

---

## Step 6 — `global/container.css`

`@utility`, not a plain class: a plain `.container` loses to Tailwind's own
`container`, whose breakpoint max-widths win (measured 1536px instead of
80rem). As an `@utility` it merges into Tailwind's, and in the optimized
output this rule follows the breakpoint max-widths, so the token wins at
every width.

```css
/* Container width — the only place it's defined (header.css reads these tokens too). */
:root {
  --container-max-width: 80rem;
  --container-padding-x: 1.5rem;
}

@utility container {
  width: 100%;
  margin-inline: auto;
  max-width: var(--container-max-width);
  padding-inline: var(--container-padding-x);
}
```

The tokens sit in `:root`, not `@theme`: Tailwind's `--container-*`
namespace would turn them into `max-w-*` utilities. Container widths and
gutters only — block classes live with each block. Ask **"ajustar algo
(largura, padding lateral)?"** before writing.

---

## Step 7 — `components/button.css` and `components/card.css`

Every CTA in every block is `btn btn-primary` or `btn btn-secondary`
(`create-block`'s `ActionEditor` preview already renders `btn btn-primary`).
Size comes from padding + type, never a height (`css-standards` ›
**Interactive element sizing**). The hover **motion** is `hover.css`'s job
(installed by `create-block`); this file owns look and hover **color**.

```css
@layer components {
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: 1px solid transparent;
    border-radius: var(--radius-button);
    font-family: var(--font-body);
    font-size: var(--text-body);
    line-height: 1.25;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }

  .btn-primary {
    background-color: var(--color-primary);
    color: var(--color-light);
  }

  .btn-primary:hover {
    background-color: color-mix(in srgb, var(--color-primary) 85%, var(--color-ink));
  }

  .btn-secondary {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .btn-secondary:hover {
    background-color: var(--color-primary-light);
  }
}
```

Add a variant only when the style guide has one (e.g. `.btn-light` for dark
sections).

`card.css` — the surface every repeater item, panel and highlighted box uses.
Without it each block re-types `rounded-card border border-border bg-light
shadow-card`: measured 8 copies across 4 blocks in a generated theme, the
same duplication Bright Minds later extracted from 24 files. A block adds
only its layout (`card flex flex-col p-8`); a state changes one property
with a utility (`open:border-primary/30`), which wins over the components
layer.

```css
@layer components {
  .card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    background-color: var(--color-light);
    box-shadow: var(--shadow-card);
  }
}
```

Ask **"ajustar algo (padding, peso, variantes, card)?"** before writing.

---

## Step 8 — Wiring

### `resources/css/app.css`

Font `@import url()` (if any) first, then Sage's stock lines, then the
foundation in this order:

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@700;800&display=swap");

@import "tailwindcss" theme(static);
@source "../../app/**/*.php";
@source "../**/*.blade.php";
@source "../**/*.js";

@import "./global/variables.css";
@import "./global/typography.css";
@import "./global/layout.css";
@import "./global/base.css";
@import "./global/container.css";

@import "./components/button.css";
@import "./components/card.css";
```

Later `components/` and `pages/` imports go below `card.css`.

### `resources/css/editor.css`

The canvas needs the same fonts, tokens, base and classes, or every editor
text falls back to WordPress's system font (measured with
`scripts/editor-fidelity.mjs`: `-apple-system` in the editor vs the theme
font on the page):

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Poppins:wght@700;800&display=swap");

@import "tailwindcss";

@import "./global/variables.css";
@import "./global/typography.css";
@import "./global/layout.css";
@import "./global/base.css";
@import "./global/container.css";

@import "./components/button.css";
@import "./components/card.css";

@source "../blocks/**/*.{php,jsx,js}";
@source "../components/**/*.{jsx,js}";
```

### Sage's `resources/views/components/alert.blade.php`

Sage ships it on Tailwind's stock palette (`bg-green-400`, `bg-red-400`, …),
which the check refuses. Point it at the state tokens:

```blade
@php($class = match ($type) {
  'success' => 'border-success text-success',
  'caution' => 'border-warning text-warning',
  'warning' => 'border-danger text-danger',
  default => 'border-border text-ink',
})

<div {{ $attributes->merge(['class' => "border-l-4 bg-surface px-4 py-3 {$class}"]) }}>
  {!! $message ?? $slot !!}
</div>
```

---

## Step 9 — Check

Copy `<skill>/templates/check-css-foundation.mjs` to
`scripts/check-css-foundation.mjs` (ask before overwriting) and run it from
the theme root:

```bash
node scripts/check-css-foundation.mjs
```

It must exit 0 before the wizard is done: every contract token in its file,
every contract class, both entrypoints wired, and no site file on the stock
palette, stock type scale, `text-hN` or an arbitrary size. Exit 1 lists each
problem as `file:line`; fix and re-run. The same script is `create-block`'s
blocking check 0.21 and runs in the pre-commit hook.

---

## Handoff

A table of the seven files created, whether `app.css` / `editor.css` / `alert`
were edited, where the fonts load from, the recurring-treatment classes
added, and the check's output. Remind the dev to run `npm run build` (they
run it — this skill doesn't).

---

## Behavior Rules

- **Never run `npm`/`composer`/`lando`/`git`.**
- **Every contract token and class, every time** — the client's values, the
  kit's names. Never ship a foundation missing one.
- **Each thing defined in exactly one file.** Color, radius, shadow →
  `variables.css`; every font, size and text rule (incl. `body` text and
  `h1`–`h6`) → `typography.css`; container → `container.css`. Every other
  file only reads them via `var(--...)` — never a raw hex, font size or
  family, never a fallback copy (`var(--x, #hex)`), never an RGB twin of a
  color. The check refuses each of these.
- **Every heading level written out** in the tokens and the `hN, .heading-N`
  rules — no "same for the rest" comments in a generated file.
- **A repeated treatment is a class before it's a second block** — add it to
  `typography.css` (text) or `components/` (UI piece, like `.card`), never
  paste it into blocks.
- **Never ship this skill's example values** as the client's style guide —
  ask first (Step 1).
- **Ask before overwriting** any file that already exists.
- **Only the foundation** — no plugin styles or one-off widgets here.

(Global rules — English language, no assumptions, push back on flawed
asks — live in `CLAUDE.md` and apply automatically.)

---
name: css-foundation-wizard
description: >
  Interactively set up a Sage 11 theme's CSS foundation — variables.css,
  layout.css, base.css, typography.css, container.css — from a free-text style guide
  description. Use this skill when starting a new theme's CSS foundation,
  or whenever a project is missing any of
  resources/css/global/{variables,layout,base,typography,container}.css. Runs a
  5-step wizard (variables → layout → base → typography → container), then wires the generated
  files into resources/css/app.css and resources/css/editor.css.
---

# css-foundation-wizard — interactive CSS foundation setup

Turns a dev's style guide description into the five CSS foundation files
every Sage 11 theme needs — all in **`resources/css/global/`**, never the root
of `resources/css/` (folder layout: `css-standards` › **CSS folder layout**) —
one step at a time — each step gated by an
"anything to adjust?" confirmation before writing, same as
`create-block`'s inferred-plan gate. Never runs `npm` / `composer` /
`lando` / `git` — the dev does that themselves.

This skill **generates** the foundation once. `css-standards` is the
skill that **enforces** the resulting rules day to day (block styles,
class ordering, hand-written CSS formatting) — see
`.claude/skills/css-standards/SKILL.md`.

---

## Pre-conditions

- Working directory = active Sage 11 theme root (must contain
  `vite.config.js`, `resources/`). If unsure, **ask** — don't guess.
- Re-running this skill to *update* an already-generated foundation
  (e.g. add one new color) is out of scope for now — it's built for
  first-time generation. If any of the five files already exists, tell
  the dev and ask whether they want to overwrite it or stop.

---

## Execution Flow

1. **Step 1** — `variables.css` (design tokens)
2. **Step 2** — `layout.css` (root viewport layout, body structure)
3. **Step 3** — `base.css` (unclassed tag defaults)
4. **Step 4** — `typography.css` (semantic text classes)
5. **Step 5** — `container.css` (max-width, container grids, lateral gutters)
6. **Wiring** — import into `resources/css/app.css` and `resources/css/editor.css`, in order
7. **Handoff** — summary of what was created/edited

Each step only starts once the previous step's file has been confirmed
and written — later steps reference token names the dev actually chose,
never placeholders.

---

## Step 1 — `global/variables.css`

1. Ask, open-ended: **"Describe your style guide (colors, fonts, type
   sizes)."**
2. Extract what's derivable from the free text: named colors + hex
   values, a display font vs. a body font, any explicit type scale
   (sizes/line-heights/weights the dev already gave).
3. Batch every remaining gap into **one** `AskUserQuestion` round (don't
   drip-feed):
   - Named color palette (e.g. `ink`, `blue`, `cream`) if not derivable.
   - Display font vs. body font, if only one was given or none.
   - The type scale for `h1`–`h6` + body + small (size, line-height,
     weight) — offer sensible defaults for anything the dev didn't
     specify (e.g. a standard modular scale) and let them override.
   - Shadows, if the style guide mentions elevation/depth.
4. Generate `resources/css/global/variables.css`:
   - Tokens meant to also become a Tailwind utility go in `@theme {}` —
     e.g. `--color-ink` auto-generates `text-ink`/`bg-ink`/`border-ink`;
     `--text-h1` (with its paired `--text-h1--line-height` /
     `--text-h1--font-weight` / `--text-h1--letter-spacing`) becomes the
     `text-h1` utility.
   - Tokens **not** meant to be a utility (e.g. an internal shadow value
     only ever referenced via `var()`) go in a plain `:root` block below
     `@theme {}`.

   ```css
   @theme {
     --color-ink: #282828;
     --color-blue: #1a73e8;
     --font-display: "Poppins", system-ui, sans-serif;
     --font-body: "Inter", system-ui, sans-serif;
     --text-h1: 3.5rem;
     --text-h1--line-height: 1.05;
     --text-h1--font-weight: 900;
     --text-body: 1rem;
     --text-body--line-height: 1.6;
     --text-body--font-weight: 400;
   }

   :root {
     --shadow-card: 0 4px 12px rgb(0 0 0 / 0.08);
   }
   ```

5. Show the generated file. Ask **"ajustar algo (cor, fonte, escala)?"**
   before writing — don't write until confirmed.

---

## Step 2 — `global/layout.css`

1. Ask, open-ended: **"Quais estilos estruturais de viewport e html/body o site precisa?"** (e.g. root layout wrapper, background base, viewport min-height).
2. Generate `resources/css/global/layout.css`:

   ```css
   @layer base {
     html,
     body {
       min-height: 100%;
       overflow-x: hidden;
     }
   }

   @layer components {
     .app {
       min-height: 100vh;
       display: flex;
       flex-direction: column;
       overflow-x: hidden;
     }
   }
   ```

3. Show the generated file. Ask **"ajustar algo?"** before writing.

---

## Step 3 — `global/base.css`

1. Fixed candidate tag list, asked as **one** batched closed question
   (which tags to style now vs. leave at browser default):
   `body`, `p`, `h1`–`h6`, `small`, `code`/`pre`, `hr`,
   `img`/`svg`/`video`, `a`, `ul`/`ol`/`li`, `blockquote`.
2. For each tag the dev selected, generate a rule inside `@layer base`,
   referencing `var(--...)` tokens from Step 1 — **never** a raw
   hex/px value; if a token doesn't exist yet for what a tag needs, go
   back and add it to `variables.css` rather than hardcoding.

   ```css
   @layer base {
     body {
       font-family: var(--font-body);
       font-size: var(--text-body);
       line-height: var(--text-body--line-height);
       color: var(--color-ink);
     }

     /* [data-heading] is a heading typed in the block editor (a textarea,
        not an h2) — sharing the rule keeps the canvas on the page's font. */
     h1, h2, h3, h4, h5, h6, [data-heading] {
       font-family: var(--font-display);
     }

     h1 {
       font-size: var(--text-h1);
       line-height: var(--text-h1--line-height);
       font-weight: var(--text-h1--font-weight);
     }
   }
   ```

3. **Non-negotiable**: every selected tag must render correctly with
   **no class** — this file is the site's unclassed baseline.
4. Show the generated file. Ask **"ajustar algo?"** before writing.

---

## Step 4 — `global/typography.css`

1. Ask, open-ended: **"Quais tratamentos de texto reusáveis o site
   precisa, além do que já ficou em `base.css`?"** (e.g. an eyebrow
   label, a hero heading larger than any `h*`, a pull-quote style, a
   caption).
2. Propose a starting list derived from Step 1's type scale — e.g. if
   `--text-h1`/`--text-h2` exist, suggest `.heading-1`/`.heading-2` as a
   starting point — plus whatever the dev described. Batch this as one
   round.
3. Each class goes in `@layer components`, pulling from
   `variables.css`:

   ```css
   @layer components {
     .heading-1 {
       font-family: var(--font-display);
       font-size: var(--text-h1);
       line-height: var(--text-h1--line-height);
       font-weight: var(--text-h1--font-weight);
     }

     .font-eyebrow {
       font-family: var(--font-body);
       font-size: 0.75rem;
       font-weight: 700;
       letter-spacing: 0.08em;
       text-transform: uppercase;
     }
   }
   ```

4. **`base.css` vs `typography.css`**: `base.css` is how a tag looks *by
   default, unclassed*. `typography.css` applies a type treatment to
   *any* element regardless of tag (give a `<div>` an h1 look, or a hero
   heading larger than any real `h*`).
5. Show the generated file. Ask **"ajustar algo?"** before writing.

---

## Step 5 — `global/container.css`

1. Ask, open-ended: **"Qual a largura máxima do container e o padding lateral?"** (e.g. max-width 80rem / 1280px, padding-inline 1.5rem).
2. Generate `resources/css/global/container.css` inside `@layer components`:

   ```css
   @layer components {
     .container {
       width: 100%;
       margin-inline: auto;
       max-width: var(--container-max-width, 80rem);
       padding-inline: var(--container-padding-x, 1.5rem);
     }
   }
   ```

3. **Scope boundary**: `container.css` is only for container widths, margins, and gutters. Block classes (`.hero`, `.testimonials`) live in each block's own `.css` file.
4. Show the generated file. Ask **"ajustar algo?"** before writing.

---

## Wiring — `resources/css/app.css` and `resources/css/editor.css`

After all five files are written:

### 1. Wire `resources/css/app.css`

Add the five `@import`s below Sage's stock lines in `resources/css/app.css`, in this order:

```css
@import "./global/variables.css";
@import "./global/layout.css";
@import "./global/base.css";
@import "./global/typography.css";
@import "./global/container.css";
```

Leave a blank line after this group for any future `components/` and `pages/` imports.

### 2. Wire `resources/css/editor.css`

Ensure `resources/css/editor.css` imports the necessary layers so the Gutenberg editor canvas has visual parity with the front-end layout and typography. **`base.css` is required** — it holds the body and heading fonts; without it every canvas text falls back to WordPress's system font (measured with `scripts/editor-fidelity.mjs`: `-apple-system` in the editor vs the theme font on the page):

```css
@import "tailwindcss";

@import "./global/variables.css";
@import "./global/base.css";
@import "./global/typography.css";
@import "./global/layout.css";
@import "./global/container.css";

@source "../blocks/**/*.{php,jsx,js}";
@source "../components/**/*.{jsx,js}";
```

---

## Handoff

End with a summary table: which of the five files were created, whether
`app.css` and `editor.css` were edited, and a reminder to run `npm run dev` /
`npm run build` to see the result (the dev runs it themselves — this
skill never runs it).

---

## Behavior Rules

- **Never run `npm`/`composer`/`lando`/`git`.**
- **All five files go in `resources/css/global/`** — create the folder if
  missing; never write them to the root of `resources/css/`.
- **Tokens only in `variables.css`** — every other file references them
  via `var(--...)`, never a raw hex/px value.
- **Order matters**: variables → layout → base → typography → container,
  both in file generation and in `app.css`'s `@import` order.
- **Ask before overwriting** any of the five files that already exists.
- **No project-specific bloat** — no third-party plugin styles, no specialized widgets in the foundation. Only the 5 essential foundation files.
- **Don't run this skill unattended for updates** — it's for first-time
  generation; adding one token to an existing `variables.css` later is a
  normal edit, not a wizard re-run.

(Global rules — English language, no assumptions, push back on flawed
asks — live in `CLAUDE.md` and apply automatically.)

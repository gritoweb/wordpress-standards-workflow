---
name: css-foundation-wizard
description: >
  Interactively set up a Sage 11 theme's CSS foundation — variables.css,
  base.css, typography.css, global.css — from a free-text style guide
  description. Use this skill when starting a new theme's CSS foundation,
  or whenever a project is missing any of
  resources/css/{variables,base,typography,global}.css. Runs a
  4-step wizard (variables → base → typography → global, each step
  depending on tokens from the previous one), then wires the generated
  files into resources/css/app.css.
---

# css-foundation-wizard — interactive CSS foundation setup

Turns a dev's style guide description into the four CSS foundation files
every Sage 11 theme needs, one step at a time — each step gated by an
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
  first-time generation. If any of the four files already exists, tell
  the dev and ask whether they want to overwrite it or stop.

---

## Execution Flow

1. **Step 1** — `variables.css` (design tokens)
2. **Step 2** — `base.css` (unclassed tag defaults)
3. **Step 3** — `typography.css` (semantic text classes)
4. **Step 4** — `global.css` (site-wide structural classes)
5. **Wiring** — import all four into `resources/css/app.css`, in order
6. **Handoff** — summary of what was created/edited

Each step only starts once the previous step's file has been confirmed
and written — later steps reference token names the dev actually chose,
never placeholders.

---

## Step 1 — `variables.css`

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
4. Generate `resources/css/variables.css`:
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

## Step 2 — `base.css`

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

     h1 {
       font-family: var(--font-display);
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

## Step 3 — `typography.css`

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

## Step 4 — `global.css`

1. Ask, open-ended: **"Quais containers/wrappers estruturais o site
   inteiro usa?"** (e.g. a root `.app` wrapper, a `.container` with a
   max-width + side padding, a `.section-wrap`).
2. Each becomes a class in `@layer components`, pulling from
   `variables.css` where relevant (e.g. a max-width token) or from the
   project's existing padding presets if `BlockPadding`/
   `@paddingClasses` are already set up (see
   `.claude/skills/blade-standards/SKILL.md`).

   ```css
   @layer components {
     .app {
       overflow-x: hidden;
     }

     .container {
       margin-inline: auto;
       max-width: 80rem;
       padding-inline: 1.5rem;
     }
   }
   ```

3. **Scope boundary — say this explicitly in the file as a comment**:
   `global.css` is **not** for block-level classes (`.hero`,
   `.testimonials` — those live in each block's own `.css` file, see
   `.claude/skills/css-standards/SKILL.md`) and **not** for button/badge/
   state-variant classes. It only holds site-wide structural/layout
   classes. Keeping this boundary is what stops `global.css` from
   becoming a catch-all drawer.
4. Show the generated file. Ask **"ajustar algo?"** before writing.

---

## Wiring — `resources/css/app.css`

After all four files are written, add these four `@import`s to
`resources/css/app.css`, **below whatever Sage already ships at the top of the
file** (its `@import "tailwindcss" …` line and any `@source` directives — leave
those exactly as they are). Keep the four in this order among themselves — later
layers reference earlier tokens/base styles:

```css
/* ↓ append below Sage's stock lines — don't touch what's above */
@import "./variables.css";
@import "./base.css";
@import "./typography.css";
@import "./global.css";
```

If they're missing or out of order, show the dev the diff and ask for
confirmation before editing — same confirm-before-editing pattern
`create-block` uses for `vite.config.js`/`editor.js`/`app.css`. Only touch these
four lines; never rewrite or reorder the stock top of the file.

---

## Handoff

End with a summary table: which of the four files were created, whether
`app.css` was edited (and how), and a reminder to run `npm run dev` /
`npm run build` to see the result (the dev runs it themselves — this
skill never runs it).

---

## Behavior Rules

- **Never run `npm`/`composer`/`lando`/`git`.**
- **Tokens only in `variables.css`** — every other file references them
  via `var(--...)`, never a raw hex/px value.
- **Order matters**: variables → base → typography → global, both in
  file generation and in `app.css`'s `@import` order.
- **`global.css` scope is structural/layout only** — no block classes,
  no button/badge/state variants.
- **Ask before overwriting** any of the four files that already exists.
- **Don't run this skill unattended for updates** — it's for first-time
  generation; adding one token to an existing `variables.css` later is a
  normal edit, not a wizard re-run.

(Global rules — English language, no assumptions, push back on flawed
asks — live in `CLAUDE.md` and apply automatically.)

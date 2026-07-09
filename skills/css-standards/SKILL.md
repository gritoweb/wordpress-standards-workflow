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

Every theme starts with **three foundation files** in `resources/styles/`.
Build these before any block styles — they're the base every component
inherits from. (Reference implementation: `gritoweb-site/.../styles/`.)

Before writing any CSS in a project, check whether
`resources/styles/variables.css`, `resources/styles/base.css`, and
`resources/styles/typography.css` exist. If a project is missing them,
walk the dev through creating each one using the shapes below — there is
no fixed file template to copy (palette, fonts and type scale are
project-specific), only the structure to follow.

1. **`variables.css` — design tokens.** Declare colors, fonts, type scale,
   weights and shadows. Use Tailwind v4's `@theme {}` whenever the token
   should also become a utility — e.g. `--color-blue` auto-generates
   `text-blue` / `bg-blue` / `border-blue`, and `--text-h1` (with its
   paired `--text-h1--line-height` / `--letter-spacing` / `--font-weight`)
   becomes the `text-h1` utility. Tokens that aren't meant to be utilities
   can live in a plain `:root`.

   ```css
   @theme {
     --color-ink: #282828;
     --font-display: "Lato", system-ui, sans-serif;
     --text-h1: 3.5rem;
     --text-h1--line-height: 1.05;
     --text-h1--font-weight: 900;
   }
   ```

2. **`base.css` — primitives.** Element-level defaults in `@layer base`,
   pulling from the tokens. **Every tag must look right with no class** —
   `body`, `p`, `h1`–`h6`, `small`, `code/pre`, `hr`, `img/svg/video`. This
   is the unclassed baseline of the whole site.

   ```css
   @layer base {
     body { font-family: var(--font-body); color: var(--color-ink); }
     h1 { font-size: var(--text-h1); line-height: var(--text-h1--line-height); }
   }
   ```

3. **`typography.css` — type classes.** Reusable typography classes in
   `@layer components`. Instead of stacking utilities on an element
   (`<h1 class="mb-0 text-h1 font-display …">`), define one semantic
   class (`.heading-1`, `.body-text`, `.font-eyebrow`) and put the styling
   there; markup stays `<h1 class="heading-1">`.

   ```css
   @layer components {
     .heading-1 { font-family: var(--font-display); font-size: var(--text-h1); line-height: var(--text-h1--line-height); }
   }
   ```

   **`base.css` vs `typography.css`:** `base.css` is how a tag looks *by
   default, unclassed*. `typography.css` applies a type treatment to *any*
   element regardless of tag — give a `<div>` an h1 look, or a hero
   `.heading-display` that's larger than any `<h*>`.

---

## Block styles

- Stick to Tailwind's default scale (`rem` for fonts, spacing). Arbitrary
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

- Never reuse generic class names (`.card`, `.box`, `.wrapper`) across
  blocks.
- Global CSS variables / design tokens live in `variables.css` (see
  **Theme CSS foundation** above) — never redefine tokens per block.
- **Class order is automated** — `prettier-plugin-tailwindcss` sorts
  non-Blade files and `@shufo/prettier-plugin-blade`
  (`sortTailwindcssClasses`) sorts Blade; a pre-commit hook enforces it
  (see README › "Code formatting"). Never hand-sort.
- **Hand-written CSS** (rare — `variables.css`, complex `@apply` bodies):
  one declaration per line, lowercase short hex (`#fff`), unitless zero
  (`0`), leading zero (`0.5rem`).

---

## When NOT to use

- Editing non-CSS files with no Tailwind classes involved.
- JS/PHP logic that doesn't touch styling.

(Global rules — English language, no assumptions, push back on flawed
asks — live in `CLAUDE.md` and apply automatically.)

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

Every theme starts with **four foundation files** in `resources/css/`
— `variables.css` (design tokens), `base.css` (unclassed tag defaults),
`typography.css` (semantic text classes), `global.css` (site-wide
structural classes like `.app`/`.container`). Build these before any
block styles — they're the base every component inherits from.

Before writing any CSS in a project, check whether all four files exist.
If any is missing, **use the `css-foundation-wizard` skill**
(`.claude/skills/css-foundation-wizard/SKILL.md`) to generate them
interactively from the dev's style guide — don't hand-walk the dev
through creating them inline; the wizard owns that flow (tokens in
`@theme {}`/`:root`, base rules in `@layer base`, typography/global
classes in `@layer components`, plus wiring the four `@import`s into
`resources/css/app.css` in order).

**`base.css` vs `typography.css`:** `base.css` is how a tag looks *by
default, unclassed*. `typography.css` applies a type treatment to *any*
element regardless of tag — give a `<div>` an h1 look, or a hero
`.heading-display` that's larger than any `<h*>`. **`global.css`** is
narrower still: only site-wide structural/layout classes (`.app`,
`.container`, `.section-wrap`) — never block-level classes (those live
in each block's own `.css` file, see **Block styles** below) and never
button/badge/state-variant classes.

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

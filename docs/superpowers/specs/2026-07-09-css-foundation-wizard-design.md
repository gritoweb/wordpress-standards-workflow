# Design: css-foundation-wizard — interactive CSS foundation setup skill

Date: 2026-07-09

## Problem

`css-standards/SKILL.md` documents the shape of the three CSS foundation
files every theme needs (`variables.css`, `base.css`, `typography.css`)
but only passively describes them — "if a project is missing them, walk
the dev through creating each one." There's no active, structured flow
that actually interviews the dev, turns a style guide into concrete
design tokens, and generates the files. There's also a fourth file the
kit has never covered: a `global.css` for site-wide structural classes
(`.app`, `.container`, `.section-wrap`) that aren't typography and
aren't block-scoped.

## Goal

Add a new skill, `css-foundation-wizard`, that runs a 4-step interactive
setup: `variables.css` → `base.css` → `typography.css` → `global.css`,
each step depending on tokens from the previous one, driven by a
free-text style guide description from the dev. Wire the generated files
into `resources/css/app.css`. Point `css-standards`' existing "Theme CSS
foundation" section at this new skill instead of describing the manual
walkthrough inline.

## Scope

In scope:
- New skill `skills/css-foundation-wizard/SKILL.md`.
- 4 sequential steps, each with: an open-ended style-guide question,
  batched closed follow-up questions for gaps, a generated file, and an
  "adjust before writing?" gate — matching `create-block`'s existing
  inferred-plan-then-gate pattern.
- Step 4 introduces `global.css` as a new file in the foundation (not
  previously documented anywhere in the kit).
- Wiring: verify/edit `resources/css/app.css` to `@import` the 4 files in
  order (`variables → base → typography → global`), with the same
  idempotent "diff shown, confirm before editing" pattern `create-block`
  uses for existing-file edits.
- Update `css-standards/SKILL.md`'s "Theme CSS foundation" section to
  point at `css-foundation-wizard` instead of describing the walkthrough
  inline (avoid duplicating the flow in two places).
- Update `README.md`'s import manifest and file tree to list the new
  skill (same one-line addition pattern used for the other per-project
  skills).

Out of scope (explicitly not doing now):
- Non-text style-guide input (PDF, Figma export, image, Figma URL) — the
  wizard only accepts a free-text description from the dev, this
  session. A future iteration could add Figma extraction via the
  `figma-use`/`figma-generate-library` skills, but that's not part of
  this task.
- Any button/badge/state-class system (`.btn-primary`, `.is-active`) —
  `global.css` is scoped to structural/layout classes only (`.app`,
  containers, section wrappers), not a general-purpose "everything else"
  bucket. If a project wants a button-class system later, that's a
  separate, explicit ask.
- Re-running the wizard to *update* an existing foundation (e.g., add a
  new color to an already-generated `variables.css`) — this first version
  covers first-time generation. The existing-file idempotency logic only
  applies to the `app.css` import wiring, not to re-editing already
  generated foundation files.

## Design

### Skill shape

Follows the existing `create-block`/`project-init` pattern: YAML
frontmatter with `name: css-foundation-wizard` and a trigger-style
`description` ("Use this skill when starting a new theme's CSS
foundation, or when a project is missing `resources/styles/variables.css`
/ `base.css` / `typography.css` / `global.css`"), then a phased Markdown
body. Never runs `npm`/`composer`/`lando`/`git` — same guard-rail as
every other skill in this kit.

### Step 1 — `variables.css`

1. Open question: "Describe your style guide (colors, fonts, type
   sizes)." Free text.
2. The skill extracts what it can (named colors + hex, display vs. body
   font, any explicit type scale) from the free text.
3. Batches remaining gaps into one `AskUserQuestion` round: named color
   palette, display font vs. body font, the type scale (h1–h6 + body +
   small — size/line-height/weight for each), and shadows if mentioned.
   Don't drip-feed questions one at a time here — batch, matching
   `create-block`'s Phase 1 gap-filling pattern.
4. Generates `variables.css`: tokens meant to also become a Tailwind
   utility go in `@theme { --color-*, --font-*, --text-h1
   (+ --text-h1--line-height/--font-weight/--letter-spacing), ... }`;
   tokens not meant to be a utility (e.g. an internal shadow value only
   ever referenced via `var()`) go in a plain `:root`.
5. Shows the generated file, asks "anything to adjust?" before writing —
   same gate `create-block` uses for its inferred plan.

### Step 2 — `base.css`

1. Fixed candidate tag list: `body`, `p`, `h1`–`h6`, `small`, `code`/`pre`,
   `hr`, `img`/`svg`/`video`, `a`, `ul`/`ol`/`li`, `blockquote`.
2. One batched closed question: which of these the dev wants styled now
   vs. left at browser default.
3. For each selected tag, generates a rule inside `@layer base`,
   referencing `var(--...)` tokens from Step 1 — never a raw hex/px
   value. This enforces `css-standards`' existing rule that tokens live
   only in `variables.css`.
4. Non-negotiable rule (carried over from `css-standards`): every
   selected tag must render correctly with **no class** — this is the
   site's unclassed baseline.
5. Same adjust-before-writing gate.

### Step 3 — `typography.css`

1. Open question: "What reusable text treatments does the site need,
   beyond what's already in `base.css`?" (e.g. eyebrow, a hero heading
   larger than any `h*`, a pull-quote style, a caption).
2. The skill proposes a starting list derived from Step 1's type scale
   (e.g. if `--text-h1`/`--text-h2` exist, suggests `.heading-1`/
   `.heading-2` as a starting point) plus whatever the dev described.
3. Each class becomes `@layer components { .name { font-family:
   var(...); font-size: var(...); ... } }`, always pulling from
   `variables.css`.
4. Reinforces the existing `css-standards` distinction: `base.css` is an
   unclassed tag's default look; `typography.css` is a type treatment
   applicable to *any* element regardless of tag.
5. Same adjust-before-writing gate.

### Step 4 — `global.css`

1. Open question: "What structural containers/wrappers does the whole
   site use?" (e.g. a root `.app` wrapper, a `.container` with a
   max-width + side padding, a `.section-wrap`).
2. Each becomes a class in `@layer components`, pulling from
   `variables.css` where relevant (e.g. a max-width token, or the
   project's existing padding presets if `BlockPadding`/`@paddingClasses`
   are already present per `blade-standards`).
3. Explicit in-file comment boundary: this file is **not** for
   block-level classes (`.hero`, `.testimonials` — those live in each
   block's own `.css` file per `css-standards`) and **not** for
   button/badge/state variants — keeps `global.css` from becoming a
   catch-all drawer.
4. Same adjust-before-writing gate.

### Wiring `app.css` + `css-standards` update

- After all 4 files are generated, check `resources/css/app.css` for
  `@import` statements pointing at the 4 new files, in this exact order:
  `variables.css` → `base.css` → `typography.css` → `global.css` (order
  matters: later layers can reference earlier tokens/base styles).
- If missing or out of order, show the dev the diff and ask for
  confirmation before editing — same idempotent, confirm-before-editing
  pattern `create-block` uses for `vite.config.js`/`editor.js`/`app.css`
  edits.
- `css-standards/SKILL.md`'s "Theme CSS foundation (start here)" section
  is rewritten: instead of describing the 3-file walkthrough inline
  (moving to 4 files: `variables.css`, `base.css`, `typography.css`,
  `global.css`), it states the shape briefly and points at
  `.claude/skills/css-foundation-wizard/SKILL.md` for the actual
  interactive generation flow — same "pointer, not duplicate" pattern
  used elsewhere in this kit (e.g. `CLAUDE.md` → `css-standards`).
- `README.md`'s file tree and import manifest gain one line each for
  `skills/css-foundation-wizard/`, matching the existing per-project
  skill rows.

## Testing / verification

No automated test suite (documentation/skills repo). Verification is
manual:
- Read the new skill file end-to-end: each step's question order,
  generated-file shape, and gate are present and don't skip a
  dependency (e.g. Step 2 must reference Step 1's actual token names,
  not placeholder names).
- Confirm `css-standards/SKILL.md`'s foundation section no longer
  duplicates the walkthrough and correctly points at the new skill's
  path.
- Confirm `README.md`'s tree and manifest both list the new skill.
- Grep for `global.css` and `css-foundation-wizard` across
  `css-standards/SKILL.md` and `README.md` to confirm every
  cross-reference resolves.

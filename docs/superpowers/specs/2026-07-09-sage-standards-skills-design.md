# Design: expand the Sage standards kit into per-domain skills

Date: 2026-07-09

## Problem

`CLAUDE.md` today condenses every WordPress/Sage standard (CSS foundation,
Blade rules, scripts/styles, PR checklist, etc.) into one file. It works as
a reference, but nothing actively drives Claude to *apply* the CSS or Blade
rules while writing code — only `create-block` and `html-qa-smoketest` exist
as skills. There's also no reusable flow for bringing the kit into a new
project; that's currently a manual, README-only checklist.

## Goal

Extract the domain-specific standards out of `CLAUDE.md` into dedicated
skills, following the existing `create-block` pattern (frontmatter trigger +
phased body + no destructive/irreversible shell commands). `CLAUDE.md`
becomes a thin index of transversal rules plus pointers to the skills that
own the details. Add a `project-init` skill that automates the safe, local
part of importing the kit into a project.

## Scope

In scope:
- Shrink `CLAUDE.md` to: Critical Rules, Stack table, Git (pointer),
  Blocks (pointer), CSS (pointer), PHP/Blade (pointer), Comments (kept in
  full — applies to all code, not just Blade), PR Checklist.
- New skill `skills/css-standards/SKILL.md`.
- New skill `skills/blade-standards/SKILL.md`.
- New skill `skills/project-init/SKILL.md`.
- Update `skills/create-block/SKILL.md` check #0.13 (global-enqueue smell)
  to reference `blade-standards` as the canonical source of that rule
  instead of restating it.
- Update `README.md`'s import manifest to list the two new per-project
  skills and describe the `project-init` skill as the new recommended way
  to do the import (keeping the manual bash instructions as a fallback).

Out of scope (explicitly not doing now):
- Moving `global-skills/commit-rules.md` — stays user-level, untouched.
- Any change to `create-block`'s or `html-qa-smoketest`'s own logic beyond
  the one cross-reference above.
- Automating anything beyond local file copies (no `npm`/`composer`/`lando`/
  `git` execution, no remote/production writes) — matches existing
  `create-block` and top-level `CLAUDE.md` guard-rails.

## Design

### 1. `CLAUDE.md` (reduced)

Keep as-is: `⚠️ Critical Rules`, `Stack`, `Git` (already just a pointer to
the commit-rules skill), `Blocks` (already just a pointer to create-block),
`Comments`, `PR Checklist`.

Replace `CSS` section body with a short pointer:
> Tailwind utilities for one-off styles; `@apply` in a dedicated class for
> reusable/semantic patterns. Full rules (design tokens, base/typography
> foundation, block class naming, hand-written CSS formatting) live in
> `.claude/skills/css-standards/SKILL.md`.

Replace `PHP / Blade` section body (including the current `Scripts &
Styles` heading, which moves under blade-standards since it's a PHP/Blade
concern) with a short pointer:
> Blade is view-only; sanitize input, escape output. Full rules (view-only
> boundary, attachment image sizing, query patterns, sanitize/escape table,
> vendor script registration vs. enqueue) live in
> `.claude/skills/blade-standards/SKILL.md`.

The detailed prose/examples currently under `CSS` and `PHP / Blade` /
`Scripts & Styles` in `CLAUDE.md` are moved verbatim (not rewritten) into
the new skills below.

### 2. `skills/css-standards/SKILL.md`

**Trigger**: creating or editing any CSS in the project — `.css` files,
`@apply` blocks, Tailwind classes in Blade/JSX — including when
`create-block` is about to generate a block's `block.css`.

**Content** (moved from `CLAUDE.md`):
1. Foundation check — verify `resources/styles/variables.css`, `base.css`,
   `typography.css` exist before styling anything; if a new project lacks
   them, this skill is what walks the dev through creating them, using the
   `@theme {}` / `@layer base` / `@layer components` examples currently in
   `CLAUDE.md` as the reference shape. No fixed file templates (a design's
   tokens/palette/fonts are project-specific) — the skill audits presence
   and shows the reference structure, it doesn't scaffold canned content.
2. Block CSS rules — unique root class per block, nested selectors, BEM
   only for complex/many-state blocks, never reuse generic class names
   (`.card`, `.box`, `.wrapper`).
3. Class order is automated (prettier-plugin-tailwindcss /
   `@shufo/prettier-plugin-blade`) — never hand-sort.
4. Hand-written CSS formatting — one declaration per line, lowercase short
   hex, unitless zero, leading zero.
5. Tokens live only in `variables.css`, never redefined per block.

### 3. `skills/blade-standards/SKILL.md`

**Trigger**: creating or editing any `.blade.php` file, or any PHP code
that prepares data for a Blade view.

**Content** (moved from `CLAUDE.md`):
1. Blade is view-only — no business logic, queries, or data fetching;
   only render-control logic (conditionals, loops over already-prepared
   data).
2. `wp_get_attachment_image($id, 'large')` — always include the size arg.
3. Avoid nested `WP_Query` inside loops.
4. Sanitize input / escape output table (verbatim from current
   `CLAUDE.md`): `sanitize_text_field`, `sanitize_email`, `wp_kses_post`,
   `absint` for input; `esc_html`, `esc_attr`, `esc_url`, `wp_kses_post` for
   output.
5. Scripts & Styles — third-party libs registered globally in
   `app/setup.php` on `init`, enqueued per-block inside that block's
   `block.php`; never enqueue vendor libs globally. This becomes the
   canonical source for the rule that `create-block` Phase 0 check #0.13
   (global-enqueue smell) already warns about — update that check to
   reference this skill instead of restating the rule inline.

### 4. `skills/project-init/SKILL.md`

**Trigger**: dev asks to start/import the kit into a new (or existing,
not-yet-standardized) project.

**Flow**:
1. Ask which scenario applies if unclear — Scenario A (Pantheon) or
   Scenario B (local-only) — matching the README's existing two paths.
   This is only to know what to *tell* the dev to run next; the skill
   itself never runs `lando`/`composer`/`npm`/`git`.
2. Automated copy phase (local, reversible, kit-repo → target project):
   - `CLAUDE.md` → project root (the reduced version from Section 1)
   - `skills/create-block/`, `skills/html-qa-smoketest/`,
     `skills/css-standards/`, `skills/blade-standards/` →
     `.claude/skills/`
   - `_docs/examples.md`, `_docs/launch-list.md` → `./_docs/`
   - `gitignore.example` → `.gitignore` **only if missing**
   - `prettier.config.example.js` → `<theme>/prettier.config.js`
   - `install-git-hooks.example.mjs` → `<theme>/scripts/install-git-hooks.mjs`
   - Before overwriting any file that already exists at the destination,
     warn and ask for confirmation (same "bail > guessing" principle as
     `create-block`'s idempotency handling).
3. Global skills — ask whether to install `commit-rules` into
   `~/.claude/skills/` (user-level, never into the project's
   `.claude/skills/`); only on explicit consent, matching the README's
   current instruction.
4. Manual-step guidance (not executed) — Sage scaffold
   (`composer create-project roots/sage sage`), theme activation,
   `npm install` (fires the git-hook `prepare` script), Lando/Pantheon
   setup — listed in the right order for the chosen scenario.
5. Handoff — summary table of what was copied, plus a checklist of what
   the dev still needs to run manually.

### 5. `README.md` update

- Import manifest table gains rows for `skills/css-standards/` and
  `skills/blade-standards/` (same "copy the whole folder" note as the
  existing rows).
- "How to use it on a new project" section is updated to mention
  `project-init` as the driving skill, keeping the existing manual
  bash instructions as a documented fallback (not removed — some devs may
  run this kit against an AI assistant without skill support).

## Testing / verification

This repo ships documentation and skill definitions, not executable code —
there's no test suite to run. Verification is manual:
- Read each new `SKILL.md` end-to-end and confirm no orphaned references
  (e.g., `CLAUDE.md` pointers resolve to a real file/section in the target
  skill).
- Diff `CLAUDE.md` before/after to confirm no rule was dropped, only
  relocated.
- Confirm `create-block`'s check #0.13 still reads correctly after adding
  the cross-reference to `blade-standards`.

# Sage Standards Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `CLAUDE.md`'s CSS and Blade/PHP standards out into two new
per-project skills (`css-standards`, `blade-standards`), add a
`project-init` skill that automates the safe local part of importing the
kit into a new project, and update `CLAUDE.md`, `create-block`, and
`README.md` to point at the new skills instead of duplicating text.

**Architecture:** This is a documentation/skill-definition repo (no build,
no test suite, no runtime). Each "task" produces one or more Markdown
files under `skills/` plus edits to `CLAUDE.md` / `README.md`. Verification
is manual: read the file back and grep for the cross-references to confirm
they resolve.

**Tech Stack:** Markdown, YAML frontmatter (skill `name`/`description`).

## Global Constraints

- English for all file content (matches `CLAUDE.md`'s "English for all
  commit messages, comments, and variables" — extended here to skill docs
  since this repo's own convention is English-only Markdown).
- Never invent new rules — every rule moved into a new skill must be
  copied verbatim from the current `CLAUDE.md` (see spec
  `docs/superpowers/specs/2026-07-09-sage-standards-skills-design.md`),
  not reworded.
- `commit-rules` in `global-skills/` stays untouched — out of scope.
- No skill may run `npm`/`composer`/`lando`/`git` — matches the existing
  `create-block` rule ("Never runs `npm` / `composer` / `lando` / `git`
  commands. The dev does that themselves.").
- Follow the existing `skills/create-block/SKILL.md` shape: YAML
  frontmatter (`name`, `description` written as a trigger — "Use this
  skill whenever…"), then a Markdown body.
- Commit after each task with the project's commit convention
  (`[TYPE]: subject`, English, no co-author — see
  `global-skills/commit-rules.md`).

---

### Task 1: Create `skills/css-standards/SKILL.md`

**Files:**
- Create: `skills/css-standards/SKILL.md`

**Interfaces:**
- Produces: a skill file referenced by `CLAUDE.md`'s `CSS` section (Task
  3) via the path `.claude/skills/css-standards/SKILL.md`, and copied by
  `project-init` (Task 5) as one of the per-project skill folders.

- [ ] **Step 1: Write the file**

```markdown
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
```

- [ ] **Step 2: Verify the file was written correctly**

Run: `head -5 skills/css-standards/SKILL.md`
Expected output starts with:
```
---
name: css-standards
description: >
```

- [ ] **Step 3: Commit**

```bash
git add skills/css-standards/SKILL.md
git commit -m "$(cat <<'EOF'
[FEAT]: add css-standards skill

Extracts the CSS/Tailwind rules out of CLAUDE.md into a dedicated
skill so Claude applies them actively while writing CSS, not just as
reference prose.
EOF
)"
```

---

### Task 2: Create `skills/blade-standards/SKILL.md`

**Files:**
- Create: `skills/blade-standards/SKILL.md`

**Interfaces:**
- Produces: a skill file referenced by `CLAUDE.md`'s `PHP / Blade` section
  (Task 3) via `.claude/skills/blade-standards/SKILL.md`, and referenced
  by `skills/create-block/SKILL.md` check #0.13 (Task 4). Also copied by
  `project-init` (Task 5).

- [ ] **Step 1: Write the file**

```markdown
---
name: blade-standards
description: >
  Apply the team's Blade/PHP standards for a Sage 11 + Acorn theme
  whenever creating or editing a .blade.php view, or any PHP code that
  prepares data for one (e.g. a block's block.php). Use this skill
  before writing new Blade/PHP view code and when reviewing existing
  Blade files for standard compliance — view-only boundary, attachment
  image sizing, query patterns, input sanitization, output escaping,
  and vendor script/style registration vs. enqueue.
---

# blade-standards — Sage 11 Blade/PHP conventions

**Blade is view-only.** No business logic, queries, or data fetching.
Only render-control logic (conditionals, loops over already-prepared
data).

- `wp_get_attachment_image($id, 'large')` — always include the size
  argument (enables native `srcset`); never omit it.
- Avoid nested `WP_Query` inside loops.

---

## Sanitize input, escape output

```php
// Input (saving data)
sanitize_text_field($_POST['name']);
sanitize_email($_POST['email']);
wp_kses_post($_POST['content']);  // safe HTML
absint($_POST['count']);

// Output (rendering data)
esc_html($value);        // plain text
esc_attr($value);        // HTML attributes
esc_url($url);           // URLs
wp_kses_post($content);  // trusted HTML
```

---

## Scripts & Styles

Third-party scripts/styles: **register globally** in `app/setup.php` (on
`init`), then **enqueue per-block** inside that block's `block.php`
render. Never enqueue vendor libs globally.

```php
add_action('init', function () {
    wp_register_script('swiper', 'https://cdn.example.com/swiper.min.js', [], '11.0', true);
});

// Inside the block render callback
wp_enqueue_script('swiper');
```

This is the rule `create-block`'s Phase 0 "global-enqueue smell" check
(#0.13) warns about — a `wp_enqueue_script(`/`wp_enqueue_style(` call
found outside `resources/blocks/*/block.php` (excluding the theme's own
`app`/`editor` handles) is the smell this section forbids.

---

## When NOT to use

- Editing PHP that has nothing to do with rendering a view (e.g. a CLI
  script, a WP-CLI command class).
- Editing block.json / block.jsx (JS side) — those aren't Blade/PHP.

(Global rules — English language, no assumptions, push back on flawed
asks — live in `CLAUDE.md` and apply automatically.)
```

- [ ] **Step 2: Verify the file was written correctly**

Run: `head -5 skills/blade-standards/SKILL.md`
Expected output starts with:
```
---
name: blade-standards
description: >
```

- [ ] **Step 3: Commit**

```bash
git add skills/blade-standards/SKILL.md
git commit -m "$(cat <<'EOF'
[FEAT]: add blade-standards skill

Extracts the Blade/PHP rules (view-only boundary, sanitize/escape,
vendor script registration) out of CLAUDE.md into a dedicated skill.
EOF
)"
```

---

### Task 3: Reduce `CLAUDE.md`'s CSS and PHP/Blade sections to pointers

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `skills/css-standards/SKILL.md` (Task 1),
  `skills/blade-standards/SKILL.md` (Task 2) — must exist at
  `.claude/skills/css-standards/SKILL.md` and
  `.claude/skills/blade-standards/SKILL.md` once a project imports the
  kit, so the pointer paths below are correct.

- [ ] **Step 1: Replace the `## CSS` section**

Find the entire `## CSS` section in `CLAUDE.md` — from the `## CSS`
heading up to (not including) the next `---` before `## PHP / Blade` —
and replace it with:

```markdown
## CSS

Tailwind utilities for one-off styles; `@apply` in a dedicated class for
reusable/semantic patterns. Full rules (design tokens, base/typography
foundation, block class naming, hand-written CSS formatting) live in
`.claude/skills/css-standards/SKILL.md`.
```

- [ ] **Step 2: Replace the `## PHP / Blade` section**

Find the entire `## PHP / Blade` section (from `## PHP / Blade` through
the end of the `## Scripts & Styles` section, up to but not including
`## Comments`) and replace both with a single section:

```markdown
## PHP / Blade

Blade is view-only; sanitize input, escape output. Full rules (view-only
boundary, attachment image sizing, query patterns, sanitize/escape table,
vendor script registration vs. enqueue) live in
`.claude/skills/blade-standards/SKILL.md`.
```

- [ ] **Step 3: Verify no content was lost, only relocated**

Run: `grep -n "^## " CLAUDE.md`
Expected output (heading list, in order):
```
## ⚠️ Critical Rules
## Stack
## Git
## Blocks
## CSS
## PHP / Blade
## Comments
## PR Checklist
```

Run: `grep -n "css-standards\|blade-standards" CLAUDE.md`
Expected: two lines, one per pointer added in Steps 1–2.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
[DOCS]: point CLAUDE.md's CSS and PHP/Blade sections at their skills

Replaces the inline CSS and Blade/PHP rule prose with pointers to the
new css-standards and blade-standards skills, avoiding duplication.
EOF
)"
```

---

### Task 4: Update `create-block`'s global-enqueue check to reference `blade-standards`

**Files:**
- Modify: `skills/create-block/SKILL.md`

**Interfaces:**
- Consumes: `skills/blade-standards/SKILL.md` (Task 2) — the "Scripts &
  Styles" section is the canonical text this check now points to.

- [ ] **Step 1: Edit check #0.13's row**

Find this row in the "Compatibility warnings (do NOT auto-fix)" table:

```markdown
| 0.13 | **Global-enqueue smell.** Scan `app/**.php` + `functions.php` for `wp_enqueue_script(`/`wp_enqueue_style(` *outside* `resources/blocks/*/block.php`. Theme handles (`app`, `editor`) are fine; vendor-lib-looking handles (`swiper`, `gsap`, …) loaded globally are a smell — warn with file:line, recommend the canonical pattern (register in `setup.php`, enqueue in `block.php`). |
```

Replace it with:

```markdown
| 0.13 | **Global-enqueue smell.** Scan `app/**.php` + `functions.php` for `wp_enqueue_script(`/`wp_enqueue_style(` *outside* `resources/blocks/*/block.php`. Theme handles (`app`, `editor`) are fine; vendor-lib-looking handles (`swiper`, `gsap`, …) loaded globally are a smell — warn with file:line, recommend the canonical pattern from `.claude/skills/blade-standards/SKILL.md` (register in `setup.php`, enqueue in `block.php`). |
```

- [ ] **Step 2: Verify the edit**

Run: `grep -n "blade-standards" skills/create-block/SKILL.md`
Expected: one match, the line from Step 1.

- [ ] **Step 3: Commit**

```bash
git add skills/create-block/SKILL.md
git commit -m "$(cat <<'EOF'
[DOCS]: point create-block's enqueue-smell check at blade-standards

Avoids duplicating the vendor-script registration rule now that it
lives canonically in the blade-standards skill.
EOF
)"
```

---

### Task 5: Create `skills/project-init/SKILL.md`

**Files:**
- Create: `skills/project-init/SKILL.md`

**Interfaces:**
- Consumes: the kit's own file layout (`CLAUDE.md`, `skills/create-block/`,
  `skills/html-qa-smoketest/`, `skills/css-standards/`,
  `skills/blade-standards/`, `_docs/examples.md`, `_docs/launch-list.md`,
  `gitignore.example`, `prettier.config.example.js`,
  `install-git-hooks.example.mjs`, `global-skills/commit-rules.md`) as
  copy sources — all already exist after Tasks 1–2.
- Produces: nothing consumed by later tasks in this plan; it's a leaf
  skill referenced only by `README.md` (Task 6).

- [ ] **Step 1: Write the file**

```markdown
---
name: project-init
description: >
  Import the GritoWeb WordPress standards kit into a project — new or
  existing. Use this skill whenever the user asks to "start a new
  WordPress project", "import the standards", "set up the kit in this
  project", "apply our standards here", or similar. Copies the kit's
  CLAUDE.md, per-project skills, docs and config templates into the
  target project, and walks the dev through the remaining manual steps
  (Lando, Sage scaffold, npm install) without ever running
  npm/composer/lando/git itself.
---

# project-init — import the standards kit into a project

Automates the safe, local, reversible part of "copy the standards in"
(file copies inside the working tree) and guides the dev through
everything that requires real infrastructure (Lando, Pantheon, Composer,
npm) — which this skill never runs itself.

Never runs `npm` / `composer` / `lando` / `git` commands. The dev does
that themselves. Never writes to a remote or production environment.

---

## Pre-conditions

- The kit repo (this repo, or a checkout/copy of it) is reachable on
  disk or the dev has pasted its contents.
- Target = the project's working directory (theme root or full-site
  repo root — ask if unclear, don't guess).

---

## Execution Flow

1. **Phase 0** — Ask which scenario applies (only to know what to tell
   the dev to run next).
2. **Phase 1** — Copy kit files into the target project.
3. **Phase 2** — Offer the global (user-level) skills.
4. **Phase 3** — Hand off the manual steps for the chosen scenario.

---

## Phase 0 — Which scenario?

If not already clear from context, ask the dev:

- **Scenario A — Pantheon**: the project has (or will have) a Pantheon
  site and is cloned via Lando's `pantheon` source.
- **Scenario B — Local only**: a plain local WordPress install via
  Lando's `wordpress` recipe, no Pantheon.

This only changes the manual-step guidance in Phase 3 — the file copy in
Phase 1 is identical for both.

---

## Phase 1 — Copy kit files into the project

Copy the following from the kit into the target project. Before
overwriting any file that **already exists** at the destination, stop,
show the dev a diff of what would change, and ask for confirmation —
never silently overwrite (same "bail > guessing" principle as
`create-block`'s idempotency handling).

| From (kit) | To (target project) | Overwrite rule |
|---|---|---|
| `CLAUDE.md` | `./CLAUDE.md` | Ask before overwriting if present |
| `skills/create-block/` | `./.claude/skills/create-block/` | Copy whole folder; ask before overwriting |
| `skills/html-qa-smoketest/` | `./.claude/skills/html-qa-smoketest/` | Copy whole folder; ask before overwriting |
| `skills/css-standards/` | `./.claude/skills/css-standards/` | Copy whole folder; ask before overwriting |
| `skills/blade-standards/` | `./.claude/skills/blade-standards/` | Copy whole folder; ask before overwriting |
| `_docs/examples.md` | `./_docs/examples.md` | Ask before overwriting if present |
| `_docs/launch-list.md` | `./_docs/launch-list.md` | Ask before overwriting if present |
| `gitignore.example` | `./.gitignore` | **Only if `.gitignore` doesn't exist yet** — never overwrite an existing one |
| `prettier.config.example.js` | `<theme>/prettier.config.js` | Ask before overwriting if present |
| `install-git-hooks.example.mjs` | `<theme>/scripts/install-git-hooks.mjs` | Ask before overwriting if present |

`<theme>` = the Sage theme root, typically `wp-content/themes/<name>`
(ask the dev if there's more than one theme, or if the repo layout is
non-standard).

After copying, show a summary table of what was created vs. skipped
(already existed, dev declined).

---

## Phase 2 — Offer global (user-level) skills

`global-skills/commit-rules.md` is **not** copied into the project. Tell
the dev it's recommended as a user-level skill shared across every
project, and offer to install it — **only on explicit yes**:

```bash
mkdir -p ~/.claude/skills/commit-rules
cp global-skills/commit-rules.md ~/.claude/skills/commit-rules/SKILL.md
```

If `~/.claude/skills/commit-rules/SKILL.md` already exists, don't
overwrite — show the dev the difference and ask first.

---

## Phase 3 — Manual steps (guidance only, never executed)

List these steps for the dev to run themselves, in order, based on the
Phase 0 answer. Do not run any of these commands.

### Scenario A — Pantheon

1. Create the site on Pantheon (empty, raw WordPress).
2. `lando init --source pantheon` — paste the machine token, pick the
   site.
3. `lando start` then `lando pull` (DB + uploads).
4. Scaffold Sage:
   ```bash
   cd wp-content/themes
   composer create-project roots/sage sage
   cd sage && composer install
   ```
5. `lando wp theme activate sage`.
6. Review and commit the copied kit files through the normal git flow —
   **never push without the project owner's permission**.
7. Build theme assets (Step below).

### Scenario B — Local only

1. `lando init --recipe wordpress` (current working directory).
2. Adjust `.lando.yml` if needed (e.g. `php: "8.3"`), then `lando start`.
3. `lando wp core download`, configure `wp-config.php`, complete the
   install (language, admin user).
4. Scaffold Sage (same commands as Scenario A step 4).
5. `lando wp theme activate sage`.
6. Optionally `git init` + an initial commit — local only, never push
   without permission.
7. Build theme assets (Step below).

### Theme assets (both scenarios)

```bash
cd wp-content/themes/sage
npm install       # also installs the pre-commit hook via the `prepare` script
npm run dev       # development (HMR) — or:
npm run build     # production build
```

---

## Phase 4 — Handoff

End with:
1. A table of every file copied/skipped (from Phase 1).
2. Whether `commit-rules` was installed (Phase 2).
3. The ordered manual-step checklist for the chosen scenario (Phase 3),
   so the dev has one place to follow through to a running site.

---

## Behavior Rules

- **Never run `npm`/`composer`/`lando`/`git`** — the dev runs every
  command in Phase 3 themselves.
- **Never write to production or a remote environment.**
- **Ask before overwriting** any existing file at the destination.
- **`.gitignore` is special** — only written if missing, never merged or
  overwritten.
- **Global skills are opt-in** — never copied without explicit consent.

(Global rules — English language, no co-author, no production writes, no
assumptions, push back on flawed asks — live in `CLAUDE.md` and apply
automatically.)
```

- [ ] **Step 2: Verify the file was written correctly**

Run: `head -5 skills/project-init/SKILL.md`
Expected output starts with:
```
---
name: project-init
description: >
```

- [ ] **Step 3: Commit**

```bash
git add skills/project-init/SKILL.md
git commit -m "$(cat <<'EOF'
[FEAT]: add project-init skill

Automates the safe local file-copy part of importing the standards
kit into a project, and guides the dev through the remaining manual
infra steps without ever running npm/composer/lando/git itself.
EOF
)"
```

---

### Task 6: Update `README.md`'s import manifest and usage instructions

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `skills/css-standards/`, `skills/blade-standards/` (Tasks 1–2)
  and `skills/project-init/` (Task 5) as the paths referenced in the
  updated manifest/instructions.

- [ ] **Step 1: Add the two new skills to the "What's here" file tree**

In the fenced tree in the `## What's here` section, find:

```
skills/
  html-qa-smoketest/SKILL.md       # QA skill — imported to <project>/.claude/skills/
  create-block/SKILL.md            # block scaffold skill — imported to <project>/.claude/skills/
```

Replace with:

```
skills/
  html-qa-smoketest/SKILL.md       # QA skill — imported to <project>/.claude/skills/
  create-block/SKILL.md            # block scaffold skill — imported to <project>/.claude/skills/
  css-standards/SKILL.md           # CSS/Tailwind standards skill — imported to <project>/.claude/skills/
  blade-standards/SKILL.md         # Blade/PHP standards skill — imported to <project>/.claude/skills/
  project-init/SKILL.md            # kit-import skill — imported to <project>/.claude/skills/
```

- [ ] **Step 2: Add the two new skills to the import manifest table**

In the `### Import manifest` table, find the row:

```markdown
| `skills/create-block/` | `./.claude/skills/create-block/` | Copy the whole folder |
```

Add these rows immediately after it:

```markdown
| `skills/css-standards/` | `./.claude/skills/css-standards/` | Copy the whole folder |
| `skills/blade-standards/` | `./.claude/skills/blade-standards/` | Copy the whole folder |
| `skills/project-init/` | `./.claude/skills/project-init/` | Copy the whole folder — or use it to drive this very import (see below) |
```

- [ ] **Step 3: Point "How to use it on a new project" at `project-init`**

Find this paragraph in `## How to use it on a new project`:

```markdown
After WordPress is up (see workflow below), tell Claude (or any AI assistant):

> *"Access this repo: `<URL of this repo>` and import the kit into this project."*

The AI should fetch the repo and place every file according to the manifest
below. No shell script needed — the manifest **is** the source of truth.
```

Replace with:

```markdown
After WordPress is up (see workflow below), tell Claude (or any AI assistant):

> *"Access this repo: `<URL of this repo>` and import the kit into this project."*

If the AI assistant supports Claude Code skills, it should use the
**`project-init`** skill (`skills/project-init/SKILL.md`) to drive the
import — it copies every file per the manifest below and then walks
through the remaining manual steps (Lando, Sage scaffold, npm install).

If skills aren't supported, the AI should fetch the repo and place every
file according to the manifest below by hand. No shell script needed —
the manifest **is** the source of truth either way.
```

- [ ] **Step 4: Verify the edits**

Run: `grep -n "css-standards\|blade-standards\|project-init" README.md`
Expected: at least 4 matches (tree entries + manifest rows + the
project-init mention in the usage paragraph).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
[DOCS]: list new skills in the import manifest and point import flow at project-init

Adds css-standards, blade-standards and project-init to the kit's
file tree and import manifest, and updates the "how to use it"
instructions to prefer the project-init skill when available.
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 → spec §2 (css-standards). Task 2 → spec §3
  (blade-standards). Task 3 → spec §1 (CLAUDE.md reduction). Task 4 →
  spec's create-block cross-reference update. Task 5 → spec §4
  (project-init). Task 6 → spec §5 (README update). All five spec
  sections are covered.
- **No placeholders:** every step contains the literal file content or
  exact diff to apply — no "TBD", no "similar to Task N".
- **Consistency:** the pointer path `.claude/skills/css-standards/SKILL.md`
  / `.claude/skills/blade-standards/SKILL.md` used in Task 3 matches the
  destination path used in Task 5's Phase 1 table and Task 6's manifest
  rows.

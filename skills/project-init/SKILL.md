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
| `skills/css-foundation-wizard/` | `./.claude/skills/css-foundation-wizard/` | Copy whole folder; ask before overwriting |
| `skills/blade-standards/` | `./.claude/skills/blade-standards/` | Copy whole folder; ask before overwriting |
| `skills/project-init/` | `./.claude/skills/project-init/` | Copy whole folder; ask before overwriting |
| `_docs/examples.md` | `./_docs/examples.md` | Ask before overwriting if present |
| `_docs/launch-list.md` | `./_docs/launch-list.md` | Ask before overwriting if present |
| `gitignore.example` | `./.gitignore` | **Only if `.gitignore` doesn't exist yet** — never overwrite an existing one |
| `prettier.config.example.js` | `<theme>/prettier.config.js` | Ask before overwriting if present |
| `install-git-hooks.example.mjs` | `<theme>/scripts/install-git-hooks.mjs` | Ask before overwriting if present |
| `mu-plugins/acorn-pantheon-storage.php` | `wp-content/mu-plugins/acorn-pantheon-storage.php` | **Pantheon: required, copy as-is.** Relocates Acorn storage off the read-only filesystem; must be in the first commits |

`<theme>` = the Sage theme root, typically `wp-content/themes/<name>`
(ask the dev if there's more than one theme, or if the repo layout is
non-standard).

> **`.gitignore` — two separate actions.** Copy `gitignore.example` **only if
> the project has none** (Pantheon clones already ship one — leave it). Either
> way, **append `/.githooks/`** to whatever `.gitignore` the project ends up
> with: the hook installer regenerates that folder on every install and it must
> not be tracked. Append the single line; never rewrite the file.

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
4. Scaffold Sage, **naming the theme after the project — not `sage`** (every
   `<theme>` below is that name; shipping a theme still called `sage` is a
   launch blocker):
   ```bash
   cd wp-content/themes
   composer create-project roots/sage <theme>
   cd <theme> && composer install
   ```
   Then set `vite.config.js` `base:` to `/wp-content/themes/<theme>/public/build/`
   (Sage's stock Bedrock path 404s every asset otherwise), and claim the theme's
   identity in `style.css` — `Theme Name`, `Author`, `Text Domain`, and **reset
   `Version` to `1.0.0`**; match `package.json`'s `name`. (Re-verified by the
   launch list at go-live.)
5. `lando wp theme activate <theme>`.
6. Review and commit the copied kit files through the normal git flow —
   **never push without the project owner's permission**.
7. Build theme assets (Step below).
8. **Make the theme deployable** — this upstream has no build step, so
   `vendor/` and `public/build/` must be committed or the deployed site
   white-screens (`wp_die` on the missing autoloader). Edit Sage's own
   `wp-content/themes/<theme>/.gitignore` to drop `/vendor` and `/public/*`,
   keep `/node_modules`, then commit the built output. Also copy
   `mu-plugins/acorn-pantheon-storage.php` to `wp-content/mu-plugins/` — without
   it Acorn tries to compile views into the read-only `wp-content/cache` and
   white-screens on Test/Live. Both must land in the **first commits**. Full
   rationale: README › **Deploying to Pantheon**.

### Scenario B — Local only

1. `lando init --recipe wordpress` (current working directory).
2. Adjust `.lando.yml` if needed (e.g. `php: "8.3"`), then `lando start`.
3. `lando wp core download`, configure `wp-config.php`, complete the
   install (language, admin user).
4. Scaffold Sage (same commands as Scenario A step 4 — name it `<theme>`,
   not `sage`).
5. `lando wp theme activate <theme>`.
6. Optionally `git init` + an initial commit — local only, never push
   without permission.
7. Build theme assets (Step below).

### Theme assets (both scenarios)

```bash
cd wp-content/themes/<theme>
npm install       # also installs the pre-commit hook via the `prepare` script
npm run dev       # development (HMR) — or:
npm run build     # production build
```

> npm or pnpm is the dev's call — just stay consistent within a project. Sage
> scaffolds a `pnpm-lock.yaml`; if you use npm, don't end up committing both
> lockfiles. The `prepare` hook fires on either.

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

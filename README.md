# GritoWeb — WordPress Standards & Workflow

Single **source of truth** so every dev starts WordPress projects the same way.
Stack: **Sage 11** theme (Vite, Acorn, Blade, Tailwind), **Lando** local env,
standard WordPress layout (theme in `wp-content/themes/`, no Bedrock).

This repo is **documentation + reference**, not automation. You bring the
project up by hand (it's interactive anyway — Pantheon token, DB, etc.) and
copy the standards in.

## What's here

```
README.md                          # this file — the workflow + import manifest
CLAUDE.md                          # the dev standard — imported to the project root
skills/
  html-qa-smoketest/SKILL.md       # QA skill — imported to <project>/.claude/skills/
  create-block/SKILL.md            # block scaffold skill — imported to <project>/.claude/skills/
  css-standards/SKILL.md           # CSS/Tailwind standards skill — imported to <project>/.claude/skills/
  css-foundation-wizard/SKILL.md   # interactive CSS foundation setup skill — imported to <project>/.claude/skills/
  blade-standards/SKILL.md         # Blade/PHP standards skill — imported to <project>/.claude/skills/
  project-init/SKILL.md            # kit-import skill — imported to <project>/.claude/skills/
  fotos/SKILL.md                   # block screenshot generator — imported to <project>/.claude/skills/
  site-settings-wizard/SKILL.md    # interactive wizard for Site Settings — imported to <project>/.claude/skills/
global-skills/
  commit-rules.md                  # commit convention — NOT per-project; recommend installing to ~/.claude/skills/ (user-level)
_docs/
  examples.md                      # canonical reference block (code) — imported to <project>/_docs/
  launch-list.md                   # pre-launch checklist — imported to <project>/_docs/
gitignore.example                  # base .gitignore template — imported as <project>/.gitignore (only if missing)
prettier.config.example.js         # Prettier + Tailwind/Blade class sorting — copied to <theme>/prettier.config.js
install-git-hooks.example.mjs      # pre-commit hook installer — copied to <theme>/scripts/install-git-hooks.mjs
mu-plugins/
  acorn-pantheon-storage.php       # Pantheon blocker: relocates Acorn storage — copied to <project>/wp-content/mu-plugins/
CHANGELOG.md                       # what changed in the standards
```

## How to use it on a new project

After WordPress is up (see workflow below), tell Claude (or any AI assistant):

> *"Access this repo: `<URL of this repo>` and import the kit into this project."*

If the AI assistant supports Claude Code skills, it should use the
**`project-init`** skill (`skills/project-init/SKILL.md`) to drive the
import — it copies every file per the manifest below and then walks
through the remaining manual steps (Lando, Sage scaffold, npm install).

If skills aren't supported, the AI should fetch the repo and place every
file according to the manifest below by hand. No shell script needed —
the manifest **is** the source of truth either way.

> ⚠️ **CRITICAL FOR AI ASSISTANTS: Theme Root vs. WordPress Root**
> - In standard WordPress installations with Sage 11, the codebase lives in `wp-content/themes/<theme>/`.
> - All `.claude/skills/`, `CLAUDE.md`, and `_docs/` must be imported into `<theme>/` (`wp-content/themes/<theme>/`), **NEVER into the WordPress root**.
> - **NEVER clone or leave the `wordpress-standards-workflow` repository inside the WordPress root.**
> - If you clone this repository from GitHub to extract skills, copy the files to `<theme>/` and **delete the cloned kit directory immediately** (`rm -rf ...`).

### Import manifest

`<theme>` = the Sage theme root, typically `wp-content/themes/<name>`.

| From (this repo) | To (your project) | Notes |
|---|---|---|
| `CLAUDE.md` | `<theme>/CLAUDE.md` | Must be at the theme root — Claude auto-loads it when working in the theme |
| `skills/html-qa-smoketest/` | `<theme>/.claude/skills/html-qa-smoketest/` | Copy the whole folder |
| `skills/create-block/` | `<theme>/.claude/skills/create-block/` | Copy the whole folder |
| `skills/css-standards/` | `<theme>/.claude/skills/css-standards/` | Copy the whole folder |
| `skills/css-foundation-wizard/` | `<theme>/.claude/skills/css-foundation-wizard/` | Copy the whole folder |
| `skills/blade-standards/` | `<theme>/.claude/skills/blade-standards/` | Copy the whole folder |
| `skills/project-init/` | `<theme>/.claude/skills/project-init/` | Copy the whole folder — or use it to drive this very import (see below) |
| `skills/fotos/` | `<theme>/.claude/skills/fotos/` | Copy the whole folder — block screenshot generator (Chrome headless → webp + svg fallback) |
| `skills/site-settings-wizard/` | `<theme>/.claude/skills/site-settings-wizard/` | Copy the whole folder — adds a tab to the Site Settings page (Secure Custom Fields), only when asked |
| `_docs/examples.md` | `<theme>/_docs/examples.md` | Reference patterns the AI uses for grounding |
| `_docs/launch-list.md` | `<theme>/_docs/launch-list.md` | Pre-launch checklist for go-live |
| `_docs/site-settings-pattern.md` | `<theme>/_docs/site-settings-pattern.md` | The Site Settings pattern (SCF page, empty by default; tabs on request) |
| `_docs/editor-fidelity-checklist.md` | `<theme>/_docs/editor-fidelity-checklist.md` | Canvas fidelity checklist |
| `gitignore.example` | `<theme>/.gitignore` | **Only if** `<theme>/.gitignore` does not exist yet — never overwrite |
| `prettier.config.example.js` | `<theme>/prettier.config.js` | Theme root; then add the `prepare` + `lint-staged` keys and copy the hook installer — see "Code formatting" |
| `prettierignore.example` | `<theme>/.prettierignore` | Theme root; keeps the committed `vendor/` and `public/build/` away from the formatter — see "Code formatting" |
| `install-git-hooks.example.mjs` | `<theme>/scripts/install-git-hooks.mjs` | Pre-commit installer; wired via the theme's `prepare` script |
| `mu-plugins/acorn-pantheon-storage.php` | `wp-content/mu-plugins/acorn-pantheon-storage.php` | **Pantheon: required, copy as-is.** Relocates Acorn's storage off the read-only filesystem |

`README.md`, `CHANGELOG.md` and any other file at the kit's root are about
the kit itself and are **not** imported into projects.

The `global-skills/` folder is **not** part of the per-project import — see
"Global skills" below.

### Global skills (user-level — recommend, don't auto-import)

> **AI assistant: act on this.** After importing the per-project files above,
> always inspect `global-skills/`. These are **user-level** skills meant to
> live in `~/.claude/skills/` and be shared across *every* project — they are
> **not** copied into the project's `.claude/skills/`.
>
> For each skill in `global-skills/`, **tell the user it's recommended** and
> **offer to install it**. Install **only if the user agrees** — never copy
> into `~/.claude/skills/` silently. If the user declines, skip it and move on.
>
> On install, convert the flat file to the layout Claude Code expects (one
> folder per skill, each containing a `SKILL.md`):
>
> ```bash
> # global-skills/commit-rules.md  →  ~/.claude/skills/commit-rules/SKILL.md
> mkdir -p ~/.claude/skills/commit-rules
> cp global-skills/commit-rules.md ~/.claude/skills/commit-rules/SKILL.md
> ```
>
> If a skill of the same name already exists in `~/.claude/skills/`, **don't
> overwrite** — show the user the difference and ask first.

### Doing it manually (if you prefer)

If you'd rather copy by hand instead of asking the AI, from the project root:

```bash
KIT=/path/to/this/repo

cp "$KIT/CLAUDE.md" ./CLAUDE.md
mkdir -p .claude/skills _docs
cp -R "$KIT/skills/html-qa-smoketest" .claude/skills/
cp -R "$KIT/skills/create-block" .claude/skills/
cp "$KIT/_docs/examples.md"     ./_docs/examples.md
cp "$KIT/_docs/launch-list.md"  ./_docs/launch-list.md
# only if the project has no .gitignore yet:
cp "$KIT/gitignore.example" ./.gitignore
```

Then point the AI at `_docs/examples.md` and `CLAUDE.md` for context before
generating code.

Global skills are **not** part of this per-project copy — they go to your
user-level `~/.claude/skills/` once and are shared across every project
(see "Global skills" above):

```bash
# install once per machine, not per project:
mkdir -p ~/.claude/skills/commit-rules
cp "$KIT/global-skills/commit-rules.md" ~/.claude/skills/commit-rules/SKILL.md
```

---

## Code formatting (enforced for every dev)

Tailwind class order isn't done by hand — it's automated and enforced at the
repo level. `prettier-plugin-tailwindcss` sorts classes in non-Blade files
(CSS `@apply`, JS/JSX); for `.blade.php`, `@shufo/prettier-plugin-blade` does
the sorting via its `sortTailwindcssClasses` option (the tailwindcss plugin
can't wrap the Blade parser). A pre-commit hook runs `lint-staged` so nothing
unsorted lands in a commit.

This works in **any layout** — whether the theme is the git root (standalone
theme repo) or a subdirectory of a larger repo (Pantheon / full-site). We do
**not** use the `husky` package: a tiny `prepare` script installs a native git
hook at the actual git root and points `core.hooksPath` at it, resolving the
root at runtime. (Running `npx husky init` inside a theme subdirectory is the
common trap — husky resolves `core.hooksPath` relative to the git root, so the
hook silently never fires.)

Set up once per theme (host, not inside Lando):

```bash
cd wp-content/themes/<theme>

# 1. formatter + plugins + lint-staged (NO husky)
npm i -D prettier prettier-plugin-tailwindcss @shufo/prettier-plugin-blade lint-staged

# 2. copy the kit's Prettier config, ignore file + the hook installer
cp "$KIT/prettier.config.example.js" ./prettier.config.js
cp "$KIT/prettierignore.example" ./.prettierignore
mkdir -p scripts
cp "$KIT/install-git-hooks.example.mjs" ./scripts/install-git-hooks.mjs
```

Then add to the theme's `package.json`:

```json
{
  "scripts": { "prepare": "node ./scripts/install-git-hooks.mjs" },
  "lint-staged": {
    "{app,resources}/**/*.{css,blade.php,js,jsx}": "prettier --write"
  }
}
```

> **The glob is scoped to `{app,resources}` on purpose — don't widen it to
> `*.{css,blade.php,js,jsx}`.** On the layout this kit targets, `vendor/` and
> `public/build/` are committed (no build step on deploy — see **Deploying to
> Pantheon**), so a bare glob hands Prettier every third-party and build-output
> file that happens to be staged. On a real first commit that was **119 of 145
> matched files** — including Laravel's own Blade views under
> `vendor/illuminate/pagination/` — rewriting code we don't own, against
> `CLAUDE.md` › Critical Rules. The `.prettierignore` copied above is the second
> guard and also covers a manual `npx prettier --write .`.
>
> Sanity-check it before the first commit, with the theme staged:
>
> ```bash
> git diff --cached --name-only \
>   | grep -E '\.(css|blade\.php|js|jsx)$' \
>   | grep -cE '/(vendor|public/build)/'
> ```
>
> Must print `0`.

Run `npm install` once to fire `prepare` and install the hook. Because it runs
on `prepare`, any dev who clones and runs `npm install` gets the hook
automatically — Pantheon clone or local `git init`, no per-machine step.
The generated `.githooks/` is auto-managed; add `/.githooks/` to the repo
`.gitignore` (it's regenerated on every install).

---

## Project start workflow

Two scenarios. The "copy the standards in" part is identical; only how
WordPress comes up differs. Both start from a **brand-new, empty** site.

### Prerequisites (host machine)

Composer and Node run on the **host**; Lando only serves WordPress.

- Docker + [Lando](https://lando.dev/)
- PHP **8.3+** and Composer (Sage 11 requires 8.3; run the latest stable
  release where you can)
- Node + npm (theme asset build)
- Git
- Scenario A only: a Pantheon account and a personal **machine token**
  (Pantheon → Account → Machine Tokens).

### Scenario A — Pantheon

1. Create the site on Pantheon (empty, raw WordPress).
2. Create the project folder locally and `cd` into it.
3. `lando init --source pantheon` — paste the machine token (hidden), pick the site.
4. `lando start` then `lando pull` (DB + uploads; `lando start` clones code only).
5. Scaffold Sage into the theme dir, **naming the theme after the project —
   not `sage`**. Every `<theme>` placeholder below is that name (e.g.
   `acme-2026`); shipping a theme still called `sage` is a launch blocker
   (see `_docs/launch-list.md` › Theme identity).
   ```bash
   cd wp-content/themes
   composer create-project roots/sage <theme>
   cd <theme> && composer install     # boots Acorn
   ```
   Then fix Vite's `base:` — Sage ships a Bedrock path (`/app/themes/sage/…`)
   that 404s every built asset on a standard WP layout:
   ```js
   // vite.config.js
   base: '/wp-content/themes/<theme>/public/build/',
   ```
   And claim the theme's identity in `style.css` — set `Theme Name`, `Author`,
   `Text Domain`, and **reset `Version` to `1.0.0`** (your theme's real start;
   `11.2.1` is Sage's). Match `package.json`'s `name`. The launch list
   re-verifies this at go-live.
6. Activate the theme: `lando wp theme activate <theme>`.
7. Copy the standards in (see "How to use it" above) — the Pantheon clone is
   already a git repo: review and commit through the normal flow,
   **never push without the project owner's permission**.
8. Build theme assets (see "Theme assets").
9. Make the theme deployable — see **Deploying to Pantheon** below. On this
   upstream the build output has to be committed, and Sage's own `.gitignore`
   fights that by default. Do this before the first push or the deploy
   white-screens.

### Scenario B — Local only (no Pantheon)

1. Create the project folder and `cd` into it.
2. `lando init --recipe wordpress` (choose "current working directory").
3. Adjust `.lando.yml` (e.g. `php: "8.3"`), then `lando start`.
4. `lando wp core download`, configure `wp-config.php` (host `database`,
   credentials per recipe), open the install URL, set language + admin user.
5. Scaffold Sage (same as Scenario A, step 5 — name it `<theme>`, not `sage`).
6. Activate: `lando wp theme activate <theme>`.
7. Copy the standards in. Optionally `git init` + an initial commit
   (local only — never push without permission).
8. Build theme assets.

### Theme assets (both scenarios)

Sage 11 uses **Vite**. Composer/Node on the host, WordPress in Lando.

```bash
cd wp-content/themes/<theme>
npm install
npm run dev      # development (HMR)   — or:
npm run build    # production build
```

> **npm or pnpm — the dev's call, but stay consistent per project.** Sage
> scaffolds a `pnpm-lock.yaml`; if you go with npm, don't end up committing both
> lockfiles. The examples use `npm`; swap in `pnpm` freely — the `prepare` hook
> fires on either.

> **Lando + Vite gotcha:** the Vite dev server runs on the host while the site
> is served from the Lando container, so HMR can fail to connect until the dev
> server origin is reachable from the browser. If HMR misbehaves, use
> `npm run build` and reload, or align the Vite dev server URL with the Lando
> app URL in the theme's Vite config. Record the working setting per project.

---

## Deploying to Pantheon (Scenario A)

**The build output must be committed.** This kit targets the plain Pantheon
WordPress upstream — WordPress core is committed to git and there is **no build
step** (no root `composer.json`, no `build_step: true` in `pantheon.upstream.yml`,
no CI). Pantheon serves **exactly what you push**; nothing runs `composer install`
or `pnpm build` on deploy.

So the theme's `vendor/` and `public/build/` have to be in git. If they aren't,
the deployed site white-screens on every request:

- Sage's `functions.php` calls `wp_die()` when `vendor/autoload.php` is missing.
- With no `public/build/`, there's no compiled CSS or JS even if it did boot.

Sage scaffolds its **own** `wp-content/themes/<theme>/.gitignore` that ignores
both. After scaffolding, edit that file down to only the true local artifacts:

```diff
# wp-content/themes/<theme>/.gitignore
  /node_modules
- /vendor
- /public/*
- !/public/.gitkeep
  .env
  npm-debug.log
```

Then `pnpm build` (or `npm run build`) and commit `vendor/` + `public/build/`
alongside the source. The kit's root `gitignore.example` is already set up for
this — it does **not** ignore those two paths.

**Relocate Acorn's storage — also a blocker.** By default Acorn compiles Blade
views into `wp-content/cache/acorn`, but on Pantheon Test/Live the code
filesystem is read-only (only `wp-content/uploads` is writable), so every request
`wp_die`s there. The kit ships a drop-in mu-plugin that points Acorn's storage at
`wp-content/uploads/acorn` (writable on every environment) **before** the theme
boots Acorn — no theme edit. Copy it in, and commit it in the **first commits**:

```bash
cp "$KIT/mu-plugins/acorn-pantheon-storage.php" wp-content/mu-plugins/
```

The compiled views land under `wp-content/uploads/` (git-ignored, regenerated at
runtime) — only the mu-plugin file itself is committed.

> **Alternative — Integrated Composer + Build Tools.** Pantheon can instead run
> the build for you: `build_step: true` in `pantheon.upstream.yml` makes the
> platform run `composer install` on deploy, and a
> [Build Tools](https://docs.pantheon.io/guides/build-tools) CI pipeline runs
> the front-end (`pnpm build`). That's a heavier, differently-structured repo
> (root `composer.json`, WordPress in a `web/` subdir, core managed as a
> dependency) and is **not** what this kit sets up. If a project goes that route,
> invert the rule above — ignore `vendor/` and `public/build/`, and let the
> platform rebuild them. Note IC alone only covers Composer/PHP deps; the Vite
> front-end build still needs Build Tools or a committed `public/build/`.

---

## Maintaining the standards

`CLAUDE.md`, the skill and the examples are versioned here — this repo, not the
old gists, is the source of truth. To change a standard: open a PR, add a
`CHANGELOG.md` entry. Point the old gists at this repo (or archive them).

## Troubleshooting

- **`composer create-project` fails** — PHP must be **8.3+** on the host
  (`php -v`); Sage 11 requires it. Prefer the latest stable release.
- **Theme not activating** — Lando must be running; run
  `lando wp theme activate <theme>` after `lando start`.
- **HMR not connecting** — see the Lando + Vite gotcha; `npm run build` is the
  reliable fallback.
- **Reset a Lando env** — `lando destroy -y && lando start` (local data lost;
  re-`lando pull` on Pantheon).

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

- The kit repo (this repo, or a checkout/copy of it) is reachable on disk or via git.
- **Target is ALWAYS the active Sage 11 theme root** (`wp-content/themes/<theme>/`), **NEVER the WordPress CMS root**. The theme is the versioned project where blocks, Blade templates, Vite, package.json, and CSS reside. All `.claude/skills/`, `CLAUDE.md`, `_docs/`, and git versioning must live inside the theme directory (`wp-content/themes/<theme>/`).
- **Zero repository clutter in WordPress root**: If an AI assistant or developer clones this repository (`wordpress-standards-workflow`) from GitHub (e.g. `git clone https://github.com/gritoweb/wordpress-standards-workflow`), it must:
  1. Clone to a temporary folder outside the project (or `./.temp-kit`);
  2. Copy the required skills, docs, and configs into `wp-content/themes/<theme>/`;
  3. **Immediately delete the cloned kit directory** (`rm -rf ...`).
  Under no circumstances should the `wordpress-standards-workflow` git repository be left sitting inside the WordPress root or inside `wp-content/`.

---

## Execution Flow

1. **Phase 0** — Ask which scenario applies (only to know what to tell
   the dev to run next).
2. **Phase 1** — Copy kit files into the target theme (`wp-content/themes/<theme>/`).
3. **Phase 1b** — Run `css-foundation-wizard`: the style guide foundation
   (`resources/css/global/`) — **required**, before the header and any block.
4. **Phase 1c** — Replace Sage's bare header with the kit's responsive
   header + primary navigation, on the foundation's tokens.
5. **Phase 2** — Offer the global (user-level) skills.
6. **Phase 3** — Hand off the manual steps for the chosen scenario.

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

## Phase 1 — Copy kit files into the theme

Copy the following from the kit into the target theme (`wp-content/themes/<theme>/`). Before
overwriting any file that **already exists** at the destination, stop,
show the dev a diff of what would change, and ask for confirmation —
never silently overwrite (same "bail > guessing" principle as
`create-block`'s idempotency handling).

`<theme>` = the Sage theme root, typically `wp-content/themes/<name>`.

| From (kit) | To (target theme in `wp-content/themes/<name>/`) | Overwrite rule |
|---|---|---|
| `CLAUDE.md` | `<theme>/CLAUDE.md` | Ask before overwriting if present |
| `skills/create-block/` | `<theme>/.claude/skills/create-block/` | Copy whole folder; ask before overwriting |
| `skills/html-qa-smoketest/` | `<theme>/.claude/skills/html-qa-smoketest/` | Copy whole folder; ask before overwriting |
| `skills/css-standards/` | `<theme>/.claude/skills/css-standards/` | Copy whole folder; ask before overwriting |
| `skills/css-foundation-wizard/` | `<theme>/.claude/skills/css-foundation-wizard/` | Copy whole folder; ask before overwriting |
| `skills/blade-standards/` | `<theme>/.claude/skills/blade-standards/` | Copy whole folder; ask before overwriting |
| `skills/project-init/` | `<theme>/.claude/skills/project-init/` | Copy whole folder; ask before overwriting |
| `skills/fotos/` | `<theme>/.claude/skills/fotos/` | Copy whole folder; ask before overwriting |
| `skills/site-settings-wizard/` | `<theme>/.claude/skills/site-settings-wizard/` | Copy whole folder; ask before overwriting |
| `_docs/examples.md` | `<theme>/_docs/examples.md` | Ask before overwriting if present |
| `_docs/launch-list.md` | `<theme>/_docs/launch-list.md` | Ask before overwriting if present |
| `_docs/site-settings-pattern.md` | `<theme>/_docs/site-settings-pattern.md` | Ask before overwriting if present |
| `_docs/editor-fidelity-checklist.md` | `<theme>/_docs/editor-fidelity-checklist.md` | Ask before overwriting if present |
| `gitignore.example` | `<theme>/.gitignore` | **Only if `<theme>/.gitignore` doesn't exist yet** — never overwrite an existing one |
| `prettier.config.example.js` | `<theme>/prettier.config.js` | Ask before overwriting if present |
| `prettierignore.example` | `<theme>/.prettierignore` | Ask before overwriting if present. **Required** — keeps `vendor/` and `public/build/` away from formatter |
| `theme/` | `<theme>/` | The framework: copy the whole tree (it mirrors the theme layout — `app/`, `resources/`, `scripts/`). Ask before overwriting any file that exists. Then run **Phase 1a** |
| `mu-plugins/acorn-pantheon-storage.php` | `wp-content/mu-plugins/acorn-pantheon-storage.php` | **Pantheon: required, copy as-is.** Relocates Acorn storage off the read-only filesystem |

> **`.gitignore` — two separate actions.** Copy `gitignore.example` to `<theme>/.gitignore` **only if
> the theme has none**. Either way, **append `/.githooks/`** to whatever `.gitignore` the project ends up
> with: the hook installer regenerates that folder on every install and it must
> not be tracked. Append the single line; never rewrite the file.

After copying, show a summary table of what was created vs. skipped
(already existed, dev declined).

---

## Phase 1a — Fill the framework placeholders and wire it

The copied `theme/` carries neutral placeholders (`__PREFIX__`, `__TEXT_DOMAIN__`,
`__THEME_SLUG__`, `__BLOCK_NAMESPACE__`, `__BLOCK_CATEGORY_SLUG__`,
`__BLOCK_CATEGORY_TITLE__`). Fill them once, here:

1. Write `<theme>/kit.config.json` from `theme/kit.config.example.json`. Derive
   `textDomain` from `style.css` and `themeSlug` from the folder name; propose
   `prefix` (letters/digits/underscore, no hyphens) and `blockNamespace` from the
   slug, and ask the dev to confirm them. Ask: `"Qual namespace pros blocos?
   Sugiro '<theme-slug>'. Ele vai no nome de cada bloco salvo no conteúdo, então
   não dá pra trocar depois sem migrar os posts."` and `"Vou criar uma categoria
   pros seus blocos. Quer chamar de '<Theme Name> Blocks' ou outro nome?"`.
   Set `kitPath` to this kit's checkout path; leave `grounds` as `[]`.
2. Run `node scripts/kit-setup.mjs` from the theme root, then
   `node scripts/kit-setup.mjs --check` — it must exit 0.
3. Run `create-block`'s **Phase 0** (checks only, no block): it wires
   `functions.php`, `editor.js`, `app.css`, `editor.css`, `app.js` and the Blade
   directives, with the same confirm-before-edit flow. 0.21 (CSS foundation) is
   expected to fail until Phase 1b.

---

## Phase 1b — CSS foundation from the style guide (required)

Copying `skills/css-foundation-wizard/` only installs the skill; nothing runs
it by itself. A theme that skips this step ships with the browser's default
font and Tailwind's stock palette in every block (verified 2026-09-23: two
test themes built from the kit had no `resources/css/global/` at all). So,
as soon as the Sage theme exists (Scenario B: after step 5; Scenario A:
after step 4), before the header:

1. **Run the `css-foundation-wizard` skill** in the theme root. It asks for
   the client's style guide and writes `resources/css/global/` and
   `components/button.css` with every token of its contract, wires
   `app.css`/`editor.css`. `scripts/check-css-foundation.mjs` came with `theme/` (Phase 1).
2. **Gate:** `node scripts/check-css-foundation.mjs` exits 0. Don't create
   blocks, the Home page or the first commit before it does — `create-block`
   (check 0.21) and the pre-commit hook both refuse a theme that fails it.
3. No style guide yet? Ask the dev for one (Figma link, brand PDF, or colors
   + fonts in plain text). Don't invent a palette — the wizard offers
   defaults only for the gaps.

---

## Phase 1c — Header & primary navigation (theme code)

Sage ships `resources/views/sections/header.blade.php` as an unstyled brand
link + a `<nav>` that renders **only when a menu is assigned** — a fresh site
comes out with no menu, and assigning one gives an unstyled bullet list with
no mobile toggle. Never leave that in place. Runs right after Phase 1b —
`header.css` reads the style guide tokens with no fallback, so the
foundation must exist first.

| From (`<skill>/templates/`) | To (`<theme>/`) | Rule |
|---|---|---|
| `header.blade.php` | `resources/views/sections/header.blade.php` | Overwrite **only** if it is still Sage's stock header (contains `class="banner"` and `nav-primary`); otherwise show the diff and ask |
| `header.css` | `resources/css/components/header.css` | Create; ask if it exists |
| `navigation.js` | `resources/js/modules/navigation.js` | Create; ask if it exists |
| `front-page.blade.php` | `resources/views/front-page.blade.php` | Create; ask if it exists. Sage's `page.blade.php` prints `partials.page-header` (an unstyled `<h1>` with the page title) above the content — on a block-built home that stray "Home" line under the header reads as a broken menu, and it duplicates the hero's `<h1>` |

Replace `__TEXT_DOMAIN__` with the theme's `Text Domain`, then wire it:

```css
/* resources/css/app.css */
@import './components/header.css';
```

```js
// resources/js/app.js
import { initNavigation } from './modules/navigation';

// app.js loads as type="module" (deferred), so the DOM is already parsed.
initNavigation();
```

The header keeps Sage's `primary_navigation` location (registered in
`app/setup.php`). With no menu assigned it lists the published pages, so it
is never empty; the real menu is created in Phase 3 (**Primary menu**).
**Verify** at 390px and 1280px: desktop shows the links inline; mobile shows
the toggle, which opens/closes the panel (`aria-expanded` flips, `Esc` closes);
nothing but the blocks renders between the header and the first block.

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
5. `lando wp theme activate <theme>`, then `lando wp plugin install secure-custom-fields --activate` (Site Settings runs on SCF).
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
4. Configure permalinks and ensure `.htaccess` exists at WordPress root:
   ```bash
   lando wp rewrite structure '/%postname%/' --hard
   ```
   **CRITICAL for image preview**: Verify that `.htaccess` exists at the WordPress root with standard Apache rewrite rules:
   ```apache
   # BEGIN WordPress
   <IfModule mod_rewrite.c>
   RewriteEngine On
   RewriteBase /
   RewriteRule ^index\.php$ - [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.php [L]
   </IfModule>
   # END WordPress
   ```
   Without this file, Apache returns 404 HTML for REST API requests (`/wp-json/wp/v2/media/*`), breaking Gutenberg image previews.
5. Scaffold Sage (same commands as Scenario A step 4 — name it `<theme>`,
   not `sage`).
6. Copy kit standards into `wp-content/themes/<theme>/` per Phase 1 table.
   If the kit repository was cloned from GitHub, **delete the cloned kit directory immediately** (`rm -rf ...`) so the WordPress root remains clean.
7. `lando wp theme activate <theme>`, then `lando wp plugin install secure-custom-fields --activate` (Site Settings runs on SCF).
8. Optionally `git init` + an initial commit inside `wp-content/themes/<theme>` — local only, never push without permission.
9. Build theme assets (Step below).
10. **Creating Home Page with Sample Blocks** (when requested by user prompt) —
    only after Phase 1b's check exits 0:
    - Scaffold blocks in `<theme>/resources/blocks/<name>/` using `create-block` patterns (`EDITOR_BLOCK_FRAME` for White Summers dashed border, `AutoGrowingTextarea` without inline height clamping, and `AttachmentImageControl` with `×` remove button on hover).
    - Run `npm run build` in `<theme>`.
    - Create the "Home" page in WordPress with the blocks serialized:
      ```bash
      lando wp post create --post_type=page --post_title='Home' --post_status='publish' --post_content='<!-- wp:<theme>/<block-1> /--><!-- wp:<theme>/<block-2> /-->...'
      ```
    - Set the "Home" page as the static front page:
      ```bash
      HOME_ID=$(lando wp post list --post_type=page --name=home --field=ID)
      lando wp option update show_on_front 'page'
      lando wp option update page_on_front "$HOME_ID"
      ```
11. **Primary menu** — create it and assign it to Sage's location, so the
    Phase 1c header shows a real menu (add every page the site has):
    ```bash
    lando wp menu create "Primary"
    lando wp menu item add-post primary "$HOME_ID" --title="Home"
    lando wp menu location assign primary primary_navigation
    ```
12. **Clear WordPress's install defaults** — a fresh install puts
    Archives / Categories / Recent Comments widgets into Sage's footer
    sidebar (they render unstyled under the site) and leaves comments open,
    which `CLAUDE.md` › WordPress Settings forbids:
    ```bash
    lando wp widget reset --all
    lando wp option update default_comment_status closed
    lando wp option update default_ping_status closed
    lando wp comment list --format=ids | xargs -r lando wp comment delete --force
    lando wp post list --post_type=any --comment_status=open --format=ids \
      | xargs -r -I{} lando wp post update {} --comment_status=closed --ping_status=closed
    ```
13. **Smoke check before handing off** — open the home at desktop and mobile
    width: header menu works (Phase 1c), nothing renders under the content
    but the footer you built (no stray widgets), and each block with an
    entrance animation gains `data-entered` on scroll (`create-block` ›
    "Entrance animation wiring"). In the editor: no block shows "This block
    has encountered an error", repeaters reorder/delete from the sidebar
    with the canvas updating at once. Report what was checked, not "should
    work".

### Theme assets (both scenarios)

Sage's stock `package.json` has no `prepare` script and no `lint-staged` key,
so the hook copied in Phase 1 never installs unless both are added. Add to
the theme's `package.json` (merge into the existing `scripts`):

```json
{
  "scripts": { "prepare": "node ./scripts/install-git-hooks.mjs" },
  "lint-staged": {
    "{app,resources}/**/*.{css,blade.php,js,jsx}": "prettier --write"
  }
}
```

```bash
cd wp-content/themes/<theme>
npm i -D prettier prettier-plugin-tailwindcss @shufo/prettier-plugin-blade lint-staged
npm install       # runs `prepare` → installs the pre-commit hook (format + CSS foundation check)
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
2. The output of `node scripts/check-css-foundation.mjs` (Phase 1b) — exit 0,
   or say plainly that the foundation is still pending and blocks can't start.
3. Whether `commit-rules` was installed (Phase 2).
4. The ordered manual-step checklist for the chosen scenario (Phase 3),
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

# WordPress — Development Best Practices

> Read before any PR.

---

## ⚠️ Critical Rules

- **Never `git push` without permission**.
- **Never write to production / a remote environment without explicit permission.** Read-only commands (Terminus, remote `wp-cli`) are free; writes (`lando push`, `terminus` deploy/clone/wipe, remote `wp db`/`search-replace`/import) need explicit ask.
- **Never modify WordPress core or third-party plugin files** — only plugins we own. If unsure whether a plugin is ours, **stop and ask** (changes get wiped on the next update).
- **Keep a `CHANGELOG.md`** in every theme/plugin we own — but only for *notable, release-level* changes, never a line per file or per commit ([Keep a Changelog](https://keepachangelog.com) format: `## [version] - YYYY-MM-DD` header, `Added` / `Changed` / `Fixed` / `Removed` subsections). The `commit-rules` SKILL decides when an entry is warranted, asks before adding one, and handles the format.
- **Version the theme and every plugin we own** using SemVer (`MAJOR.MINOR.PATCH`): MAJOR = breaking, MINOR = backwards-compatible feature, PATCH = fix. Version lives in the theme's `style.css` header and the plugin's main PHP file header. A version bump is what triggers a `CHANGELOG.md` entry — internal refactors, chores, docs and formatting that don't bump the version need no entry.
- **Never add `Co-authored-by`** in commit messages.
- **English** for all commit messages, comments, and variables.
- **Theme root is the development target**: In Sage 11 setups, code, `.claude/skills/`, `CLAUDE.md`, and versioning reside inside `wp-content/themes/<theme>/`. Never clone or leave the kit repository in the WordPress root.
- **Never assume** — when unclear, stop and ask.
- **Don't just agree** — push back on flawed requests with explanation.

---

## Stack

| Layer | Technology |
|---|---|
| Theme | [Sage (Roots)](https://roots.io/sage/) |
| Build | Vite |
| PHP | Blade + Acorn (Laravel) |
| CSS | Tailwind (via `@apply` for reusable patterns) |
| Blocks | Gutenberg via Acorn |
| Local env | [Lando](https://lando.dev/) |
| Custom fields | [Secure Custom Fields](https://wordpress.org/plugins/secure-custom-fields/) (SCF, free ACF fork) — never ACF Pro |

---

## WordPress Settings

- **Disable WordPress comments entirely** — turn off commenting for all post
  types (Settings → Discussion, plus `default_comment_status` /
  `default_ping_status` for post types we register), and close comments/pings
  on existing content. Remove/hide related admin UI and widgets rather than
  leaving an unused, unmoderated attack surface.
  `scripts/wp/comments-off.sh` (via `lando wp`) closes them on a local site.

---

## Kit log

While building, add one line to `_docs/kit-log.md` whenever the kit got
something wrong, had to be worked around, or you built something that looks
reusable — what happened and the file it touched. Don't decide what belongs
in the kit mid-build: after the site ships, the kit's `kit-harvest` skill
reads this log and proposes changes, item by item.

## Kit reference

`kitPath` in `kit.config.json` is the kit checkout this theme was set up from
(kept outside the project). Read `<kitPath>/examples/...` when a doc points
there: tested builds of each pattern. Read them, build the theme's own — never
copy an example and never write to the kit.

---

## Git

To write a commit, use the `commit-rules` SKILL (message format, types, flow). If it isn't installed, follow the guard-rails in **Critical Rules**: one subject per commit, English, never push without permission, no co-author.

---

## Blocks

To create a new block, use the `create-block` SKILL. If it doesn't exist in the project, ask the user to add it before proceeding.

**Editor — content on the canvas, never in the sidebar.** Text, links and
buttons are edited on the canvas, where they show on the page. The sidebar
(`<InspectorControls>`) holds configuration only: the item list, background
media, block settings, Spacing, Entrance animation. **Never put a button
editor, link field or text field in the sidebar** — no `ActionEditor`,
`LinkPicker`, `LinkControl`, `TextControl`, `RichText` or
`AutoGrowingTextarea` inside `<InspectorControls>` (a numeric
`TextControl type="number"` setting is fine). `scripts/editor-fidelity.mjs`
reports any it finds.

**Conformance.** `node scripts/conformance.mjs` reports every block against the
kit's rules without editing anything: an `error` blocks the commit (pre-commit
hook), a `warn` only prints. Opt out of one rule per block in `block.json`
(`__conformance.skip`) with a reason.

**Block assets — the canonical rule:**

- A block's **own** front-end CSS/JS is declared in `block.json` via
  `file:./block.css` (`viewStyle`) and `file:./block.js` (`viewScript`).
  WordPress enqueues them conditionally (only where the block renders) and
  serves them **from source** — so `block.css` is **plain CSS** (no
  `@apply`/`@reference`) and `block.js` is **plain vanilla** (no `import`).
  Vite never touches them; it compiles only the editor's `block.jsx`.
- **Third-party vendor libs** (Swiper, GSAP, …) are committed under
  `resources/{js,css}/vendor/`, **registered** in `app/setup.php`
  (`wp_register_script`/`wp_register_style`), and **enqueued** in the
  `block.php` of each block that uses them (`wp_enqueue_*`). Never enqueue a
  vendor lib globally. The block's `block.js` consumes it via its global
  (e.g. `window.Swiper`).

---

## CSS

Tailwind utilities for one-off styles; `@apply` in a dedicated class for
reusable/semantic patterns.

**Style guide only.** Every theme has its foundation in
`resources/css/global/` + `components/{button,card}.css` (generated by the
`css-foundation-wizard` skill from the client's style guide) **before** any
block exists. Each value is defined once: color in `variables.css`, all type
in `typography.css`, the container in `container.css`. Blocks use its tokens
and classes (`heading-2`, `text-body`, `text-ink`, `bg-surface`,
`card`, `btn btn-primary`) — never Tailwind's stock palette or type
scale (`slate-*`, `text-3xl`, `text-sm`), `text-hN` or arbitrary sizes. A
treatment two blocks share becomes a class first.
`node scripts/check-css-foundation.mjs` must exit 0; the pre-commit hook runs it.

**Exception — block-scoped CSS** (`block.css`) is
**plain CSS**, never `@apply` (it's served from source, not Vite-compiled — see
**Blocks**); use `var(--...)` tokens there and keep Tailwind for the block's
**markup**. Full rules (design tokens, base/typography foundation, block class
naming, hand-written CSS formatting) live in
`.claude/skills/css-standards/SKILL.md`.

---

## Site Settings

Site-wide values an editor changes live on the SCF **Site Settings** page and
are read only through `App\Settings\SiteSettings` (or a class extending it),
never `get_field()` directly. Add fields with the `site-settings-wizard` skill;
the pattern is `_docs/site-settings-pattern.md`.

---

## PHP / Blade

Blade is view-only; sanitize input, escape output. Full rules (view-only
boundary, attachment image sizing, query patterns, sanitize/escape table,
vendor script registration vs. enqueue) live in
`.claude/skills/blade-standards/SKILL.md`.

---

## Comments

Good code is self-explanatory. **Comment why, never what.**

```php
// ❌ $title = get_the_title($id); // gets the post title
// ✅ API returns null on private posts; fallback prevents fatal in template
$title = get_the_title($id) ?? get_bloginfo('name');
```

- If a comment seems necessary, try renaming a variable or function first.
- Stale comments are worse than no comments — delete when the code changes.
- TODOs require owner and date: `// TODO @name YYYY-MM-DD: remove after migration`
- Never commit commented-out code.

---

## PR Checklist

- [ ] Tested on mobile and desktop
- [ ] No `console.log` or `var_dump` left behind
- [ ] Unique block root class, scoped styles
- [ ] All inputs sanitized, all outputs escaped
- [ ] Commit in English, no co-author, one subject
- [ ] **`CHANGELOG.md` updated** — if the PR has notable, release-level changes (the `commit-rules` skill prompts for this; skip for internal refactors/chores/docs that don't bump the version)
- [ ] **Version bumped** in the theme's `style.css` / plugin header following SemVer (MAJOR / MINOR / PATCH per the rule above) — when the change warrants a release
- [ ] Permission granted before pushing to `main`/`production`
- [ ] **Did not alter anything in production without explicit permission**
- [ ] **Did not alter WordPress core or third-party plugin files** (only plugins we own)

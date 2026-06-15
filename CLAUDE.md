# WordPress — Development Best Practices

> Read before any PR.

---

## ⚠️ Critical Rules

- **Never `git push` without permission**.
- **Never write to production / a remote environment without explicit permission.** Read-only commands (Terminus, remote `wp-cli`) are free; writes (`lando push`, `terminus` deploy/clone/wipe, remote `wp db`/`search-replace`/import) and `lando pull` need explicit ask.
- **Never modify WordPress core or third-party plugin files** — only plugins we own. If unsure whether a plugin is ours, **stop and ask** (changes get wiped on the next update).
- **Keep a `CHANGELOG.md`** in every theme/plugin we own — but only for *notable, release-level* changes, never a line per file or per commit ([Keep a Changelog](https://keepachangelog.com) format: `## [version] - YYYY-MM-DD` header, `Added` / `Changed` / `Fixed` / `Removed` subsections). The `commit-rules` SKILL decides when an entry is warranted, asks before adding one, and handles the format.
- **Version the theme and every plugin we own** using SemVer (`MAJOR.MINOR.PATCH`): MAJOR = breaking, MINOR = backwards-compatible feature, PATCH = fix. Version lives in the theme's `style.css` header and the plugin's main PHP file header. A version bump is what triggers a `CHANGELOG.md` entry — internal refactors, chores, docs and formatting that don't bump the version need no entry.
- **Never add `Co-authored-by`** in commit messages.
- **English** for all commit messages, comments, and variables.
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

---

## Git

To write a commit, use the `commit-rules` SKILL (message format, types, flow). If it isn't installed, follow the guard-rails in **Critical Rules**: one subject per commit, English, never push without permission, no co-author.

---

## Blocks

To create a new block, use the `create-block` SKILL. If it doesn't exist in the project, ask the user to add it before proceeding.

---

## CSS

Tailwind utilities for one-off styles; `@apply` in a dedicated class for reusable/semantic patterns.

### Theme CSS foundation (start here)

Every theme starts with **three foundation files** in `resources/styles/`. Build these before any block styles — they're the base every component inherits from. (Reference implementation: `gritoweb-site/.../styles/`.)

1. **`variables.css` — design tokens.** Declare colors, fonts, type scale, weights and shadows. Use Tailwind v4's `@theme {}` whenever the token should also become a utility — e.g. `--color-blue` auto-generates `text-blue` / `bg-blue` / `border-blue`, and `--text-h1` (with its paired `--text-h1--line-height` / `--letter-spacing` / `--font-weight`) becomes the `text-h1` utility. Tokens that aren't meant to be utilities can live in a plain `:root`.

   ```css
   @theme {
     --color-ink: #282828;
     --font-display: "Lato", system-ui, sans-serif;
     --text-h1: 3.5rem;
     --text-h1--line-height: 1.05;
     --text-h1--font-weight: 900;
   }
   ```

2. **`base.css` — primitives.** Element-level defaults in `@layer base`, pulling from the tokens. **Every tag must look right with no class** — `body`, `p`, `h1`–`h6`, `small`, `code/pre`, `hr`, `img/svg/video`. This is the unclassed baseline of the whole site.

   ```css
   @layer base {
     body { font-family: var(--font-body); color: var(--color-ink); }
     h1 { font-size: var(--text-h1); line-height: var(--text-h1--line-height); }
   }
   ```

3. **`typography.css` — type classes.** Reusable typography classes in `@layer components`. Instead of stacking utilities on an element (`<h1 class="mb-0 text-h1 font-display …">`), define one semantic class (`.heading-1`, `.body-text`, `.font-eyebrow`) and put the styling there; markup stays `<h1 class="heading-1">`.

   ```css
   @layer components {
     .heading-1 { font-family: var(--font-display); font-size: var(--text-h1); line-height: var(--text-h1--line-height); }
   }
   ```

   **`base.css` vs `typography.css`:** `base.css` is how a tag looks *by default, unclassed*. `typography.css` applies a type treatment to *any* element regardless of tag — give a `<div>` an h1 look, or a hero `.heading-display` that's larger than any `<h*>`.

### Block styles

- Stick to Tailwind's default scale (`rem` for fonts, spacing). Arbitrary values only when strictly needed.
- Every block has a **unique root class** named after the block (`.hero`, `.testimonials`) — scopes all its styles.
- Nest selectors under the root. BEM (`__element--modifier`) only for complex blocks with many nested states.

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

- Never reuse generic class names (`.card`, `.box`, `.wrapper`) across blocks.
- Global CSS variables / design tokens live in `variables.css` (see **Theme CSS foundation** above) — never redefine tokens per block.
- **Class order is automated** — `prettier-plugin-tailwindcss` sorts Tailwind classes (Blade markup + `@apply`) into the canonical order. Never hand-sort; a pre-commit hook enforces it (see README › "Code formatting"). Format-on-save is optional convenience.
- **Hand-written CSS** (rare — `variables.css`, complex `@apply` bodies): one declaration per line, lowercase short hex (`#fff`), unitless zero (`0`), leading zero (`0.5rem`).

---

## PHP / Blade

**Blade is view-only.** No business logic, queries, or data fetching. Only render-control logic (conditionals, loops over already-prepared data).

- `wp_get_attachment_image($id, 'large')` — always include the size argument (enables native `srcset`); never omit it.
- Avoid nested `WP_Query` inside loops.

**Sanitize input, escape output:**

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

Third-party scripts/styles: **register globally** in `app/setup.php` (on `init`), then **enqueue per-block** inside that block's `block.php` render. Never enqueue vendor libs globally.

```php
add_action('init', function () {
    wp_register_script('swiper', 'https://cdn.example.com/swiper.min.js', [], '11.0', true);
});

// Inside the block render callback
wp_enqueue_script('swiper');
```

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

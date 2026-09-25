# Phase 5: audit (404 and template coverage)

Closes the site's build. Builds the templates a theme needs but no page design covers (the 404, the password form, the search results page), then audits every template the site's content actually requires and reports what's missing. The output is a themed 404, whatever other templates the audit finds absent, a `## Template audit` section in the map, and a launch-list reconciliation.

This is the phase that catches what the comps never showed. A Figma file has page designs; WordPress has states (no results, protected, not found, paginated, archived), and a design system that only covers the happy path breaks the first time a visitor mistypes a URL.

## Contents

- Inputs
- Enumerate what the site needs
- The 404
- The other stateful templates
- Custom post types and archives
- Blocks and templates are different things
- Theme identity and the screenshot
- The template audit table
- Reconcile the launch list
- Verify
- Common mistakes
- Handoff

## Inputs

From `_docs/figma-map.md`: the **Pages** table, the **Block inventory** (including its custom post type dependencies and its "not blocks" list), the **Canonical nodes**, and **Questions for design**. From the theme: `resources/views/`, `app/setup.php` and `app/site.php` (nav menu locations: Sage registers `primary_navigation`; footer locations are registered in `app/site.php`, never `setup.php`), and the project's `_docs/launch-list.md`.

Most of this phase reads the theme, not Figma. Expect a handful of Figma calls at most: a 404 board if one exists, and any state board a page design implies. Give the read estimate as usual, and say when the answer is "no board exists, this is derived."

## Enumerate what the site needs

Build the list from three sources, in this order. Don't start from the theme's existing files: that tells you what's there, not what's missing.

1. **The content architecture.** Every custom post type needs a single template, and an archive template unless archives are consciously off. Every taxonomy the same. The map's CPT dependency table names them.
2. **WordPress's own states.** 404, search results with and without results, password-protected content, paginated archives, and the front page if it differs from a normal page.
3. **The page designs.** Any page in the map whose layout isn't reachable by composing blocks: an archive listing, a single-item layout, a landing page with a fixed structure.

Then compare that list against `resources/views/` and the registrations in `app/setup.php` and `app/site.php`. What's on the list and not in the theme is the phase's work.

## The 404

The 404 is the one template this phase always builds, because Sage ships a placeholder and a visitor will find it. It is design, not design system: build it per site from the comp and `_docs/patterns/404.md` (the parts to keep, the tests to write, and a link to the tested example in `<kitPath>/examples/views/404.blade.php`), never from a copy of the example.

- **If the file has a 404 board**, build it like any other node: read it, propose, write, verify.
- **If it doesn't** (the common case, and a tier-3 gap already recorded in phase 0), derive it rather than blocking. A themed 404 needs a heading, a sentence, and a way back. Use the display type from `typography.css`, the `.btn` classes from phase 2, the `container` utility, and the shell that phase 3 built. Add a search form if the site has search.
- Mark it `derived`, list it under **Built without Figma**, add "no 404 design" to **Questions for design**, and say in the handoff that it's a derivation waiting on a comp.

Never leave WordPress's unstyled 404 in place because the design didn't cover it. An unthemed 404 is the single most visible hole in a design system.

## The other stateful templates

Each is small, each is on the launch list, and none of them will have a comp:

| Template | What it needs | Derive from |
| --- | --- | --- |
| Search results | A results list, the query echoed back, and an explicit no-results state with a way to search again | The post card from phase 2, the page heading treatment |
| Password-protected | A themed form replacing WordPress's bare default | `forms.css` from phase 1 |
| Paginated archive | The pagination component from phase 2 wired to `the_posts_pagination` | The phase-2 pagination classes |
| Front page | Only if it differs structurally from a page built out of blocks | The map's Home row |

Build the ones the site needs, skip the ones it doesn't, and say which you skipped and why. A site with no search doesn't need a search template.

## Custom post types and archives

**This skill does not register post types.** The map records what the blocks expect; someone else builds them. What this phase does is check the consequences:

- For each CPT in the map's dependency table, does a single template exist, and does the block that reads it have somewhere to link?
- Is `has_archive` deliberate? A CPT with archives on and no archive template falls back to `index.blade.php`, which usually looks wrong. Either add the template or say the registration should set `'has_archive' => false`.
- Does a taxonomy exist with no archive template? Same call.

Report these as findings with a recommendation each. Don't register anything to make a finding go away.

## Blocks and templates are different things

Phase 4 drew this line and phase 5 enforces it. A section an editor places is a block; a layout WordPress selects by context is a template. The failure mode is building a template's content as a block nobody can insert, or scaffolding a block for something only a template can render.

A single-item layout (a team member page, a service child page) is a template. It may *use* blocks, and it may reuse phase-2 components, but the page itself is `single-<type>.blade.php`, not something in the inserter.

## Theme identity and the screenshot

The launch list requires a real `screenshot.png` at 1200 × 900 and a `style.css` header that doesn't still say Sage or Roots. Check both:

- `Theme Name`, `Author`, `Author URI`, `Description`, `Version`, and `Text Domain` all reflect the project.
- `screenshot.png` is a real render of the built site, not the starter placeholder.

The screenshot needs a rendered page, so take it after the shell and at least one page of blocks exist, which by phase 5 they do. Ask the dev to capture it, or capture it from the running site; don't generate a mock-up.

## The template audit table

Add a `## Template audit` section to `_docs/figma-map.md`:

```markdown
## Template audit

Audited 2026-08-22 against the content architecture, WordPress's states, and the page designs.

| Template | Needed because | Exists | Themed | Action |
| --- | --- | --- | --- | --- |
| `404.blade.php` | Always | yes | no | Rebuilt this phase, derived (no board) |
| `search.blade.php` | Site has search | yes | no | Themed this phase; no-results state added |
| `single-team.blade.php` | Team CPT | no | n/a | Not built: CPT not registered yet. Blocked, recorded |
```

Every row ends in an action, and "no action needed" is a valid one. A row with no action is an unfinished audit.

List anything blocked on work outside this skill (an unregistered post type, an unanswered design question) as blocked rather than silently skipping it.

## Reconcile the launch list

The project's `_docs/launch-list.md` is the checklist this phase answers to. Walk its **Required pages & layouts** and **Theme identity** sections and reconcile them against what the theme now has:

- Tick nothing on the user's behalf; report what's now true and let them tick.
- Add anything this phase found that the list doesn't cover.
- Make sure every dev artifact the design-system phases created is on it for removal: the styleguide template and its published page, block verification pages, and test attachments. Those must not ship.

## Verify

Rendering matters here as much as anywhere, and these templates are easy to check because you can navigate straight to them:

1. **404**: request a URL that doesn't exist. The themed page renders inside the layout with the header and footer, and the way back works.
2. **Search**: search a term with results, then a term with none. Both render; the no-results state says something useful.
3. **Password**: protect a page, log out, and load it. The form is themed.
4. **Archives**: load every archive the site has, including a paginated one if enough content exists.
5. **Every template at two widths**, and with the header and footer present, since a template that bypasses the layout loses the shell.
6. Compare against a comp where one exists; where none does, check the template against the design system's own tokens and components rather than against nothing.
7. Write the tests `_docs/patterns/404.md` lists for the 404, and add a render-harness test for any other template this phase builds (`SKILL.md` › **Automated gates**), and add its heading/link contrast pair to `resources/css/contrast-pairs.json` if it introduces one that isn't already covered.

Report each as what you saw. A template nobody loaded is unverified.

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Leaving WordPress's default 404 because Figma had no board | Derive it; mark it `derived` and ask design |
| Starting the audit from `resources/views/` | Start from what the content needs; the directory shows only what exists |
| Registering a post type to close a finding | Not this skill. Report it with a recommendation |
| Building a single-item layout as a block | It's a template; blocks go inside it |
| An audit row with no action column filled | Every row ends in an action, including "none needed" |
| Shipping the starter `screenshot.png` | Capture a real 1200 × 900 render of the built site |
| Ticking launch-list items on the user's behalf | Report what's true; the tick is theirs |
| Calling the phase done with the styleguide page still unlisted | Every dev artifact goes on the launch list for removal |

## Handoff

Summarize in one table: template → needed because → built or blocked → verified. State what was derived and what's blocked on someone else, and repeat the questions added to **Questions for design**.

Update `_docs/figma-map.md`: the `## Template audit` section, any new derivations in the Gaps table, and **Current status / Next step**.

Propose the CHANGELOG entry and the version bump; the dev commits with `commit-rules`. Then say the design system is complete, and list what remains outside it: post type registration, content entry, and the launch list's own items.

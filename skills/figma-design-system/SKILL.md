---
name: figma-design-system
description: Sets up a Sage 11 WordPress theme's design system from a Figma file the same way on every project (typography, color, spacing, buttons, forms, and the components the file has, with the kit's fixed token names and style guide layout), then plans the design built on top of it: header, footer, page blocks, and the 404 and template audit, built per site from the kit's patterns. Inventories the file into _docs/figma-map.md first, with a confirm gate before every write. Use whenever the user wants to start a theme from a Figma design, "set up the design system," "create the base CSS from the style guide," "build the buttons from Figma," "map the Figma file," "the design system changed," or "check every template exists" (even if they don't say Figma), when a Sage theme has no foundation CSS yet.
---

# Figma design system for Sage 11

Turns a Figma file into a Sage 11 theme's design system, phase by phase, the way the team does it by hand: inventory the file once, then foundation CSS, components, header and footer, page blocks, and a template audit. Every phase reads, proposes one batch for confirmation, writes, and verifies. Nothing is written before the user says yes.

Core principle: **build what Figma draws.** Every value comes from Figma: line heights, colors, sizes, borders, and states. The skill never swaps in a convention or a "better" value (a 1.5 body line height, a 2px border so nothing shifts, one height for every Small button, a darker color for contrast).

- When Figma lacks a state, infer it from Figma's other families and say which node.
- Invent only what Figma has no source for at all, and list it in the map under **Built without Figma**.
- A color that fails WCAG AA ships as drawn: `"asDrawn": true` in `contrast-pairs.json`, and a row in the map's **Contrast failures (built as drawn)** table. It is never "fixed".

Two standing exceptions: a font the site doesn't load uses the site's font, and loading buttons use the kit's centered spinner.

## Design system versus design

The kit ships three kinds of thing, and this skill treats them differently (the kit README):

| Kind | What this skill does with it |
| --- | --- |
| **Framework** (block framework, entrance, grounds, padding, `SiteSettings`, test harnesses) | Nothing. It's installed by `project-init`. This skill only fills `kit.config.json`'s `grounds`. |
| **Design system structure** (token file, base, typography, helpers, forms, button structure, the style guide template, the contrast gate) | Fills it from the project's Figma in phases 1 and 2. The structure is the same on every project: same files, same required token names, same style guide sections. Only the values change. |
| **Design** (header, footer, 404, blocks, cards, anything a comp may or may not have) | Plans and builds it per site from the comp in phases 3 to 5, using the pages in `_docs/patterns/` as the checklist and the tested examples in `examples/` as references. Nothing here is installed code to adapt. |

Without a Figma file, `css-foundation-wizard` builds the same design system from a style guide the dev gives. Header, footer, 404, and cards are **design, not design system**. Never copy an example's markup into the theme. Build from the comp, on the shared components and the design system's tokens and classes.

## Before anything: locate the project state

Run this check on every invocation, before asking the user anything. Report it as one table and propose the next phase. If `$ARGUMENTS` names a phase, skip the proposal and start that phase after the table.

| Check | How | Means |
| --- | --- | --- |
| Theme root | Find the directory with `vite.config.js`, `app/setup.php`, `resources/css/app.css` (usually `wp-content/themes/<name>/`). Ask if there's more than one. | Where files go |
| Figma map | `_docs/figma-map.md` exists at the project root and has a `File key:` line | Phase 0 done |
| Design changed | The map's `File key:` no longer matches the file link the user gives, or a canonical node ID fails to resolve | Run `references/re-inventory.md` before any other phase |
| Foundation | `resources/css/global/{variables,typography,layout,base,container}.css` exist and `node scripts/check-css-foundation.mjs` passes its token checks | Phase 1 done |
| Components | `resources/css/components/button.css` and `card.css` exist | Phase 2 done |
| Style guide | `resources/views/template-styleguide.blade.php` has the six board sections (`#typography` through `#components`) | The structure is installed; each phase fills its board |
| Shell | `resources/css/components/header.css` and `footer.css` exist | Phase 3 done |
| Blocks | The map has a `## Block inventory` section | Phase 4 planned |
| Audit | The map has a `## Template audit` section | Phase 5 done |
| Gravity Forms | `wp-content/plugins/gravityforms/` exists | `components/forms-gravity.css` (shipped with the kit) applies; `app/site.php` already turns Gravity Forms' own CSS off |
| Grounds | `<theme>/kit.config.json`'s `grounds` array is non-empty | Ground names captured from Figma |

The next phase is the first one not done. Don't redo a done phase unless the user asks; offer "re-run" instead. If the design-changed check fires, say so before proposing any phase: a stale map makes every later phase wrong in a way `npm run build` can't catch.

## Phases

| Phase | Reads | Writes | Reference |
| --- | --- | --- | --- |
| 0 `inventory` | One Figma file link (ask once); every page; the style guide candidates | `_docs/figma-map.md` | `references/figma-reading.md`, `references/figma-map-template.md` |
| 0b `re-inventory` | The existing map; the new file link | Updated `_docs/figma-map.md`, superseded entries moved to `_docs/figma-map-history.md` | `references/re-inventory.md` |
| 1 `foundation` | The map; the typography, color, spacing, and forms boards | `resources/css/global/*.css` in `css-foundation-wizard`'s shapes (values only, the token names are fixed), `app.css`/`editor.css`/`theme.json` wiring, font loading, `contrast-pairs.json`, `styleguide-colors.json` | `references/foundation.md`, `references/derivation-rules.md` |
| 2 `components` | The map; the buttons board and any component boards | `components/button.css` and `card.css` (wizard shapes, Figma values), then the components the file defines; the style guide's `#buttons` and `#components` specimens | `references/components.md` |
| 3 `shell` (design) | The map; header and footer nodes; logo assets; `_docs/patterns/header.md`, `footer.md`; `_docs/site-settings-pattern.md` | The site's own `resources/views/sections/*.blade.php`, composers, `resources/css/components/*.css`, `resources/images/`, SCF fields via `SiteSettings` | `references/shell.md` |
| 4 `blocks` (design) | The map; page artboards; `_docs/patterns/README.md`; `_docs/editor-contract.md` | Block inventory in the map; one `create-block` handoff per block, with the pattern name | `references/blocks.md` |
| 5 `audit` (design) | The theme; WordPress registrations; `_docs/patterns/404.md` | Themed 404, template coverage report, `screenshot.png` | `references/audit.md` |

Read the phase's reference file before starting it. If a phase's reference file doesn't exist yet, stop at the end of the previous phase and say so, don't improvise the phase.

Phases 0 and 1 are the base. Phases 2 to 5 follow the same shape: read the map, pull only the nodes you need, propose, confirm, write, verify. Phase 0b only runs when the state check finds a stale map; it is not a step every project takes. Phases 1 and 2 are the design system. Phases 3 to 5 are design, built per site.

## Design system boards

Every project's design system has the same six boards, in this order. Phase 0 records which of them the file has (`## Design system boards` in the map), and phases 1 and 2 fill one style guide section per board. A file that lacks a board gets it derived from `references/derivation-rules.md` and marked `derived`, never skipped and never reordered.

| Board | Style guide section | What it holds | Phase |
| --- | --- | --- | --- |
| **Typography** | `#typography` | Font families and weights, the type scale (h1 to h6, lead, body, small, caption, label, button, link) and its mobile steps | 1 |
| **Color** | `#color` | The palette ramps, the semantic colors (primary, ink, light, surface, danger, success), and the grounds | 1 |
| **Spacing** | `#spacing` | The container width and gutters, section spacing, radius, and shadow | 1 |
| **Buttons** | `#buttons` | The three roles (primary, inverted, on-dark) plus the link button, sizes, and every state | 2 |
| **Forms** | `#forms` | Text fields, textarea, select, checkbox and radio, label, and the error state | 1 |
| **Components** | `#components` | The reusable pieces the file actually defines as components: alerts, badges, pagination, social icons. Never cards, a header, a footer, or a 404 | 2 |

The token names, the file layout, and the style guide sections come from the kit and never change per project. The values come from the project's Figma: `references/foundation.md` › **Required tokens** lists the fixed names.


## The map is the cache

`_docs/figma-map.md` holds a **fixed shape**: current state, pages, artboards, canonical nodes, tokens, gaps, questions, and the sections later phases append (token mapping, components, block inventory, template audit). Later phases read the map first and call Figma only for the nodes they need.

The map never grows by appending history: every cycle rewrites its sections in place. A superseded entry (an old node ID, a resolved gap, a past readiness report) moves to `_docs/figma-map-history.md` with the date, instead of staying in the live map. A map that only ever grows stops being a cache and turns into a log nobody re-reads; keeping it fixed-shape is what makes "read the map first" cheap every time.

Re-walk the file only when the user says the design changed or a node no longer resolves (see `references/re-inventory.md`).

## Gap policy

Apply in order. Record every gap in the map with its tier.

1. **Infer from the file**: marked `inferred`, cites the node, included in the phase's confirmation batch. A state Figma draws on one family and not another (carry it over from the family that has it), or a style that isn't in the style guide but is consistent across artboards. Always try this first.
2. **Derive by rule**: only for a value Figma has no source for at all. Marked `derived`, listed in the map under **Built without Figma**. Missing type-scale steps, a focus ring no family draws, radius steps. Rules and their outputs are in `references/derivation-rules.md`; use those, not ad hoc guesses. A value Figma gives is never a gap, so a drawn value is never replaced by a rule's.
3. **Ask design**: listed under **Questions for design** in the map, phrased to paste to the designer. Proceed on everything else; mark the area `pending`. Triggers: missing font files or weights, no mobile artboards anywhere in the file, no focus, hover, or error states, no form elements anywhere in the file, no 404 design, contradicting values across artboards, two candidate style guides.

A gap is tier 3 only if a wrong guess would change the brand's look or block a whole phase. Everything else is tier 1 or 2. Don't stop the phase for tier 1 or 2.

**Mobile is a per-page question, not a file-wide one.** A file can have mobile artboards for the home page and none for the contact page. During phase 0, check every page you walk for a mobile-width artboard (see **Classify pages and artboards** in `references/figma-reading.md`) and record it in the **Artboards** table. "No mobile board" for a given page is a tier-3 gap for that page: add it to **Questions for design** (named by page), even when the file has mobile boards elsewhere. Don't let one page's mobile coverage stand in for the rest.

## Confirm gates

- One batch of questions per phase, not a question per item. Use `AskUserQuestion` for closed choices.
- Show the proposed files (or a diff for edits) and ask before writing. Never overwrite an existing foundation or layout file without a diff and a yes.
- Keep Sage's stock lines in `app.css` and `editor.css` untouched; append imports below them.

## Verify by rendering

**A passing build is not verification.** `npm run build` exiting 0 proves the CSS compiled, not that anything looks right. A phase is done when its output has been rendered in a browser and compared with the Figma node.

The mechanism is a **dev styleguide page**. The kit installs the template, `resources/views/template-styleguide.blade.php`, with one section per board (see **Design system boards**), so the layout is the same on every project:

1. In the first phase that produces something visible, ask the user to publish a page using the template. Record the page ID and URL in the map. Don't write a new template.
2. Each phase fills its boards' sections: the tokens and type steps in `#typography`, `#color`, and `#spacing` come from the live `variables.css` on their own, and the phase adds a specimen for every button variant, form state, and component it built inside `#buttons`, `#forms`, and `#components`. Never add a seventh section. A specimen that belongs to design (a card, a header piece) doesn't go on the style guide.
3. **Render specimens at their Figma width.** A 480px component squeezed into a 340px grid cell clips its own headline, which reads as a component bug but is a harness artifact. Give each tile the comp's width and let the page scroll.
4. Compare against the node's `get_screenshot` output, and exercise every interactive state (hover, focus, disabled) by hand.
5. Register the template and the published page in `_docs/launch-list.md` under cleanup, and mark them in the map. The styleguide never ships.

Phase 3's header and footer render on every page, so verify those on a real front-end page at desktop and mobile widths instead; the styleguide's `#components` section still carries the pieces that have no home yet, such as the social icon set.

**Compare by measuring, not by looking.** A holistic glance passes anything roughly the right shape. Render with the comp's own content, put the node screenshot beside it, and walk a fixed list: type, color, spacing, layout, chrome, and anything present in one and not the other, reporting each item as a match or as a difference with a number on it. A phase-4 block passed a six-check verification and was still visibly wrong: a 50/50 column split against the comp's 37/63, an image 153px short, an inset edge where the comp bled off the page. The per-phase reference files carry the list.

Report verification as what you saw, not as what should have happened. If you couldn't render it, say the phase is unverified.

## Automated gates

Rendering catches what a build can't; the kit's `theme/scripts/` harnesses catch what a screenshot comparison won't notice or won't re-check on the next change. Run these as part of each phase's verify step, alongside the render comparison. Neither replaces the other:

| Gate | Script | Checks |
| --- | --- | --- |
| Contrast | `node scripts/contrast.mjs` | Every token pair in `resources/css/contrast-pairs.json` clears its WCAG AA threshold, or is marked `"asDrawn": true` because Figma draws it that way (warned, listed in the map, never recolored). An unflagged failure errors, and so does a flagged pair that now passes. Phase 1 creates `contrast-pairs.json` from the token mapping's text, large-text, and UI pairs (body on paper, button text on primary, focus ring on ground, and so on); phase 2 and phase 3 add a pair for every new component and ground combination they introduce. |
| Cascade | `scripts/css-cascade.mjs`, per-file `*.test.mjs` | Which declaration actually wins for a given element and state, across layers, specificity, and `!important`: the way a browser resolves it, not the way the source reads top to bottom. Write one alongside any file with more than a couple of overlapping selectors (forms, buttons, header). |
| Blade render | `scripts/render-harness.mjs` | A Blade view renders the expected markup and classes with fake WordPress functions, without a real WordPress install. Use it for the shell (phase 3) and any composer-backed view. |
| Editor bundle | `scripts/editor-test-bundle.mjs` | A block's `block.jsx` bundles and runs in Node with `@wordpress/*` stubbed; phase 4 hands this to `create-block`, which owns the block's own tests. |

Run `node --test` from the theme root before calling any phase done. These gates are pass/fail and belong in the phase's handoff next to the rendered comparison, not instead of it: a green `node --test` run proves the CSS resolves and the markup is right; it doesn't prove the page looks like the comp.

## Conventions

- Tokens live in their owner file (`css-foundation-wizard` › **The token contract**): color/shape in `global/variables.css`, type in `global/typography.css`, the container in `global/container.css`. Every other file uses `var(--...)`, never a raw hex or font size (`check-css-foundation` refuses it).
- Base tag styles go in `@layer base`, reusable classes in `@layer components`. Unlayered CSS beats every Tailwind utility in v4, so an unlayered `h1 { ... }` would break `text-sm` on a heading.
- **The `@layer` lesson goes one level further than "unlayered beats layered."** WordPress core prints its own CSS unlayered: a block editor's inherited styles, `wp-block-library`, admin-bar rules. Core's unlayered CSS beats every rule the theme puts in `@layer base`/`@layer components`, no matter how specific, because an unlayered declaration always outranks a layered one. That's why the editor canvas sometimes can't rely on `.btn` alone to beat a core default, and why a layered rule occasionally needs `!important` to win where an unlayered kit rule would not have. Know which side of that line a rule needs to be on before reaching for `!important`; see `css-standards` for the full lesson and `scripts/css-cascade.mjs` for the resolver that checks it.
- `base.css` = unclassed tags. `typography.css` = a type treatment for any element. `layout.css` = `html`/`body`/`.app` structure; `container.css` = `@utility container`. `components/forms.css`, `selection.css` and `forms-gravity.css` ship with the kit and read tokens only. Component and block classes never go in `global/`.
- Font sizes in rem. `clamp()` only when the style guide gives both ends.
- Hand-written CSS: one declaration per line, short lowercase hex, unitless zero, leading zero.
- Comments explain why, never what.
- Assets (logos, icons) come from Figma exports through `download_assets`, never hand-drawn SVG. Name them for what they are (`logo.svg`, `logo-stacked.svg`, `facebook.svg`), never after the client or the file (no `logo-acme-2026.svg`, no `logo-final-v2.svg`).
- Every class, data attribute, and Blade partial name is neutral: no client name, no ground name lifted straight from a Figma layer (`Yellow`, `Earth`) baked into a selector. Roles, not colors: a button family is `.btn-primary`/`.btn-secondary`/`.btn-on-dark`/`.btn-link`, not `.btn-yellow`/`.btn-earth`. Ground names live only in `kit.config.json`'s `grounds` array and the generated `.ground-<name>` classes (see **Grounds**); nothing else references a ground by name.
- Follow the project's `css-standards`, `blade-standards`, and `CLAUDE.md` when they exist; this skill fills in the Figma side.
- Header, footer, 404, and cards are built from `_docs/patterns/` and the comp, never from a copy of an example. The example is a reference the kit tests; the pattern page says what to keep and what to adapt.

## Grounds

A ground is a named background/foreground combination a block can sit on (Figma calls these things like "Cream section", "Dark band", "Yellow highlight"). Grounds are config-driven, not hardcoded per component or per block:

1. While reading the style guide and page artboards (phase 0) or components (phase 2), note every distinct background a section or component sits on, and record it as a candidate ground in the map.
2. In the phase's confirmation batch, propose the ground list as `{ name, token, light }`: `name` neutral and short (`cream`, `dark`, `accent`), `token` the CSS color token backing it, `light` whether foreground content on it should read as light or dark text.
3. On confirmation, write the array into `<theme>/kit.config.json`'s `grounds` key (show the diff, same confirm-before-write rule as any other file) instead of inlining ground names in CSS or PHP. The framework worker's `kit-setup.mjs` generates `resources/css/global/grounds.css` with one `.ground-<name>` class per entry from this array; this skill only fills the config, it doesn't hand-write `grounds.css`.
4. Components and blocks read only the resulting `.ground-<name>` class and the semantic aliases it sets; never a ground's Figma name.
5. A dark ground (`light: false`) swaps `--color-ink`, `--color-muted`, `--color-link`, `--color-link-hover`, and `--color-focus` for their `-on-dark` twins in `variables.css`, so text, links, and the focus ring stay visible on it. Give every alias that draws text or a ring on a ground a twin, add it to the generator's flip list in `kit-setup.mjs`, and add its pair on the dark ground to `contrast-pairs.json`.

## Figma tools

Use the `plugin:figma:figma` MCP tools. `get_metadata` with no node lists pages; with a page ID it returns the artboard tree. `get_variable_defs`, `get_design_context`, `get_screenshot`, and `download_assets` need a node ID. Invoke the `figma:figma-design-to-code` skill before the first `get_design_context` call in a session. Details and the call order are in `references/figma-reading.md`.

## When the design system changes mid-project

The designer changes a color, a type step, a button, or the whole file after phases 1 and 2 shipped. Don't re-run phase 1, and don't edit the design (blocks, header, footer) to match. Run four steps in this order, and end each with a report:

1. **Re-inventory**. Run `references/re-inventory.md`. When only a style changed (the file key is the same), re-read just the boards the designer names, or all six when unsure, and update the map's `## Design system boards` in place. Move what it replaces to `_docs/figma-map-history.md`.
2. **Token diff**. Build a table of every token that moved: name, old value, new value, source (`variable`, `frame`, `derived`, `inferred`). Names never change: a new value goes into an existing token, and a Figma value with no token gets a new project token, not a repurposed name. Delete a token only when a search of `resources/` shows nothing reads it. If a ground was added, removed, or repointed, edit `kit.config.json`'s `grounds` and ask the dev to run `node scripts/kit-setup.mjs`. Show the diff, wait for a yes, then write `variables.css` and the map's `## Token mapping`.
3. **Style guide re-check**. Open the published style guide and compare every section that changed with its board, measuring per **Verify by rendering**. Then check what reads the changed tokens: search `resources/` for each token, and render the header, the footer, and one block per token consumer. A hard-coded value that the token should have covered is a defect in that file; fix it at the token, not with a per-block override.
4. **Contrast gate**. Update `resources/css/contrast-pairs.json` for every changed or new color pair, and for each new ground. Ask the dev to run `node --test`. A pair under its WCAG AA threshold gets `"asDrawn": true` and a row in the map's **Contrast failures (built as drawn)** table; a flagged pair that now passes loses its flag. Never move a color to make a pair pass.

Propose the CHANGELOG line and version bump. The dev commits with `commit-rules`.

## Guardrails

One rule, for a human dev and an agent alike (this skill runs the same way regardless of who's driving): **build and test locally, never push or write remotely.**

- Never run `npm`, `composer`, `lando`, or `git`. Ask the user to run the build (`npm run build` in the theme root) and report the result; then verify. This holds whether a human or an agent is running the skill, don't skip it because no one's watching.
- Never write to a remote or production environment.
- Never commit. Propose the CHANGELOG line and version bump; the user commits with `commit-rules`.
- If a Figma call fails with a permission or rate-limit error, stop, say so, and resume from the map later. Don't retry in a loop.
- If the Figma link has no `/design/` path, or the file key can't be parsed, ask for **Share > Copy link** from the Figma app. Don't guess a node ID.

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Writing base styles outside `@layer base` | Wrap them; utilities must win |
| Hex or a raw font size outside its owner file | Add a token to its owner file (`variables.css`, `typography.css`) and reference it |
| Inventing a hover color because Figma has none | Infer it from another family's hover and cite the node; invent only with no source at all, and list it under **Built without Figma** |
| Replacing a Figma value with a convention (1.5 line height, 2px border, one Small height, a darker color for contrast) | Build the drawn value. A failing color ships as drawn with `"asDrawn": true` |
| Recoloring a pair that fails AA | Flag it `"asDrawn": true` and add it to **Contrast failures (built as drawn)** in the map |
| Putting a button class in `global/` | Buttons are phase 2, `components/button.css` |
| Leaving Gravity Forms CSS on and fighting it with `!important` | `app/site.php` already turns it off when the plugin is active; `forms-gravity.css` stays plain |
| Styling Gravity Forms markup outside `forms-gravity.css` | Keep plugin selectors in that one kit file; native fields are `forms.css` |
| Walking every artboard with `get_design_context` during inventory | One `get_metadata` per page; node reads happen per phase |
| Re-reading Figma in phase 2 for things the map already has | Read the map first |
| Asking the designer about a missing `h5` size | Derive from the scale (no Figma source), and list it under **Built without Figma** |
| Reporting "the build passed" as verification | Render it and measure it; see **Verify by rendering** |
| Comparing a render with its Figma node by eye | Walk a fixed list and put a number on every difference |
| Classifying page sections before asking what supplies their content | Post types, plugins, and forms change the answer; see `references/blocks.md` |
| Building an interactive component to its Figma variant labels | Labels get reversed. Check the interaction is coherent: a face holding a link must be the revealed state |
| Trusting the no-`nodeId` page listing as the file's full page list | Ask for the Pages panel list; see `references/figma-reading.md` |
| Continuing a phase after the file key or a canonical node changed | Stop, run `references/re-inventory.md` first |
| Appending a new "as of" section to the live map instead of rewriting in place | Move the old content to `_docs/figma-map-history.md`; the map stays fixed-shape |
| Treating "the file has mobile boards" as covering every page | Check per page; a page with none is its own tier-3 gap |
| Naming a class or file after a ground's Figma layer name (`Yellow`, `Cream`) | Roles for shared components, `kit.config.json`'s `grounds` for backgrounds |
| Calling a phase done because `node --test` is green | That's the automated gates half; still render and measure against the comp |
| Building cards in phase 2 | Cards are design. They come from a block or a collection's card partial, in phase 4 |
| Copying an example's header, footer, or 404 into the theme | Build from the comp with the pattern page as the checklist; the example is a reference |
| Renaming a required token because Figma calls it something else | Keep the kit's name, put the Figma name in the token mapping table |
| Adding a seventh section to the style guide | Put the specimen in the board it belongs to, or leave it off if it's design |
| Re-running phase 1 from scratch after the designer changes a color | Follow **When the design system changes mid-project** |

## Handoffs

- `create-block` (project skill) builds each page block; phase 4 hands it the title, slug, block category (from `kit.config.json`'s `blockCategory`), the pattern name (from `_docs/patterns/README.md`), source node URL, and the attributes visible in the design: see the handoff contract in `references/blocks.md`. `create-block` scaffolds a placeholder `preview.svg` from its template, and phase 4 swaps in the Figma export as a real preview image after it finishes. This skill never describes `BlockManager`, grounds, entrance, or the editor's internals itself; `_docs/editor-contract.md` (written by the block framework) and `create-block` own that.
- `_docs/site-settings-pattern.md` and the `SiteSettings` accessor own every site-wide value an editor changes without a deploy: header CTA and scroll behavior, footer content, socials. (A favicon is WordPress's own Site Icon, under Appearance > Customize; the kit doesn't add a second setting for it.) A site adds the fields its own header and footer need by following that doc, and phase 3 reads them through the accessor, never a raw `get_field` call in Blade or a composer.
- `_docs/patterns/` (header, footer, 404 pages for phases 3 and 5; the block patterns for phase 4) says what to build and what must not change. The comp says how it looks.
- `html-qa-smoketest` and `_docs/launch-list.md` supply the audit checks.
- `commit-rules` owns commits.

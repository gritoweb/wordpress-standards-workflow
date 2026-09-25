---
name: figma-design-system
description: Sets up a Sage 11 WordPress theme's design system from a Figma file the same way on every project (typography, color, spacing, buttons, the card, forms and the components the file has), in css-foundation-wizard's files and fixed token names. Inventories the file into docs/figma-map.md first, with a confirm gate before every write. Use whenever the user wants to start a theme from a Figma design, "set up the design system from Figma," "build the buttons from Figma," "map the Figma file," or "the design system changed."
---

# Figma design system for Sage 11

Turns a Figma file into the theme's design system, phase by phase: inventory
the file once, then foundation CSS, then components. Every phase reads,
proposes one batch for confirmation, writes, and verifies. Nothing is written
before the user says yes.

It writes **the same files and token names as `css-foundation-wizard`** (its
**The token contract**); only the values come from Figma. Without a Figma
file, `css-foundation-wizard` builds the same design system from a style
guide the dev gives.

Core principle: **build what Figma draws.** Every value comes from Figma:
line heights, colors, sizes, borders, and states. Never swap in a convention
or a "better" value (a 1.5 body line height, a 2px border, a darker color).

- When Figma lacks a state, infer it from Figma's other families and say which node.
- Invent only what Figma has no source for at all, and list it in the map under **Built without Figma**.

## Design system versus design

| Kind | This skill |
| --- | --- |
| **Framework** (blocks, entrance, padding, Site Settings) | Nothing: `project-init` and `create-block` install it. |
| **Design system** (tokens, typography, container, buttons, card, forms, the Styleguide page) | Fills it from Figma in phases 1 and 2. Same files and token names on every project; only the values change. |
| **Design** (header, footer, 404, blocks) | Not this skill: built afterwards with `create-block` and the comp, only what the site needs. |

## Before anything: locate the project state

Run this check on every invocation, before asking anything. Report it as one
table and propose the next phase.

| Check | How | Means |
| --- | --- | --- |
| Theme root | The directory with `vite.config.js`, `app/setup.php`, `resources/css/app.css` (usually `wp-content/themes/<name>/`). Ask if there's more than one. | Where files go |
| Figma map | `docs/figma-map.md` exists and has a `File key:` line | Phase 0 done |
| Design changed | The map's `File key:` no longer matches the link the user gives, or a canonical node fails to resolve | Run `references/re-inventory.md` first |
| Foundation | `resources/css/global/{variables,typography,layout,base,container}.css` exist and `node scripts/check-css-foundation.mjs` passes | Phase 1 done |
| Components | `resources/css/components/button.css` and `card.css` hold Figma values (the map's **Components** table) | Phase 2 done |
| Styleguide page | The private "Styleguide" page (`project-init`) exists on `template-styleguide.blade.php` | Where each phase is verified |

The next phase is the first one not done. Don't redo a done phase unless the
user asks.

## Phases

| Phase | Reads | Writes | Reference |
| --- | --- | --- | --- |
| 0 `inventory` | One Figma file link (ask once); every page; the style guide candidates | `docs/figma-map.md` | `references/figma-reading.md`, `references/figma-map-template.md` |
| 0b `re-inventory` | The existing map; the new file link | Updated map; superseded entries in `docs/figma-map-history.md` | `references/re-inventory.md` |
| 1 `foundation` | The map; the typography, color, spacing and forms boards | `resources/css/global/*.css` (values only, token names fixed), font loading, `components/forms.css` when the file draws forms | `references/foundation.md`, `references/derivation-rules.md` |
| 2 `components` | The map; the buttons board and any component boards | `components/button.css` and `card.css` (Figma values), then the components the file defines | `references/components.md` |

Read the phase's reference file before starting it. This skill stops at the
design system.

## Design system boards

Every project has the same six boards, in this order, and the Styleguide page
has one section per board. A board the file lacks is derived from
`references/derivation-rules.md` and marked `derived`, never skipped.

| Board | Styleguide section | What it holds | Phase |
| --- | --- | --- | --- |
| **Typography** | `#typography` | Font families and weights; h1 to h6 (with mobile steps), lead, body, small | 1 |
| **Color** | `#color` | The contract colors (ink, muted, light, surface, border, primary, primary-light, success, warning, danger) plus any extra named colors | 1 |
| **Spacing** | `#spacing` | Container width and side padding, radius, shadow | 1 |
| **Buttons** | `#buttons` | `.btn-primary` and `.btn-secondary`, sizes, and every state | 2 |
| **Forms** | `#forms` | Text fields, textarea, select, checkbox and radio, label, error state | 1 |
| **Components** | `#components` | Reusable pieces the file defines as components (alerts, badges, pagination). Never cards, a header, a footer or a 404 | 2 |

## The map is the cache

`docs/figma-map.md` has a **fixed shape** (`references/figma-map-template.md`):
current state, pages, artboards, canonical nodes, tokens, gaps, questions, and
the sections later phases append. Later phases read the map first and call
Figma only for the nodes they need. Every cycle rewrites its sections in
place; superseded entries move to `docs/figma-map-history.md` with the date.

## Gap policy

Apply in order and record every gap in the map with its tier.

1. **Infer from the file** (`inferred`, cite the node): a state drawn on one family and not another, a style consistent across artboards. Always try this first.
2. **Derive by rule** (`derived`, listed under **Built without Figma**): only for a value Figma has no source for at all, with `references/derivation-rules.md`.
3. **Ask design** (under **Questions for design**, phrased to paste to the designer): missing fonts or weights, no mobile artboard for a page, no focus/hover/error states, no form elements, contradicting values. Proceed on everything else.

Mobile is a per-page question: a page with no mobile artboard is its own gap,
even when other pages have one.

## Confirm gates

- One batch of questions per phase, not one per item. Use `AskUserQuestion` for closed choices.
- Show the proposed files (or a diff) and ask before writing. Never overwrite a foundation file without a diff and a yes.
- Keep Sage's stock lines in `app.css` and `editor.css`; append imports below them.

## Verify by rendering

**A passing build is not verification.** A phase is done when its output has
been rendered on the private **Styleguide** page and compared with the Figma
node. The page reads the tokens itself; the phase only adds a specimen for
each button variant, form state and component inside `#buttons`, `#forms`
and `#components`. Never add a seventh section.

- Render specimens at their Figma width.
- Compare by measuring, not by looking: type, color, spacing, layout, and anything present in one and not the other, each as a match or a difference with a number.
- Exercise every interactive state (hover, focus, disabled) by hand.
- `node scripts/check-css-foundation.mjs` must exit 0.

Report what you saw. If you couldn't render it, say the phase is unverified.

## Conventions

- Tokens live in their owner file: color/shape in `global/variables.css`, type in `global/typography.css`, the container in `global/container.css`. Every other file uses `var(--...)`.
- Base tag styles in `@layer base`, reusable classes in `@layer components`; unlayered CSS beats every Tailwind utility.
- Font sizes in rem. `clamp()` only when the design gives both ends.
- Assets come from Figma exports (`download_assets`), named for what they are (`logo.svg`), never after the client.
- Every class name is neutral and by role (`.btn-primary`, not `.btn-yellow`).
- Follow `css-standards`, `blade-standards` and `CLAUDE.md`.

## Figma tools

Use the Figma MCP tools. `get_metadata` with no node lists pages; with a page
ID it returns the artboard tree. `get_variable_defs`, `get_design_context`,
`get_screenshot` and `download_assets` need a node ID. Details and call order:
`references/figma-reading.md`.

## When the design system changes mid-project

Don't re-run phase 1 and don't edit blocks to match. In order:

1. **Re-inventory** (`references/re-inventory.md`): re-read only the boards that changed.
2. **Token diff**: a table of every token that moved (name, old, new, source). Names never change. Show the diff, wait for a yes, then write.
3. **Re-check the Styleguide page** and what reads the changed tokens (search `resources/`).

Propose the CHANGELOG line; the dev commits.

## Guardrails

- Never run `npm`, `composer`, `lando` or `git`. Ask the user to run `npm run build` and report the result; then verify.
- Never write remotely and never commit.
- If a Figma call fails with a permission or rate-limit error, stop and say so. Don't retry in a loop.
- If the link has no `/design/` path or the file key can't be parsed, ask for **Share › Copy link**. Don't guess a node ID.

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Hex or a raw font size outside its owner file | Add a token to the owner file and reference it |
| Renaming a contract token because Figma calls it something else | Keep the kit's name; put the Figma name in the map's token mapping |
| Inventing a hover color | Infer it from another family and cite the node; only with no source, list it under **Built without Figma** |
| Walking every artboard with `get_design_context` during inventory | One `get_metadata` per page; node reads happen per phase |
| Re-reading Figma for what the map already has | Read the map first |
| Reporting "the build passed" as verification | Render it on the Styleguide page and measure |
| Building cards, a header or a footer here | That's design: `create-block` and the comp |
| Adding a seventh Styleguide section | Put the specimen in its board, or leave it off if it's design |

## Handoffs

- `create-block` builds each block the comp needs, after this skill.
- `site-settings-wizard` owns site-wide values an editor changes without a deploy.
- `commit-rules` owns commits.

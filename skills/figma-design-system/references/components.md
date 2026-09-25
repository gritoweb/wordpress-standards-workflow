# Phase 2: components

Fills the buttons and components boards: first `components/button.css` and
`components/card.css` in `css-foundation-wizard`'s shapes (its Step 7), then
whatever else the file defines as a reusable component (badges, pills,
alerts, pagination), one file each under
`resources/css/components/`. No page sections (they are blocks, built with `create-block`) and no designed
cards beyond the shared `.card` surface.

## Inputs

From `docs/figma-map.md`: the **Canonical nodes** for buttons and component
nodes. Read each with `get_design_context`, one at a time; give a read
estimate first and wait. Tokens come from phase 1 via `var(--…)`; never a raw
hex or px a token covers (`check-css-foundation` refuses it).

## Buttons

The roles are fixed by the contract: `.btn` (shape, focus, disabled) plus
`.btn-primary` and `.btn-secondary`; every CTA in every block uses one of them.
Map each Figma variant to the role it **plays**, never its color name
(`.btn-primary`, not `.btn-yellow`); ask when a variant's role isn't obvious
from where it appears. A variant the contract lacks gets a new role-named
class in the same file.

- Every value is the one Figma draws: padding, border, radius, type, and each
  state (hover, focus, pressed, disabled). A missing state is inferred from
  another family (cite the node); invented only with no source, and listed
  under **Built without Figma**.
- Padding-only sizing is the default (`css-standards` › **Interactive element
  sizing**); a Figma frame with a fixed height may set `min-height` — say so
  in the batch.
- The hover **motion** stays in `hover.css` (Appearance › Customize ›
  Motion); this file owns colors per state.
- Keep the icon slot classes (`btn-icon-*`): the editor's `ActionEditor`
  prints them.

## Other components

One file per component, `resources/css/components/<name>.css`, a unique root
class named after it (`.badge`, `.pagination`), tokens only, BEM only when it
has many nested states. A "component" that is really a section
or a designed card is a block, built with `create-block`.

## Interactive states: check coherence, don't copy labels

Figma interaction labels are often reversed. A face that contains a link or a
button must be the revealed state; a hover that hides what the user was
reading is wrong; a hover-only state must also work on `:focus-within`. When
label and interaction disagree, build the coherent version and add the
mismatch to **Questions for design**.

## Wiring

`button.css` and `card.css` are already in `app.css`/`editor.css` (wizard
Step 8). A new component file is imported below them in `app.css`, and in
`editor.css` when it appears in editor content. Show the diff and wait.

## Verify

1. `node scripts/check-css-foundation.mjs` exits 0.
2. A specimen per variant and state on the Styleguide page's `#buttons`, one per
   component in `#components`, each at its Figma width; compare with the
   node's `get_screenshot` and exercise hover, focus and disabled by hand.
3. `npm run build` (the dev runs it) — not verification on its own.

## Handoff

Components created (component → file → source node), the `app.css` edits,
the CHANGELOG line. The design system is done; blocks come next, with `create-block`.

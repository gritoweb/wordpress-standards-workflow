# Phase 1: foundation CSS

Fills the theme's style guide foundation from the Figma file: tokens, type,
the container and unclassed tags. It covers the typography, color, spacing and forms
boards (`SKILL.md` › **Design system boards**). The files, their layout and the
token names are **`css-foundation-wizard`'s** — this phase writes the same
files with Figma's values instead of asking for a style guide. Read
`derivation-rules.md` alongside: its **Figma first** rule governs every value.

## The contract

The single source of the required names is `css-foundation-wizard` ›
**The token contract** (colors, state colors, shape, container, fonts,
headings with mobile steps, text) and its contract classes. `scripts/check-css-foundation.mjs` enforces it. A project changes
**values only**; a Figma color or ramp the contract has no slot for is added
under its own name (`--color-sand`, `--color-grey-500`), never by renaming or
repurposing a contract token. Semantic tokens may point at a ramp step
(`--color-primary: var(--color-brand-500)`).

## Steps

1. Build the **token mapping table**: every contract token gets a row — Figma
   name → token, value, source (`variable`, `frame`, `derived`, `inferred`) —
   so a missing one shows as a gap instead of a silent placeholder. Every value
   is the one Figma draws: never a convention, never an adjusted color. Apply `derivation-rules.md` only where Figma has no source, and
   list it in the map under **Built without Figma**.
2. Draft, in the wizard's shapes (its Steps 2–7 code blocks):
   `global/variables.css`, `global/typography.css`, `global/layout.css`,
   `global/base.css`, `global/container.css`, and the wiring (wizard Step 8:
   `app.css`, `editor.css`, `theme.json`, `editor/canvas.css`).
   `components/button.css` and `card.css` are phase 2.
3. Decide font loading (see **Fonts**) — usually the one question the file
   can't answer.
4. **One confirmation batch**: the token mapping table, the files, the
   `app.css`/`editor.css` diffs, the font choice. `AskUserQuestion` for closed
   choices (font source, any `inferred` value) and a yes to write.
5. Write. Append `## Token mapping` to the map.
6. Verify (see **Verify**). Propose the CHANGELOG line and version bump.

## Fonts

Figma names the family, not where it comes from. Ask once, per family:

| Source | What to write |
| --- | --- |
| Google Fonts | The `@import url(...)` line first in `app.css` and `editor.css` (wizard Step 8), only the weights the type styles use |
| Adobe Fonts | Ask for the kit ID; `@import url("https://use.typekit.net/KIT_ID.css");` the same way |
| Self-hosted | Files in `resources/fonts/`; `@font-face` at the top of `typography.css` with `url("@fonts/FILE.woff2")`, one rule per weight/style, `font-display: swap` |
| Don't know | Tier 3: list families and weights under **Questions for design**; write `--font-*` with a system fallback |

A font the site doesn't load uses the site's font (standing exception).

## Forms

Only when the file draws form elements: write `components/forms.css` (native
fields, label, error state) from the forms board, reading tokens only
(`--color-border`, `--color-danger`, …), and import it in `app.css` and
`editor.css` below `card.css`. A value no token carries is added as a token
first. No form plugin CSS unless the site uses that plugin and someone asks.

## Verify

1. `node scripts/check-css-foundation.mjs` exits 0.
2. Ask the dev to run `npm run build` and paste any error (a Tailwind error on
   an unknown utility means a token name doesn't match).
3. Open the private **Styleguide** page (`project-init` created it) and
   compare `#typography`, `#color`, `#spacing` and `#forms` with the boards
   (`get_screenshot` on each node), measuring, not glancing.
4. The block editor picks up the fonts and tokens (`editor.css`).

## Handoff

Files created or edited (table), the font choice, the token mapping appended
to the map, gaps still `pending`, and the CHANGELOG entry (`Added`, minor
bump). Then propose phase 2.

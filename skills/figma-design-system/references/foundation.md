# Phase 1: foundation CSS

Fills the theme's style guide foundation from the Figma file: tokens, type,
the container, unclassed tags, `contrast-pairs.json` and
`styleguide-colors.json`. It covers the typography, color, spacing and forms
boards (`SKILL.md` › **Design system boards**). The files, their layout and the
token names are **`css-foundation-wizard`'s** — this phase writes the same
files with Figma's values instead of asking for a style guide. Read
`derivation-rules.md` alongside: its **Figma first** rule governs every value.

## The contract

The single source of the required names is `css-foundation-wizard` ›
**The token contract** (colors, link/focus/placeholder, the `-on-dark` twins,
shape, container, fonts, headings with mobile steps, text) and its contract
classes. `scripts/check-css-foundation.mjs` enforces it. A project changes
**values only**; a Figma color or ramp the contract has no slot for is added
under its own name (`--color-sand`, `--color-grey-500`), never by renaming or
repurposing a contract token. Semantic tokens may point at a ramp step
(`--color-primary: var(--color-brand-500)`).

## Steps

1. Build the **token mapping table**: every contract token gets a row — Figma
   name → token, value, source (`variable`, `frame`, `derived`, `inferred`) —
   so a missing one shows as a gap instead of a silent placeholder. Every value
   is the one Figma draws: never a convention, never a color adjusted to pass
   contrast. Apply `derivation-rules.md` only where Figma has no source, and
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

## Forms and Gravity Forms

`components/forms.css`, `selection.css` and `forms-gravity.css` ship with the
kit and read only contract tokens, so the forms board is filled through the
tokens (border, placeholder, focus, danger), not by editing those files. Gravity
Forms' own CSS is already off in `app/site.php` when the plugin is active.
A value the forms board draws that no token carries is added as a token and
used from a project file under `components/`, never by editing the kit files.

## Verify

1. `node scripts/check-css-foundation.mjs` exits 0.
2. `resources/css/contrast-pairs.json`: the wizard's base pairs plus every
   heading color on its background and every state color on its surface.
   `node scripts/contrast.mjs`: a pair under AA is never fixed by changing the
   color — Figma drew it — so it gets `"asDrawn": true` and a row in the map's
   **Contrast failures (built as drawn)** with both ratios. The gate warns on a
   flagged failure, fails an unflagged one, and fails a flagged pair that now
   passes. A pair that fails only because this phase **invented** one of its
   colors is fixed by re-inventing that color.
3. `resources/css/styleguide-colors.json`, so the style guide's `#color`
   section groups swatches the way the Figma Color board does:
   `{ "groups": [ { "name": "Brand Primary", "swatches": [ { "token": "--color-primary", "name": "Primary 300 (base)", "figma": "Brand/Primary/Primary 300 (base)" } ] } ] }`.
   The hex comes from `variables.css` at render time; unlisted tokens still
   render under "Other".
4. Ask the dev to run `npm run build` and paste any error (a Tailwind error on
   an unknown utility means a token name doesn't match).
5. Open the published style guide page (`template-styleguide.blade.php`) and
   compare `#typography`, `#color`, `#spacing` and `#forms` with the boards
   (`get_screenshot` on each node), measuring, not glancing.
6. The block editor picks up the fonts and tokens (`editor.css`).

## Handoff

Files created or edited (table), the font choice, the token mapping appended
to the map, gaps still `pending`, and the CHANGELOG entry (`Added`, minor
bump). Then propose phase 2.

# Derivation rules (gap tier 1)

## Figma first

Every value comes from Figma: line heights, colors, sizes, borders, and states. Never swap in a convention or a "better" value: not a 1.5 body line height, not a 2px border so nothing shifts, not one height for every Small button, not a darker color for contrast. If Figma draws it, build it as drawn.

When Figma lacks a state, infer it from Figma's other families and name the node it came from (a missing hover on the on-dark button comes from the hover on the primary button, for example). Mark it `inferred`.

Invent a value only when Figma has no source for it at all, and list it in the map under **Built without Figma**.

A color that fails WCAG AA ships as drawn. Flag the pair with `"asDrawn": true` in `contrast-pairs.json` and list it in the map under **Contrast failures (built as drawn)**. Never adjust the color to pass.

Two standing exceptions:

- A font the site doesn't load uses the site's font, and the map says so.
- A loading button uses the kit's centered spinner, whatever Figma draws.

The rules below apply only to a value Figma has no source for. Each rule says when it applies, what it produces, and how to record it. Mark every derived value `derived` in the map's token mapping. The user can override any of them in the phase's confirmation batch.

## Contents

- Figma first
- Units and conversion
- Type scale
- Line height, letter spacing, weight
- Spacing and container
- Breakpoints
- Color states
- Focus ring
- Radius, shadows, transitions
- What is not derivable

## Units and conversion

- Figma gives px. Write rem: `rem = px / 16`. Keep three decimals at most (`1.125rem`), or a clean fraction.
- Letter spacing in Figma is px or %; write em: `em = px / font-size-px`, or `% / 100`.
- Line height in Figma is px, %, or "auto"; write a unitless ratio: `px / font-size-px`, or `% / 100`. "Auto" is Figma's own value: write `normal`, not a ratio you choose.

## Type scale

Applies only when a heading level or text size is missing from the style guide. A step the file draws keeps its drawn size, even if it breaks the ratio.

1. Anchor on what exists: body size (default `1rem` if missing) and the largest heading given.
2. Fill missing steps with a modular ratio of **1.25** from the body size upward (`1rem, 1.25rem, 1.563rem, 1.953rem, 2.441rem, 3.052rem`), rounded to a clean rem (`1, 1.25, 1.5, 2, 2.5, 3`). If the given headings imply a different ratio, use that ratio instead.
3. Never let a derived size break the order `h1 > h2 > … > h6 ≥ body`.
4. Small text: `0.875rem`. Caption or eyebrow: `0.75rem`.
5. Mobile sizes when the design has only desktop: headings `h1`-`h3` at 70 % of desktop, rounded to a clean rem; `h4`-`h6` and body unchanged. Write them as the base value with the desktop value under the `md` breakpoint.

Record: `--text-h5: 1.25rem /* derived: modular 1.25 */`.

## Line height, letter spacing, weight

Applies only to a style Figma gives no value for at all. A style with a line height, letter spacing, or weight keeps it as drawn, whatever it is.

- Line height missing (no value on the style or on any sibling style of the same kind): headings `1.1`, body `1.5`, small text `1.4`, buttons and labels `1`. Figma's "auto" is not missing: write `normal`.
- Letter spacing missing: `0` for body, `-0.01em` for headings 2rem and larger, `0.05em` for uppercase labels.
- Weight missing: headings `700`, body `400`, labels `600`. If the family's available weights don't include the derived one, use the closest weight the family has.

## Spacing and container

- Spacing scale: keep Tailwind's default (`--spacing: 0.25rem`). Don't invent a custom scale unless the style guide shows one; then add named tokens (`--spacing-section: 6rem`).
- Side gutter: if page artboards show consistent side padding, use it; otherwise `1.5rem` mobile, `6rem` desktop (the kit's own placeholder values, see **Required tokens** in `foundation.md`). Tokens: `--padding-global` (mobile/base) and `--padding-global-lg` (the `lg` breakpoint up): the kit's `helpers.css` container already reads these two names, so change their values, don't add a differently-named token.
- Container max-width: the content width of the desktop artboard (artboard width minus both gutters), rounded to a clean rem. If the desktop artboard is 1440 with 128 gutters, the content is 1184 → `74rem`. Token: `--container-max`, the kit's own name, required (see `foundation.md`).

## Breakpoints

- Keep Tailwind's defaults (`sm 40rem, md 48rem, lg 64rem, xl 80rem, 2xl 96rem`) unless the artboard widths in the map don't fit them.
- Map artboard widths: ≤ 480 → mobile (base styles), 744-1024 → `md`, ≥ 1280 → `lg` or `xl`. Write mobile first.
- If the design's desktop width sits between defaults (for example 1440), don't add a breakpoint for it; the container max-width handles it.
- Record any breakpoint you add in `@theme` as `--breakpoint-*` in rem.

## Color states

Applies when a component has no hover, active, focus, or disabled variant in the file.

1. **Infer from Figma first.** Find the same state on another family (the primary button's hover for a missing on-dark hover, the input's focus for a missing textarea focus) and carry over what changes: the color pair, the border, the underline. Cite the node in the map. Mark it `inferred`.
2. **Invent only with no source at all.** No family in the file draws the state. Then shift the base color 10 % toward black on light backgrounds, toward white on dark (`color-mix(in oklch, var(--color-primary), black 10%)`) for hover, 15 % the same direction for active, and `opacity: 0.5; cursor: not-allowed;` for disabled. Write the shift as a token such as `--color-primary-hover` in `:root` (not `@theme`, it doesn't need a utility) so the component file stays hex-free. List it in the map under **Built without Figma**.

Never move a border width, a size, or a padding to keep a state from shifting the layout. Figma's numbers stay. A state that changes the size in Figma changes it in the build.

Text on a drawn or inferred color that falls under 4.5:1 ships as drawn: `"asDrawn": true` in `contrast-pairs.json` and a row in the map's **Contrast failures (built as drawn)** table. Text on an invented color that falls under 4.5:1 is an invention error: pick the other direction of the shift, and list it under **Built without Figma**.

Record: `--color-primary-hover: color-mix(...) /* built without Figma: 10% darker */`.

## Focus ring

If Figma draws a focus ring, build it as drawn (color, width, offset, and whether it is an outline or a shadow). If only one family draws one, infer the rest from it and cite the node.

With no ring anywhere in the file, write one, list it under **Built without Figma**, and use `outline: 2px solid var(--color-focus); outline-offset: 2px;` on `:focus-visible`. Default `--color-focus: var(--color-ink)`. Use the brand accent instead only when the file's own accent value already checks ≥ 3:1 against both `--color-paper` and `--color-primary` (the button-on-primary case).

## Radius, shadows, transitions

- Radius missing (Figma draws none anywhere): `0` if every component in the file is square; otherwise the smallest radius seen on a button. The kit's own tokens are named by role, not size: `--radius-button`, `--radius-card`, `--radius-media`, `--radius-pill`; set the ones the file has evidence for; don't add a `--radius-sm/md/lg` scale instead. `--radius-card` is required (see `foundation.md`) even when nothing in the file uses rounded corners yet.
- Shadows missing: none, except `--shadow-300` (required, see `foundation.md`); a plausible default if the file gives no evidence is a soft `0 1px 3px rgb(0 0 0 / 0.1)`. Don't add further elevation the design doesn't have.
- Transitions: `150ms ease` for color and background, `300ms ease` for transforms and opacity. Token `--transition-fast`, `--transition-base` in `:root`.

## What is not derivable

These are tier 3 (ask design, don't derive): a missing font family or a weight the family lacks (until design answers, the site's font stands in, see **Figma first**), the brand palette itself, whether a color is primary or secondary when the file is ambiguous, the mobile layout of a component that changes shape, error and success colors when none exist, the 404 design.

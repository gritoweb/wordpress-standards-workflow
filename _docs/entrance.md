# Entrance animations

Every block has an **Entrance animation** panel in the inspector. A block's
parts (heading, body, buttons, each repeated item) fade, slide, or both when
they enter the viewport. Each block ships a preset that works without
editing. Editors can tune it per block, and Site Settings holds the
site-wide defaults.

Hover effects for buttons and body links are global and live in Site
Settings too; see "Hover" below.

## Data flow

Motion values reach a part from four places, in order of precedence:

1. The block's own saved attribute values, printed on the section root.
2. The block's preset, the `default` of the `entrance` attribute in its
   `block.json`.
3. Site Settings, printed on `:root` in the page head.
4. The fallbacks in `resources/css/components/entrance.css`.

The `block.json` default is the only copy of a block's preset.
`BlockEntrance::fromBlock()` reads it for the front end, and the editor
reads the same default through `entranceCanvas.js`'s `resolveEntrance()`. No
second copy exists in `block.php` or `block.jsx`.

A saved `null` for distance, duration, delay, or stagger means "use the site
default". WordPress keeps a saved `entrance` object whole, so a key the
object lacks fills from the block's preset, not from Site Settings.

## The `entrance` attribute

`BlockManager::globalAttributes()` adds one object attribute, `entrance`, to
every block. The **global default** (what a block gets when it declares no
`entrance` default of its own) is:

```json
{
  "type": "fade-slide",
  "direction": "up",
  "distance": null,
  "unit": "px",
  "duration": null,
  "delay": null,
  "stagger": null,
  "trigger": "section"
}
```

Every number is `null` on purpose: a block that doesn't set its own preset
must fall through to Site Settings > Motion, not to a hard-coded number that
silently overrides it. `BlockManager.test.mjs` asserts this shape directly,
so a future edit that reintroduces a literal number there fails a test
immediately.

| Key | Values |
| --- | --- |
| `type` | `none`, `fade`, `slide`, `fade-slide` |
| `direction` | `up`, `down`, `left`, `right` |
| `distance` | 0 to 2000, or `null` for the site default |
| `unit` | `px` or `vw` |
| `duration` | 0 to 3000 ms, or `null` |
| `delay` | 0 to 3000 ms, or `null` |
| `stagger` | 0 to 1000 ms, or `null` |
| `trigger` | `section` or `item` |

`BlockEntrance::sanitize()` whitelists and clamps every value. A bad type
falls back to `fade-slide`, a bad direction to `up`, a bad unit to `px`, and
a bad trigger to `section`. Opening a block in the editor never writes the
attribute.

### Direction

`direction` is the direction of travel. `up` starts the part below its
final position and moves it up. The panel labels say where the part enters
from instead:

| Value | Panel label |
| --- | --- |
| `up` | From below |
| `down` | From above |
| `left` | From the right |
| `right` | From the left |

A block whose items travel in from the side (for example a staggered panel
list) would set its preset direction to `left` or `right`, so the items
start off that edge and travel across.

## Triggers

The **Trigger** control sets when parts enter.

- **All together, staggered** (`section`): the section enters once, when it
  reaches the viewport, and its parts follow one after another. The
  **Stagger** value sets the gap between parts.
- **Each item as it scrolls in** (`item`): every part waits for its own
  entry. **Stagger** is hidden and doesn't apply. The saved value stays, so
  switching back to `section` restores it.

A block whose items are taller than a screen, or stack far down the page
(a card grid with pagination, a location panel), should default to the item
trigger. Every other block defaults to the section trigger.

Each part enters once and never replays, except through the editor's
Preview action (see "Inspector panel").

## Markup a block renders

The Blade view prints attributes through two directives. Both call
`BlockEntrance`, so nothing raw reaches the markup.

`@entrance($entrance)` goes on the section root:

```html
<section data-entrance="fade-slide" data-entrance-dir="right"
  data-entrance-trigger="item"
  style="--e-distance: 48px; --e-duration: 600ms; --e-stagger: 150ms">
```

The directive prints `data-entrance-trigger` only for `item`. It prints only
the custom properties the block overrides. It prints nothing when `type` is
`none`, so the block renders as if it had no entrance. A caller with its own
inline style passes it as a second argument (`@entrance($entrance,
$extraStyle)`) instead of splicing the directive's output by hand; the
directive merges the two into one `style` attribute.

`@entrancePart($index)` goes on each part:

```html
<h2 data-entrance-part>…</h2>
<p data-entrance-part style="--e-i: 1">…</p>
```

Use one running index across all parts in the block's fixed order, not one
index per list. Both directives print their own `style` attribute, so never
add a second `style` to the same element.

Put the directives on parts, never on a section or a container. A transform
on a size container, a bleed wrapper, or a clipping panel breaks its
children: never transform an element that also establishes layout for its
own children.

### Custom properties

| Property | Set on | Meaning |
| --- | --- | --- |
| `--e-duration` | `:root`, section | Transition length. |
| `--e-delay` | `:root`, section | Delay before the first part. |
| `--e-stagger` | `:root`, section | Gap between parts in the section trigger. |
| `--e-distance` | `:root`, section | Travel distance, with its unit. |
| `--e-ease` | `:root` | Transform curve. |
| `--e-i` | part | The part's position in the stagger. |
| `--e-from-opacity`, `--e-from-x`, `--e-from-y` | section | Start state, derived from `type` and `direction`. |
| `--hover-duration` | `:root` | Hover transition length. |

### State attributes

The module sets these. Don't set them in markup.

| Attribute | Set on | Meaning |
| --- | --- | --- |
| `data-entered` | section, or a part with the item trigger | The element has entered. |
| `data-entrance-done` | part | The part's transition ended, so its own transitions (a button's hover) apply again. |
| `data-entrance-ready` | `<html>` | The module ran. The head script watches for it. |

## Where site defaults come from

Site Settings has a **Motion** tab with an entrance section and a hover
section. The field group is `group___PREFIX___site_settings.json`
(`__PREFIX__` is the project's own prefix from `kit.config.json`).

| Field | Default | Choices |
| --- | --- | --- |
| `motion_duration` | 1000 ms | 0 to 3000 |
| `motion_delay` | 250 ms | 0 to 3000 |
| `motion_stagger` | 250 ms | 0 to 1000 |
| `motion_distance` | 32 | 0 to 2000 |
| `motion_distance_unit` | `px` | `px`, `vw` |
| `motion_ease` | `ease-out` | `ease-out`, `ease-in-out`, `ease` |
| `hover_button` | `fade` | `lift`, `fade`, `none` |
| `hover_link` | `underline` | `underline`, `fade`, `none` |
| `hover_duration` | 250 ms | 0 to 1000, clamp matches the field max |

There is no site-level "motion off" switch. Reduced motion is driven
entirely by the visitor's OS-level `prefers-reduced-motion` setting (see
Reduced motion above) — Site Settings only tunes the values used when
motion is on. To test the reduced-motion path, change your OS's
reduce-motion setting or emulate `prefers-reduced-motion: reduce` in your
browser's devtools; there's nothing to flip in Site Settings.

The four entrance min/max pairs above must match `BlockEntrance::LIMITS` and
`entranceCanvas.js`'s `LIMITS` exactly:
`app/Blocks/entrance-limits-parity.test.mjs` asserts all three agree, and
skips the SCF half of that assertion with a message until the Site Settings
group exists in a given branch.

The site setup code reads these fields (through whatever `SiteSettings`
accessor the project's Site Settings phase ships) and prints them in two
places:

- **Front end:** a `<style id="__PREFIX__-motion-defaults">` block in
  `wp_head` with the selector `html:root`. Its specificity beats the
  `:root` fallbacks in `entrance.css` whatever the print order.
- **Editor:** the same values as a JS object,
  `window.__PREFIX__EntranceDefaults`, printed via `wp_add_inline_script()`
  on the editor script handle. `EntranceControl.jsx` reads this global as
  its `siteDefaults` fallback, so a change in Site Settings shows up in
  every block's placeholder without that block passing `siteDefaults`
  itself. A block only passes an explicit `siteDefaults` prop when it
  intentionally wants to show something other than the site value (rare).

`--e-ease` prints `cubic-bezier(0.22, 0.61, 0.36, 1)` for `ease-out`, written
literally in `SiteSettings` and `entrance.css`: Tailwind v4 defines its own
`--ease-out`, which shadowed a `var(--ease-out)` reference.

Save the SCF JSON on every environment other than local before the fields
appear: see `docs/site-settings.md`.

## How the CSS behaves

`resources/css/components/entrance.css` is plain CSS, imported by `app.css`
and `editor.css`.

- **Hidden state:** parts hide only under `html.entrance`. Without
  JavaScript, the class never appears and everything is visible.
- **Section trigger:** parts stay hidden until the section carries
  `data-entered`.
- **Item trigger:** each part stays hidden until it carries its own
  `data-entered`.
- **Timing:** opacity transitions on a linear curve. The transform keeps the
  shared ease-out. With both on ease-out, the fade finishes early in a long
  travel and the entrance reads as a pure slide.
- **Delay:** `--e-delay` plus `--e-i` times `--e-stagger`. With the item
  trigger, the module sets `--e-i` to 0 on entry, so an item waits only for
  the block's delay.
- **Reduced motion:** no transform, and a 150 ms fade.
- **Print:** every part is opaque, untransformed, and untransitioned.
- **Layout:** only `transform` and `opacity` change, so nothing shifts.

Off-page distances such as `100vw` rely on the layout root clipping
horizontal overflow, so a slide from the left never widens the page.

## Module

`resources/js/modules/entrance.js` exports `initEntrance()`; call it first
in the theme's front-end entry script.

- One `IntersectionObserver` watches the sections that use the section
  trigger, with a `-10%` bottom margin. It sets `data-entered` and stops
  watching.
- Item parts enter from their layout position. A part the hidden state
  moves off screen never intersects the viewport, so the module compares
  each part's `offsetTop` chain against the fold instead of observing it.
  When every part has entered, the module marks the section entered, so a
  part added later is never hidden.
- A sweep, run after each observer callback and on throttled scroll, enters
  a section or part the viewport jumped past in one frame.
- Parts appended later (for example by a collection block's "load more")
  land in an entered section and show in their end state; the paging
  script's own reveal keyframe still runs.
- At the first `transitionend`, a part gets `data-entrance-done`. If no
  transition fires, the part is released on its own timing.

### Fail-safes

Every failure leaves the page readable:

- **No JavaScript:** the head script never runs, so parts stay visible.
- **Bundle never reports ready:** the head snippet adds `entrance` to
  `<html>`'s class list and removes it after five seconds if `<html>` lacks
  `data-entrance-ready`.
- **Missing `IntersectionObserver`, or any exception:** the module removes
  `entrance`, which shows everything.
- **Print:** the print rule overrides the hidden state.

## Inspector panel

`resources/blocks/components/backend/EntranceControl.jsx` renders a
collapsed **Entrance animation** panel. Each `block.jsx` mounts it once. It
accepts `singlePart` (hides Stagger) and an optional `siteDefaults` override
(see "Where site defaults come from").

The panel shows only the controls that apply to the current selection:

| Control | None | Fade | Slide, Fade and slide |
| --- | --- | --- | --- |
| Type | Shown | Shown | Shown |
| Trigger | Hidden | Shown | Shown |
| Direction, Distance, Unit | Hidden | Hidden | Shown |
| Duration, Delay | Hidden | Shown | Shown |
| Stagger | Hidden | Shown | Shown |
| Preview | Hidden | Shown | Shown |

Stagger is hidden for every type when the trigger is `item` or the block
has a single part. Hidden controls never write, and their saved values
stay.

A number field writes `null` when you empty it. It clamps typed values to
the server limits and shows the site default as its placeholder. Changing a
control writes the whole `entrance` object with one key changed.

**Preview** replays the block once on the canvas. The canvas root carries
the same data attributes and inline properties as the front end, plus
`data-entered`, so blocks are visible at rest. The replay hides that one
block, then re-enters it. Nothing animates while you scroll the editor.

## Hover

Hover is global. It has no per-block settings.

- **Button hover:** `lift` fades the color and raises the button with a
  shadow token. `fade` transitions color only. `none` removes the
  transition. Lift doesn't apply to disabled, `aria-disabled`, or busy
  buttons.
- **Link hover:** `underline` draws a faint rule at rest and wipes a full
  rule in from the start of the link while the color fades. `fade` and
  `none` never touch buttons.
- **Scope:** the underline applies to body copy only, never to header or
  footer navigation or a third-party embed's own markup.
- **Duration:** `--hover-duration`, 250 ms by default.
- **Reduced motion:** no rise and no wipe. The color still fades.

The effect is a body class, not a custom property, because CSS can't branch
on a property's value. The site setup code adds `hover-btn-lift`,
`hover-btn-fade`, or `hover-btn-none`, and `hover-link-underline`,
`hover-link-fade`, or `hover-link-none`. Only the duration is a custom
property.

## Block presets

Read the preset for a block from its own `block.json`. Parts animate in a
fixed order: text before media, repeated items one after another.

## Add an entrance to a new block

1. Add an `entrance` attribute default to the block's `block.json` only if
   it needs a preset different from the global default (see "The `entrance`
   attribute"). Set `trigger` to `item` if the block repeats tall items.
2. In `block.php`, call `BlockEntrance::fromBlock($attributes, __DIR__)` and
   pass the result to the view.
3. In the view, add `@entrance($entrance)` to the section root and
   `@entrancePart($index)` to each part, in animation order.
4. In `block.jsx`, mount `EntranceControl`.
5. Write tests that assert the attributes on the owning elements (via
   `render-harness.mjs`'s `renderBlock()` + `openingTag()`), and that
   opening the block writes nothing (via `editor-test-bundle.mjs` +
   `wpEditorStubs()`).

## Verify

At 390, 1440, and full width:

1. On a hard reload, no content flashes before it hides. With JavaScript
   off, content is visible.
2. Each block plays once on entry and never replays on scroll back.
3. A part travelling `100vw` enters from off page with no horizontal
   scrollbar.
4. Any slider/carousel still transitions between slides independently of
   the entrance.
5. A collection block's "load more" appends items with its own reveal and
   no second hidden state.
6. With reduced motion emulated, parts don't move and fade briefly.
7. Every page opens clean in the editor. Preview replays the block.
   Changing a value writes only that key.
8. Navigation links show no underline wipe. Body links do.

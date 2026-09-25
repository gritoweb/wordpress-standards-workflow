# create-block — Attribute type inference, the keyword table, the special expansion rules (button pair, images, repeaters) and when to ask

Part of the `create-block` skill (`../SKILL.md`); read it only when the task needs it.

### Attribute type inference (description → type + control)

When the dev describes attributes naturally ("hero with a heading, subtitle,
background image and CTA button"), map each described field using the table
below. Output feeds Phase 2 directly.

**Rich text vs plain text rule.** `RichText` is for **long copy** —
paragraphs, descriptions, quotes, anything where bold/italic/links matter
inline. **Headings, labels, simple short text** (subtitles, eyebrows, item
titles) use `AutoGrowingTextarea` — no inline formatting to inject, clean
placeholder, no accidental newlines.

**Canvas fields look like the page.** Every text field sits on the canvas
with the **same style guide classes as its Blade element** (`heading-2` on
both); `AutoGrowingTextarea` already carries the field reset (full width,
transparent, no outline) — never a form wrapper, a
white card, or a border around the field. That's how `docs/examples/`
builds every block.

#### Keyword lookup table

| Dev's wording contains | Inferred type | Generated attribute(s) | Editor control |
|---|---|---|---|
| `title`, `heading`, `headline`, `name`, `label` | string | `<name>` | `<AutoGrowingTextarea heading className="heading-N" />` on the canvas — same `heading-N` as the Blade `<hN>` |
| `subtitle`, `subheading`, `tagline`, `eyebrow` | string | `<name>` | `<AutoGrowingTextarea className="font-eyebrow text-primary" />` (eyebrow) or `… text-lead text-muted` (subtitle) — same classes as the page |
| `description`, `body`, `content`, `paragraph`, `quote`, `excerpt`, `long text`, `copy` | string (multi-line / formatted) | `<name>` | `<RichText tagName="div" className="text-body text-muted" />` on the canvas — same classes as the page |
| `image`, `photo`, `picture`, `thumbnail`, `cover` (foreground/inline) | image (ID-first) | `<name>Id` (number) | On the **canvas**: `<AttachmentImageControl imageId={...} onSelect={(media) => setAttributes({ <name>Id: media.id })} onRemove={() => setAttributes({ <name>Id: 0 })} />` — URL resolved at render via `useAttachmentUrls`. X button on hover to remove. |
| `bg`/`background image`/`cover image` (fills the block behind other content) | image (ID-first) | `<name>Id` (number) | In the **sidebar**, inside a `PanelBody title="Background Media"`: `<AttachmentImageControl imageId={...} onSelect={...} onRemove={...} noStylesheet />` + `<ImagePositionControl />` right under it for the focal point. The canvas keeps only the **passive** full-bleed preview (`backgroundImage`/`<img>` with `focalCss(<name>Position)`) — no click target there. |
| `icon` | string (Dashicon slug or arbitrary name) | `<name>` | `<TextControl>` (or `<IconPicker>` if the project ships one) |
| `link`, `url`, `cta link`, `href` | link (Gutenberg `LinkControl` object: `{url, opensInNewTab}`) | `<name>` | `<LinkPicker label="..." value={...} onChange={...} />` — inside `ActionEditor` for a button, never in the sidebar |
| `button`, `cta` (alone, no "link") | button **PAIR** | `<name>Text` (string) + `<name>Link` (object) | Styled `<span>` preview on canvas reflecting the button label. **Click opens `<ActionEditor>` inline**, directly below the button — always on canvas, never in the sidebar, never a floating `Popover`. `stacked={false}` (two-column layout) for a full-width/single CTA; `stacked={true}` (single vertical column) when the trigger sits inside a narrow per-item container (grid card, list item) — see the "Buttons / CTAs" rule below. **`ActionEditor` and `LinkPicker` never go inside `<InspectorControls>`.** |
| `color`, `bg color`, `text color` | string (hex / palette slug) | `<name>` | `<ColorPalette>` or `<PanelColorSettings>` |
| `size`, `width`, `height`, `count`, `amount`, plain `number` | number (unsigned) | `<name>` | `<TextControl type="number">` or `<RangeControl>` |
| `show X`, `enable X`, `visible`, `active`, `toggle`, "is X" boolean | boolean | `<name>` | `<ToggleControl>` |
| `list of X`, `X list`, `items`, `slides`, `cards`, `testimonials`, `features`, `points`, `steps`, `accordion items`, `tabs`, carousel | array | `<name>` (`items` is the conventional default for the array attr) | **`<ItemList>` in the sidebar** (reorder, delete, add) + the items rendered on the canvas in array order, each sub-field edited inline (recurse: infer sub-field types from the same table). See **Repeaters** below — no other pattern exists. |
| `video` + url/embed | string (URL) | `<name>Url` | `<TextControl type="url">` |
| `alignment`, `align`, `text alignment` | string enum | `<name>` (default `"left"`) | `<AlignmentToolbar>` or `<SelectControl>` |
| `layout`, `variant`, `style` + descriptor (e.g. "compact/full") | string enum | `<name>` | `<SelectControl options={...}>` (config — put in `InspectorControls`) |

#### Special expansion rules (apply BEFORE the keyword lookup)

1. **Image (ID-first)**: any image-like mention generates a **single
   attribute** — `<name>Id` (number). The URL is resolved at render time
   via the `useAttachmentUrls` hook (calls `@wordpress/data`'s `getMedia`)
   — no stale URL stored in the block. Render via `<AttachmentImageControl>`
   (X button on hover to remove, Spinner while loading, "unavailable" state when
   attachment is deleted). **Foreground/inline image → canvas.**
   **Background/cover image → sidebar** (`<AttachmentImageControl
   noStylesheet />` inside `PanelBody title="Background Media"`), and if
   the wording mentions "background" or "bg", also add a second attribute
   `<name>Position` (string, default `"center"`) and render
   `<ImagePositionControl />` in that same sidebar panel, right under the
   image control.

   **Always show a suggested dimension hint** next to the field label (e.g.
   `Background Image — recommended 1920×1080px`), so the editor knows what
   to upload before the image looks stretched/pixelated on the front end.
   Pick the suggested size from context — don't ask unless genuinely
   ambiguous:

   | Image role (from wording / block context) | Suggested dimensions |
   |---|---|
   | hero / background / cover (full-width section bg) | 1920×1080px |
   | card / thumbnail / feature image | 800×600px |
   | avatar / author / testimonial photo | 200×200px |
   | logo / partner / brand mark | 300×150px |
   | icon (raster, not Dashicon) | 64×64px |
   | gallery / carousel slide | 1200×800px |
   | unclear | 1200×800px (safe general default) |

2. **Button pair**: "button" / "CTA" alone (without "link") generates **two
   attributes** — `<name>Text` (string) + `<name>Link` (Gutenberg
   `LinkControl` object: `{url, opensInNewTab}`). **Default `link.url` to
   `""`, never `"#"`** — a bare `#` isn't empty to `LinkControl`, it's a
   real (bad) URL it tries to preview; with no fetchable title it falls
   back to showing the raw `#` in both the title and info slots of its
   preview, reading as a duplicated/broken value the moment an editor opens
   it. An empty string renders `LinkControl`'s normal "search for a link"
   empty state instead — this is true anywhere `LinkControl`/`LinkPicker`
   appears, not just in `ActionEditor`. **Always canvas, never the
   sidebar, never a floating `Popover`** — clicking the styled `<span>`
   preview opens `<ActionEditor>` **inline**, directly below the button, in
   both cases. The only thing that changes with context is the `stacked`
   prop:
   - **Full-width / single CTA** (hero, banner, one button per block):
     `<ActionEditor stacked={false}>` (two-column layout — label field
     beside the link picker), inside exactly
     `<div className="w-full max-w-xl text-left">`. The block already
     has the width and naturally grows to contain it. **The wrapper around
     `ActionEditor` (either mode) is layout only — never give it `bg-*`,
     `p-*`, `rounded-*`, `shadow-*`, `border` or a top margin:**
     `ActionEditor` draws its own panel, so a styled wrapper puts a card
     inside a card.
   - **CTA inside a repeater item** (a grid card, a list item):
     `<ActionEditor stacked={true}>` — the SAME component, just a single
     vertical column (label, then the link picker, then the checkbox, each
     full width). A ~280px grid
     column has no room for `stacked={false}`'s two-column layout, but
     easily fits one stacked field at a time — no separate mechanism
     needed, just the prop `ActionEditor` was already built with.
   - **The link field is the one exception:** inside `ActionEditor`, the
     destination is a button showing the URL that opens core's
     `LinkControl` in a small `Popover`. Keep it — `LinkControl` rendered
     inline on the canvas is broken by the theme CSS (squashed icon row,
     stray ↗), while its `Popover` renders outside the canvas and looks like
     core everywhere else. Only the CTA editor as a whole must not float.
   - **Why not `Popover`, twice**: floating a `Popover` around
     `ActionEditor` for consistency, then again only for the narrow-item
     case, both got reverted the same day. A `Popover` doesn't participate
     in layout, so it never grows its own block/card to fit; on a shorter
     block it spilled into whatever rendered next, and inside a grid it
     spilled into the row below — its collision handling only avoids the
     *viewport* edge, never a sibling element a few inches away. There is
     no `position`/`placement` value that fixes that, because the problem
     isn't positioning, it's that a floating overlay is the wrong tool
     here at all.
   - **Why not the sidebar either**: moving the repeater-item's link
     **destination** into a sidebar panel tied to an "active" item (mirror
     of `<ItemList>`'s pattern) does avoid every overlap — sidebar and
     canvas never touch — but it was never what was asked for, and it
     reads as inconsistent with every other button in the theme, which
     opens inline on the canvas right where you clicked. `stacked={true}`
     gets the same "fits a narrow column" property without leaving the
     canvas.

3. **Array recursion**: when the dev says "list of X with title, image, and description", recurse the inference for each sub-field (`title` → string, `image` → pair, `description` → string). The final shape is one array attribute whose items are objects with typed sub-fields. Sanitize per-sub-field in `block.php`'s `array_map(...)`.

#### Ambiguity → ask (batched with Phase 1's gap-filling round — don't drip-feed)

- "image link" — linked image (pair + link) or URL of an image (string)?
- "X" with no matching keyword.
- An attribute named like a verb ("highlight") — likely boolean, but confirm.

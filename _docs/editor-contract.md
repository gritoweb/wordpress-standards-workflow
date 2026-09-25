# The editor contract

The rules every block's `block.jsx` follows, so the editor canvas shows what
the page shows and an editor edits real content in place. Apply this
contract to every block `create-block` scaffolds and every existing block a
change touches.

`node scripts/conformance.mjs --rules` lists the numbered rules (`CANVAS-1`, `TEXT-1`,
and so on) and the checkable rules `theme/scripts/conformance.test.mjs`
enforces. This document explains why the canvas works the way it does. When
the two disagree, the conformance rules win.

## Goal

The editor canvas shows what the page shows. An editor edits real content in
place, and only choices that exist for editors live in the inspector.

## Plan every block against these questions

Before writing a block's editor, answer these (for a scaffolded block,
`create-block`'s Phase 1 answers most of them from the dev's description):

1. What is the editor creating, and which values belong together?
2. What should the block look like with real saved content, before it is
   selected?
3. What becomes editable when selected, and where do structural controls
   live?
4. What do empty, loading, missing-media, and partially configured states
   show?
5. What happens when items are added, selected, reordered, or removed?
6. Which controls affect the front end, and how does the editor reflect
   that effect?
7. Which saved variants and uses elsewhere must remain compatible?
8. What specific observation proves the block works?

These answers belong in the first implementation, not polish deferred until
review.

## Canvas

- The canvas root is `EditorSection` (`CANVAS-1`, `CANVAS-2`): a `<section>`
  with the block props and the entrance props merged into one style, the
  `<slug>-editor` class, the ground, the divider, the inner container, and
  the shared **dashed outline**. The outline marks the block's edge without
  taking layout space, so it stays. It is not the "dashed preview box" this
  contract removes: that was a gray instruction panel around a "Preview"
  heading.
- Render the block's real composition, matching its Blade view in
  `resources/views/blocks/`. Same headings, same order, same button
  treatment, and the same conditions for which parts show.
- No labelled form scaffolding on the canvas: no `HEADING`, `BODY`,
  `BUTTON TEXT`, `BUTTON LINK` captions wrapping inputs, and no
  `... Preview` heading.
- Text fields become inline editable regions carrying the front end's own
  type classes, so the canvas reads as the page. A plain-string heading,
  eyebrow, subtitle, or label is an auto-growing `<textarea>`
  (`InlineHeading` and `InlineField`, on `AutoGrowingTextarea`), not an
  `<input>`, which clips a long heading, and not `RichText`, which invites
  markup into a plain string (`TEXT-1`). Every heading field pairs its
  front-end class with a tier from `EDITOR_TYPE`, so no canvas heading is
  larger than `statement` (`CANVAS-4`).
- An optional field shows when it has a value or the block is selected. The
  main heading also shows when the block has no other content, so an empty
  block always has a writing target (`CANVAS-6`).

### Buttons and links are the main trap

The theme's own button and link classes live in `@layer components`.
WordPress core's `wp-components` styles are not in any layer, and an
unlayered rule beats a layered one regardless of specificity: a
`@wordpress/components` `Button` therefore cannot be restyled into the
theme's treatment. This is why `InspectorControls` in this kit's shared
components use inline styles, never Tailwind classes: `editor.css` reaches
the canvas iframe only, never the inspector sidebar.

- A non-interactive styled preview renders as a `<span>` carrying the
  front-end classes, with `role="group"`, an `aria-label`, `pointer-events:
  none`, no `href`, no anchor, and no click handler. `CtaPreview` renders the
  section button this way and owns its three labels (`CTA-3`).
- An interactive trigger that must stay clickable renders as a real
  `<button>` where one fits, or a `<span>` with `role="button"`,
  `tabIndex={0}`, an `onClick`, and an `onKeyDown` handling Enter and Space
  when it can't be a `<button>` for layout reasons. Never a
  `components-button` standing in for the front end's own button.

### Inspector

- The inspector holds **configuration only** (item lists, background media,
  settings, Spacing, Entrance animation). No `ActionEditor`, `LinkPicker`,
  `LinkControl`, `RichText`, text field or `InlineField` goes there
  (conformance `INSP-7`, the kit's hard rule in `create-block`).
- Style inspector contents with inline styles, not Tailwind, for the reason
  above.

### Padding: no editor control

A block's padding is a `block.json` default (or the framework's own global
default), never an editor control (`PAD-1`, `INSP-4`). This is a settled
default for the kit, not an oversight.

### Media

- The complete image frame (`AttachmentImageControl`) is the select-or-
  replace action.
- An optional single image passes `onRemove`, and the frame then offers the
  one removal action. An image inside a repeater item passes none, because
  removing the row is the removal (`MEDIA-5`).
- Keep previews and every media state (empty, loading, unavailable) outside
  `MediaUploadCheck`. Only opening the Media Library is capability gated.

### Data

- Never write attributes on mount, on selection, or on opening a panel.
  Writes happen only when an editor changes a value. Every block's
  `block.test.mjs` asserts this.

## Shared editing contract

- Use the actual theme fonts, colors, button treatments, image placement,
  and content order. Scale the composition for comfortable editing. Do not
  shrink the whole block with a CSS transform or make small text
  unreadable.
- Give text priority. A compact media column for an ordinary split; a
  photo band keeps enough image area to judge placement and contrast. Long
  content grows naturally without a field scrollbar or clipped text.
- Remove repeated block titles, dashed preview boxes, and permanent
  field-label scaffolding from the canvas. Gutenberg supplies the block
  identity. The block's dashed outline (`EditorSection`) stays: it is the
  block's edge, not a preview box.
- Text fields have accessible names. Use quiet focus treatment with
  internal breathing room and a visible keyboard focus indicator.
- Preserve existing data types. Formatted copy stays rich text; plain
  headings stay plain strings. Do not silently strip or normalize existing
  rich text when mounting or changing selection.
- Empty optional fields do not occupy large blank boxes. When the block is
  selected, provide a compact action to add the optional content. Use
  neutral prompts, not sample marketing copy that could be mistaken for
  saved content.
- Keep structural controls in collapsed, plainly named inspector panels.
  Open the relevant panel only when an explicit canvas action needs it.
  Avoid arbitrary typography, color, size, or animation controls beyond
  what the block's own attributes define.
- The section button is edited **on the canvas**: its `CtaPreview` never
  navigates, and `ActionEditor` opens right under it while the block is
  selected. Label and link remain one editorial unit. The preview reads
  "Complete button" when only one is present and "Add button" when empty and
  selected, matching the front end's rendering condition (`CTA-3`). A per-item
  link is an `<ActionEditor stacked>` under its item, on the canvas.
- Opening, selecting, switching preview state, and loading attachments must
  never write attributes. Preserve legacy URL fallbacks without creating
  new URL-based image content. New image selections store attachment IDs
  and clear only the corresponding obsolete URL field.
- Filled media has one obvious replacement action and one removal action.
  Replacement opens the Media Library with the current attachment
  selected. Removal clears the block's reference, never the library
  attachment. Loading and unavailable attachments remain visibly distinct
  from an empty field.
- A repeater's `ItemList` lives in the inspector, in a panel named for the
  items, and never in the canvas body. It holds order, membership, and
  per-item settings that aren't content. The item's own content is edited
  in place on the canvas, where the item renders (`REP-2`, `REP-3`).
- Reordering preserves the selected item by identity, including its text,
  links, images, and any legacy properties. Provide keyboard move controls
  as well as pointer controls. After a move the active row is the moved
  item, after an add it is the new item, and removing the selected item
  selects the nearest survivor. `useRepeater()` owns this (`REP-4`,
  `REP-5`).
- Editor states such as which item is selected, or a card's front/detail
  face, remain local UI state and are never serialized into page content.

## Collection blocks: don't fabricate what the editor can't see

A block backed by a `WP_Query` over a post type (the content-type pattern)
often can't reproduce the front end's exact result in the editor: `_embed`
and `getEntityRecords()` return what's in the REST response, which may
lack fields an SCF group hides from REST (`show_in_rest: 0`), the exact
sort key the front end uses, or a manual/featured flag. Don't invent a
believable-looking first row from partial data: it reads as a promise the
editor can't keep.

- Use an honest description of the query instead of a fake card preview
  when the editor can't verify enough of the record to render it
  faithfully: what's queried, and a real count or membership signal where
  the editor can compute one.
- Don't use a total published-record count as a filtered result count when
  the filter itself isn't visible to the editor. A limit is a configured
  maximum, not a result count.
- Distinguish loading, a successful empty result, an unavailable selected
  record, and a request failure. Preserve selections during every state.
- Keep this logic local to the block that owns the query; it's not a
  shared component concern.

## Verify by rendering

Each block's tests (`block.test.mjs`, see `create-block`'s Phase 2, Step 4)
cover the list below, and `theme/scripts/conformance.test.mjs` checks the
same rules across every block:

- The canvas renders the real composition with no labelled form
  scaffolding.
- Any styled button/link preview is not a `components-button`, renders no
  anchor unless it is one, and carries the front-end classes.
- An interactive trigger still activates by click and by keyboard (Enter
  and Space) when it isn't a native `<button>`.
- Mounting and selecting the block writes no attributes.
- Media renders the states this contract requires, and the frame opens the
  Media Library.

Assert on rendered output (via `renderToStaticMarkup` or the captures
`wpEditorStubs()` provides) or on the props a real render invokes a control
with, never on source text.

# Phase 4: blocks (page sections)

Turns the page designs into a plan: every distinct page section becomes a Gutenberg block, with a name, a pattern, a source node, a real preview image, and an attribute list. Blocks are design, not design system: each one is built per site from the comp, on the pattern that fits it. This phase **plans and hands off**. The project's `create-block` skill scaffolds each block; this phase gives it everything it needs so it asks nothing.

The output is a `## Block inventory` in `_docs/figma-map.md` plus one handoff per block. Nothing under `resources/blocks/` is written by this phase.

## Contents

- Inputs
- Walk the page designs
- Ask what backs the content
- What counts as a block
- Deduplicate across pages
- Name the block and pick the category
- Pick the pattern
- Derive the attributes
- Export the preview image
- The handoff contract
- Block inventory in the map
- Order and batching
- What a block reuses
- Verify
- What rendering catches that the plan can't
- Common mistakes
- Handoff

## Inputs

From `_docs/figma-map.md`: the **Pages** table, the **Artboards** sections, the **Canonical nodes**, and the components built in phase 2. Pages marked `pending` in the map haven't been walked yet: this phase walks them, and it's usually the largest read batch in the project. From the theme: `<theme>/kit.config.json` for `blockCategory` and `grounds`, and `_docs/editor-contract.md` for what the block framework already provides (padding defaults, grounds, entrance, image position, the shared editor components); read it once at the start of this phase rather than re-deriving framework behavior from the block framework's source.

Give the read estimate first (which pages, how many calls) and wait for the go-ahead. A typical inventory is one `get_metadata` per pending page, a handful of `get_screenshot` calls on sections whose names don't say what they are, and one `download_assets` per block. Reading a section with `get_design_context` happens when you plan that block's attributes, not during the walk.

## Walk the page designs

1. Run `get_metadata` on each page node. The artboard tree gives you each page frame and its top-level children: the sections, in order, with names and node IDs. That tree is the inventory's raw material.
2. Skip hidden frames and earlier versions. A page usually carries one visible frame and two or three archived copies; the map already marks them.
3. Screenshot what the tree can't settle. A section named `Frame 427` or `Group 12` tells you nothing, and a name that reads like a component often isn't one. Screenshot the section node, not the whole page: a 1440 × 9944 page rendered at `maxDimension: 1024` is 148px wide and unreadable.
4. Don't call `get_design_context` on a page frame. It returns the whole page and burns the context you need for the plan.

Record each page's sections in the map as you go, so a session that stops halfway doesn't have to re-walk.

## Ask what backs the content

Before classifying anything, ask the dev what supplies the content on these pages. The design cannot show it, and getting it wrong invalidates both the classification and the attribute lists:

- **Custom post types.** Which sections draw from one, and what fields does it hold? A grid backed by a post type gets query and display attributes, never a repeater of hand-entered items.
- **Third-party plugins.** A feed, a map, a slider, a form plugin. A section a plugin renders is usually not a block at all, though the page around it still needs its blocks.
- **Forms.** Which form plugin, and does a section embed a specific form by ID?
- **Templates.** Which pages are archives or single templates rather than editor-composed pages.

One real run: the design showed a news grid, a people grid, a clients grid, and a contact section. The architecture behind them was a paid LinkedIn feed plugin, a Team post type, a Clients post type, and a Gravity Form, four different answers that no screenshot could have supplied, and each one changed the block.

Registering post types is **not** this phase and not this skill. Record each as a dependency in the inventory, listing the fields the block expects, and flag it in the handoff.

## What counts as a block

Classify every section before naming anything:

| The section is | Treat it as | Why |
| --- | --- | --- |
| A page section an editor places, reorders, or repeats | A block | This phase |
| A whole page layout, or a listing driven by a query | A template | Phase 5 and the theme's templates |
| A small piece reused inside sections (an alert, a badge, pagination) | A component | Phase 2 (reuse it, don't rebuild it). A card isn't one: it belongs to its block |
| The header, footer, or mobile menu | The shell | Phase 3, already built from `_docs/patterns/header.md` and `footer.md` |
| A paragraph or heading an editor writes | Core blocks | Don't scaffold a block for it |

Two calls need a rule:

- **A listing of posts, people, or clients.** If the editor picks the items by hand, it's a block with an array attribute. If WordPress supplies them from a query, it's a block with query attributes (post type, count, category) or an archive template. Decide from the design: a "Latest news" strip of three is usually a query; a curated "Featured people" row is usually a repeater. When the design doesn't say, ask.
- **A section that appears once, on one page, with nothing variable in it.** Ask before making it a block. A one-off is sometimes a block anyway, because the client wants to move it later, and sometimes it's page content.

Figma names lie. Screenshot before classifying, the same as phase 3 did for the header candidates.

## Deduplicate across pages

The same section appears on several pages with different copy. That's one block, not five.

- Group by visual identity, not by page. Record every instance's node ID: those instances are the evidence for the attribute list.
- A real structural difference between instances (image left versus image right, two columns versus three) is a **layout attribute on one block**, not a second block. Two blocks that differ only in color are one block with a color attribute.
- A difference big enough that no shared markup survives is a second block. Say which instances forced the split.

Write the instance list into the inventory. It's the only thing that justifies each attribute later.

## Name the block and pick the category

- **Title** comes from the section's role, in sentence case: `Hero`, `Card grid`, `Testimonials`. Use the Figma board name only when it describes the section; a code name like `Section 04` doesn't.
- **Slug** is the title lowercased and hyphenated. Before proposing it, check that `resources/blocks/<slug>/` doesn't exist and the slug isn't already in `BlockManager::$blocks`.
- **Category** is already a project-wide decision by this phase: `<theme>/kit.config.json`'s `blockCategory` (`slug`/`title`), set once during project setup, since every `block.json` carries it as a literal and renaming it later means editing every block. Read it from the config rather than asking the dev to invent one here; if it's still the placeholder (or the config doesn't exist yet), stop and say the project needs `blockCategory` set before phase 4 scaffolds anything. `create-block` reads the same value at its infrastructure check `0.11` in `app/Blocks/BlockCategories.php`.

Record the category in the inventory header so later sessions don't ask again.

## Pick the pattern

`_docs/patterns/README.md` lists the patterns a block can start from: section intro, CTA band, background-photo band, media and text split, carousel, opening statement, collection grid, logo row, location with map, and form embed. Three more (card row with two faces, staggered panel list, embedded feed) were seen once, on White Summers, so treat them as starting points.

For each inventory row, read the pattern's **When it applies** and pick the one that fits. Record its name in the inventory and in the handoff, so `create-block` reads the right page. Two rules:

- If no pattern fits, write `none` and say what is new about the section. `create-block` then composes from the section intro's parts. A new shape that two sections share is a candidate for the harvest checklist (`_docs/kit-harvest.md`).
- A pattern is a structure to build from, not a block to copy. The comp still decides the measures, the ratios, and the copy.

## Derive the attributes

The rule: **what varies across the instances is an attribute; what never varies is markup.** Compare the instances you grouped during dedupe and let the differences drive the list. An attribute nobody will ever change is a control in the way.

Map what you see in the design to `create-block`'s own vocabulary, so its Phase 1 inference has nothing left to guess:

| In the design | Attribute in the handoff |
| --- | --- |
| Section heading, eyebrow, label, button text | `string`, plain input |
| Paragraph, quote, long copy | `string`, RichText |
| Photo, illustration, background | Image pair: `<name>Id` + `<name>Url`; a background adds `<name>Position` |
| A link with no visible button | Link object (`{url, opensInNewTab}`) |
| A call-to-action button | Button pair: `<name>Text` + `<name>Link` |
| Three cards, four logos, a slider | Array attribute (`items`), with the sub-fields typed by the same table |
| Two instances that differ in arrangement | `string` enum, `SelectControl`, in the Inspector |
| A part present on one page and absent on another | `boolean` toggle |
| A distinct background/color combination the section sits on | `ground` enum, from `kit.config.json`'s `grounds` array (`SKILL.md` › Grounds) |

Three things you don't put in the list (they come from the block framework, documented in `_docs/editor-contract.md`, not invented per block):

- **Padding.** The kit sets per-block padding defaults rather than an editor control (no `PaddingControls` in the kit). Read the comp's vertical padding and hand it over as the block's default in the handoff, so the block matches Figma the moment it's inserted; that default, not a control, is what makes it match.
- **Ground.** If the section sits on one of the file's named grounds, note which one; `create-block` wires the `ground` attribute and its class from `kit.config.json` automatically once the ground is confirmed (phase 0/2). Don't hand-roll a `background`/`bgColor` attribute for something a ground already covers.
- **The anchor.** `create-block` wires `supports.anchor` on every block.

Give each image a recommended dimension from the comp's frame, rounded to `create-block`'s table (hero or background 1920 × 1080, card 800 × 600, avatar 200 × 200, logo 300 × 150, slide 1200 × 800). The editor sees that hint next to the field.

## Export the preview image

`create-block` generates a placeholder `preview.svg` carrying the block title. Replace it with the design, so the inserter shows the section an editor is about to place.

1. **Export a real page instance, not the component set.** The inventory's source node is often a `COMPONENT SET`, and exporting that renders every variant stacked in one image. A hero exported from its set came back 324 × 700 with three heroes in it, a valid file, a useless preview. Pick an instance from the block's **Appears on** list, at the comp's full width.
2. Run `download_assets` on that instance with `defaultFormat: "png"`. The response's `export` entry is the render of the whole node.
3. Save it to `_docs/figma/blocks/<slug>.png`. The block folder doesn't exist yet, so the export is staged with the other Figma reference images.
4. **Open the file and look at it.** Confirm it shows one section, at a readable size, at roughly the comp's aspect ratio. A call that succeeds proves a file was written, not that the image is the section. This check costs one read and catches an unusable preview before it ships.
5. For a tall section, or an export over about 300 KB, use `get_screenshot` with `maxDimension: 1200` instead and download the PNG from the URL it returns. The inserter panel is small; a 9,000px render helps nobody.
6. After `create-block` scaffolds the block, copy the PNG to `resources/blocks/<slug>/preview.png`, change `block.jsx`'s `import previewImage from './preview.svg'` to `'./preview.png'`, and delete the placeholder. The `isPreview` attribute and the `example` field stay exactly as generated.
7. **Reserve the preview's box in CSS, not from the image.** The inserter measures the preview panel before the image file decodes. Sizing the image with `width: 100%; height: auto` alone makes the first, uncached hover render a clipped, mis-scaled sliver, and adding `width`/`height` attributes is not enough on its own. Wrap the image in a `div` carrying an explicit `aspect-ratio` matching the export, plus `overflow: hidden` and the corner radius, then let the image fill it with `width: 100%; height: 100%; object-fit: cover`. Keep the `width`/`height` attributes on the image as well.

Verify the preview on a **cold first hover in a fresh tab**: a second hover reads from cache and hides the defect. On a cold hover the panel legitimately renders in three steps: the info card, the reserved box, then the image. Only clipping or a mis-proportioned box is a defect; the intermediate empty box is not.

Keep the export under about 300 KB. A hero exported at 1200px wide runs roughly 500 KB while the inserter panel is only about 280px, so 800px is ample.

Never hand-draw a preview, and never ship the placeholder as if it were the design.

## The handoff contract

One block, one handoff. Write it into the inventory and hand the same text to `create-block`:

```
Block:      Hero
Slug:       hero
Pattern:    Carousel (_docs/patterns/carousel.md)
Category:   From kit.config.json's blockCategory (e.g. "Acme Blocks" / acme-2026)
Source:     https://www.figma.com/design/<file-key>/?node-id=<id>
Preview:    _docs/figma/blocks/hero.png → resources/blocks/hero/preview.png
Appears on: Home, About, Team, Services, Contact
Attributes:
  - heading          string       plain input
  - intro            string       RichText
  - bgImageId/Url    image pair   recommended 1920×1080px, plus bgImagePosition
  - ctaText/Link     button pair
  - ground           enum         from kit.config.json's grounds array (see SKILL.md › Grounds); default matches the comp's background
Reuses:     .btn-primary (phase 2), the container utility, phase-1 tokens
Padding:    112 desktop / 56 mobile, from the comp, the block's own default; the kit has no editor padding control (see _docs/editor-contract.md)
Notes:      Heading is the h1 treatment already in typography.css. The
            background sits behind a 40% ink scrim; that's markup, not an attribute.
```

Every field earns its place: `create-block` asks for a title, infers attributes from free text, picks the pattern and the category, and generates a placeholder preview. The handoff answers all four before it asks. The pattern names come from `_docs/patterns/README.md`. For the framework attributes every block gets for free (padding, ground, entrance, the anchor), read `_docs/editor-contract.md` rather than describing `BlockManager`'s internals here: this phase's job is the plan and the handoff, not the framework.

## Block inventory in the map

Add a `## Block inventory` section to `_docs/figma-map.md`, below the artboards. Lead with the category decision, then the table, then the handoffs.

```markdown
## Block inventory

Category: from `<theme>/kit.config.json`'s `blockCategory` (title / slug), set in `app/Blocks/BlockCategories.php` by `create-block`'s bootstrap step.

| Block | Slug | Pattern | Source node | Preview | Appears on | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Hero | `hero` | Carousel | `1000:2001` | `_docs/figma/blocks/hero.png` | Home, About, Team | planned |
```

Status runs `planned` → `scaffolded` → `verified`. A block is `verified` only after it has rendered on the front end and been compared with its node, not when the build passes.

Sections you decided are **not** blocks belong in the inventory too, as a short "Not blocks" list with the reason. Otherwise the next session re-litigates every one of them.

## Order and batching

- Propose the whole inventory in one batch. Nothing gets scaffolded before it's approved.
- Hero first: it appears on the most pages and it settles the section rhythm the rest inherit.
- Then order by how many pages a block appears on. A section used once comes last.
- Scaffold **one block at a time**: hand it to `create-block`, render it, verify it, then the next. A queue of unverified blocks hides the same defect five times.

## What a block reuses

Blocks are the last phase to write CSS, and everything they need already exists.

- No new hex, font size, or breakpoint. Values come from `variables.css` through `var(--...)` or through the Tailwind utilities the `@theme` tokens generate.
- A button in a section is the phase-2 `.btn` family. Don't restyle it inside a block. A card is part of its block (or of a collection's card partial, `post-grid-card`), built from the comp in phase 4, not a phase-2 component.
- If a section shows something that looks like a reusable component the map doesn't list, stop and say so. It may belong in phase 2, used by several blocks, rather than buried in one.
- Follow `create-block`'s Tailwind-first rule: one-off layout is utilities in the Blade view; `block.css` exists only for reusable or semantic CSS, and it's plain CSS with no `@apply`.
- Sections that align to the page grid use the `container` utility. Full-bleed sections use the padding tokens, not a hardcoded value.

## Verify

Phase 4 produces a plan, so it has two verifications at two different times.

**Inventory coverage**, before any handoff:

1. Put each page's screenshot beside the inventory and walk it from top to bottom. Every section maps to exactly one inventory row, a phase-2 component, the shell, or a line in the "Not blocks" list. A section that maps to nothing is a hole in the plan.
2. Every preview PNG exists and opens, and shows the section rather than a placeholder.
3. Every source node URL resolves.

**The built block**, after `create-block` runs:

1. Ask the dev to run `npm run build`. **That is not verification.**
2. Open the block editor on a draft page. The block appears in the inserter under the project's category, its preview panel shows the Figma render on a **cold first hover in a fresh tab**, and every control edits its attribute.
3. Save and view the front end at the comp width, at a phone width, and at a width well above the container's cap (2560 at minimum, 3840 if the audience has 4K screens). Then run the measured comparison below.
4. Empty it out. Remove the image, clear the heading, delete every repeater item but one. The block must degrade, not collapse or throw.
5. Check the editor preview against the front end. They diverge when the Blade view and `block.jsx` drift apart.
6. Check for horizontal overflow at both widths (`scrollWidth` against `clientWidth`), and check the page logged out as well as logged in.
7. Report what you saw at each step. If a step didn't run, the block is unverified.

### Compare by measuring, not by looking

A holistic glance passes a block that is roughly the right shape. One real run reported the front end "compared against the node" and called it verified; the client looked at it and said it was half there. The block had a 50/50 column split against the comp's 37/63, an image 153px short, the wrong corner radius, and an inset edge where the comp bled off the page, every one of them invisible to an impressionistic check.

Render at the comp width with **the same content as the comp** (comparing different copy and a different photo hides real differences), put the node screenshot beside it, and walk this list. Report every row as `match`, or `differs` and by exactly how much:

| Group | What to measure |
| --- | --- |
| Type | Family, size, weight, line height, letter spacing, and case, for every text element including counters and button labels |
| Color | Every foreground, background, and border, as computed values against the Figma values |
| Spacing | The gap between each pair of adjacent elements, the section padding, and the gutter between columns |
| Layout | Column widths and their ratio, vertical alignment, image panel width, aspect ratio, and how the photo crops inside it |
| Chrome | Position, format, size, shape, and color of anything overlaying the content: counters, arrows, badges |
| Presence | Anything in the comp missing from the render, and anything in the render the comp doesn't have |

Fix everything on the list, then run it again. The block is verified when the list is clean, not when it looks close.

Two things that make the numbers trustworthy: get exact values with `get_design_context` on the node rather than eyeballing a screenshot, and check the arithmetic adds up: a comp whose gutter, columns, and gaps sum to the frame width tells you whether an edge bleeds or insets.

**Name the node every number came from, and say what kind of number it is.** A measurement is only as good as the node it was taken from. The media in these comps is usually a frame containing an image fill, so radius, padding, and gap can sit on an inner node, a mask, or the fill rather than on the frame you read: a frame reporting `cornerRadius: 0` above a rounded child looks exactly like "square" in metadata. Prefer a **declared** property (an auto-layout gap, a `cornerRadius` on the node that draws the shape) over a distance **computed** from bounding boxes, and label which kind each number is. One block produced three wrong values this way in a single pass: rows recorded as bleeding that sit at symmetric gutters, a gap that was a computed distance rather than a designed one, and a media frame recorded as having no radius.

**A comp value can be an artboard artifact rather than a design intention.** The clearest case is a corner radius on an edge that bleeds to the viewport: Figma rounds it because the comp frame ends at 1440 and the bleeding edge is the frame's own edge, but in a browser that edge runs to the window and a rounded corner there is wrong. The rule: **a corner on a bleeding edge is never rounded**, and it should be derived from the block's bleed state, not hardcoded per instance, so toggling the bleed in the editor gives the right corners automatically. Watch for the same class elsewhere: a shadow clipped by the artboard, a background that stops at 1440, a gutter that is really the frame margin.

**When a measurement contradicts what the design plainly looks like, the measurement is the suspect.** Re-check the node before you build to the number. Someone glancing at the file and saying "all of these are rounded" outranks a `cornerRadius: 0` read off the wrong frame.

**Measure the split ratio at several widths, not just the comp's.** A comp is one width, so a layout can match it exactly and still be wrong everywhere else. The failure mode is a fixed-pixel column beside a `flex-1` sibling: every pixel of viewport above the container cap goes to the sibling. One hero measured 63% media at 1440 and 74% at 2560, correct where it was checked, visibly broken on a 4K screen, and the drift was sitting in the verification table unread because nobody compared the rows to each other.

The rule for any full-bleed section: **above the container width the internal split stays proportional; only the bleed absorbs the extra viewport.** Size the text column as a share of the container rather than a fixed pixel width, give the media its comp share plus whatever gutter it bleeds into, and report the ratio at each width so drift is visible as a trend rather than a single number.

**Fill every repeater to the comp's item count.** A logo wall verified with three logos hid what happened at the comp's ten. Test content is part of the test: if the comp shows ten items, four cards, or two columns of navigation, the verification content has that many.

**Sweep the width range; the checkpoints are spot checks.** Measuring at 1440, 1920, 2560, 3840 and 390 tests the breakpoints, not the ranges between them. A fixed or minimum width holds until a breakpoint fires, so an element passes at every checkpoint and is broken at every width in between. One quote panel passed all five and was broken continuously from 1025 to 1345. Step the viewport across the range, report the **threshold width** at which something first breaks and the width it recovers, and treat the named widths as spot checks.

**Document overflow is not containment.** In that same case `scrollWidth` against `clientWidth` stayed clean at all 161 swept widths while the panel slid 174px under its neighbour. Measure each element against **its own container**, not against the page.

**Every tokenised value a block consumes goes on that block's own comparison list.** Once a value is normalised into a token by a decision made elsewhere, it stops appearing on any individual block's list, and a pass can be thorough about everything on its list while missing what a cross-block decision quietly removed from it. `--spacing-split-gap: 64` was derived from one block's thirteen instances; a second block that consumed it declared 20, was never in that sample, and shipped a 69px gap while passing verification against its own node. For each shared token an element uses, measure the element's **own** declared comp value and flag any case where it is not in the sample the token came from.

**Prove the detector before trusting a clean sweep.** A PHP-notice check grepped for WordPress's HTML-formatted warning shape on a stack with `html_errors = 0`, so it found nothing and reported clean while two warnings printed on every page. Fire a deliberate fault first and confirm the check catches it; a detector that has never caught anything is not evidence.

**Say which kind of check a report covers.** A structural pass (heading counts, seam positions, overflow, no PHP notices) is a **floor**, not a fidelity pass. One template passed 112 structural cases and was reported clean while its background colour, type sizes and layout were all wrong against the comp, because only the two pieces someone had asked about were ever measured. Report structural and fidelity results in separate, labelled sections, and never let the first stand in for the second.

**Templates get the same comparison as blocks.** The list above is written for blocks, so a template assembled from fields or ACF data can pass everything it has a checklist for and still be visibly wrong. Walk the same fixed list (type, colour, spacing, layout, chrome, presence) over every element of the rendered template.

**Verify the editor as an authoring surface, not a second render.** "Every instance renders, every control is populated, no block warnings" is a render check. It cannot see a repeater rendered as tabs with no way to reorder, or images clipping out of their container because `editor.css` is a separate cascade nothing measured. For every repeater: add an item, remove one, **reorder**, and confirm each row is identifiable at a glance. Measure editor-side geometry against the front end. Two editor-crashing bugs have shipped here behind a perfect front end.

### Getting a real narrow viewport

`resize_window` can report success without moving the tab's rendering viewport, and a block editor's own device preview renders the editor form rather than front-end markup. Neither is a mobile check. A **same-origin iframe** has its own layout viewport, so `@media` evaluates against it and the measurements are real. Use that, and if every approach fails, say exactly what you tried and what each one did before calling the width unverified.

## What rendering catches that the plan can't

Phase 3 shipped six defects behind a clean build (see `shell.md`). Blocks add their own:

| Defect | Symptom | Cause |
| --- | --- | --- |
| Foundation globals beat the block's utilities | Spacing or color off by a step | Unlayered base styles outrank Tailwind utilities |
| The block renders in the editor but not on the front end | Blank section, no error | The Blade view and `block.jsx` drifted apart |
| The inserter shows the placeholder card | Generic gray preview | `preview.svg` never swapped for the export |
| The block sits in the wrong inserter category | Editor can't find it | `block.json`'s `category` doesn't match the registered slug |
| A repeater with one item collapses | Broken grid | No empty or single-item case in the Blade |
| A background image stretches | Blurred or cropped subject | No dimension hint, so the editor uploaded a small file |

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Scaffolding a block per page instead of per section | Deduplicate across pages first; instances become attributes |
| Two blocks that differ only in color or arrangement | One block, one enum attribute |
| Reading a whole page frame with `get_design_context` | `get_metadata` for the tree, per-section reads when you plan that block |
| Naming a block from a Figma board called `Section 04` | Name it for what it does |
| Handing `create-block` a block with no pattern named | Read `_docs/patterns/README.md`, pick one, or write `none` and say why |
| Treating a pattern as a template to fill in | It's the parts and the rules; the comp decides the rest |
| Deciding the category after the first block ships | Every `block.json` carries the literal slug; decide once, up front |
| Inventing padding attributes | The four global padding attributes exist; supply the comp's values as defaults |
| Making an attribute for something identical in every instance | That's markup |
| Shipping `create-block`'s placeholder preview | Export the node and swap the import |
| Exporting the preview from a component set | You get every variant stacked in one image; export a page instance at comp width |
| Recording a preview path without opening the file | A successful call proves a file exists, not that it shows the section |
| A new hex inside a block | Add or reuse a token in `variables.css` |
| Rebuilding a phase-2 component inside a block | Reuse the class |
| Calling a block done because the build passed | Insert it, render it, empty it, measure it |
| Comparing with the node by looking rather than measuring | Walk the fixed list and report each row as match or differs-by-what |
| Comparing the render and the comp with different content | Put the comp's own copy and image in the block first |
| Reporting a width unverified because one resize call didn't work | Use a same-origin iframe; name every approach you tried |
| Checking only the comp width and a phone width | A fixed column beside `flex-1` breaks only above the container cap; measure at 2560 too |
| Verifying a repeater with two or three placeholder items | Fill it to the comp's count; what breaks at ten is invisible at three |
| Reading radius, gap, or padding off the outer frame | The value often sits on a child, a mask, or the fill; name the node it came from |
| Building to a number that contradicts the visible design | Re-check the node first; the measurement is the suspect |
| Rounding a corner on an edge that bleeds off the page | The comp rounds it because the artboard ends there; derive corners from the bleed state |
| Checking the inserter preview on a second hover | The cache hides the defect; use a cold hover in a fresh tab |
| Handing `create-block` a one-line prompt | Give it the full contract so it asks nothing |

## Handoff

Summarize in one table: block → slug → pattern → source node → preview → status. State the category decision and where it's registered. List what you classified as **not** a block and why. Note every attribute marked `derived` and every question added to **Questions for design**.

Update `_docs/figma-map.md`: the `## Block inventory` section, the walked pages in the **Pages** table with their node IDs, the new artboard subsections, and **Current status / Next step**.

Propose the CHANGELOG entry and the version bump; the dev commits with `commit-rules`. Then propose phase 5 (audit).

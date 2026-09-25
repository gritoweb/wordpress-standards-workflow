# Reading the Figma file

How phase 0 walks a file and how later phases pull nodes. Read before any Figma call.

## Contents

- Parse the link
- Tool order
- Phase 0: walk the file
- Classify pages and artboards
- Find tokens
- Later phases: pull nodes
- Assets and screenshots
- Errors

## Parse the link

A Figma app **Share > Copy link** or browser URL looks like:

```
https://www.figma.com/design/FILE_KEY/File-Name?node-id=12-345&m=dev
https://www.figma.com/design/FILE_KEY/branch/BRANCH_KEY/File-Name
```

- `FILE_KEY` is the segment after `/design/`. For branch URLs, use `BRANCH_KEY` as the file key.
- `node-id=12-345` becomes node ID `12:345`. A link without `node-id` is fine for the inventory; keep any node ID as a hint.
- `/board/` (FigJam), `/slides/`, and `/make/` links don't work for these tools. Ask for the design file's link.

Record the file key and the original link in the map.

## Tool order

| Need | Tool | Notes |
| --- | --- | --- |
| List pages | `get_metadata` with `fileKey` only | Returns page IDs and names |
| List artboards on a page | `get_metadata` with the page ID as `nodeId` | Sparse XML: IDs, names, types, positions, sizes. One call per page. |
| Tokens used by a node | `get_variable_defs` | Works on the style guide frame; returns name → value pairs |
| Full design of a node | `get_design_context` | Reference code, screenshot, tokens. Invoke `figma:figma-design-to-code` first. Large pages time out; call it on artboards, not pages. |
| Picture of a node | `get_screenshot` | Use the URL and `curl` it; don't ask for base64 |
| Logo, icons, images | `download_assets` | Raw images and SVGs from the node subtree |
| Named styles and components in libraries | `search_design_system` | One query per intent |

Never substitute `get_metadata` or `get_screenshot` for `get_design_context` when you need real values; never call `get_design_context` on a whole page.

## Phase 0: walk the file

1. Ask once for the file link if the map doesn't exist. Ask for the style guide page link too, as an optional hint.
2. `get_metadata(fileKey)` → pages. Write the page table. **Don't trust this listing as complete**: see the next section.
3. For each page, `get_metadata(fileKey, pageId)` → artboards. Record every top-level frame, section, and component set: node ID, name, type, width × height. Skip nested children. Build the MCP URL as `https://www.figma.com/design/FILE_KEY/?node-id=ID-WITH-DASH`.
4. Classify each page and artboard (next section). For every `page`-classified artboard, check whether a mobile-width sibling exists (≤ 480px, same name pattern: `Home / Mobile` beside `Home / Desktop`) and record it in the **Mobile board** column. A page with no mobile-width sibling is a tier-3 gap for that page (see `SKILL.md` › **Gap policy**), even if other pages in the file have one.
5. For the style guide candidates (at most three), `get_variable_defs` on the frame. Summarize colors, fonts, text sizes, spacing, radii, effects found. If variables are empty, note it; phase 1 reads the frame with `get_design_context` instead.
6. Fill the map's **Design system boards** table: for each of the six boards (typography, color, spacing, buttons, forms, components), the node that holds it and whether the file has it (`present`), lacks it (`derived`), or needs a question first (`pending`). The rows and their order are fixed, so a file with no forms board still gets a Forms row. Cards, headers, footers, and 404s never count as boards: they're design.
7. Write the readiness report and the questions for design.
8. Show the page table, the classification, the readiness report, and your proposed canonical nodes. Ask the user to confirm or correct the style guide page, the design system boards, and the canonical nodes (buttons, header, footer, 404, home). Save their answers in **Canonical nodes** and **Design system boards**.

Budget: pages + 1 metadata calls, plus up to three `get_variable_defs`. No `get_design_context` in phase 0.

## The page listing is often incomplete

`get_metadata` with no `nodeId` has returned a single page for a ten-page file. Treat its output as a starting set, never as the file's page list.

Check it before writing the page table:

- If the listing returns one page, or fewer pages than the file's tabs suggest, say so and ask the user to paste the **Pages panel** list from the Figma sidebar: the names in order.
- If the user gave a node link, and that node's canvas isn't in the listing, the listing is definitely short. Say which page is missing.
- Compare page names against the artboards you find: an artboard that references a page you never listed is the same signal.

Then ask for one **Share > Copy link** per named page, or ask the user to right-click each page and copy its link. Record every page in the table, with `pending` in the Node ID column for pages you haven't walked. A `pending` page is a known gap, not a missing one.

Note the source in the map, so a later session knows the list came from the user:

```
Figma's no-`nodeId` page listing returned only the System page for this file, so the page list comes from the user's Pages panel.
```

Walking every page is optional. Walk the style guide, the components page, and one page design in phase 0; leave the rest `pending` until a phase needs them.

## Classify pages and artboards

Use names first, then size, then a screenshot only if still unclear.

| Classification | Name hints | Size hints |
| --- | --- | --- |
| `style-guide` | style guide, styleguide, design system, foundations, tokens, colors, colours, typography, type, brand | Tall or wide frames, not page-sized |
| `components` | components, buttons, forms, inputs, cards, UI kit, library; component sets | Small frames, many siblings |
| `shell` | header, nav, navigation, footer, menu | Full-width, short |
| `page` | home, about, services, contact, blog, post, single, archive, landing; a page name | Page-sized: 1280-1920 wide (desktop), 744-1024 (tablet), 360-430 (mobile) |
| `state` | 404, not found, search, no results, error, password | Page-sized |
| `archive` | archive, old, v1, wip, scratch, explorations, cover, thumbnails | Anything |
| `unknown` | n/a | n/a |

Record the widths you saw; the derivation rules use them for breakpoints. If two pages both look like `style-guide`, that's a tier-3 question, not a guess.

## Find tokens

- Variables (`get_variable_defs`) are the best source: names and values are exact. Record the Figma name and the value as given.
- Text styles usually show up as names like `Heading/H1`, `Body/Regular`. Record name, font family, size, line height, weight, letter spacing, and case.
- If there are no variables, the style guide frame itself is the source: phase 1 calls `get_design_context` on it and reads the values from the returned CSS and screenshot. Say in the map that tokens are "read from the frame," not "variables."
- Effects (shadows, blurs) and radii are often only visible on components; note where you saw them.

## Later phases: pull nodes

1. Read `_docs/figma-map.md`. Take node IDs from **Canonical nodes** and the artboard tables.
2. Call `get_design_context` on each node you need, one at a time, after invoking `figma:figma-design-to-code`. Treat the returned React and Tailwind as a reference, not as code to paste.
3. Prefer Code Connect mappings, then design annotations, then variables, then raw values from the returned code, then the screenshot, in that order.
4. If a node ID no longer resolves, tell the user the design may have changed and offer to re-walk that page only.

## Assets and screenshots

- `get_screenshot` returns a URL; download it with `curl -sL URL -o path.png`. For comparison images, keep them under `_docs/figma/` in the project or the scratch directory, not in the theme.
- `download_assets` on the header node gives the logo SVG and raw images; save under `resources/images/` with descriptive names. Don't redraw anything.
- Asset URLs expire; download during the phase that needs them.

## Errors

| Error | Do |
| --- | --- |
| Permission or "can't access" | Run `whoami`, tell the user which account is connected and that the file must be visible to it. Stop. |
| Rate limit | Stop. Say how far you got (the map is already written). Resume later from the map. |
| Timeout on `get_design_context` | Retry on a smaller node (a child artboard), not the same node. |
| Link without `/design/` | Ask for the design file's **Share > Copy link**. |

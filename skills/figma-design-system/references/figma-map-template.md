# `_docs/figma-map.md` template

Write the map at the project root, `_docs/figma-map.md`, in exactly this shape. Later phases parse the headings, so keep them. Replace every `PLACEHOLDER`; delete the guidance comments.

**The shape is fixed.** Every phase and every re-inventory cycle rewrites these sections in place: it never appends a second "as of" copy of a section below the first. History (superseded node IDs, removed pages, past readiness reports) goes in `_docs/figma-map-history.md`, dated, not in this file. See `references/re-inventory.md` for the cycle that moves content there.

````markdown
# Figma map: PROJECT_NAME

Inventory of the Figma file for this theme, written by the `figma-design-system` skill. Later phases read this file instead of re-walking Figma. Re-run the inventory (`references/re-inventory.md`) if the design changes: don't hand-edit node IDs to patch around a replaced file.

- File key: `FILE_KEY`
- File link: FILE_LINK
- Connected Figma account: ACCOUNT_EMAIL
- Walked: YYYY-MM-DD
- Readiness: ready | ready with questions for design | not ready
- Re-inventory log: none | see `_docs/figma-map-history.md#YYYY-MM-DD-file-replaced`

## Pages

| Page | Node ID | Classification | Mobile board | Artboards | MCP URL |
| --- | --- | --- | --- | --- | --- |
| PAGE_NAME | 0:1 | style-guide | n/a | 12 | https://www.figma.com/design/FILE_KEY/?node-id=0-1 |

## Artboards

One subsection per page, same order as the page table.

### PAGE_NAME

| Artboard | Node ID | Type | Size | Classification | Mobile board | MCP URL |
| --- | --- | --- | --- | --- | --- | --- |
| Home / Desktop | 12:345 | FRAME | 1440 × 3200 | page | yes (Home / Mobile, 14:88) | https://www.figma.com/design/FILE_KEY/?node-id=12-345 |
| Contact / Desktop | 15:200 | FRAME | 1440 × 1800 | page | no (tier 3, see Questions for design) | https://www.figma.com/design/FILE_KEY/?node-id=15-200 |

## Canonical nodes

Confirmed by the user at the end of phase 0. Phases 1 to 5 start here.

| Role | Node ID | MCP URL | Confirmed by |
| --- | --- | --- | --- |
| Style guide | 0:1 | … | USER, YYYY-MM-DD |
| Buttons | … | … | … |
| Form elements | … | … | … |
| Header | … | … | … |
| Footer | … | … | … |
| Home | … | … | … |
| 404 | … | … | … |

## Design system boards

The same six rows on every project, in this order (`SKILL.md` › **Design system boards**). Status is `present` (the file has the board), `derived` (the file has none and the phase derives it), or `pending` (blocked on a question for design). Never add, remove, or reorder a row: a board the file lacks stays in the table as `derived`.

| Board | Node ID | Status | Notes |
| --- | --- | --- | --- |
| Typography | 0:1 | present | Families, weights, scale to h6 |
| Color | 0:1 | present | Ramps and semantic colors |
| Spacing | none | derived | Container, gutters, radius, shadow from page artboards |
| Buttons | 5:20 | present | Three roles, sizes, states |
| Forms | none | pending | No form elements in the file: see Questions for design |
| Components | 6:12 | present | Alerts, badges. No cards: cards are design |

## Tokens found

Source: variables | read from the style guide frame

### Colors

| Figma name | Value | Proposed CSS name | Source |
| --- | --- | --- | --- |
| Brand/Primary | #1a73e8 | --color-primary | variable |

### Fonts

| Figma family | Weights seen | Proposed token | Loading |
| --- | --- | --- | --- |
| Poppins | 400, 700 | --font-display | google | adobe | self-hosted | pending |

### Type styles

| Figma style | Size | Line height | Weight | Letter spacing | Case | Proposed token |
| --- | --- | --- | --- | --- | --- | --- |
| Heading/H1 | 56 | 1.05 | 700 | -0.02em | none | --text-h1 |

### Spacing, radius, effects

| Kind | Figma name or where seen | Value | Proposed token |
| --- | --- | --- | --- |
| radius | Button/Primary | 8 | --radius-md |

### Breakpoints seen

| Width | Count | Role |
| --- | --- | --- |
| 1440 | 14 | desktop |
| 390 | 12 | mobile |

## Gaps

| Tier | Area | What's missing | Resolution |
| --- | --- | --- | --- |
| 1 derived | type scale | no h5, h6 | derivation-rules: modular scale |
| 2 inferred | buttons | hover state | read from Home / Desktop 12:345 |
| 3 pending | fonts | Poppins files or license | see Questions for design |

## Questions for design

Paste these to the designer.

1. QUESTION

## Readiness report

| Item | Present | Node |
| --- | --- | --- |
| Style guide | yes | 0:1 |
| Variables or text styles | yes | n/a |
| Component set (buttons at least) | yes | … |
| Form elements | no | n/a |
| Header and footer | yes | … |
| Mobile artboards | some pages (see Artboards) | n/a |
| Page designs | yes | n/a |
| 404 or error state | no | n/a |

"Mobile artboards" here summarizes the per-page **Mobile board** column in **Artboards**; a page missing one is its own tier-3 gap even when this row reads "some pages".

Verdict: VERDICT, one sentence.
````

Sections added by later phases, in this order, at the end of the file:

- `## Token mapping` (phase 1): the final Figma name → CSS token table as written, with `derived` and `inferred` marks. Every required token name (`foundation.md` › **The contract**) has a row.
- `## Built without Figma` (phase 1, extended by every later phase): every value Figma had no source for at all, so the build invented it (`derivation-rules.md` › **Figma first**). One row per value: token or component, the value built, the rule that produced it, and why no Figma node could stand in. A value inferred from another Figma family is not listed here; it is `inferred` in the token mapping with its node.
- `## Components` (phase 2): component → node → CSS file.

# Phase 0b: re-inventory (the design changed)

Runs when `docs/figma-map.md` already exists but no longer matches the Figma file: the designer replaced the file, a canonical node ID stopped resolving, or the user says the design changed. It's step 1 of `SKILL.md` › **When the design system changes mid-project**, which then runs the token diff, the style guide re-check, and the contrast gate. Phase 0 assumes a clean start; this phase assumes the theme already has real CSS, Blade, and blocks built against the old map, and the goal is a diff, not a rewrite from zero.

## Contents

- When this phase runs
- Diff old and new
- Decide what each change means
- Update the map
- What doesn't get re-walked
- Verify
- Handoff

## When this phase runs

- The `File key:` in the map doesn't match the file key parsed from the link the user gives now.
- A node ID recorded in **Canonical nodes** or an **Artboards** table returns "not found" from `get_metadata` or `get_design_context`.
- The user says so directly ("the designer sent a new file", "the Figma link changed", "re-check the design").
- The file key is the same but the designer changed a style (a color, a type step, a button). Skip the page-by-page walk: re-read only the design system boards the designer names (or all six when unsure), update the map's **Design system boards** and **Tokens found** in place, and go on to the token diff.

Don't run it speculatively. A single missing node is often just that node moving inside the same file: check with `get_metadata` on its old parent before assuming the whole file changed.

## Diff old and new

1. Record the old file key from the map before touching anything; it's the only copy once the map is overwritten.
2. Walk the new file the same way phase 0 does (`references/figma-reading.md`): `get_metadata(fileKey)` for pages, then per page for artboards. Don't call `get_design_context` yet.
3. Build a diff table, page by page and artboard by artboard, by name and by rough position/size: Figma assigns new node IDs on import, so **node ID equality never signals a match**; name and shape do:

   | Page/artboard | Old node ID | New node ID | Status |
   | --- | --- | --- | --- |
   | Home / Desktop | 12:345 | 88:120 | renamed ID, same content: re-map |
   | Style guide | 0:1 | 0:1 | unchanged |
   | Contact | 40:12 | n/a | removed |
   | Pricing | n/a | 90:44 | new |

4. For anything flagged "renamed ID, same content," spot-check with one `get_screenshot` before trusting the name match: a redesign sometimes keeps a page's name and replaces everything under it.

## Decide what each change means

| Diff result | What to do |
| --- | --- |
| Same name, same rough size and position, new node ID | Update the node ID in the map; nothing downstream needs a rebuild. |
| Same name, visibly different content (spot-checked) | Treat as a redesign of that page. The CSS, Blade, or block built from the old node needs review: flag it, don't silently re-point the ID. |
| Removed | Mark the row `removed` in the map, don't delete it: move it to `docs/figma-map-history.md` instead (see **Update the map**). Anything built from it (a block, a component) is now unsourced; say so in the handoff, don't delete the code. |
| New | Add a new row. Decide with the user whether it needs its own phase-0-style classification now or can wait until a later phase needs it. |

Only tokens, components, the shell, and blocks whose source node is gone or redesigned are affected. A file-wide replacement doesn't mean every phase reruns: most of the time only a handful of pages actually changed.

## Update the map

The map is fixed-shape (see `SKILL.md` › **The map is the cache**), so this phase edits sections in place rather than appending a new "as of" block:

1. Update the header: new `File key:`, `File link:`, `Walked:` date. Keep `Connected Figma account:` if unchanged.
2. Replace the **Pages** and **Artboards** tables with the current state: new node IDs, new rows for additions, `removed` rows removed from the live table.
3. Move everything superseded (the old file key and link, the removed rows, the readiness report as it stood, any resolved or now-obsolete gap) into `docs/figma-map-history.md`, under a dated heading:

   ```markdown
   ## 2026-09-14: file replaced

   Old file key: `OLD_KEY` (https://www.figma.com/design/OLD_KEY/...)

   ### Removed

   | Page/artboard | Node ID | Reason |
   | --- | --- | --- |
   | Contact | 40:12 | Page dropped from the new file |
   ```

4. **Canonical nodes** keeps only nodes still confirmed against the new file. A node whose target changed needs the user's re-confirmation, same as phase 0: don't silently carry an old confirmation forward onto a different node ID.
5. Add a `## Re-inventory log` line to the live map's top matter (one line, dated, linking to the history file) so a later session sees at a glance that this project has been through it before.

## What doesn't get re-walked

- Pages and artboards the diff shows unchanged. Don't re-read a node just because the file key changed elsewhere.
- Anything already built and verified whose source node is confirmed unchanged: its CSS, Blade, or block stays as is.
- `references/derivation-rules.md` gaps already resolved and not touched by the diff.

## Verify

1. Confirm the diff table accounts for every page in both the old map and the new walk: nothing silently dropped.
2. For every row marked "redesign" or "removed," confirm with the user before touching any built file. This phase never edits CSS, Blade, or a block on its own; it only updates the map and flags what needs another phase's attention.
3. Report the diff table as the phase's output. A re-inventory is done when the map matches the new file and the user has seen exactly what changed, not when the file key is updated.

## Handoff

Summarize: what changed (table), what was moved to history, which later phases (1 through 5) now have stale output because their source node moved or disappeared, which design system boards changed (they need the token diff), and what's new and unclassified. Propose the CHANGELOG line if any shipped CSS or template is now built from an unsourced node. Then propose whichever phase the state check in `SKILL.md` names next.

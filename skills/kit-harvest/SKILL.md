---
name: kit-harvest
description: >
  Learn from a finished project. Run this from the kit repo, never
  from a project, and give it the path to a finished project's theme. Use it
  when the user says "harvest <project>", "what did <project> teach the kit",
  "run the harvest checklist", or "compare this site to the kit". It runs the
  kit's conformance checks over the theme's blocks, sorts the project's
  `docs/kit-log.md`, compares the blocks, header, footer, and shared code
  against `docs/patterns/` and `docs/block-conventions.md`, and writes one
  proposal file in `docs/harvest/`. It changes nothing else until the
  maintainer approves each item, and then it applies only the approved items,
  on a branch, with tests. It never edits the project.
---

# kit-harvest: turn a finished site into proposed kit changes

The kit gets better from each site it builds, but only if someone decides what
carries over. `docs/kit-harvest.md` is the checklist. This skill does the
reading and the comparing, and leaves every decision to the maintainer.

This skill is **kit-only**. `project-init` doesn't install it, because it runs
from the kit repo against a finished project. If you're in a project checkout,
stop and tell the user to run it from the kit.

## Rules

- **The project is read-only.** Never write, build, or commit in the project,
  and never start its local site. Read its files and run the conformance
  script against it, which only links files into a temporary folder.
- **One proposal file, then nothing.** Until the maintainer approves items,
  the only file you create is `docs/harvest/<project>-<date>.md`.
- **Default to waiting.** A structure seen on one site is a note, not a
  promotion. See the promotion rule below.
- **Never push.** Approved changes land on a branch in the kit, and the
  maintainer pushes.
- Write the proposal in English.

## Inputs

1. The path to the project's theme, for example
   `<project>/wp-content/themes/<theme>`.
2. The project's short name for the file name (`griddl`). Ask if it
   isn't obvious.
3. Today's date, as `YYYY-MM-DD`.
4. The build history, all read-only: the project root, the owned plugins and
   mu-plugins (`wp-content/plugins/<ours>`, `wp-content/mu-plugins/`),
   `git log --oneline` since the kit install, the Decisions and Gotchas
   sections of session notes if the project keeps any.

## Step 1: Run the conformance checks

```sh
node skills/create-block/templates/conformance.mjs <theme path>
```

It checks every block in `<theme>/resources/blocks/*` and only reads files. An
older theme may fail rules that didn't exist when it was built: that's a
finding about the kit's history, not a proposal. Group the failures by root
cause, and say which rules follow from which. **A failure with no reason is a
defect in the project, not a proposal.** It only becomes a proposal item when
a code comment or the kit log shows the project broke the rule on purpose.

## Step 2: Sort the kit log

Find the project's `docs/kit-log.md`: in the theme first, then in each parent
folder up to the repository root. If there is none, say so in the proposal.
That is a finding, because the project didn't log.

Read every entry, group the entries by tag, and sort each into one action,
using the table in `docs/kit-harvest.md`. The tags are `kit-bug`, `lesson`,
`framework-gap`, `pattern-candidate`, and `site-specific`. An entry with no
tag is a finding: say so in the proposal, and sort it by what it says.

| Entry | Action |
| --- | --- |
| A kit bug or a wrong instruction | Fix it in the kit. |
| A lesson or gotcha | Add it to the skill it belongs to. |
| A gap in the framework the site worked around | Fix it in the kit. |
| A new block or pattern | Run the promotion rule. |
| Site-specific | Leave it in the site. |

Quote each entry, name the file it touched, and name the kit file that would
change.

## Step 2b: Read the build history

The log only holds what someone remembered to write. Read the inputs from
step 4 of **Inputs** for the rest. Anything there that would have been a kit-log
entry becomes a proposal row, with the tag it should have had.

## Step 3: Compare the project to the kit

Read `docs/patterns/README.md`, the pattern pages, and
`docs/block-conventions.md` first. Then answer five questions.

1. **New recurring structures (candidate patterns).** Map every block, the
   header, the footer, and the 404 to a pattern page. For each one, say which
   pattern it is, and where it adds a part, a variant, or a behavior the page
   doesn't list. A block that maps to no pattern is a candidate pattern. A
   block that fits a pattern marked "seen once" is evidence for that page, and
   the proposal says what the page should change.
2. **Conventions the project broke on purpose (candidate rule changes).** Use
   only failures from step 1 that carry a reason. For each, say whether the
   rule is wrong (change the conventions doc) or the project is wrong (no
   change). Also look for project code that solves a problem a rule already
   covers, but differently and better.
3. **Shared code that looks generic (candidate framework components).** List
   the project's code that isn't a block: PHP under `app/`, scripts under
   `resources/js/`, stylesheets under `resources/css/`, and anything under
   `resources/blocks/components/`. Compare each file with the template it came
   from under `skills/*/templates/`. A file the kit lacks is a candidate. A
   file the project has improved is a kit fix. A file where the kit is ahead
   is not a proposal item.
4. **Instruction drift.** Diff the project's `CLAUDE.md`, `docs/` and
   `.claude/skills/` against the kit copies, using the install map in
   `skills/project-init/SKILL.md`. Exclude `docs/kit-log.md`,
   `docs/tech-debt.md` and `docs/kit-start.md`. Each drift is a **kit fix**
   (the project improved it) or a project defect.
5. **Repeated mistakes a check could catch.** Read the fix commits and the
   review reports. Each mistake that recurs becomes a **rule change** item that
   names the proposed rule ID and how `conformance.mjs` would detect it.

### The promotion rule

An item joins the kit only when **all** of these hold, from
`docs/kit-harvest.md`:

- Two sites have needed it, or it's clearly generic and the kit maintainer
  agrees. Default to waiting for the second site.
- A different design could use it with config alone: no client copy, no
  page-named variants.
- It uses the framework (entrance, padding, Site Settings) and has tests.

For every candidate, write down the answer to each line, and a
recommendation: **Promote**, **Wait for a second site**, or **Leave in the
site**. Say "clearly generic" only when a second design could use it
unchanged, and say plainly that the maintainer decides.

## Step 4: Write the proposal

Create `docs/harvest/<project>-<date>.md`. Use this shape:

```markdown
# Harvest: <project>, <date>

Source: <theme path> at <git commit, if a repository>
Kit: <kit branch> at <kit commit>

## Summary

Three to five lines: how many items, how many recommended, what matters most.

## Conformance

<the script's output, plus the root causes and which failures are defects>

## Kit log

<one row per entry, or "No kit log found.">

## Patterns

<the block-to-pattern table, then the candidates>

## Proposal items

### H1: <short imperative title>

- **Kind:** kit fix | skill lesson | framework component | pattern | rule change
- **Evidence:** <project file and line, kit-log entry, or conformance rule>
- **Kit change:** <the files that would change>
- **Promotion rule:** second site: <yes or no>. Config only: <yes or no>. Uses the framework and testable: <yes or no>.
- **Recommendation:** Promote | Wait for a second site | Leave in the site
- **Decision:** [ ] approve  [ ] reject  [ ] wait
```

Number the items `H1`, `H2`, and so on, so the maintainer can answer with
"approve H1, H3". Order them by recommendation, promotions first. End with the
list of kit-log entries the items would resolve, so the maintainer can clear
them in the project by hand. This skill doesn't.

Commit the proposal alone, as `[DOCS]: add the <project> harvest proposal`. Then stop
and show the maintainer the summary. Do not start any item.

## Step 5: Apply what's approved

Only after the maintainer names the items.

1. Create a branch: `harvest/<project>-<date>`.
2. For each approved item, in order:
   - Write the failing test first, with `node:test`.
   - Make the change in the kit, never in the project.
   - Run `npm test`. It must pass before you commit.
   - Commit with `[TYPE]: subject`, one subject per commit, no co-author.
3. Add a `CHANGELOG.md` entry when the change is release-level (the
   `commit-rules` skill decides).
4. Tick each finished item in the proposal, and commit that with the item.
5. Never push. Tell the maintainer the branch name and what's left.

Rejected and waiting items stay in the proposal as the record. A "wait" item
is the first data point for the second site.

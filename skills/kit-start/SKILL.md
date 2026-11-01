---
name: kit-start
description: >
  Reads a project's state and runs the next build step, in order: install the
  kit, the design system, the header and footer, the blocks, the templates,
  then the launch. Use when the user runs /kit-start, asks "what's next",
  "start the site" or "where are we in the build", or has just installed the
  kit. Hands each step to the skill that owns it and never repeats a finished
  step unless asked.
---

# kit-start: run the next build step

Sequences the kit's skills. Each step belongs to another skill; this one
decides which step is next, starts it, and records it when it's done. It
never repeats a step's instructions.

## State file

Progress lives in the theme's `docs/kit-start.md`. Create it on the first run:

```markdown
# Kit start

One line per finished step. /kit-start reads this file to pick the next step.

- [ ] install
- [ ] design-system
- [ ] header-footer
- [ ] blocks
- [ ] templates
- [ ] launch
```

When a step finishes, change its line to `- [x] <step> YYYY-MM-DD`, plus the
source it used when it has one (`figma` or `wizard`). Read this file for
state, not the theme's files: the kit installs templates, so their presence
proves nothing.

## Every run

1. **Install check.** No `kit.config.json` in the theme root means the kit
   isn't installed: run `project-init`.
2. Read `docs/kit-start.md`, creating it if missing. A project set up before
   this skill has no state file: ask which steps are done and tick them.
3. Report the steps as one table (step, status, date) and name the next one,
   the first unticked line. If `$ARGUMENTS` names a step, run that one. Re-run
   a finished step only when the user asks.
4. Run the step. Stop at its end, update the state file, and name the next
   step. Run one step per invocation unless the user asks to continue.

## Steps

| Step | Run | Done when |
| --- | --- | --- |
| `install` | `project-init` | `node scripts/kit-setup.mjs --check` exits 0 and the local site opens |
| `design-system` | With a Figma file, `figma-design-system` phases 0 to 2; without one, `css-foundation-wizard` | `check-css-foundation.mjs` and `contrast.mjs` exit 0, and the Styleguide page shows all six sections. Record `figma` or `wizard` |
| `header-footer` | `figma-design-system` phase 3; without Figma, `project-init` Phase 1c restyled from the comp | The header and footer match the comp at 390, 768 and 1440 wide |
| `blocks` | `figma-design-system` phase 4; without Figma, `create-block` for each section of the comp | Every block in the inventory is built and `editor-fidelity.mjs` reports no difference |
| `templates` | `figma-design-system` phase 5 | The 404, search, archives and single templates are styled |
| `launch` | `launch` | The launch skill reports the site ready |

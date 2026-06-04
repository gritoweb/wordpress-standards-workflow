---
name: commit
description: >
  Create a git commit following the team's canonical message convention.
  Use this skill whenever the user asks to commit, "comita aí", "faz o
  commit", "salva isso no git", stage-and-commit changes, or wants help
  writing a commit message. Handles the full flow: inspects the working
  tree, groups changes into one logical subject, writes a conventional
  message in English, and commits — without ever pushing.
---

# commit — conventional git commit helper

Stages and commits the current changes with a message that follows the
team standard. **Never pushes.** **Never adds a co-author.**

---

## Guard-rails (always apply)

- **Never `git push`** — committing is local only. If the user wants to
  push, they ask separately and grant permission.
- **Never add `Co-authored-by`** (or any co-author trailer).
- **English only** for the commit subject and body.
- **One subject per commit** — one logical change. If the working tree
  mixes unrelated changes, stop and ask whether to split into multiple
  commits.

---

## Message format

```
[TYPE]: short imperative subject
```

- `TYPE` is uppercase, subject in lowercase imperative ("add", "fix",
  "update" — not "added"/"adds").
- Keep the subject under ~72 chars. No trailing period.

### Types

| Type | Use for |
|---|---|
| `FEAT` | a new feature / capability |
| `FIX` | a bug fix |
| `REFACTOR` | code change that neither fixes a bug nor adds a feature |
| `CHORE` | tooling, deps, config, housekeeping |
| `DOCS` | documentation only |
| `STYLE` | formatting, whitespace, no logic change |

### Examples

```
[FEAT]: add testimonials block
[FIX]: fix mobile menu on Safari
[CHORE]: update theme dependencies
```

---

## Execution flow

1. **Inspect** — run `git status` and `git diff` (staged + unstaged) to
   see what changed. Read enough to understand the *why*, not just the *what*.
2. **Scope check** — if the changes cover more than one logical subject,
   stop and ask the user whether to split them. Don't bundle unrelated work.
3. **Stage** — stage the relevant files (`git add`). Don't blindly
   `git add -A` if there are unrelated changes in the tree.
4. **Compose** — pick the single best `TYPE` and write the subject.
   Add a short body only if the change needs a *why* that the subject
   can't carry.
5. **Commit** — `git commit`. Never `--amend` an existing commit unless
   the user explicitly asks.
6. **Confirm** — report the commit hash and subject. Do **not** push.

---

## When NOT to use

- The user explicitly asks to push, open a PR, or deploy — that's a
  separate, permission-gated action.
- There are no changes to commit — say so instead of creating an empty commit.

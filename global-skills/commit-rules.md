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

## Changelog

The `CHANGELOG.md` of a theme/plugin we own is for **notable,
release-level changes** — not a line per file or per commit. Don't dump
the git log into it.

**Before committing, ask the user whether this commit should update the
changelog.** Use judgment on what to suggest:

- **Likely worth an entry:** a new feature/block, a user-visible fix, a
  breaking change, anything that warrants a SemVer version bump.
- **Likely _not_ worth an entry:** internal refactors, tooling/config
  chores, docs, formatting/style — anything that doesn't bump the version.

State your read ("this looks like a `FIX` users would notice — add a
changelog entry?") rather than asking a blank question. If the user says
yes:

1. Append under the current `## [version] - YYYY-MM-DD` section (create
   it on a version bump), in the right `Added` / `Changed` / `Fixed` /
   `Removed` subsection. Follow [Keep a Changelog](https://keepachangelog.com).
2. On a version bump, also bump the version in the theme's `style.css`
   header / plugin's main PHP header (SemVer: MAJOR / MINOR / PATCH).
3. Stage the `CHANGELOG.md` (and version file) with the rest of the commit.

Only applies to themes/plugins **we own** — never touch core or
third-party changelogs.

---

## Execution flow

1. **Inspect** — run `git status` and `git diff` (staged + unstaged) to
   see what changed. Read enough to understand the *why*, not just the *what*.
2. **Scope check** — if the changes cover more than one logical subject,
   stop and ask the user whether to split them. Don't bundle unrelated work.
3. **Changelog check** — decide whether the change is notable enough for
   a `CHANGELOG.md` entry (see **Changelog** above) and ask the user
   before adding one.
4. **Stage** — stage the relevant files (`git add`), including
   `CHANGELOG.md` / version file if the user opted in. Don't blindly
   `git add -A` if there are unrelated changes in the tree.
5. **Compose** — pick the single best `TYPE` and write the subject.
   Add a short body only if the change needs a *why* that the subject
   can't carry.
6. **Commit** — `git commit`. Never `--amend` an existing commit unless
   the user explicitly asks.
7. **Confirm** — report the commit hash and subject. Do **not** push.

---

## When NOT to use

- The user explicitly asks to push, open a PR, or deploy — that's a
  separate, permission-gated action.
- There are no changes to commit — say so instead of creating an empty commit.

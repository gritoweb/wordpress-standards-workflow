---
name: launch
description: >
  Pre-launch audit of a WordPress site against its own launch-list.md. It checks every item it can (wp-cli, theme files, HTTP on the public URL), asks before fixing anything it knows how to fix (one user approval for the whole ordered list of commands, enforced by a hook), re-checks, and writes a pass/fail/fixed/manual report as Markdown + HTML + PDF. Use when the user says "/launch", "launch check", "is the site ready to go live?", "pre-launch audit" or "go-live checklist".
hooks:
  PreToolUse:
    - matcher: "Bash|Write|Edit|MultiEdit|NotebookEdit|AskUserQuestion"
      hooks:
        - type: command
          command: 'node "$CLAUDE_PROJECT_DIR/.claude/skills/launch/guard/guard.mjs" || exit 2'
  PostToolUse:
    - matcher: "AskUserQuestion"
      hooks:
        - type: command
          command: 'node "$CLAUDE_PROJECT_DIR/.claude/skills/launch/guard/guard.mjs" post'
---

# /launch: pre-launch audit and report

The source of truth is **`launch-list.md` in this skill's folder** (`.claude/skills/launch/launch-list.md`). It is read-only: if it is missing or has no item IDs, stop and ask. Never replace or rewrite it. Every item there has an ID,
tags (`auto`, `fix`, `manual`), a **Check**, a **Pass if** and sometimes a
**Fix**. This skill runs those checks. It never invents items, and it never
marks an item as passed without evidence. If the list and this file disagree,
the list wins.

Everything the skill writes (the report, chat summaries of results, commit text) is **English**.

## The guard (enforced, not advisory)

Loading this skill registers a `PreToolUse` hook (`guard/guard.mjs`) for the rest of the session.
It sorts every Bash command into one of three groups:

- **Reads** run: the read-only wp-cli, Terminus and SSH commands, `curl` GET/HEAD, `grep`, `ls`.
- **Writes are denied until the USER approves them.** This covers a wp-cli write, `rm`, `mv`,
  `sed -i`, `scp`, `rsync`, `mysql`, interactive `ssh`, a remote non-read command, `curl` with data,
  `git push`, and `bash -c`/`eval` wrapping any of these.
- **Never** runs, even if it was approved:
  - `rm -r`
  - `wp db reset|drop|clean`, `wp site empty|delete`
  - `terminus env:wipe|site:delete|env:clone-content`
  - `DROP`/`TRUNCATE` SQL
  - `mkfs`, `dd`, `chmod -R 777`

  The user runs these by hand if they are ever really needed.

How a write gets approved (one click):
1. Put every command you need, **in run order**, into **one** `AskUserQuestion`:
   - header `Launch fixes`
   - the question says where they run (local / staging / **PRODUCTION** + `siteurl`)
   - an option labelled exactly `Approve all`, whose `preview` is the numbered list, one exact
     command per line: `1. lando wp db export - > ~/launch-backup-<site>-<date>.sql`
   - a `Cancel` option

   Never pre-fill `answers`; the guard denies it.
2. The user clicks. A `PostToolUse` hook reads the answer and approves **exactly the previewed lines**
   (minus anything on the never-run list). It tells you how many were approved.
3. Run them **exactly** as written and **in the listed order**. The guard refuses a command that
   skips ahead. Reads (re-checks) can run between them. Every approval works once and expires in
   2 hours, and a new question replaces whatever was left of the last batch. `Cancel` clears it.

Fallback without the question UI: write the list to `.launch-pending.txt` and ask the user to type
`! node .claude/skills/launch/guard/approve.mjs`.

You can't approve anything yourself. The guard denies any tool call that touches
`approve.mjs` or `~/.launch-guard/`, and any question with pre-filled answers. Never try to get around a denial: no rewording the command,
no other interpreter, no editing the guard. A denial means you stop and ask.

## Safety rules (they override every step below)

1. **Only listed commands run.** The check phase runs only the **Check** commands from
   `launch-list.md`. These are read-only: `wp … get|list|check-update|config get`,
   `curl` GET/HEAD, `grep`, `ls`, `head`. The fix phase runs only that item's **Fix**.
   Anything else that writes needs its own explicit ask, even when it looks harmless. That includes:
   - `wp db query` with UPDATE/DELETE/INSERT, `wp search-replace`, `wp db import|reset`
   - `wp plugin update`, `wp core update`
   - `rm`, `mv`, `chmod`
   - `terminus` deploy/clone/wipe, `lando push`
2. **Say where before every write.** Before the first fix, run `wp option get siteurl` on
   the target and show it with the environment's name (local, staging or **PRODUCTION**). If the URL
   isn't what the user named, stop. Production gets the word **PRODUCTION** in the ask.
3. **Back up before the first write**, on that same environment, and show the backup's path or ID:
   - local: `lando wp db export ~/launch-backup-<site>-<date>.sql`, outside the web root
   - Pantheon: `terminus backup:create <site>.<env> --element=db`
   - other remote: `wp db export ~/launch-backup-<date>.sql` in the user's home, **never** inside the web root (an exposed `.sql` is SEC-9's failure)

   If the backup fails, no fix runs.
4. **Never lock anyone out.**
   - SEC-1: create the new admin first. Confirm with `wp user get <new>` that it exists with
     role `administrator`, then delete `admin`, always with `--reassign`.
   - `wp user delete` without `--reassign` is forbidden. It deletes the user's posts.
   - Never delete the last administrator, or the user the person said they log in with.
   - Activate security plugins (SEC-6) with their defaults. Never change the login URL, never
     enable 2FA for other users, and never turn on blocking rules from the CLI.
5. **One fix at a time, then verify.** If a fix fails, or the site answers 5xx after it
   (`curl -s -o /dev/null -w "%{http_code}" $URL`), stop. Show the output, tell the user which
   backup restores the site, and ask before doing anything else.
6. **No secrets or personal data in the report or chat.**
   - Never print `wp config list`, DB credentials, salts, API keys or `.env` content. Read only the
     named constant (`wp config get WP_DEBUG`).
   - Users appear as login and role, never email.
   - SSH/Terminus credentials are never written to any file.
7. **Be gentle with the site.** At most 15 pages and one request at a time. No crawling, load tests or brute-force probes.
8. **No git.** The skill never commits or pushes. The report files are left for the user.
9. **When unsure, stop and ask.** This applies to unexpected output, a plugin that may be custom, or a value the list doesn't give. Never guess.

## 0. Gather the target (ask, never assume)

Ask the user for the following, and wait for the answers:

1. **Local site**: is the Lando app running in this theme's WordPress? Detect it with
   `lando wp option get siteurl`. If that fails, try `wp option get siteurl`.
   No working wp-cli means the wp-cli items run against the remote environment
   instead, or become `manual`.
2. **Public URL** (`$URL`), the site as visitors will see it (the live URL, or the
   test/staging URL when the site isn't live yet). Without one, every HTTP item becomes `manual`.
3. **Remote environment**, only if wp-cli on the server is wanted: the Pantheon
   `<site>.<env>` for `terminus wp <site>.<env> -- …`. Reading is allowed. Writing follows step 3.
4. **Project name**, for the report's header.

`$THEME` is the active theme root (where this skill is installed: the folder containing `.claude/`).

## 1. Run the checks

Go through `launch-list.md` section by section. For each item tagged `auto`:

- Run the **Check** exactly as written: `lando wp …` locally, `terminus wp … -- …` remotely,
  `curl` against `$URL`, `grep`/`ls` in `$THEME`.
- Compare the result with **Pass if** and record one of these results:
  - `✅ Pass`: evidence matches.
  - `❌ Fail`: evidence doesn't match. The severity comes from the item (🚫 / ⚠️ / 💡).
  - `➖ N/A`: the item doesn't apply (for example, no e-commerce or not a migration). Say why.
  - `👁 Manual`: tagged `manual`, or the check couldn't run (no URL, no wp-cli, no access). Say what's missing.
- Keep the **evidence** short and real: the command's relevant output line, the HTTP
  status, the file and line. Never write "looks fine" without output to back it.

Rules while checking:
- **Read-only.** Nothing is changed in this step, not even "obvious" fixes.
- A check that errors (timeout, 5xx, wp-cli error) is `👁 Manual` with the error as evidence, never `✅`.
- For page-level checks (SEO-4 … SEO-8), check the home page plus every page in the main menu. Cap it at 15 pages, and list any you skipped.
- `html-qa-smoketest` covers a single page's markup in depth. Point to it for SEO-8 details instead of duplicating it.

## 2. Offer the fixes

Collect every `❌ Fail` whose item is tagged `fix`. Show them as a numbered list. Each entry has
the ID, what's wrong, the **exact command** that will run, and where it runs (local or remote):

```
1. SEC-1  user "admin" exists           local   lando wp user create … && lando wp user delete admin --reassign=…
2. SEO-1  search engines discouraged    REMOTE  terminus wp acme.live -- option update blog_public 1
```

- Ask which to apply: numbers, `all local`, or `none`. Then write the chosen commands to `.launch-pending.txt`, and have the user approve them with the guard (above).
- A fix that needs a value the list doesn't give (a new admin login and email, a timezone, a theme
  name) is asked for. **Never invent it.**
- `CON-2` (drafts and trash): show the titles before deleting, because a draft can be real work.
- Updates (SEC-3), file deletions in the web root (SEC-9) and `public/build/` are **never** auto-fixed. They go into the report as actions for the dev.

## 3. Apply what was approved

- Run only commands the user approved through the guard. The backup (safety rule 3) is the first line of the pending list.
- **Remote** fixes (`terminus wp … -- <write>`, `wp --ssh=…`, `ssh … wp …`) go in the pending list **one
  per line, never chained**, so the user sees every remote write in the list they approve. This is the kit's
  rule (`CLAUDE.md`: never write to a remote environment without explicit permission).
- Run one fix at a time. If one fails, stop, show the output, and ask before going on.
- After the fixes, **re-run the Check** of every fixed item. An item is `🔧 Fixed` only if its
  re-check passes. Otherwise it stays `❌ Fail`, with the new evidence.

## 4. Write the report

Write `docs/launch-report.md` in this shape (the first `#` is the page title):

```markdown
# Launch report: <Project>

## Result

| Result | Items |
|---|---|
| ✅ Pass | **N** |
| 🔧 Fixed during this run | **N** |
| ❌ Fail (required) | **N** |
| ❌ Fail (recommended) | **N** |
| 👁 Manual check | **N** |
| ➖ N/A | **N** |

**Verdict:** Ready to launch / **Not ready**: N required items fail.

## Required items still failing

| ID | Item | Evidence | What to do |
|---|---|---|---|

## Security
| ID | Item | Result | Evidence |
|---|---|---|---|
| SEC-1 | No `admin` user | ✅ Pass | `wp user list`: admin not found |

## Base SEO
… one table per launch-list section, in the same order …

## Fixed during this run

| ID | Command | Where | Re-check |
|---|---|---|---|

## Manual checks

- **SEC-15** 2FA on every administrator: Security Optimizer › Login Security
- …

## How this was checked

Local: `lando` (siteurl …). Public URL: … Remote: … Date: …
```

- The verdict is **Ready** only when no 🚫 item is `❌ Fail`. `👁 Manual` 🚫 items are called out under the verdict.
- Evidence goes in backticks. The renderer escapes everything, so pasted HTML is safe.

Then render it in the same visual style as every GritoWeb report:

```bash
node .claude/skills/launch/report/report.mjs docs/launch-report.md \
  --about "<Project>" --subtitle "Pre-launch audit" \
  --meta "Date=<YYYY-MM-DD>" --meta "URL=<host>" --meta "Verdict=<Ready|Not ready>" --pdf
```

This writes `docs/launch-report.html` and `docs/launch-report.pdf` next to the `.md`. The PDF needs
Chrome, Edge or Chromium. Without one, the HTML is still written, and the command says so with exit 1.
The generator needs only Node 18+ and no packages.

## 5. Close

Tell the user the verdict, the counts, the required items still failing, and the paths of the
HTML and PDF. Don't commit the report unless asked. The `.md`, `.html` and `.pdf` are the deliverable.

## Never

- Mark `✅` without evidence, or turn a failed check into `👁 Manual` to make the verdict look better.
- Change anything (locally or remotely) before step 2's approval. Never write remotely without the per-command OK.
- Touch WordPress core, third-party plugin code or `public/build/`.
- Write the report in any language other than English.

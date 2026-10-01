---
name: launch
description: >
  Pre-launch audit of a WordPress site against its own launch-list.md. It checks every item it can (wp-cli, theme files, HTTP on the public URL), runs HTTP/page/PageSpeed tools, asks for missing values in one round, fixes everything it can after one user approval of the ordered command list (enforced by a hook), re-checks, and writes a professional pass/fail report as Markdown + HTML + PDF. Use when the user says "/launch", "launch check", "is the site ready to go live?", "pre-launch audit" or "go-live checklist".
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

## 0. Gather the target (one round of questions)

Detect first, then ask only what you can't detect, in **one** `AskUserQuestion`:
- **wp-cli:** try `lando wp option get siteurl`, then `wp option get siteurl`. If Lando isn't running,
  the first fix in the approval list is `lando start`.
- **Remote** (only when the user wants the server checked): Pantheon `<site>.<env>` for
  `terminus wp <site>.<env> -- …`, or SSH (`user@host:port/path`) for `wp --ssh=… …`. The key must
  already work; test it with `option get siteurl`.
- **`$URL`:** the public URL (live or staging). If the site only exists locally, use the Lando URL. The
  `public` items then come out `LOCAL`.
- **Project name:** for the report header. Default to the theme name.

`$THEME` is the active theme root (the folder containing `.claude/`). `$TOOLS` is
`.claude/skills/launch/tools`.

## 1. Check everything (read-only)

1. Run the three tools once, and save their JSON for the report:
   ```bash
   node $TOOLS/http-audit.mjs $URL
   node $TOOLS/page-audit.mjs $URL <menu page URLs…> --links      # add --w3c only for a public URL
   node $TOOLS/psi.mjs $URL                                        # about 40 s without a PAGESPEED_API_KEY
   ```
2. Run the `wp …`, `grep` and `ls` checks of `launch-list.md`.
3. Give every item exactly one result:
   - `PASS`: the evidence matches **Pass if**.
   - `FAIL`: it doesn't.
   - `LOCAL`: a `public` item checked on a local URL. Re-check it on the public URL; it's never `FAIL`.
   - `MANUAL`: a `manual` item, or a check that couldn't run (say why: no access, timeout, error).
   - `N/A`: the item doesn't apply (no e-commerce, not a migration). Say why.
4. Keep the evidence short and real: the field and its value, the command's output line, the file
   and line. A check that errors is `MANUAL` with the error, never `PASS`.

Nothing changes in this step, not even an "obvious" fix.

## 2. Ask for the missing values (one round)

Collect every `FAIL` tagged `ask`, and put them in one `AskUserQuestion` with up to 4 questions,
asking a second round only if there are more. Each question offers your **suggested answer first**:
- the timezone from the site language
- the category name from the site's content
- an admin email at the client's domain
- a meta description you drafted from the page's real text, shown in full
- the logo as the OG image and the site icon

The user can accept or type their own. Never invent a value the user hasn't seen.

## 3. One approval for every fix

Build the fix list from every `FAIL` tagged `fix` (with the values from step 2), **in this order**:
1. `lando start`, if it's needed
2. the backup (safety rule 3)
3. the fixes, in the list's order

Then ask the single `Launch fixes` question (see **The guard**). Its question text says the environment and `siteurl`. Its
`Approve all` preview is the numbered list of exact commands. Write remote commands one per line,
never chained.

Never offer as a fix:
- updates (SEC-3)
- deleting logs, backups or `.env` (SEC-9)
- template changes (SEO-5)
- `public/build/`

They go in the report as actions for the dev.

## 4. Apply, then re-check

- Run the approved commands exactly, in order, one at a time (safety rule 5).
- After each fix, re-run that item's check. It's `FIXED` only if the re-check passes. Otherwise it
  stays `FAIL`, with the new evidence.
- When everything has run, run `http-audit.mjs` and `page-audit.mjs` again, because plugins change
  HTTP behaviour. Update every affected result.

## 5. Write the report

Write `docs/launch-report.md` in this shape. Use **no emoji**: results and severities are plain words,
which the renderer turns into coloured labels.

```markdown
# Launch report: <Project>

**Verdict: Ready to launch** | **Verdict: Not ready** (N required items fail) | **Verdict: Ready locally** (N public-URL checks pending)

| Result | Items |
|---|---|
| PASS | **N** |
| FIXED | **N** |
| FAIL | **N** (N required) |
| LOCAL | **N** |
| MANUAL | **N** |
| N/A | **N** |

## PageSpeed

| Device | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Mobile | **84** | 99 | 83 | 92 | 3.4 s | 0 | 0 ms |
| Desktop | 97 | 99 | 82 | 92 | 1.0 s | 0 | 0 ms |

Minimum: 70 on mobile. Source: <source>. Open in PageSpeed Insights: [mobile](<psi_link>) · [desktop](<psi_link_desktop>)

## Required items still failing

| ID | Item | Evidence | What to do |
|---|---|---|---|

## Fixed during this run

| ID | Command | Re-check |
|---|---|---|

Backup: `<path or ID>`

## Security
| ID | Severity | Item | Result | Evidence |
|---|---|---|---|---|
| SEC-1 | Required | No `admin` user | PASS | `wp user list`: no `admin` |

… one table per section of `launch-list.md`, in the same order …

## Manual checks

1. **MAIL-2** Every form delivers: submit each form …
…

## How this was checked

Target: <environment> (`siteurl`). URL: … Remote: … Date: … Tools: http-audit, page-audit, psi (<source>).
```

- The verdict is **Ready to launch** only when no Required item is `FAIL` and nothing is `LOCAL`.
- Put evidence in backticks. The renderer escapes everything, so pasted HTML is safe.

Render it:

```bash
node .claude/skills/launch/report/report.mjs docs/launch-report.md \
  --about "<Project>" --subtitle "Pre-launch audit" \
  --meta "Date=<YYYY-MM-DD>" --meta "URL=<host>" --meta "Verdict=<Ready|Not ready|Ready locally>" --pdf
```

This writes `docs/launch-report.html` and `.pdf` next to the `.md`, using Node 18+ and no packages.
The PDF needs Chrome, Edge or Chromium.

## 6. Close

Tell the user:
- the verdict
- the counts
- the PageSpeed mobile score, with its link
- what was fixed
- the required items still failing, each with its next step
- the report paths

Don't commit anything.

## Never

- Mark `PASS` without evidence, or downgrade a `FAIL` to `MANUAL`/`LOCAL` to make the verdict look better.
- Change anything before the user's approval.
- Replace or rewrite `launch-list.md`, or any file the user didn't approve.
- Touch WordPress core, third-party plugin code or `public/build/`.
- Put emoji in the report, or write it in any language other than English.

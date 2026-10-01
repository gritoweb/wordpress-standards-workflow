---
name: launch
description: >
  Pre-launch audit of a WordPress site against its own launch-list.md. It checks every item it can (wp-cli, theme files, HTTP on the public URL), runs HTTP/page tools and reads PageSpeed Insights from pagespeed.web.dev (no API key), asks for missing values in one round, fixes everything it can after one user approval of the ordered command list (enforced by a hook), re-checks, and writes a professional pass/fail report as Markdown + HTML + PDF. Use when the user says "/launch", "launch check", "is the site ready to go live?", "pre-launch audit" or "go-live checklist".
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
   - local: `lando wp db export - > ~/launch-backup-<site>-<date>.sql`. Stream to the host: `~` inside `lando wp` is the container's home, which the host can't see.
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

## 0. Gather the target (detect first, ask at most once)

**Re-check mode.** If `launch/report.md` already exists, the first question offers:
- `Re-check what failed` (recommended): re-run the tools and only the agent checks that were `FAIL` or
  `LOCAL`, then rebuild the report (step 5). This takes 1–2 minutes.
- `Full audit`

Detect, without asking:
- **wp-cli:** `lando wp option get siteurl`, then `wp option get siteurl`. If Lando is installed but
  stopped, the first line of the approval list is `lando start`.
- **Project name:** `Theme Name` in `$THEME/style.css`, or the theme folder name.
- **Privacy page URL:** `wp option get wp_page_for_privacy_policy` returns an **ID**; turn it into the
  URL with `wp post get <id> --field=url`. Zero means there is none.

Then ask only what is still unknown, in **one plain chat message** (see **How to ask** below). Skip
anything the user already gave in the command, for example `/launch https://acme.com`:
- **`$URL`, the site to audit:** the public URL (live or staging), or the local `siteurl`. On a local
  URL, public-only items come out `LOCAL`.
- **`$PSI_URL`, the URL PageSpeed Insights tests:** it must be public, because Google can't reach
  Lando. Suggest `$URL` when it is public; otherwise suggest "none, local estimate only".
- **Migration, the old site:** its URL, a path to a file with the old URLs, or "none" if the site
  isn't replacing an old one.
- **Terms page URL:** WordPress has no setting for it. Suggest a published page whose slug looks like
  terms, or "none".

**How to ask.** There are two kinds of question, and they never mix:
- **A value the user types** (a URL, an email, a file path, a name, a text) is asked in a **plain chat
  message**, never as `AskUserQuestion` options. Number the values, put your suggestion after each,
  and end with: "Reply with the values that differ, or `ok` to accept all." Then wait for the reply.
  Example:
  ```
  1. Site to audit: http://acme.lndo.site (detected)
  2. PageSpeed URL: none, local estimate only
  3. Old site (migration): none
  4. Terms page: https://acme.lndo.site/terms/ (found by slug)
  Reply with the values that differ (e.g. "2: https://acme.com, 3: https://old-acme.com"), or ok.
  ```
  Use what the user writes as it is. Never turn a typed value into a list of options, and never ask
  the same value again. If a reply is unclear, ask about that one value in plain text.
- **A choice between fixed options** (re-check or full audit, the `Launch fixes` approval, skip or
  apply something) uses `AskUserQuestion`.

Remote wp-cli (Pantheon `terminus wp <site>.<env> -- …`, or SSH `wp --ssh=user@host:port/path …`)
is used only when the user asks for the server to be checked. The key must already work: test it
with `option get siteurl`.

`$THEME` is the active theme root (the folder containing `.claude/`). Everything the skill generates
goes in `launch/` at the theme root, so the user can delete it any time.

## 1. Check everything (read-only)

1. Run the tools **in parallel, in one Bash call**, writing their JSON to `launch/raw/`. Put the
   `mkdir` on its own line first. Write the paths literally, because the guard only lets the skill's
   own tools through. Leave out a flag whose value is unknown:
   ```bash
   mkdir -p launch/raw
   node .claude/skills/launch/tools/http-audit.mjs $URL > launch/raw/http.json 2>/dev/null &
   node .claude/skills/launch/tools/page-audit.mjs $URL <menu page URLs…> --links --privacy-url <url> --terms-url <url> > launch/raw/pages.json 2>/dev/null &
   node .claude/skills/launch/tools/psi.mjs $PSI_URL --screenshot launch/pagespeed-mobile.png > launch/raw/psi.json 2>/dev/null &
   node .claude/skills/launch/tools/redirect-audit.mjs $URL --old <old-site> > launch/raw/redirects.json 2>/dev/null &
   wait
   ```
   - `redirect-audit` runs only for a migration. With a list of old URLs, use `--list <file>`.
   - Add `--w3c` to `page-audit` only for a public `$URL`, because it sends the HTML to validator.w3.org.
   - `psi.mjs` reads pagespeed.web.dev in headless Chrome (about 25 s, no API key). On a local URL,
     or when the page fails, it falls back to local Lighthouse and says why.
2. Meanwhile, run the `wp …`, `grep` and `ls` checks of `launch-list.md`. These are the items the
   tools can't see.
3. **The tools decide their own items.** `report/evaluate.mjs` computes, from the JSON, every item
   the tools can see, with its evidence: HTTPS, headers, exposed files, robots, sitemap, canonical,
   H1, OG, alt, broken links, PageSpeed, migration, analytics, consent, forms, search and so on.
   Don't re-judge those. You give results only for the rest, plus `FIXED` for anything you fixed.
   If you contradict a tool, the build refuses the report and says which item disagrees.
4. Give each of your items exactly one result:
   - `PASS`: the evidence matches **Pass if**.
   - `FAIL`: it doesn't. Add the action that fixes it.
   - `LOCAL`: a `launch-env` item checked on a local site (debug flags, dev packages, logs).
   - `MANUAL`: a `manual` item, or a check that couldn't run (say why).
   - `N/A`: the item doesn't apply (no e-commerce, not a migration). Say why.

   The evidence is real: the command's output line, or the file and line. A check that errors is
   `MANUAL` with the error, never `PASS`.

Nothing changes in this step, not even an "obvious" fix.

## 2. Ask for the missing values (one round)

Collect every `FAIL` tagged `ask`, and ask for all of them in **one plain chat message** (see **How to
ask** in step 0: numbered values, your suggestion after each, `ok` accepts all). Suggest:
- the timezone, from the site language
- the category name, from the site's content
- an admin email at the client's domain, and the inbox for the MAIL-2 test email
- a meta description you drafted from the page's real text, shown in full
- the logo for the icon and OG image (see **Logo** in `launch-list.md`), with a background colour.
  Run `brand-images.mjs`, open both PNGs and show them to the user before offering the fix.
- **contacts (LIVE-3):** show `contacts.phones` and `contacts.emails` from `pages.json`, plus the
  footer text, and ask the user to confirm them or write the right ones

The user accepts or writes their own. Never invent a value the user hasn't seen. Mark a suggested
value the user accepted without editing with `"suggested": true` in its result.

**Two rounds of questions at most per run:** the values, then `Launch fixes`. Anything that turns up
later goes into the report's next steps.

## 3. One approval for every fix

Build the fix list from every `FAIL` tagged `fix` (with the values from step 2), **in this order**:
1. `lando start`, if it's needed
2. the backup (safety rule 3)
3. the fixes, in the list's order
4. `rm docs/launch-list.md`, if that old copy is still in the project

Then ask the single `Launch fixes` question (see **The guard**). Its question text says the environment
and `siteurl`. Its `Approve all` preview is the numbered list of exact commands. Write remote commands
one per line, never chained.

Never offer as a fix:
- updates (SEC-3)
- deleting logs, backups or `.env` (SEC-9)
- redirects (SEO-11)
- template changes (SEO-5, PAGE-3)
- `public/build/`

They go in the report as actions for the dev.

## 4. Apply, then re-check

- Run the approved commands exactly, in order, one at a time (safety rule 5).
- After each fix, re-run that item's check. It's `FIXED` only if the re-check passes.
- When everything has run, run `http-audit.mjs` and `page-audit.mjs` again into `launch/raw/`, because
  fixes change what they see. `psi.mjs` isn't re-run unless a fix targeted performance.

## 5. Build the report (no hand-written report)

Pipe your results as JSON on stdin to the builder. It merges them with the tools' decisions,
**refuses** an incomplete set or one that contradicts the tools, computes the counts, verdict and next
steps, and writes `launch/report.md`, `report.html` and `report.pdf`, with the PageSpeed screenshot
embedded:

```bash
node .claude/skills/launch/report/build.mjs --dir launch <<'JSON'
{
  "project": "<Theme Name>",
  "date": "<YYYY-MM-DD>",
  "target": { "environment": "local|staging|production", "siteurl": "<siteurl>", "url": "<$URL>", "psi_url": "<$PSI_URL>", "remote": null },
  "items": [
    { "id": "SEC-1", "result": "PASS", "evidence": "wp user list: no admin" },
    { "id": "SET-1", "result": "FIXED", "evidence": "timezone_string America/Sao_Paulo", "suggested": true },
    { "id": "MAIL-1", "result": "FAIL", "evidence": "no SMTP plugin active", "action": "Install WP Mail SMTP and set the credentials." }
  ],
  "fixed": [ { "id": "SET-1", "command": "wp option update timezone_string America/Sao_Paulo", "recheck": "option is set" } ],
  "backup": "<path or ID, or null>",
  "notes": ["<anything the reader must know, e.g. PageSpeed measured another URL>"]
}
JSON
```

- If it exits 1, read the list it prints (missing IDs, contradictions, a FAIL without an action), fix
  your results and run it again. Never work around it by writing the report by hand.
- It prints the verdict and counts as JSON. The verdict is computed: **Ready to launch** only with no
  Required `FAIL` and nothing `LOCAL`.

## 6. Close

Tell the user:
- the verdict
- the counts
- the PageSpeed mobile score, with its report link
- what was fixed
- the required items still failing, each with its next step
- `launch/report.pdf`

Don't commit anything.

## Never

- Mark `PASS` without evidence, contradict a tool's result, or downgrade a `FAIL` to `MANUAL`/`LOCAL`
  to make the verdict look better.
- Write or edit the report by hand.
- Change anything before the user's approval.
- Replace or rewrite `launch-list.md`, or any file the user didn't approve.
- Touch WordPress core, third-party plugin code or `public/build/`.
